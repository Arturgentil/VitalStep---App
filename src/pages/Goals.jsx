import React, { useEffect, useMemo, useState } from 'react';
import { Flag, Plus, Target, Trash2, Trophy, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Goals() {
  const { operatorId, profile, patchProfile, demoMode } = useApp();
  const { activities, energyLogs, loading, demo } = useTelemetryData();
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [memberships, setMemberships] = useState([]);
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

  const load = async (isAlive = () => true) => {
    if (!operatorId || demoMode || !supabase) {
      setGoals([]);
      setAchievements([]);
      setChallenges([]);
      setMemberships([]);
      return;
    }

    const [goalsResult, achievementsResult, challengesResult, membershipsResult] =
      await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('operator_id', operatorId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('achievements')
          .select('*')
          .eq('operator_id', operatorId),
        supabase
          .from('challenges')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('challenge_participants')
          .select('challenge_id, operator_id')
          .eq('operator_id', operatorId),
      ]);

    for (const result of [
      goalsResult,
      achievementsResult,
      challengesResult,
      membershipsResult,
    ]) {
      if (result.error) throw result.error;
    }

    if (!isAlive()) return;

    setGoals(goalsResult.data || []);
    setAchievements(achievementsResult.data || []);
    setChallenges(challengesResult.data || []);
    setMemberships(membershipsResult.data || []);
  };

  useEffect(() => {
    let alive = true;

    load(() => alive).catch((error) => {
      console.error('Erro ao carregar metas e desafios:', error);
    });

    return () => {
      alive = false;
    };
  }, [operatorId, demoMode]);

  // Persist newly reached achievements once, and refresh progress of the others.
  useEffect(() => {
    if (!operatorId || loading || demoMode || !supabase) return;

    const existing = new Map(achievements.map((a) => [a.key, a]));
    const now = new Date().toISOString();

    const changed = progress.filter((item) => {
      const previous = existing.get(item.key);
      const reached = item.progress >= item.threshold;

      return (
        (!previous && reached) ||
        (previous && Number(previous.progress) !== Number(item.progress)) ||
        (previous && reached && !previous.unlocked_at)
      );
    });

    if (!changed.length) return;

    let alive = true;

    const persistAchievements = async () => {
      try {
        const rows = changed.map((item) => {
          const previous = existing.get(item.key);

          return {
            operator_id: operatorId,
            key: item.key,
            title: item.title,
            description: item.description,
            tier: item.tier,
            metric: item.metric,
            threshold: item.threshold,
            progress: item.progress,
            unlocked_at:
              previous?.unlocked_at ||
              (item.progress >= item.threshold ? now : null),
          };
        });

        const { data, error } = await supabase
          .from('achievements')
          .upsert(rows, { onConflict: 'operator_id,key' })
          .select('*');

        if (error) throw error;
        if (alive && data) {
          setAchievements((previous) => {
            const merged = new Map(previous.map((item) => [item.key, item]));
            data.forEach((item) => merged.set(item.key, item));
            return Array.from(merged.values());
          });
        }
      } catch (error) {
        console.error('Erro ao salvar conquistas:', error);
      }
    };

    persistAchievements();

    return () => {
      alive = false;
    };
  }, [progress, achievements, operatorId, loading, demoMode]);

  const todaySteps = sum(activities.filter((a) => isToday(a.started_at)).map((a) => a.steps || 0));
  const todayEnergy = sum(energyLogs.filter((e) => isToday(e.recorded_at)).map((e) => e.energy_mwh || 0));
  const unlockedByKey = new Map(achievements.map((a) => [a.key, a.unlocked_at]));
  const grid = progress.map((p) => ({ ...p, unlocked_at: unlockedByKey.get(p.key) || null }));
  const unlockedCount = grid.filter((a) => a.unlocked_at).length;

  const addGoal = async () => {
    if (!draft.title.trim() || !operatorId || demoMode || !supabase) return;

    setBusy(true);
    try {
      const { data: created, error } = await supabase
        .from('goals')
        .insert({
          operator_id: operatorId,
          title: draft.title.trim(),
          metric: draft.metric,
          period: draft.period,
          target: Number(draft.target),
          unit: METRIC_LABEL[draft.metric],
          active: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      setGoals((previous) => [created, ...previous]);
      setDraft({ title: '', metric: 'steps', period: 'daily', target: 10000 });
    } catch (error) {
      console.error('Erro ao criar meta:', error);
    } finally {
      setBusy(false);
    }
  };

  const createChallenge = async () => {
    if (
      !challengeDraft.title.trim() ||
      !operatorId ||
      demoMode ||
      !supabase ||
      Number(challengeDraft.target) <= 0 ||
      Number(challengeDraft.days) <= 0
    ) return;

    setBusy(true);
    try {
      const starts = new Date();
      const ends = new Date();
      ends.setDate(ends.getDate() + Number(challengeDraft.days));

      const { data: created, error } = await supabase
        .from('challenges')
        .insert({
          operator_id: operatorId,
          title: challengeDraft.title.trim(),
          metric: challengeDraft.metric,
          target: Number(challengeDraft.target),
          unit: METRIC_LABEL[challengeDraft.metric],
          starts_on: localDateString(starts),
          ends_on: localDateString(ends),
          visibility: 'public',
          created_by_name: name || profile?.display_name || 'Operador',
        })
        .select('*')
        .single();

      if (error) throw error;

      setChallenges((previous) => [created, ...previous]);

      const { error: membershipError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: created.id,
          operator_id: operatorId,
        });

      if (membershipError) {
        console.error('Desafio criado, mas não foi possível registrar a inscrição:', membershipError);
      } else {
        setMemberships((previous) => [
          ...previous,
          { challenge_id: created.id, operator_id: operatorId },
        ]);
      }

      setChallengeDraft({ title: '', metric: 'steps', target: 50000, days: 7 });
    } catch (error) {
      console.error('Erro ao criar desafio:', error);
    } finally {
      setBusy(false);
    }
  };

  const joinChallenge = async (challenge) => {
    if (!operatorId || demoMode || !supabase) return;

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challenge.id,
          operator_id: operatorId,
        });

      if (error && error.code !== '23505') throw error;

      setMemberships((previous) => {
        if (previous.some((item) => item.challenge_id === challenge.id)) {
          return previous;
        }

        return [
          ...previous,
          { challenge_id: challenge.id, operator_id: operatorId },
        ];
      });
    } catch (error) {
      console.error('Erro ao participar do desafio:', error);
    }
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
                <button
                  type="button"
                  onClick={async () => {
                    if (!supabase || demoMode) return;
                    try {
                      const { error } = await supabase
                        .from('goals')
                        .delete()
                        .eq('id', g.id)
                        .eq('operator_id', operatorId);

                      if (error) throw error;
                      setGoals((previous) => previous.filter((item) => item.id !== g.id));
                    } catch (error) {
                      console.error('Erro ao excluir meta:', error);
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
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
              const joined = memberships.some(
                (membership) => membership.challenge_id === c.id,
              );
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-foreground">{c.title}</p>
                    <p className="font-mono text-[9px] text-muted-foreground">
                      {c.target} {c.unit} · {c.starts_on} → {c.ends_on} · {c.created_by_name}
                    </p>
                  </div>
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