import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BioPulse from '@/components/visuals/BioPulse';
import { BatteryMedium, Droplets, Footprints, HeartPulse, Maximize2, Thermometer, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import { MetricGridSkeleton, PanelSkeleton } from '@/components/sv/LoadingSkeleton';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import MetricGrid from '@/components/dashboard/MetricGrid';
import CorePanel from '@/components/dashboard/CorePanel';
import GoalsStrip from '@/components/dashboard/GoalsStrip';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import QuickAccess from '@/components/dashboard/QuickAccess';
import SeriesChart from '@/components/sv/SeriesChart';
import PerformanceTimeline from '@/components/visuals/PerformanceTimeline';
import StatusPill from '@/components/sv/StatusPill';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { currentStreak, dailySeries, sum } from '@/lib/metrics';
import { fmtAgo, fmtDistance, fmtEnergy, fmtInt, isToday } from '@/lib/format';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { profile, live, ble, demoMode, operatorId } = useApp();
  const navigate = useNavigate();
  const { loading, activities, measurements, energyLogs, demo } = useTelemetryData();
  const [achievements, setAchievements] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let alive = true;

    if (!operatorId || demoMode || !supabase) {
      setAchievements([]);
      return () => {
        alive = false;
      };
    }

    const loadAchievements = async () => {
      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('*')
          .eq('operator_id', operatorId);

        if (error) throw error;
        if (alive) setAchievements(data || []);
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
        if (alive) setAchievements([]);
      }
    };

    loadAchievements();

    return () => {
      alive = false;
    };
  }, [operatorId, demoMode]);

  const todayActivities = activities.filter((a) => isToday(a.started_at));
  const latest = (metric) => measurements.find((m) => m.metric === metric);

  const stepsToday = live?.telemetry?.steps ?? sum(todayActivities.map((a) => a.steps || 0));
  const energyToday = sum(energyLogs.filter((e) => isToday(e.recorded_at)).map((e) => e.energy_mwh || 0));
  const minutesWeek = Math.round(sum(activities.filter((a) => Date.now() - new Date(a.started_at) < 7 * 864e5).map((a) => (a.duration_s || 0) / 60)));
  const distanceToday = sum(todayActivities.map((a) => a.distance_m || 0));
  const streak = currentStreak(activities);
  const unlocked = achievements.filter((a) => a.unlocked_at).length;

  const bpm = live?.telemetry?.bpm ?? latest('bpm')?.value ?? null;
  const spo2 = live?.telemetry?.spo2 ?? latest('spo2')?.value ?? null;
  const temp = live?.telemetry?.temp_c ?? latest('temp_c')?.value ?? null;
  const battery = live?.telemetry?.battery_pct ?? null;
  const quality = live?.telemetry?.quality ?? latest('bpm')?.quality ?? null;
  const updatedAt = live?.at ?? latest('bpm')?.measured_at ?? null;
  const stale = updatedAt ? Date.now() - new Date(updatedAt).getTime() > 90000 : true;

  const stepsSeries = useMemo(
    () => dailySeries(activities.map((a) => ({ at: a.started_at, value: a.steps || 0 })), 7),
    [activities],
  );
  const energySeries = useMemo(
    () => dailySeries(energyLogs.map((e) => ({ at: e.recorded_at, value: e.energy_mwh || 0 })), 7),
    [energyLogs],
  );
  const bpmSamples = measurements
    .filter((m) => m.metric === 'bpm')
    .slice(0, 24)
    .reverse()
    .map((m) => ({ bpm: m.value }));

  const alerts = useMemo(() => {
    const list = [];
    if (!ble.status || ble.status === 'idle' || ble.status === 'disconnected') {
      if (!demoMode) {
        list.push({
          tone: 'info',
          title: 'Nenhum tênis conectado',
          detail: 'Pareie o dispositivo para receber telemetria real.',
          to: '/dispositivo',
        });
      }
    }
    if (bpm && profile && bpm > (profile.bpm_alert_max || 165)) {
      list.push({ tone: 'alert', title: `BPM acima do limite: ${Math.round(bpm)}`, detail: `Limite configurado em ${profile.bpm_alert_max} bpm. Avalie a intensidade.` });
    }
    if (spo2 && profile && spo2 < (profile.spo2_alert_min || 92)) {
      list.push({ tone: 'alert', title: `SpO₂ abaixo do limite: ${Math.round(spo2)}%`, detail: 'Leitura óptica pode sofrer interferência de movimento. Não é diagnóstico.' });
    }
    if (battery !== null && battery < 20) {
      list.push({ tone: 'warn', title: `Bateria do tênis em ${battery}%`, detail: 'Carregue o dispositivo antes da próxima sessão.', to: '/energia' });
    }
    if (stale && (ble.status === 'connected' || demoMode)) {
      list.push({ tone: 'warn', title: 'Dados desatualizados', detail: 'Nenhum pacote novo nos últimos 90 segundos.', to: '/dispositivo' });
    }
    if (list.length === 0) {
      list.push({ tone: 'ok', title: 'Sistemas nominais', detail: 'Telemetria recebida dentro dos limites configurados.' });
    }
    return list.slice(0, 4);
  }, [ble.status, bpm, spo2, battery, stale, profile, demoMode]);

  const cards = [
    { key: 'steps', label: 'Passos hoje', value: fmtInt(stepsToday), unit: 'passos', icon: Footprints, accent: 'cyan', hint: live?.telemetry?.steps ? 'contador do tênis' : 'soma das sessões', updatedAt },
    { key: 'bpm', label: 'Frequência cardíaca', value: bpm ? Math.round(bpm) : null, unit: 'bpm', icon: HeartPulse, accent: 'alert', quality, updatedAt, state: bpm ? (stale ? 'stale' : 'live') : 'unavailable' },
    { key: 'spo2', label: 'Saturação O₂', value: spo2 ? Math.round(spo2) : null, unit: '%', icon: Droplets, accent: 'cyan', quality, updatedAt, state: spo2 ? (stale ? 'stale' : 'live') : 'unavailable' },
    { key: 'temp', label: 'Temperatura', value: temp != null ? temp.toFixed(1) : null, unit: '°C', icon: Thermometer, accent: 'energy', quality, updatedAt, state: temp != null ? (stale ? 'stale' : 'live') : 'unavailable', hint: temp != null ? 'contato' : 'sensor ausente' },
    { key: 'energy', label: 'Energia gerada', value: fmtEnergy(energyToday).value, unit: fmtEnergy(energyToday).unit, icon: Zap, accent: 'energy', hint: 'acumulado do dia', updatedAt },
    { key: 'battery', label: 'Bateria do tênis', value: battery != null ? battery : null, unit: '%', icon: BatteryMedium, accent: 'neutral', updatedAt, state: battery != null ? 'live' : 'unavailable' },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="StepVolt Command Center"
        title={`${greeting()}, ${profile?.display_name?.split(' ')[0] || 'operador'}`}
        description={`${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · ${distanceToday > 0 ? `${fmtDistance(distanceToday)} hoje` : 'nenhuma atividade registrada hoje'}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={demo ? 'demo' : ble.status === 'connected' ? 'connected' : 'idle'}>
              {demo ? 'dados de demo' : ble.status === 'connected' ? 'tempo real' : 'sem telemetria'}
            </StatusPill>
            {profile?.public_profile ? (
              <StatusPill tone="info" dot={false}>perfil público</StatusPill>
            ) : (
              <StatusPill tone="idle" dot={false}>perfil privado</StatusPill>
            )}
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Núcleo StepVolt" subtitle="corpo ↔ tênis ↔ energia ↔ aplicativo">
            <CorePanel ble={ble} live={live} demo={demo} />
          </Panel>

          {loading ? <MetricGridSkeleton count={6} /> : <MetricGrid cards={cards} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel
              title="Passos · 7 dias"
              subtitle="soma diária das sessões registradas"
              right={
                <button type="button" onClick={() => setExpanded('steps')} className="rounded-md p-1 text-muted-foreground hover:text-primary" aria-label="Expandir gráfico">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              }
            >
              {loading ? <PanelSkeleton rows={4} /> : <SeriesChart data={stepsSeries} color="primary" unit="passos" />}
            </Panel>
            <Panel
              title="Energia · 7 dias"
              subtitle="energia captada pelo piezoelétrico"
              right={
                <button type="button" onClick={() => setExpanded('energy')} className="rounded-md p-1 text-muted-foreground hover:text-primary" aria-label="Expandir gráfico">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              }
            >
              {loading ? <PanelSkeleton rows={4} /> : <SeriesChart data={energySeries} color="energy" unit="mWh" decimals={1} />}
            </Panel>
          </div>

          <Panel title="Performance Timeline" subtitle="toque em uma barra para abrir a sessão" right={<Link to="/atividade" className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">histórico</Link>}>
            {loading ? <PanelSkeleton rows={4} /> : activities.length ? (
              <PerformanceTimeline activities={activities} days={14} onSelect={(a) => a.id && navigate(`/atividade/${a.id}`)} />
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma sessão registrada ainda.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Alertas" subtitle="derivados dos limites do seu perfil">
            <AlertsPanel alerts={alerts} />
          </Panel>

          <Panel title="Metas e conquistas" subtitle="progresso calculado dos registros">
            <GoalsStrip
              profile={profile}
              stepsToday={stepsToday}
              energyToday={energyToday}
              minutesWeek={minutesWeek}
              streak={streak}
              unlocked={unlocked}
              total={achievements.length || 6}
            />
          </Panel>

          <Panel title="BioPulse" subtitle="últimas amostras de frequência cardíaca">
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl text-foreground">{bpm ? Math.round(bpm) : '—'}</span>
              <span className="font-mono text-[10px] text-muted-foreground">bpm · {updatedAt ? fmtAgo(updatedAt) : 'sem dados'}</span>
            </div>
            <div className="mt-1">
              <BioPulseInline samples={bpmSamples} bpm={bpm} />
            </div>
          </Panel>

          <Panel title="Acesso rápido" subtitle="módulos do sistema">
            <QuickAccess />
          </Panel>
        </div>
      </div>

      <Dialog open={Boolean(expanded)} onOpenChange={(o) => !o && setExpanded(null)}>
        <DialogContent className="max-w-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm uppercase tracking-[0.14em]">
              {expanded === 'steps' ? 'Passos · 7 dias' : 'Energia · 7 dias'}
            </DialogTitle>
          </DialogHeader>
          {expanded === 'steps' ? (
            <SeriesChart data={stepsSeries} color="primary" unit="passos" height={320} />
          ) : (
            <SeriesChart data={energySeries} color="energy" unit="mWh" height={320} decimals={1} />
          )}
          <p className="font-mono text-[9px] text-muted-foreground">
            {demo ? 'Série simulada de demonstração.' : 'Série calculada a partir das sessões e registros energéticos salvos.'}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BioPulseInline({ samples, bpm }) {
  return (
    <div className="h-16">
      <BioPulse samples={samples} bpm={bpm} height={64} />
    </div>
  );
}