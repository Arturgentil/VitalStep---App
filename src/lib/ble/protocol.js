/**
 * StepVolt BLE Protocol — v1.0
 * ---------------------------------
 * Frame layout (little-endian payload):
 *
 *   offset  size  field
 *   0       1     0x53 'S'      magic 1
 *   1       1     0x56 'V'      magic 2
 *   2       1     version       protocol major version (1)
 *   3       1     type          message type (see MESSAGE)
 *   4       1     seq           sequence number, wraps at 255
 *   5       1     length        payload length in bytes (0..64)
 *   6       n     payload       type-specific, little-endian
 *   6+n     1     crc8          CRC-8 (poly 0x07, init 0x00) over bytes 0..5+n
 *
 * Every packet is validated (magic, length, crc) before being accepted.
 * Duplicate `seq` values inside the dedupe window are discarded.
 */

export const PROTOCOL_VERSION = 1;
export const SERVICE_UUID = '7a1c0001-6b4e-4f6d-9a2b-5c3d7e8f9a01';
export const TELEMETRY_CHAR_UUID = '7a1c0002-6b4e-4f6d-9a2b-5c3d7e8f9a01';
export const ENERGY_CHAR_UUID = '7a1c0003-6b4e-4f6d-9a2b-5c3d7e8f9a01';
export const COMMAND_CHAR_UUID = '7a1c0004-6b4e-4f6d-9a2b-5c3d7e8f9a01';
export const DEVICE_NAME_PREFIX = 'StepVolt';

export const MESSAGE = {
  TELEMETRY: 0x01,
  ENERGY: 0x02,
  PRESSURE: 0x03,
  DEVICE_INFO: 0x04,
  ERROR: 0x05,
  CMD_START: 0x10,
  CMD_STOP: 0x11,
  CMD_CALIBRATE: 0x12,
  CMD_SOS_TEST: 0x13,
  CMD_SET_RATE: 0x14,
};

export const MESSAGE_LABEL = {
  0x01: 'TELEMETRY',
  0x02: 'ENERGY',
  0x03: 'PRESSURE',
  0x04: 'DEVICE_INFO',
  0x05: 'ERROR',
  0x10: 'CMD_START',
  0x11: 'CMD_STOP',
  0x12: 'CMD_CALIBRATE',
  0x13: 'CMD_SOS_TEST',
  0x14: 'CMD_SET_RATE',
};

export const SENSOR_FLAGS = [
  { bit: 0, key: 'imu', label: 'Acelerômetro + Giroscópio' },
  { bit: 1, key: 'ppg', label: 'Sensor óptico (BPM/SpO₂)' },
  { bit: 2, key: 'temp', label: 'Termômetro de contato' },
  { bit: 3, key: 'piezo', label: 'Piezoelétrico (pressão + energia)' },
  { bit: 4, key: 'fsr', label: 'Matriz FSR plantar (6 zonas)' },
  { bit: 5, key: 'gps', label: 'Módulo GNSS auxiliar' },
];

export const CRC8_TABLE = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let b = 0; b < 8; b += 1) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    table[i] = crc;
  }
  return table;
})();

export function crc8(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC8_TABLE[crc ^ bytes[i]];
  return crc;
}

export function encodeFrame(type, seq, payload = new Uint8Array(0)) {
  const frame = new Uint8Array(7 + payload.length);
  frame[0] = 0x53;
  frame[1] = 0x56;
  frame[2] = PROTOCOL_VERSION;
  frame[3] = type & 0xff;
  frame[4] = seq & 0xff;
  frame[5] = payload.length;
  frame.set(payload, 6);
  frame[6 + payload.length] = crc8(frame.subarray(0, 6 + payload.length));
  return frame;
}

/** Returns {ok, reason} — used by the parser to reject malformed frames. */
export function validateFrame(frame) {
  if (!frame || frame.length < 7) return { ok: false, reason: 'quadro incompleto' };
  if (frame[0] !== 0x53 || frame[1] !== 0x56) return { ok: false, reason: 'magic inválido' };
  const length = frame[5];
  if (frame.length !== 7 + length) return { ok: false, reason: 'tamanho divergente' };
  if (frame[2] !== PROTOCOL_VERSION) return { ok: false, reason: `versão ${frame[2]} não suportada` };
  const expected = crc8(frame.subarray(0, 6 + length));
  if (expected !== frame[6 + length]) return { ok: false, reason: 'CRC inválido' };
  return { ok: true };
}

export function decodeFrame(frame) {
  const check = validateFrame(frame);
  if (!check.ok) return { ok: false, reason: check.reason };
  return {
    ok: true,
    version: frame[2],
    type: frame[3],
    seq: frame[4],
    payload: frame.slice(6, 6 + frame[5]),
  };
}

function u32(p, o) {
  return (p[o] | (p[o + 1] << 8) | (p[o + 2] << 16) | (p[o + 3] << 24)) >>> 0;
}
function u16(p, o) {
  return p[o] | (p[o + 1] << 8);
}
function i16(p, o) {
  const v = u16(p, o);
  return v & 0x8000 ? v - 0x10000 : v;
}

/** TELEMETRY — steps u32, bpm u8, spo2 u8, temp_c×100 i16, battery u8, flags u8, quality u8 */
export function parseTelemetry(p) {
  if (p.length < 11) return null;
  return {
    steps: u32(p, 0),
    bpm: p[4],
    spo2: p[5],
    temp_c: i16(p, 6) / 100,
    battery_pct: p[8],
    flags: p[9],
    quality: ['low', 'medium', 'high'][Math.min(2, p[10])] || 'low',
  };
}

/** ENERGY — power_uw u32, voltage_mv u16, current_ma i16, energy_uwh u32, battery u8 */
export function parseEnergy(p) {
  if (p.length < 13) return null;
  return {
    power_mw: u32(p, 0) / 1000,
    voltage_v: u16(p, 4) / 1000,
    current_ma: i16(p, 6),
    energy_mwh: u32(p, 8) / 1000,
    battery_pct: p[12],
  };
}

/** PRESSURE — six zones u8 (heelL, midL, foreL, heelR, midR, foreR), total load g u16 */
export function parsePressure(p) {
  if (p.length < 8) return null;
  const zones = ['heel_l', 'mid_l', 'fore_l', 'heel_r', 'mid_r', 'fore_r'];
  const pressure = {};
  zones.forEach((z, i) => {
    pressure[z] = p[i];
  });
  return { zones: pressure, total_load_g: u16(p, 6) };
}

/** DEVICE_INFO — fw major, minor, patch, protocol, sensor flags, battery */
export function parseDeviceInfo(p) {
  if (p.length < 6) return null;
  return {
    firmware_version: `${p[0]}.${p[1]}.${p[2]}`,
    protocol_version: p[3],
    sensor_flags: p[4],
    battery_pct: p[5],
  };
}

export function parseError(p) {
  if (!p.length) return { code: 0, message: 'erro desconhecido' };
  return { code: p[0], message: String.fromCharCode(...p.slice(1)) };
}

export function decodeSensors(flags) {
  return SENSOR_FLAGS.map((s) => ({ ...s, available: Boolean(flags & (1 << s.bit)) }));
}

export function commandFrame(type, seq, extra = {}) {
  let payload = new Uint8Array(0);
  if (type === MESSAGE.CMD_SET_RATE) payload = new Uint8Array([extra.rateHz || 1]);
  if (type === MESSAGE.CMD_START) payload = new Uint8Array([extra.kind === 'run' ? 1 : 0]);
  return encodeFrame(type, seq, payload);
}

/**
 * Accumulates BLE notification chunks until a complete frame is available.
 * A single notification may carry several frames, or half of one.
 */
export class FrameParser {
  constructor() {
    this.buffer = new Uint8Array(0);
    this.rejected = 0;
  }

  push(chunk) {
    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer, 0);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;
    const frames = [];
    let guard = 0;
    while (this.buffer.length >= 7 && guard < 64) {
      guard += 1;
      const length = this.buffer[5];
      const total = 7 + length;
      if (this.buffer[0] !== 0x53 || this.buffer[1] !== 0x56) {
        // resync on next plausible header
        const next = this.buffer.findIndex((b) => b === 0x53);
        this.buffer = next > 0 ? this.buffer.slice(next) : this.buffer.slice(1);
        this.rejected += 1;
        continue;
      }
      if (this.buffer.length < total) break;
      const candidate = this.buffer.slice(0, total);
      const decoded = decodeFrame(candidate);
      if (decoded.ok) frames.push(decoded);
      else this.rejected += 1;
      this.buffer = this.buffer.slice(total);
    }
    if (this.buffer.length > 512) {
      this.buffer = new Uint8Array(0);
      this.rejected += 1;
    }
    return frames;
  }
}