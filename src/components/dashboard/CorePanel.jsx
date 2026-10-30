import React from 'react';
import { Bluetooth, Radio, Thermometer } from 'lucide-react';
import StepVoltCore from '@/components/visuals/StepVoltCore';
import DigitalTwin from '@/components/visuals/DigitalTwin';
import StatusPill from '@/components/sv/StatusPill';
import { decodeSensors } from '@/lib/ble/protocol';
import { fmtAgo } from '@/lib/format';

export default function CorePanel({ ble, live, demo }) {
  const connected = ble.status === 'connected';
  const sensors = demo
    ? decodeSensors(0b111111)
    : ble.info
      ? decodeSensors(ble.info.sensor_flags)
      : [];
  const power = live?.energy?.power_mw ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex flex-col items-center">
        <StepVoltCore connected={connected} powerMw={power} bpm={live?.telemetry?.bpm} demo={demo} size={190} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={demo ? 'demo' : connected ? 'connected' : 'idle'} pulse={connected}>
            {demo ? 'simulação' : connected ? 'link ativo' : 'aguardando enlace'}
          </StatusPill>
          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Bluetooth className="h-3 w-3" />
            {ble.deviceName || (demo ? 'StepVolt-DEMO' : 'nenhum tênis')}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <Radio className="h-3 w-3" />
            {ble.lastPacketAt ? fmtAgo(ble.lastPacketAt) : '—'}
          </span>
        </div>

        <DigitalTwin sensors={sensors} active={connected || demo} />

        <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
          <div className="sv-panel-tight px-2 py-1.5">
            <p className="hud-label text-[8px]">firmware</p>
            <p className="truncate text-foreground">{ble.info?.firmware_version || (demo ? '2.4.0' : '—')}</p>
          </div>
          <div className="sv-panel-tight px-2 py-1.5">
            <p className="hud-label text-[8px]">protocolo</p>
            <p className="truncate text-foreground">v{ble.info?.protocol_version ?? '1.0'}</p>
          </div>
          <div className="sv-panel-tight flex items-center gap-1 px-2 py-1.5">
            <Thermometer className="h-3 w-3 text-energy" />
            <div className="min-w-0">
              <p className="hud-label text-[8px]">temp.</p>
              <p className="truncate text-foreground">
                {live?.telemetry?.temp_c != null ? `${live.telemetry.temp_c.toFixed(1)}°C` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}