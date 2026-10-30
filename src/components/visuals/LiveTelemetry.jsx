import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, BatteryMedium, Bluetooth, Cpu, Gauge, Radio } from 'lucide-react';
import StatusPill from '@/components/sv/StatusPill';
import { fmtAgo, fmtNum } from '@/lib/format';
import { SENSOR_FLAGS } from '@/lib/ble/protocol';

const TONE = {
  connected: 'connected',
  reconnecting: 'warning',
  requesting: 'warning',
  connecting: 'warning',
  stale: 'warning',
  error: 'error',
  unsupported: 'error',
  disconnected: 'idle',
  idle: 'idle',
};

const LABEL = {
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  requesting: 'Seleção',
  connecting: 'Conectando',
  stale: 'Sinal perdido',
  error: 'Falha',
  unsupported: 'Sem suporte',
  disconnected: 'Desconectado',
  idle: 'Em espera',
};

/** Live Telemetry — every value here comes from the transport layer or is absent. */
export default function LiveTelemetry({ ble, live, demo = false }) {
  const packetsRef = useRef(ble.packets);
  const prev = useRef({ packets: ble.packets, t: Date.now() });
  const [rate, setRate] = useState(0);

  useEffect(() => {
    packetsRef.current = ble.packets;
  }, [ble.packets]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = packetsRef.current - prev.current.packets;
      const dt = (now - prev.current.t) / 1000;
      if (dt > 0) setRate(Math.max(0, delta / dt));
      prev.current = { packets: packetsRef.current, t: now };
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const info = ble.info;
  const telemetry = live?.telemetry;
  const sensors = SENSOR_FLAGS.map((s) => ({
    ...s,
    available: info ? Boolean(info.sensor_flags & (1 << s.bit)) : null,
  }));

  const rows = [
    { icon: Radio, label: 'Pacotes/s', value: demo ? '—' : fmtNum(rate, 1), hint: demo ? 'demo' : 'BLE' },
    { icon: Activity, label: 'Pacotes totais', value: fmtNum(ble.packets), hint: 'validados' },
    { icon: AlertTriangle, label: 'Duplicados / CRC', value: `${ble.duplicates} / ${ble.rejected}`, hint: 'descartados' },
    { icon: Cpu, label: 'Firmware', value: info?.firmware_version || '—', hint: info ? `proto v${info.protocol_version}` : 'sem leitura' },
    { icon: BatteryMedium, label: 'Bateria do tênis', value: telemetry?.battery_pct != null ? `${telemetry.battery_pct}%` : '—', hint: 'pacote atual' },
    { icon: Gauge, label: 'Sinal (RSSI)', value: ble.rssi != null ? `${ble.rssi} dBm` : '—', hint: ble.rssi != null ? 'anúncio BLE' : 'não exposto' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={demo ? 'demo' : TONE[ble.status] || 'idle'} pulse={ble.status === 'connected'}>
          {demo ? 'Demo' : LABEL[ble.status] || ble.status}
        </StatusPill>
        {ble.deviceName && <span className="font-mono text-[10px] text-muted-foreground">{ble.deviceName}</span>}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {ble.lastPacketAt ? fmtAgo(ble.lastPacketAt) : 'nenhum pacote'}
        </span>
      </div>

      {ble.detail && <p className="font-mono text-[10px] text-muted-foreground">{ble.detail}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="sv-panel-tight p-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <r.icon className="h-3 w-3" />
              <span className="hud-label text-[9px]">{r.label}</span>
            </div>
            <p className="num mt-1 text-sm text-foreground">{r.value}</p>
            <p className="font-mono text-[9px] text-muted-foreground">{r.hint}</p>
          </div>
        ))}
      </div>

      <div className="sv-panel-tight p-3">
        <p className="hud-label mb-2 flex items-center gap-1.5">
          <Bluetooth className="h-3 w-3" /> Sensores declarados pelo firmware
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {sensors.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-[11px]">
              <span
                className={
                  s.available === null
                    ? 'h-1.5 w-1.5 rounded-full bg-muted-foreground/40'
                    : s.available
                      ? 'h-1.5 w-1.5 rounded-full bg-success'
                      : 'h-1.5 w-1.5 rounded-full bg-destructive/70'
                }
              />
              <span className={s.available === false ? 'text-muted-foreground' : 'text-foreground/85'}>{s.label}</span>
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                {s.available === null ? 'desconhecido' : s.available ? 'ativo' : 'sem resposta'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}