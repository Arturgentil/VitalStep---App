import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bluetooth,
  Check,
  Cpu,
  FlaskConical,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import BrandLogo from '@/components/brand/BrandLogo';
import VitalStepCore from '@/components/visuals/VitalStepCore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import StatusPill from '@/components/sv/StatusPill';
import DemoNotice from '@/components/sv/DemoNotice';
import { decodeSensors } from '@/lib/ble/protocol';
import { cn } from '@/lib/utils';

const STEPS = ['Conceito', 'Sistema', 'Conta', 'Permissões', 'Metas', 'Tênis', 'Relatório'];

export default function Onboarding() {
  const { profile, patchProfile, connect, ble, demoMode, setDemoMode } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    birth_year: profile?.birth_year || 1994,
    height_cm: profile?.height_cm || 174,
    weight_kg: profile?.weight_kg || 71,
    sex: profile?.sex || 'undisclosed',
    daily_step_goal: profile?.daily_step_goal || 8000,
    daily_energy_goal_mwh: profile?.daily_energy_goal_mwh || 120,
    weekly_minutes_goal: profile?.weekly_minutes_goal || 150,
    consent_health: profile?.consent_health ?? false,
    consent_location: profile?.consent_location ?? false,
    consent_ai: profile?.consent_ai ?? false,
    notify_alerts: profile?.notify_alerts ?? true,
  });
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const sensors = useMemo(() => (ble.info ? decodeSensors(ble.info.sensor_flags) : []), [ble.info]);

  const finish = async () => {
    setSaving(true);
    try {
      await patchProfile({ ...form, onboarded: true, consent_at: new Date().toISOString(), last_report_at: new Date().toISOString() });
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const tryConnect = async () => {
    setConnectError(null);
    setConnecting(true);
    try {
      await connect();
    } catch (err) {
      setConnectError(err?.message || 'Não foi possível iniciar a conexão.');
    } finally {
      setConnecting(false);
    }
  };

  const canNext = step !== 2 || form.display_name.trim().length > 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 sv-grid opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-8 sm:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo symbolClassName="h-9 w-9" nameClassName="sr-only sm:not-sr-only" />
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/50' : 'w-3 bg-border',
                )}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          {step === 0 && (
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <p className="hud-label">Apresentação</p>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  O movimento do seu corpo<br />
                  <span className="text-primary">vira energia e inteligência.</span>
                </h1>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  VitalStep é uma plataforma biométrica acoplada a um tênis com ESP32. Ela lê seus sinais,
                  interpreta sua pisada e mede a energia gerada a cada passo — com transparência sobre o que é medido,
                  estimado ou simulado.
                </p>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="info">tempo real</StatusPill>
                  <StatusPill tone="energy">energia cinética</StatusPill>
                  <StatusPill tone="idle" dot={false}>dados privados</StatusPill>
                </div>
              </div>
              <div className="grid place-items-center">
                <VitalStepCore connected powerMw={7.4} bpm={112} size={240} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="hud-label">Como funciona</p>
                <h2 className="mt-1 text-2xl font-semibold">Três camadas, um único fluxo</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: HeartPulse, title: 'Biometria', text: 'PPG mede BPM e SpO₂; o termômetro de contato registra a temperatura quando o sensor está presente.', color: 'text-primary' },
                  { icon: Zap, title: 'Energia', text: 'O piezoelétrico converte a pressão do passo em potência elétrica medida em mW e acumulada em mWh.', color: 'text-energy' },
                  { icon: Cpu, title: 'Biomecânica', text: 'Os FSRs mapeiam a carga plantar em calcanhar, mediopé e antepé de cada pé.', color: 'text-accent' },
                ].map((c) => (
                  <div key={c.title} className="sv-panel p-4">
                    <c.icon className={cn('h-5 w-5', c.color)} />
                    <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="sv-panel flex items-start gap-3 border-primary/20 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                  Nenhum valor é inventado. Se um sensor não existir ou não responder, a métrica aparece como
                  <span className="text-foreground"> indisponível</span> em vez de receber um número fictício.
                  Interpretações de saúde são informativas e não substituem avaliação profissional.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto w-full max-w-lg space-y-5">
              <div>
                <p className="hud-label">Conta e perfil</p>
                <h2 className="mt-1 text-2xl font-semibold">Como devemos chamar você?</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seus dados ficam vinculados apenas a este operador. O perfil começa privado.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nome de exibição</Label>
                  <Input id="name" value={form.display_name} onChange={(e) => set('display_name')(e.target.value)} placeholder="Ex.: Ana Ribeiro" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="birth">Ano de nascimento</Label>
                  <Input id="birth" type="number" value={form.birth_year} onChange={(e) => set('birth_year')(Number(e.target.value))} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="sex">Sexo (opcional)</Label>
                  <select
                    id="sex"
                    value={form.sex}
                    onChange={(e) => set('sex')(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="undisclosed">Prefiro não informar</option>
                    <option value="female">Feminino</option>
                    <option value="male">Masculino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input id="height" type="number" value={form.height_cm} onChange={(e) => set('height_cm')(Number(e.target.value))} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="weight">Massa (kg)</Label>
                  <Input id="weight" type="number" value={form.weight_kg} onChange={(e) => set('weight_kg')(Number(e.target.value))} className="mt-1.5" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto w-full max-w-2xl space-y-3">
              <div>
                <p className="hud-label">Consentimento</p>
                <h2 className="mt-1 text-2xl font-semibold">Permissões, uma por uma</h2>
                <p className="mt-1 text-xs text-muted-foreground">Você pode revogar qualquer uma delas depois, no Perfil.</p>
              </div>
              {[
                { key: 'consent_health', icon: HeartPulse, title: 'Dados biométricos', text: 'Armazena BPM, SpO₂ e temperatura junto às suas sessões. Fica privado por padrão e nunca é publicado automaticamente.' },
                { key: 'consent_location', icon: MapPin, title: 'Localização (GPS)', text: 'Usada apenas durante uma atividade, se você ativar a rota. Nunca é compartilhada sem ação explícita.' },
                { key: 'consent_ai', icon: Sparkles, title: 'Análise por IA', text: 'Permite que o assistente leia suas métricas para explicar tendências. Ele informa quais dados usou.' },
                { key: 'notify_alerts', icon: ShieldCheck, title: 'Alertas de limites', text: 'Notifica quando BPM, SpO₂ ou bateria cruzam os limites que você definiu.' },
              ].map((p) => (
                <div key={p.key} className="sv-panel flex items-start gap-3 p-3.5">
                  <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium">{p.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{p.text}</p>
                  </div>
                  <Switch checked={form[p.key]} onCheckedChange={set(p.key)} />
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="mx-auto w-full max-w-lg space-y-5">
              <div>
                <p className="hud-label">Metas iniciais</p>
                <h2 className="mt-1 text-2xl font-semibold">Defina seu ponto de partida</h2>
                <p className="mt-1 text-xs text-muted-foreground">Valores editáveis a qualquer momento. Metas servem para orientar, não para cobrar.</p>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'daily_step_goal', label: 'Passos por dia', unit: 'passos', min: 1000, max: 30000, step: 500 },
                  { key: 'daily_energy_goal_mwh', label: 'Energia gerada por dia', unit: 'mWh', min: 10, max: 2000, step: 10 },
                  { key: 'weekly_minutes_goal', label: 'Minutos ativos por semana', unit: 'min', min: 30, max: 900, step: 15 },
                ].map((g) => (
                  <div key={g.key} className="sv-panel p-3.5">
                    <div className="flex items-center justify-between">
                      <Label>{g.label}</Label>
                      <span className="num text-sm text-primary">
                        {form[g.key]} <span className="text-[10px] text-muted-foreground">{g.unit}</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={g.min}
                      max={g.max}
                      step={g.step}
                      value={form[g.key]}
                      onChange={(e) => set(g.key)(Number(e.target.value))}
                      className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="mx-auto w-full max-w-2xl space-y-4">
              <div>
                <p className="hud-label">Pareamento</p>
                <h2 className="mt-1 text-2xl font-semibold">Descubra o seu VitalStep</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  O tênis anuncia-se como <span className="font-mono text-foreground">VitalStep-…</span>. A conexão usa
                  Web Bluetooth e exige um navegador compatível (Chrome ou Edge) em contexto seguro.
                </p>
              </div>

              {!ble.supported && (
                <div className="sv-panel border-destructive/30 p-3.5 text-[11.5px] text-muted-foreground">
                  Este navegador não expõe Web Bluetooth. Você ainda pode explorar a plataforma com o modo de
                  demonstração, que é sempre identificado.
                </div>
              )}

              <div className="sv-panel flex flex-wrap items-center gap-3 p-4">
                <Button onClick={tryConnect} disabled={connecting || !ble.supported}>
                  <Bluetooth className="mr-2 h-4 w-4" />
                  {connecting ? 'Procurando…' : 'Procurar tênis'}
                </Button>
                <Button variant="outline" onClick={() => setDemoMode(!demoMode)}>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  {demoMode ? 'Desativar demonstração' : 'Usar demonstração'}
                </Button>
                <StatusPill tone={ble.status === 'connected' ? 'connected' : 'idle'} pulse={ble.status === 'connected'}>
                  {ble.status === 'connected' ? ble.deviceName || 'conectado' : 'sem enlace'}
                </StatusPill>
              </div>

              {connectError && <p className="font-mono text-[10px] text-destructive">{connectError}</p>}
              {demoMode && <DemoNotice />}

              <div className="sv-panel p-4">
                <p className="hud-label mb-2">Diagnóstico de sensores</p>
                {sensors.length === 0 && !demoMode ? (
                  <p className="text-[11.5px] text-muted-foreground">
                    Aguardando o pacote DEVICE_INFO do firmware para listar os sensores disponíveis.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {(demoMode && sensors.length === 0 ? decodeSensors(0b111111) : sensors).map((s) => (
                      <div key={s.key} className="flex items-center gap-2 text-[11.5px]">
                        <span className={s.available ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-destructive/70'} />
                        <span className={s.available ? 'text-foreground/85' : 'text-muted-foreground'}>{s.label}</span>
                        <span className="ml-auto font-mono text-[9px] text-muted-foreground">{s.available ? 'ok' : 'sem resposta'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="mx-auto w-full max-w-2xl space-y-4">
              <div>
                <p className="hud-label">Relatório inicial</p>
                <h2 className="mt-1 text-2xl font-semibold">Tudo pronto, {form.display_name.split(' ')[0] || 'operador'}</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['Perfil', form.display_name || '—'],
                  ['Meta de passos', `${form.daily_step_goal} / dia`],
                  ['Meta de energia', `${form.daily_energy_goal_mwh} mWh / dia`],
                  ['Minutos ativos', `${form.weekly_minutes_goal} / semana`],
                  ['Consentimento biométrico', form.consent_health ? 'concedido' : 'negado'],
                  ['Localização', form.consent_location ? 'permitida sob demanda' : 'desativada'],
                  ['Enlace BLE', ble.status === 'connected' ? `conectado · ${ble.deviceName}` : 'não pareado'],
                  ['Firmware', ble.info?.firmware_version || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="sv-panel-tight flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">{k}</span>
                    <span className="num text-[11px] text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="sv-panel flex items-start gap-3 p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Você pode parear o tênis depois em <span className="text-foreground">Dispositivo</span>. Sem enlace,
                  as métricas reais aparecem como indisponíveis — apenas a demonstração mostra valores simulados,
                  sempre identificados.
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext}>
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              {saving ? 'Salvando…' : 'Entrar no Command Center'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
