import React, { useEffect, useState } from 'react';
import { Activity, Bluetooth, Cpu, Plug, PlugZap, RotateCcw, ShieldAlert, Trash2, Wifi } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import LiveTelemetry from '@/components/visuals/LiveTelemetry';
import DigitalTwin from '@/components/visuals/DigitalTwin';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import EmptyState from '@/components/sv/EmptyState';
import { Button } from '@/components/ui/button';
import { MESSAGE, decodeSensors } from '@/lib/ble/protocol';
import { fmtAgo, fmtDateTime, fmtInt } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Device() {
  const { operatorId, ble, live, demoMode, connect, disconnect, sendCommand } = useApp();
  const [devices, setDevices] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [rate, setRate] = useState(1);
  const [feedback, setFeedback] = useState(null);

  const load = async (isAlive = () => true) => {
    if (!operatorId || !supabase || demoMode) {
      if (isAlive()) {
        setDevices([]);
        setEvents([]);
      }
      return;
    }

    const [devResult, eventResult] = await Promise.all([
      supabase
        .from('shoe_devices')
        .select('*')
        .eq('operator_id', operatorId)
        .order('last_seen', { ascending: false })
        .limit(10),
      supabase
        .from('device_events')
        .select('*')
        .eq('operator_id', operatorId)
        .order('at', { ascending: false })
        .limit(25),
    ]);

    if (devResult.error) throw devResult.error;
    if (eventResult.error) throw eventResult.error;

    if (isAlive()) {
      setDevices(devResult.data || []);
      setEvents(eventResult.data || []);
    }
  };

  useEffect(() => {
    let alive = true;

    load(() => alive).catch((err) => {
      console.error('Erro ao carregar dispositivos:', err);
      if (alive) setError('Não foi possível carregar o histórico do dispositivo.');
    });

    return () => {
      alive = false;
    };
  }, [operatorId, demoMode]);

  useEffect(() => {
    if (!operatorId || !supabase || demoMode || ble.status !== 'connected') return;

    if (!ble.deviceId) {
      setError('O dispositivo não forneceu um identificador Bluetooth válido.');
      return;
    }

    let alive = true;

    const sensors = ble.info
      ? decodeSensors(ble.info.sensor_flags).map((s) => ({
          key: s.key,
          label: s.label,
          available: s.available,
        }))
      : [];

    const payload = {
      operator_id: operatorId,
      name: ble.deviceName || 'VitalStep',
      bluetooth_id: ble.deviceId,
      firmware_version: ble.info?.firmware_version || '',
      protocol_version: String(ble.info?.protocol_version ?? 1),
      battery_pct: live?.telemetry?.battery_pct ?? null,
      rssi: ble.rssi ?? null,
      connected: true,
      last_seen: new Date().toISOString(),
      sensors,
    };

    const saveDevice = async () => {
      const { error: saveError } = await supabase
        .from('shoe_devices')
        .upsert(payload, { onConflict: 'operator_id,bluetooth_id' });

      if (saveError) throw saveError;
      if (alive) await load(() => alive);
    };

    saveDevice().catch((err) => {
      console.error('Erro ao salvar dispositivo:', err);
      if (alive) setError('Não foi possível registrar o dispositivo conectado.');
    });

    return () => {
      alive = false;
    };
  }, [ble.status, operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (label, fn) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err?.message || 'Falha ao executar a ação.');
    } finally {
      setBusy(null);
    }
  };

  const command = (type, extra, label) =>
    run(label, async () => {
      await sendCommand(type, extra);
      setFeedback(`${label} enviado ao firmware.`);
      setTimeout(() => setFeedback(null), 2600);
    });

  const removeDevice = async (id) => {
    if (!operatorId || !supabase) return;

    const { error: deleteError } = await supabase
      .from('shoe_devices')
      .delete()
      .eq('id', id)
      .eq('operator_id', operatorId);

    if (deleteError) throw deleteError;

    setDevices((current) => current.filter((device) => device.id !== id));
  };

  const sensors = ble.info ? decodeSensors(ble.info.sensor_flags) : [];
  const missing = sensors.filter((s) => !s.available);
  const diagnostics = [
    { label: 'Web Bluetooth disponível', ok: ble.supported, detail: ble.supported ? 'navegador compatível' : 'use Chrome/Edge em HTTPS' },
    { label: 'Enlace BLE estabelecido', ok: ble.status === 'connected', detail: ble.status },
    { label: 'DEVICE_INFO recebido', ok: Boolean(ble.info), detail: ble.info ? `firmware ${ble.info.firmware_version}` : 'aguardando pacote 0x04' },
    { label: 'Integridade dos pacotes', ok: ble.rejected === 0, detail: `${ble.rejected} rejeitados · ${ble.duplicates} duplicados` },
    { label: 'Sensores sem resposta', ok: sensors.length > 0 && missing.length === 0, detail: sensors.length ? `${missing.length} de ${sensors.length}` : 'desconhecido' },
    { label: 'Pacotes recebidos', ok: ble.packets > 0, detail: fmtInt(ble.packets) },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Smart Shoe"
        title="Dispositivo"
        description="Descoberta, conexão e diagnóstico do tênis ESP32. A camada de transporte valida CRC, descarta duplicados e reconecta com espera progressiva."
        right={
          <StatusPill tone={ble.status === 'connected' ? 'connected' : 'idle'} pulse={ble.status === 'connected'}>
            {ble.status === 'connected' ? 'enlace ativo' : ble.status}
          </StatusPill>
        }
      />

      {demoMode && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Pareamento" subtitle="Web Bluetooth · protocolo v1" className="lg:col-span-1">
          <div className="space-y-2.5">
            <Button className="w-full" onClick={() => run('connect', connect)} disabled={busy === 'connect' || !ble.supported}>
              <Bluetooth className="mr-2 h-4 w-4" />
              {busy === 'connect' ? 'Procurando…' : ble.status === 'connected' ? 'Trocar dispositivo' : 'Procurar tênis'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => run('disconnect', disconnect)} disabled={ble.status !== 'connected'}>
              <Plug className="mr-2 h-4 w-4" /> Desconectar
            </Button>
            {!ble.supported && (
              <p className="rounded-md border border-destructive/30 bg-destructive/[0.06] px-2.5 py-2 font-mono text-[9.5px] leading-relaxed text-muted-foreground">
                Este navegador não expõe Web Bluetooth. Use Chrome ou Edge em HTTPS para parear hardware real.
              </p>
            )}
            {ble.detail && <p className="font-mono text-[9.5px] text-muted-foreground">{ble.detail}</p>}
            {error && <p className="font-mono text-[9.5px] text-destructive">{error}</p>}
            {feedback && <p className="font-mono text-[9.5px] text-success">{feedback}</p>}
          </div>

          <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
            <p className="hud-label">Comandos</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => command(MESSAGE.CMD_CALIBRATE, {}, 'Calibração')} disabled={ble.status !== 'connected'}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Calibrar
              </Button>
              <Button size="sm" variant="outline" onClick={() => command(MESSAGE.CMD_SOS_TEST, {}, 'Teste SOS')} disabled={ble.status !== 'connected'}>
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Teste SOS
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="hud-label">Taxa</span>
              <select
                value={rate}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setRate(value);
                  command(MESSAGE.CMD_SET_RATE, { rateHz: value }, `Taxa ${value} Hz`);
                }}
                disabled={ble.status !== 'connected'}
                className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-[11px]"
              >
                {[1, 2, 5, 10].map((hz) => (
                  <option key={hz} value={hz}>{hz} Hz</option>
                ))}
              </select>
            </div>
            <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
              Os comandos são escritos na característica 0x0004. Se o firmware não responder, nada é exibido como concluído.
            </p>
          </div>
        </Panel>

        <Panel title="Telemetria ao vivo" subtitle="pacotes, integridade e sensores" className="lg:col-span-2">
          <LiveTelemetry ble={ble} live={live} demo={demoMode} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Diagnóstico" subtitle="checklist derivado do enlace real" className="lg:col-span-1">
          <ul className="space-y-1.5">
            {diagnostics.map((d) => (
              <li key={d.label} className="flex items-start gap-2 rounded-md border border-border/60 px-2.5 py-1.5">
                <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', d.ok ? 'bg-success' : 'bg-energy')} />
                <div className="min-w-0">
                  <p className="text-[11px] text-foreground/90">{d.label}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">{d.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => load().catch((err) => setError(err?.message || "Falha ao atualizar histórico."))}>
            <Activity className="mr-1.5 h-3.5 w-3.5" /> Atualizar histórico
          </Button>
        </Panel>

        <Panel title="Digital Twin" subtitle="mapa de sensores declarados" className="lg:col-span-1">
          <DigitalTwin sensors={demoMode ? decodeSensors(0b111111) : sensors} active={ble.status === 'connected' || demoMode} demo={demoMode} />
        </Panel>

        <Panel title="Eventos do enlace" subtitle="registro persistido" className="lg:col-span-1">
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {events.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum evento registrado ainda.</p>}
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-2 rounded-md border border-border/60 px-2 py-1.5">
                <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', e.kind === 'error' ? 'bg-destructive' : e.kind === 'connect' ? 'bg-success' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-foreground/90">{e.detail}</p>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {e.kind} · {fmtDateTime(e.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Dispositivos conhecidos" subtitle="histórico de pareamentos deste operador">
        {devices.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="Nenhum tênis pareado"
            description="Ao conectar um VitalStep, o firmware e os sensores ficam registrados aqui para reconexão e diagnóstico."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((d) => (
              <div key={d.id} className="sv-panel-tight p-3">
                <div className="flex items-center justify-between">
                  <p className="truncate text-[12px] font-medium">{d.name}</p>
                  <button type="button" onClick={() => run("remove", () => removeDevice(d.id))} className="text-muted-foreground hover:text-destructive" aria-label="Remover dispositivo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  {d.firmware_version || 'fw —'} · proto v{d.protocol_version || '1'} · {d.side || 'pair'}
                </p>
                <div className="mt-2 flex items-center gap-3 font-mono text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3" />{d.rssi ?? '—'}</span>
                  <span className="flex items-center gap-1"><PlugZap className="h-3 w-3" />{d.battery_pct ?? '—'}%</span>
                  <span className="ml-auto">{fmtAgo(d.last_seen)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
