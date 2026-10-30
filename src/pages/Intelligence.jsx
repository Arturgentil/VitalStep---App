import React, { useMemo, useState } from 'react';
import { AlertTriangle, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { currentStreak, dailySeries, sum } from '@/lib/metrics';
import { fmtDate, isToday } from '@/lib/format';

const DAILY_LIMIT = 20;
const SUGGESTIONS = [
  'Explique minha frequência cardíaca média dos últimos 7 dias.',
  'Compare a energia gerada hoje com a semana passada.',
  'Minha distância está evoluindo? Cite os números.',
  'O que pode explicar uma queda de sinal dos sensores?',
];

function usageKey() {
  return `stepvolt.ai.${new Date().toISOString().slice(0, 10)}`;
}

export default function Intelligence() {
  const { profile, patchProfile, live, ble, demoMode, operatorId } = useApp();
  const { activities, measurements, energyLogs, demo } = useTelemetryData();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [used, setUsed] = useState(() => Number(localStorage.getItem(usageKey()) || 0));

  const context = useMemo(() => {
    const days = dailySeries(activities.map((a) => ({ at: a.started_at, value: a.steps || 0 })), 7);
    const energyDays = dailySeries(energyLogs.map((e) => ({ at: e.recorded_at, value: e.energy_mwh || 0 })), 7);
    return {
      profile: {
        daily_step_goal: profile?.daily_step_goal ?? null,
        daily_energy_goal_mwh: profile?.daily_energy_goal_mwh ?? null,
        weekly_minutes_goal: profile?.weekly_minutes_goal ?? null,
        bpm_alert_max: profile?.bpm_alert_max ?? null,
        spo2_alert_min: profile?.spo2_alert_min ?? null,
      },
      summary: {
        stepsToday: live?.telemetry?.steps ?? sum(activities.filter((a) => isToday(a.started_at)).map((a) => a.steps || 0)),
        energyToday: sum(energyLogs.filter((e) => isToday(e.recorded_at)).map((e) => e.energy_mwh || 0)),
        minutesWeek: Math.round(sum(activities.filter((a) => Date.now() - new Date(a.started_at) < 7 * 864e5).map((a) => (a.duration_s || 0) / 60))),
        sessions: activities.length,
        streakDays: currentStreak(activities),
        latestBpm: measurements.find((m) => m.metric === 'bpm')?.value ?? live?.telemetry?.bpm ?? null,
        latestSpo2: measurements.find((m) => m.metric === 'spo2')?.value ?? live?.telemetry?.spo2 ?? null,
      },
      daily: days.map((d, i) => ({ dia: d.label, passos: d.value, energia_mwh: energyDays[i]?.value ?? 0 })),
      activities: activities.slice(0, 10).map((a) => ({
        data: fmtDate(a.started_at),
        tipo: a.kind,
        distancia_m: a.distance_m ?? null,
        duracao_s: a.duration_s ?? null,
        bpm_medio: a.avg_bpm ?? null,
        energia_mwh: a.energy_mwh ?? null,
        fonte: a.source,
      })),
      energy: {
        generatedToday: sum(energyLogs.filter((e) => isToday(e.recorded_at)).map((e) => e.energy_mwh || 0)),
        powerNowMw: live?.energy?.power_mw ?? null,
        voltageV: live?.energy?.voltage_v ?? null,
        batteryPct: live?.energy?.battery_pct ?? null,
        consumedMeasured: energyLogs.some((e) => e.consumed_mw != null),
      },
      device: {
        status: ble.status,
        firmware: ble.info?.firmware_version ?? null,
        packets: ble.packets,
        rejected: ble.rejected,
        sensorsMissing: ble.info ? 'consultar diagnóstico' : null,
      },
      demo: demoMode,
    };
  }, [profile, live, ble, activities, measurements, energyLogs, demoMode]);

  const send = async (question) => {
    const text = (question || input).trim();
    if (!text || busy) return;
    if (used >= DAILY_LIMIT) {
      setError(`Limite diário de ${DAILY_LIMIT} consultas atingido. Ele volta a zero amanhã.`);
      return;
    }
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await base44.functions.invoke('stepvoltIntelligence', { question: text, context });
      const answer = res?.data?.answer;
      if (!answer) throw new Error('O assistente não retornou uma resposta.');
      setMessages((prev) => [...prev, { role: 'assistant', text: answer, used: res.data.used }]);
      const next = used + 1;
      setUsed(next);
      localStorage.setItem(usageKey(), String(next));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Assistente indisponível no momento.');
    } finally {
      setBusy(false);
    }
  };

  if (!profile?.consent_ai) {
    return (
      <div className="space-y-4">
        <SectionTitle eyebrow="StepVolt Intelligence" title="Inteligência" description="O assistente só funciona com autorização explícita sobre seus dados." />
        <Panel title="Autorização necessária">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-2">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Para explicar suas métricas, o assistente recebe um resumo agregado — metas, totais diários e as
                últimas sessões — sem identificadores e sem dados brutos do dispositivo. Cada resposta informa quais
                campos foram usados e o que estava indisponível.
              </p>
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <Switch checked={false} onCheckedChange={() => patchProfile({ consent_ai: true })} />
                Autorizar análise por IA
              </label>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="StepVolt Intelligence"
        title="Inteligência"
        description="Assistente que explica métricas, resume sessões e compara períodos citando os dados que sustentam cada conclusão."
        right={<StatusPill tone="info" dot={false}>{used}/{DAILY_LIMIT} consultas hoje</StatusPill>}
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Conversa" subtitle="contexto enviado: resumo agregado" className="lg:col-span-2">
          <div className="max-h-[52vh] min-h-[260px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Sparkles className="h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-medium">Pergunte sobre seus números</p>
                <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                  O assistente responde apenas com base no resumo dos seus registros. Nada é inventado: se um dado não
                  existe, ele informa indisponibilidade.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-xl rounded-br-sm bg-primary/15 px-3 py-2 text-[12px] text-foreground'
                      : 'max-w-[92%] rounded-xl rounded-bl-sm border border-border bg-secondary/40 px-3 py-2 text-[12px] leading-relaxed text-foreground/90'
                  }
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.used && (
                    <p className="mt-1.5 border-t border-border/60 pt-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      fontes: {m.used.days} dias · {m.used.sessions} sessões
                      {m.used.stepsToday != null ? ` · ${m.used.stepsToday} passos hoje` : ''}
                      {m.used.demo ? ' · dados de demo' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                analisando seus dados…
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/[0.06] px-2 py-1.5 font-mono text-[9.5px] text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {error}
            </p>
          )}

          <div className="mt-3 flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ex.: minha energia caiu esta semana? Por quê?"
              className="min-h-[46px] flex-1 resize-none text-xs"
              maxLength={600}
            />
            <Button onClick={() => send()} disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Perguntas sugeridas" subtitle="atalhos para começar">
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy}
                  className="w-full rounded-lg border border-border px-2.5 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Transparência" subtitle="limites do assistente">
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li>• Analisa apenas o resumo agregado; não acessa outros operadores.</li>
              <li>• Não substitui avaliação médica e não faz diagnóstico.</li>
              <li>• Distingue medição de estimativa em cada resposta.</li>
              <li>• Limite de {DAILY_LIMIT} consultas por dia por dispositivo.</li>
            </ul>
            <label className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px]">
              <span className="text-muted-foreground">Autorização ativa</span>
              <Switch checked={Boolean(profile?.consent_ai)} onCheckedChange={(v) => patchProfile({ consent_ai: v })} />
            </label>
          </Panel>

          {operatorId && (
            <p className="px-1 font-mono text-[8.5px] leading-relaxed text-muted-foreground">
              Sessão vinculada ao operador deste dispositivo. Nenhum identificador pessoal é enviado ao modelo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}