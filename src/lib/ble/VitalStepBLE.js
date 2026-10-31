import {
  SERVICE_UUID,
  TELEMETRY_CHAR_UUID,
  ENERGY_CHAR_UUID,
  COMMAND_CHAR_UUID,
  DEVICE_NAME_PREFIX,
  MESSAGE,
  FrameParser,
  commandFrame,
  parseTelemetry,
  parseEnergy,
  parsePressure,
  parseDeviceInfo,
  parseError,
  MESSAGE_LABEL,
} from './protocol';

/**
 * VitalStepBLE: transport layer, fully independent from the UI.
 * Responsibilities: discovery, connection, notification decoding, command writes,
 * watchdog timeouts, sequence de-duplication and controlled auto-reconnect.
 * It never renders and never decides business rules; it only emits events.
 */

const STALE_AFTER_MS = 8000;
const MAX_RECONNECT_ATTEMPTS = 4;

export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

export class VitalStepBLE {
  constructor() {
    this.device = null;
    this.server = null;
    this.commandChar = null;
    this.parser = new FrameParser();
    this.listeners = new Map();
    this.seq = 0;
    this.status = 'idle'; // idle | requesting | connecting | connected | reconnecting | disconnected | unsupported | error
    this.lastPacketAt = 0;
    this.lastSeq = null;
    this.duplicates = 0;
    this.packets = 0;
    this.errors = 0;
    this.rssi = null;
    this.info = null;
    this.pressure = null;
    this.energy = null;
    this.telemetry = null;
    this.watchdog = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.manualClose = false;
    this.rateHz = 1;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        /* listener errors must never break the transport */
      }
    });
  }

  setStatus(status, detail) {
    this.status = status;
    this.emit('status', { status, detail });
  }

  log(kind, detail, rssi) {
    this.emit('device-event', { kind, detail, at: new Date().toISOString(), rssi });
  }

  /** Must be called from a user gesture (Web Bluetooth requirement). */
  async requestDevice() {
    if (!isBluetoothSupported()) {
      this.setStatus('unsupported', 'Web Bluetooth não disponível neste navegador.');
      throw new Error('Web Bluetooth não disponível neste navegador.');
    }
    this.manualClose = false;
    this.setStatus('requesting');
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: DEVICE_NAME_PREFIX }, { services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });
      this.device = device;
      this.log('scan', `Dispositivo selecionado: ${device.name || device.id}`);
      this.listenRssi();
      await this.connect();
      return device;
    } catch (err) {
      if (err?.name === 'NotFoundError') {
        this.setStatus('idle', 'Nenhum dispositivo selecionado.');
        return null;
      }
      this.setStatus('error', err?.message || 'Falha ao solicitar dispositivo.');
      this.log('error', err?.message || 'Falha ao solicitar dispositivo');
      throw err;
    }
  }

  async connect() {
    if (!this.device) throw new Error('Nenhum dispositivo pareado.');
    this.setStatus(this.reconnectAttempts ? 'reconnecting' : 'connecting');
    this.device.removeEventListener?.('gattserverdisconnected', this.onDisconnected);
    this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
    const server = await this.device.gatt.connect();
    this.server = server;
    const service = await server.getPrimaryService(SERVICE_UUID);
    const [telemetryChar, energyChar, commandChar] = await Promise.all([
      service.getCharacteristic(TELEMETRY_CHAR_UUID),
      service.getCharacteristic(ENERGY_CHAR_UUID).catch(() => null),
      service.getCharacteristic(COMMAND_CHAR_UUID).catch(() => null),
    ]);
    this.commandChar = commandChar;
    this.parser = new FrameParser();
    telemetryChar.addEventListener('characteristicvaluechanged', this.onNotify);
    await telemetryChar.startNotifications();
    if (energyChar) {
      energyChar.addEventListener('characteristicvaluechanged', this.onNotify);
      await energyChar.startNotifications();
    }
    this.reconnectAttempts = 0;
    this.lastPacketAt = 0;
    this.setStatus('connected', this.device.name || 'VitalStep');
    this.log('connect', `Conectado a ${this.device.name || this.device.id}`);
    this.startWatchdog();
    await this.sendCommand(MESSAGE.CMD_SET_RATE, { rateHz: this.rateHz }).catch(() => {});
    return true;
  }

  async disconnect({ manual = true } = {}) {
    this.manualClose = manual;
    clearInterval(this.watchdog);
    clearTimeout(this.reconnectTimer);
    try {
      this.device?.gatt?.connected && this.device.gatt.disconnect();
    } catch {
      /* ignore */
    }
    this.server = null;
    this.commandChar = null;
    this.setStatus('disconnected', manual ? 'Desconectado pelo operador.' : 'Conexão perdida.');
    if (manual) this.log('disconnect', 'Desconectado pelo operador');
  }

  onDisconnected = () => {
    clearInterval(this.watchdog);
    this.log('disconnect', 'Enlace BLE encerrado pelo dispositivo');
    if (this.manualClose) {
      this.setStatus('disconnected', 'Desconectado.');
      return;
    }
    this.scheduleReconnect();
  };

  scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus('disconnected', 'Reconexão automática esgotada. Reconecte manualmente.');
      this.log('error', 'Reconexão automática esgotada');
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(15000, 1500 * 2 ** (this.reconnectAttempts - 1));
    this.setStatus('reconnecting', `Tentativa ${this.reconnectAttempts} em ${Math.round(delay / 1000)}s`);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (err) {
        this.log('error', `Reconexão falhou: ${err?.message || 'erro'}`);
        this.scheduleReconnect();
      }
    }, delay);
  }

  onNotify = (event) => {
    this.packets += 1;
    const value = event.target.value;
    const chunk = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const frames = this.parser.push(chunk);
    frames.forEach((frame) => this.handleFrame(frame));
  };

  handleFrame(frame) {
    // Duplicate suppression: the ESP32 may retransmit the last sample.
    if (this.lastSeq !== null && frame.seq === this.lastSeq) {
      this.duplicates += 1;
      return;
    }
    this.lastSeq = frame.seq;
    this.lastPacketAt = Date.now();
    const label = MESSAGE_LABEL[frame.type] || `0x${frame.type.toString(16)}`;

    if (frame.type === MESSAGE.TELEMETRY) {
      const data = parseTelemetry(frame.payload);
      if (!data) return;
      this.telemetry = { ...data, at: new Date().toISOString() };
      this.emit('telemetry', this.telemetry);
    } else if (frame.type === MESSAGE.ENERGY) {
      const data = parseEnergy(frame.payload);
      if (!data) return;
      this.energy = { ...data, at: new Date().toISOString() };
      this.emit('energy', this.energy);
    } else if (frame.type === MESSAGE.PRESSURE) {
      const data = parsePressure(frame.payload);
      if (!data) return;
      this.pressure = { ...data, at: new Date().toISOString() };
      this.emit('pressure', this.pressure);
    } else if (frame.type === MESSAGE.DEVICE_INFO) {
      const data = parseDeviceInfo(frame.payload);
      if (!data) return;
      this.info = data;
      this.emit('device-info', data);
    } else if (frame.type === MESSAGE.ERROR) {
      const err = parseError(frame.payload);
      this.errors += 1;
      this.log('error', `Erro ${err.code}: ${err.message}`);
      this.emit('device-error', err);
    }
    this.emit('packet', { type: frame.type, label, seq: frame.seq, size: frame.payload.length + 7 });
  }

  async sendCommand(type, extra) {
    if (!this.commandChar) throw new Error('Canal de comando indisponível.');
    this.seq = (this.seq + 1) % 256;
    const frame = commandFrame(type, this.seq, extra);
    if (this.commandChar.writeValueWithoutResponse) {
      await this.commandChar.writeValueWithoutResponse(frame);
    } else {
      await this.commandChar.writeValue(frame);
    }
    this.log('command', `Comando ${MESSAGE_LABEL[type]} enviado`);
    return true;
  }

  startWatchdog() {
    clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (!this.lastPacketAt) return;
      if (Date.now() - this.lastPacketAt > STALE_AFTER_MS) {
        this.emit('stale', { sinceMs: Date.now() - this.lastPacketAt });
      }
    }, 2000);
  }

  /** RSSI is only exposed by Chromium's watchAdvertisements API. */
  async listenRssi() {
    if (!this.device?.watchAdvertisements) return;
    try {
      this.device.addEventListener('advertisementreceived', (e) => {
        if (typeof e.rssi === 'number') {
          this.rssi = e.rssi;
          this.emit('rssi', e.rssi);
        }
      });
      await this.device.watchAdvertisements();
    } catch {
      /* silently unavailable */
    }
  }

  snapshot() {
    return {
      status: this.status,
      deviceName: this.device?.name || null,
      deviceId: this.device?.id || null,
      packets: this.packets,
      duplicates: this.duplicates,
      errors: this.errors,
      rejected: this.parser.rejected,
      rssi: this.rssi,
      info: this.info,
      telemetry: this.telemetry,
      energy: this.energy,
      pressure: this.pressure,
      lastPacketAt: this.lastPacketAt || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}