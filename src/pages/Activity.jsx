import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, CirclePause, CirclePlay, Flag, Footprints, HeartPulse, MapPin, Mountain, Square, Timer, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import useActivitySession from '@/hooks/useActivitySession';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import EmptyState from '@/components/sv/EmptyState';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import RouteTrace from '@/components/activity/RouteTrace';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { fmtDistance, fmtDuration, fmtEnergy, fmtInt, fmtPace, fmtNum, fmtDateTime } from '@/lib/format';

const KINDS = [
  { key: 'walk', label: 'Caminhada', icon: Footprints },
  { key: 'run', label: 'Corrida', icon: Bike },
  { key: 'trail', label: 'Trilha', icon: Mountain },
  { key: 'custom', label: 'Personalizada', icon: Flag },
];

const FILTERS = [{ key: 'all', label: 'Todas' }, ...KINDS.map((k) => ({ key: k.key, label: k.label }))];

export default function ActivityPage() {
  const { operatorId, live, ble, demoMode, profile } = useApp();
  const { activities, loading, demo } = useTelemetryData();
  const navigate = useNavigate();
  const { state, start, pause, resume, finish, toggleGps } = useActivitySession();
  const [kind, setKind] = useState('walk');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const running = state.status === 'running';
  const active = state.status !== 'idle';
  const hasTelemetry = Boolean(live?.telemetry || live?.energy);

  const filtered = useMemo(
    () => (filter === 'all' ? activities : activities.filter((a) => a.kind === filter)),
    [activities, filter],
  );

  const stop = async () => {
    const summary = finish();
    if (!summary || !operatorId) return;
    if (summary.duration_s < 5) {
      setError('Sessão curta demais para ser registrada (mínimo 5 s).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await base44.entities.Activity.create({ operator_id: operatorId, ...summary });
      navigate(`/atividade/${created.id}`);
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a sessão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Performance Engine"
        title="Atividade"
        description="Sessão ao vivo com cronômetro, passos, distância, ritmo, BPM e energia registrada. Cada número vem do enlace BLE em tempo real."
        right={
          <StatusPill tone={running ? 'live' : 'idle'} pulse={running}>
            {running ? 'sessão ativa' : state.status === 'paused' ? 'pausada' : 'pronta'}
          </StatusPill>
        }
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Sessão ao vivo" subtitle="contadores do dispositivo" className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                disabled={active}
                onClick={() => setKind(k.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors',
                  kind === k.key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                  active && 'opacity-50',
                )}
              >
                <k.icon className="h-3.5 w-3.5" />
                {k.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="hud-label">tempo decorrido</p>
              <p className="num text-4xl font-semibold leading-none text-foreground sm:text-5xl">{fmtDuration(state.elapsed)}</p>
            </div>
            <div className="flex items-center gap-2">
              {!active && (
                <Button onClick={() => start(kind)} disabled={!hasTelemetry && !demoMode}>
                  <CirclePlay className="mr-2 h-4 w-4" /> Iniciar
                </Button>
              )}
              {running && (
                <Button variant="outline" onClick={pause}>
                  <CirclePause className="mr-2 h-4 w-4" /> Pausar
                </Button>
              )}
              {state.status === 'paused' && (
                <Button onClick={resume}>
                  <CirclePlay className="mr-2 h-4 w-4" /> Retomar
                </Button>
              )}
              {active && (
                <Button variant="destructive" onClick={stop} disabled={saving}>
                  <Square className="mr-2 h-4 w-4" /> {saving ? 'Salvando…' : 'Encerrar'}
                </Button>
              )}
            </div>
          </div>

          {!hasTelemetry && !active && (
            <p className="mt-2 font-mono text-[9.5px] text-energy">
              Sem telemetria agora: {ble.status === 'connected' ? 'aguardando pacotes do tênis' : 'conecte o tênis ou ative a demonstração'} — os contadores permanecerão em zero.
            </p>
          )}
          {error && <p className="mt-2 font-mono text-[9.5px] text-destructive">{error}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[
              { icon: Footprints, label: 'Passos', value: fmtInt(state.steps), unit: 'passos' },
              { icon: MapPin, label: 'Distância', value: fmtDistance(state.distance), unit: state.geo ? 'GPS' : 'estimada por passos' },
              { icon: Timer, label: 'Ritmo', value: state.distance > 5 ? fmtPace(state.elapsed / (state.distance / 1000)) : '—', unit: 'min/km' },
              { icon: HeartPulse, label: 'BPM', value: state.bpm ? Math.round(state.bpm) : '—', unit: 'instantâneo' },
              { icon: Zap, label: 'Energia', value: fmtEnergy(state.energy).value, unit: fmtEnergy(state.energy).unit },
              { icon: Zap, label: 'Potência', value: fmtNum(state.power, 1), unit: 'mW' },
            ].map((m) => (
              <div key={m.label} className="sv-panel-tight p-2.5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <m.icon className="h-3 w-3" />
                  <span className="hud-label text-[9px]">{m.label}</span>
                </div>
                <p className="num mt-1 text-lg text-foreground">{m.value}</p>
                <p className="font-mono text-[8.5px] text-muted-foreground">{m.unit}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Switch checked={state.geo} onCheckedChange={toggleGps} /> Rota por GPS
            </label>
            <span className="font-mono text-[9px] text-muted-foreground">
              a permissão é pedida só ao ativar; {state.route.length} pontos
            </span>
            {state.gpsError && <span className="font-mono text-[9px] text-destructive">{state.gpsError}</span>}
          </div>

          <div className="mt-3">
            <RouteTrace route={state.route} height={140} />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Estado do enlace" subtitle="fonte dos contadores">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transporte</span>
                <StatusPill tone={ble.status === 'connected' ? 'connected' : demoMode ? 'demo' : 'idle'}>
                  {ble.status === 'connected' ? 'BLE' : demoMode ? 'demo' : 'inativo'}
                </StatusPill>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Passos do tênis</span>
                <span className="num text-foreground">{live?.telemetry?.steps != null ? fmtInt(live.telemetry.steps) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pressão plantar</span>
                <span className="num text-foreground">{state.zones ? 'recebida' : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Passada (estimada)</span>
                <span className="num text-foreground">{fmtNum(((profile?.height_cm || 172) * 0.415) / 100, 2)} m</span>
              </div>
            </div>
            <p className="mt-2 font-mono text-[9px] leading-relaxed text-muted-foreground">
              Sem GPS, a distância é calculada por passos × comprimento de passada e aparece como estimativa.
            </p>
          </Panel>

          <Panel title="Última sessão" subtitle="referência para comparação">
            {activities[0] ? (
              <Link to={`/atividade/${activities[0].id}`} className="block">
                <p className="text-[12px] font-medium text-foreground">{activities[0].title || activities[0].kind}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{fmtDateTime(activities[0].started_at)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <span className="text-foreground">{fmtDistance(activities[0].distance_m)}</span>
                  <span className="text-foreground">{fmtDuration(activities[0].duration_s)}</span>
                  <span className="text-foreground">{fmtEnergy(activities[0].energy_mwh).value} {fmtEnergy(activities[0].energy_mwh).unit}</span>
                </div>
              </Link>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhuma sessão registrada.</p>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Histórico"
        subtitle={`${filtered.length} sessões`}
        right={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em]',
                  filter === f.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/50" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 30).map((a) => {
              const Icon = KINDS.find((k) => k.key === a.kind)?.icon || Footprints;
              return (
                <Link key={a.id} to={`/atividade/${a.id}`} className="sv-panel-tight flex items-center gap-3 p-3 transition-colors hover:border-primary/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">{a.title || a.kind}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">{fmtDateTime(a.started_at)}</p>
                    <p className="mt-1 flex gap-2 font-mono text-[9.5px] text-foreground/80">
                      <span>{fmtDistance(a.distance_m)}</span>
                      <span>{fmtDuration(a.duration_s)}</span>
                      {a.avg_bpm ? <span>{Math.round(a.avg_bpm)} bpm</span> : null}
                    </p>
                  </div>
                  {a.source === 'demo' && <span className="font-mono text-[8px] uppercase text-energy">demo</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Footprints}
            title="Nenhuma sessão neste filtro"
            description="Inicie uma sessão ao vivo ou conecte o tênis para registrar a primeira caminhada."
          />
        )}
      </Panel>
    </div>
  );
}