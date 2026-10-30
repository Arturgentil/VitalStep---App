import React, { useEffect, useMemo, useState } from 'react';
import { Flag, Plus, Target, Trash2, Trophy, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import AchievementGrid from '@/components/goals/AchievementGrid';
import ConsistencyCalendar from '@/components/goals/ConsistencyCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { achievementProgress } from '@/lib/achievements';
import { currentStreak, sum } from '@/lib/metrics';
import { fmtEnergy, fmtInt, isToday } from '@/lib/format';
import { cn } from '@/lib/utils';

const METRIC_LABEL = { steps: 'passos', minutes: 'minutos', energy_mwh: 'mWh', distance_m: 'metros' };
const CHALLENGE_METRICS = ['steps', 'distance_m', 'minutes', 'energy_mwh'];

export default function Goals() {
  const { operatorId, profile, patchProfile, demoMode } = useApp();
  const { activities, energyLogs, loading, demo } = useTelemetryData();
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [draft, setDraft] = useState({ title: '', metric: 'steps', period: 'daily', target: 10000 });
  const [challengeDraft, setChallengeDraft] = useState({ title: '', metric: 'steps', target: 50000, days: 7 });
  const [name, setName] = useState(profile?.display_name || 'Operador');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(
    () => ({
      activities: activities.length,
      distance_m: sum(activities.map((a) => a.distance_m || 0)),
      energy_mwh: sum(activities.map((a) => a.energy_mwh || 0)),
      steps: sum(activities.map((a) => a.steps || 0)),
      streak_days: currentStreak(activities),
    }),
    [activities],
  );

  const progress = useMemo(() => achievementProgress(stats), [stats]);

  const load = async () => {
    if (!operatorId) return;
    const [g, a, c] = await Promise.all([
      base44.entities.Goal.filter({ operator_id: operatorId }, { sort: '-created_date', limit: 30 }),
      base44.entities.Achievement.filter({ operator_id: operatorId }),
      base44.entities.Challenge.filter({}, { sort: '-created_date', limit: 30 }),
    ]);
    setGoals(g.items || []);
    setAchievements(a || []);
    setChallenges((c.items || []).filter((ch) => ch.visibility !== 'private' || ch.operator_id === operatorId));
  };

  useEffect(() => {
    load().catch(() => {});
  }, [operatorId]);

  // Persist newly reached achievements once, and refresh progress of the others.
  useEffect(() => {
    if (!operatorId || loading || demoMode) return;
    const reached = progress.filter((p) => p.progress >= p.threshold);
    const existing = new Map(achievements.map((a) => [a.key, a]));
    const toCreate = reached.filter((p) => !existing.has(p.key));
    const toUpdate = progress.filter((p) => existing.has(p.key) && existing.get(p.key).progress !== p.progress);
    if (toCreate.length) {
      base44.entities.Achievement.bulkCreate(
        toCreate.map((p) => ({
          operator_id: operatorId,
          key: p.key,
          title: p.title,
          description: p.description,
          tier: p.tier,
          metric: p.metric,
          threshold: p.threshold,
          progress: p.progress,
          unlocked_at: new Date().toISOString(),
        })),
      ).then(() => load()).catch(() => {});
    }
    if (toUpdate.length) {
      base44.entities.Achievement.bulkUpdate(
        toUpdate.map((p) => ({ id: existing.get(p.key).id, progress: p.progress })),
      ).catch(() => {});
    }
  }, [progress, achievements, operatorId, loading]);

  const todaySteps = sum(activities.filter((a) => isToday(a.started_at)).map((a) => a.steps || 0));
  const todayEnergy = sum(energyLogs.filter((e) => isToday(e.recorded_at)).map((e) => e.energy_mwh || 0));
  const unlockedByKey = new Map(achievements.map((a) => [a.key, a.unlocked_at]));
  const grid = progress.map((p) => ({ ...p, unlocked_at: unlockedByKey.get(p.key) || null }));
  const unlockedCount = grid.filter((a) => a.unlocked_at).length;

  const addGoal = async () => {
    if (!draft.title.trim() || !operatorId) return;
    setBusy(true);
    try {
      const created = await base44.entities.Goal.create({
        operator_id: operatorId,
        ...draft,
        unit: METRIC_LABEL[draft.metric],
        active: true,
      });
      setGoals((prev) => [created, ...prev]);
      setDraft({ title: '', metric: 'steps', period: 'daily', target: 10000 });
    } finally {
      setBusy(false);
    }
  };

  const createChallenge = async () => {
    if (!challengeDraft.title.trim() || !operatorId) return;
    setBusy(true);
    try {
      const starts = new Date();
      const ends = new Date();
      ends.setDate(ends.getDate() + Number(challengeDraft.days || 7));
      const created = await base44.entities.Challenge.create({
        operator_id: operatorId,
        title: challengeDraft.title.trim(),
        metric: challengeDraft.metric,
        target: Number(challengeDraft.target),
        unit: METRIC_LABEL[challengeDraft.metric],
        starts_on: starts.toISOString().slice(0, 10),
        ends_on: ends.toISOString().slice(0, 10),
        visibility: 'public',
        created_by_name: name || profile?.display_name || 'Operador',
        participants: [operatorId],
      });
      setChallenges((prev) => [created, ...prev]);
      setChallengeDraft({ title: '', metric: 'steps', target: 50000, days: 7 });
    } finally {
      setBusy(false);
    }
  };

  const joinChallenge = async (challenge) => {
    const participants = Array.from(new Set([...(challenge.participants || []), operatorId]));
    await base44.entities.Challenge.update(challenge.id, { participants });
    setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, participants } : c)));
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Progressão"
        title="Metas e conquistas"
        description="Progresso calculado a partir dos registros reais. Metas orientam consistência — não cobram desempenho."
        right={<StatusPill tone="info" dot={false}>{unlockedCount}/{grid.length} conquistas</StatusPill>}
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Metas do perfil" subtitle="editáveis a qualquer momento" className="lg:col-span-1">
          <div className="space-y-3">
            {[
              { key: 'daily_step_goal', label: 'Passos por dia', suffix: 'passos' },
              { key: 'daily_energy_goal_mwh', label: 'Energia por dia', suffix: 'mWh' },
              { key: 'weekly_minutes_goal', label: 'Minutos por semana', suffix: 'min' },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="flex-1 text-[11px] text-muted-foreground">{f.label}</span>
                <Input
                  type="number"
                  defaultValue={profile?.[f.key] ?? 0}
                  onBlur={(e) => patchProfile({ [f.key]: Number(e.target.value) })}
                  className="h-8 w-24 text-right"
                />
                <span className="font-mono text-[9px] text-muted-foreground">{f.suffix}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
            <div className="sv-panel-tight px-2 py-1.5">
              <p className="hud-label text-[8px]">passos hoje</p>
              <p className="num mt-0.5 text-sm text-primary">{fmtInt(todaySteps)}</p>
            </div>
            <div className="sv-panel-tight px-2 py-1.5">
              <p className="hud-label text-[8px]">energia hoje</p>
              <p className="num mt-0.5 text-sm text-energy">{fmtEnergy(todayEnergy).value} {fmtEnergy(todayEnergy).unit}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Conquistas" subtitle="desbloqueadas por dados registrados" className="lg:col-span-2">
          <AchievementGrid items={grid} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Calendário de consistência" subtitle="8 semanas de sessões registradas">
          <ConsistencyCalendar activities={activities} weeks={8} />
          <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            <Flag className="h-3 w-3 text-primary" />
            Sequência atual: <span className="num text-foreground">{stats.streak_days} dias</span>
          </div>
        </Panel>

        <Panel title="Metas personalizadas" subtitle="por período e métrica">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Título da meta" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="col-span-2 h-9" />
            <select value={draft.metric} onChange={(e) => setDraft((d) => ({ ...d, metric: e.target.value }))} className="h-9 rounded-md border border-input bg-transparent px-2 text-[11px]">
              {Object.keys(METRIC_LABEL).map((m) => (
                <option key={m} value={m}>{METRIC_LABEL[m]}</option>
              ))}
            </select>
            <select value={draft.period} onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))} className="h-9 rounded-md border border-input bg-transparent px-2 text-[11px]">
              <option value="daily">diária</option>
              <option value="weekly">semanal</option>
              <option value="monthly">mensal</option>
            </select>
            <Input type="number" value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: Number(e.target.value) }))} className="col-span-2 h-9" />
          </div>
          <Button size="sm" className="mt-2 w-full" onClick={addGoal} disabled={busy || !draft.title.trim()}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Criar meta
          </Button>
          <div className="mt-3 space-y-1.5">
            {goals.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhuma meta personalizada ainda.</p>}
            {goals.map((g) => (
              <div key={g.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
                <Target className="h-3 w-3 text-primary" />
                <span className="flex-1 truncate text-[11px] text-foreground">{g.title}</span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {g.target} {g.unit} · {g.period}
                </span>
                <button type="button" onClick={async () => { await base44.entities.Goal.delete(g.id); setGoals((p) => p.filter((x) => x.id !== g.id)); }} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Desafios" subtitle="individuais ou compartilhados com a comunidade" right={<Users className="h-3.5 w-3.5 text-muted-foreground" />}>
        <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            <Input placeholder="Seu nome público" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            <Input placeholder="Título do desafio" value={challengeDraft.title} onChange={(e) => setChallengeDraft((d) => ({ ...d, title: e.target.value }))} className="h-9" />
            <div className="flex gap-2">
              <select value={challengeDraft.metric} onChange={(e) => setChallengeDraft((d) => ({ ...d, metric: e.target.value }))} className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-[11px]">
                {CHALLENGE_METRICS.map((m) => (
                  <option key={m} value={m}>{METRIC_LABEL[m]}</option>
                ))}
              </select>
              <Input type="number" value={challengeDraft.target} onChange={(e) => setChallengeDraft((d) => ({ ...d, target: Number(e.target.value) }))} className="h-9 w-24" />
              <Input type="number" value={challengeDraft.days} onChange={(e) => setChallengeDraft((d) => ({ ...d, days: Number(e.target.value) }))} className="h-9 w-16" />
            </div>
            <Button size="sm" className="w-full" onClick={createChallenge} disabled={busy || !challengeDraft.title.trim()}>
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Criar desafio
            </Button>
          </div>

          <div className="space-y-1.5">
            {challenges.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum desafio ativo. Crie o primeiro ou aguarde a comunidade.</p>}
            {challenges.map((c) => {
              const joined = (c.participants || []).includes(operatorId);
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-foreground">{c.title}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      {c.target} {c.unit} · {c.starts_on} → {c.ends_on} · {c.created_by_name}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">{(c.participants || []).length} participantes</span>
                  <Button
                    size="sm"
                    variant={joined ? 'secondary' : 'outline'}
                    onClick={() => !joined && joinChallenge(c)}
                    className={cn('h-7 px-2 text-[10px]', joined && 'pointer-events-none')}
                  >
                    {joined ? 'Inscrito' : 'Participar'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </div>
  );
}