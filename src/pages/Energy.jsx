import React, { useMemo } from 'react';
import { AlertTriangle, BatteryCharging, Download, FileText, Info, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import MetricCard from '@/components/sv/MetricCard';
import EnergyReactor from '@/components/visuals/EnergyReactor';
import DemoNotice from '@/components/sv/DemoNotice';
import StatusPill from '@/components/sv/StatusPill';
import EmptyState from '@/components/sv/EmptyState';
import { Button } from '@/components/ui/button';
import { dailySeries, sum } from '@/lib/metrics';
import { fmtAgo, fmtEnergy, fmtInt, fmtNum, isToday, startOfDay } from '@/lib/format';
import { exportCSV, exportPDF } from '@/lib/exports';

const AXIS = { fontSize: 9, fill: 'hsl(var(--muted-foreground))' };

export default function Energy() {
  const { live, ble, demoMode } = useApp();
  const { loading, energyLogs, demo } = useTelemetryData();

  const todayLogs = energyLogs.filter((e) => isToday(e.recorded_at));
  const weekLogs = energyLogs.filter((e) => new Date(e.recorded_at).getTime() > startOfDay(6).getTime());

  const generatedToday = sum(todayLogs.map((e) => e.energy_mwh || 0));
  const generatedWeek = sum(weekLogs.map((e) => e.energy_mwh || 0));
  const measuredConsumedToday = sum(todayLogs.map((e) => (e.consumed_mw || 0) * 1));
  const avgPower = todayLogs.length ? sum(todayLogs.map((e) => e.power_mw || 0)) / todayLogs.length : null;
  const peak = todayLogs.reduce((best, e) => (!best || (e.power_mw || 0) > (best.power_mw || 0) ? e : best), null);
  const lastLog = energyLogs[0];
  const voltage = live?.energy?.voltage_v ?? lastLog?.voltage_v ?? null;
  const battery = live?.energy?.battery_pct ?? lastLog?.battery_pct ?? null;
  const efficiency = measuredConsumedToday > 0 ? (generatedToday / measuredConsumedToday) * 100 : null;
  const net = measuredConsumedToday > 0 ? generatedToday - measuredConsumedToday : null;
  const autonomyH = measuredConsumedToday > 0 && lastLog?.stored_mwh ? lastLog.stored_mwh / (measuredConsumedToday / Math.max(1, todayLogs.length)) : null;
  const lowVoltage = voltage !== null && voltage < 3.4;

  const power24h = useMemo(
    () =>
      energyLogs
        .filter((e) => Date.now() - new Date(e.recorded_at).getTime() < 864e5)
        .slice()
        .reverse()
        .map((e) => ({
          label: new Date(e.recorded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          gerado: Number((e.power_mw || 0).toFixed(1)),
          consumo: Number((e.consumed_mw || 0).toFixed(1)),
        })),
    [energyLogs],
  );

  const dailyBars = useMemo(
    () => dailySeries(energyLogs.map((e) => ({ at: e.recorded_at, value: e.energy_mwh || 0 })), 7),
    [energyLogs],
  );

  const csvRows = energyLogs.map((e) => ({
    registrado_em: e.recorded_at,
    potencia_mw: e.power_mw ?? '',
    energia_mwh: e.energy_mwh ?? '',
    tensao_v: e.voltage_v ?? '',
    corrente_ma: e.current_ma ?? '',
    consumo_mw: e.consumed_mw ?? '',
    bateria_pct: e.battery_pct ?? '',
    fonte: e.source || 'ble',
  }));

  const pdf = () =>
    exportPDF({
      title: 'Relatório energético',
      subtitle: `${demo ? 'Demonstração — ' : ''}Hoje: ${fmtEnergy(generatedToday).value} ${fmtEnergy(generatedToday).unit} gerados · ${energyLogs.length} registros`,
      sections: [
        {
          heading: 'Geração medida',
          lines: [
            `Energia gerada hoje (medida): ${fmtNum(generatedToday, 1)} mWh`,
            `Energia gerada nos últimos 7 dias: ${fmtNum(generatedWeek, 1)} mWh`,
            `Potência média do dia: ${avgPower === null ? 'sem dados' : `${fmtNum(avgPower, 1)} mW`}`,
            `Pico de potência: ${peak ? `${fmtNum(peak.power_mw, 1)} mW às ${new Date(peak.recorded_at).toLocaleTimeString('pt-BR')}` : 'sem dados'}`,
          ],
        },
        {
          heading: 'Consumo e eficiência',
          lines: [
            `Consumo medido hoje: ${measuredConsumedToday ? `${fmtNum(measuredConsumedToday, 1)} mWh` : 'não reportado pelo firmware'}`,
            `Balanço energético: ${net === null ? 'requer consumo medido' : `${fmtNum(net, 1)} mWh`}`,
            `Eficiência aparente (gerado ÷ consumido): ${efficiency === null ? 'não calculável sem consumo medido' : `${fmtNum(efficiency, 1)}%`}`,
            'A eficiência é uma razão calculada a partir das leituras disponíveis, não uma especificação de garantia.',
          ],
        },
        {
          heading: 'Armazenamento',
          lines: [
            `Tensão: ${voltage === null ? '—' : `${fmtNum(voltage, 2)} V`}`,
            `Bateria: ${battery === null ? '—' : `${Math.round(battery)}%`}`,
            `Autonomia estimada: ${autonomyH === null ? 'indisponível (requer consumo medido e nível do reservatório)' : `${fmtNum(autonomyH, 1)} h`}`,
          ],
        },
        {
          heading: 'Limitações',
          lines: [
            'A energia gerada não foi comprovada como suficiente para alimentar todo o sistema por 24 horas. Qualquer autonomia exibida é uma estimativa baseada em consumo medido, não uma promessa.',
            'Potência (mW) é medida instantânea; energia (mWh) é a integração no tempo. Os dois nunca são somados nem exibidos na mesma unidade.',
          ],
        },
      ],
    });

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Energy Lab"
        title="Energia"
        description="Laboratório de geração piezoelétrica: potência instantânea, energia acumulada, consumo e eficiência — com cada valor marcado como medido ou estimado."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(csvRows)} disabled={!energyLogs.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={pdf} disabled={!energyLogs.length}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        }
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Energy Reactor" subtitle="potência recebida agora" grid>
          <EnergyReactor
            powerMw={live?.energy?.power_mw ?? 0}
            energyMwh={live?.energy?.energy_mwh ?? generatedToday}
            batteryPct={battery}
            live={Boolean(live?.energy)}
          />
          <div className="mt-2 flex justify-center">
            <StatusPill tone={live?.energy ? 'energy' : 'idle'} pulse={Boolean(live?.energy)}>
              {live?.energy ? (live.source === 'demo' ? 'simulação ativa' : 'fluxo real') : 'sem fluxo'}
            </StatusPill>
          </div>
        </Panel>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <MetricCard label="Potência agora" value={live?.energy ? fmtNum(live.energy.power_mw, 1) : null} unit="mW" icon={Zap} accent="energy" hint="medido (piezo)" updatedAt={live?.energy?.at} state={live?.energy ? 'live' : 'unavailable'} />
            <MetricCard label="Gerado hoje" value={fmtEnergy(generatedToday).value} unit={fmtEnergy(generatedToday).unit} icon={Zap} accent="energy" hint="soma dos registros" updatedAt={todayLogs[0]?.recorded_at} />
            <MetricCard label="Gerado em 7 dias" value={fmtEnergy(generatedWeek).value} unit={fmtEnergy(generatedWeek).unit} icon={BatteryCharging} accent="cyan" hint="histórico" updatedAt={weekLogs[0]?.recorded_at} />
            <MetricCard label="Tensão" value={voltage !== null ? fmtNum(voltage, 2) : null} unit="V" accent={lowVoltage ? 'alert' : 'neutral'} hint={lowVoltage ? 'abaixo de 3,40 V' : 'barramento'} updatedAt={live?.energy?.at ?? lastLog?.recorded_at} state={voltage !== null ? 'live' : 'unavailable'} />
            <MetricCard label="Consumo" value={measuredConsumedToday ? fmtNum(measuredConsumedToday, 1) : null} unit="mWh" accent="neutral" hint="medido pelo firmware" updatedAt={todayLogs[0]?.recorded_at} state={measuredConsumedToday ? 'live' : 'unavailable'} />
            <MetricCard label="Eficiência" value={efficiency !== null ? fmtNum(efficiency, 1) : null} unit="%" accent="cyan" hint="estimativa calculada" updatedAt={todayLogs[0]?.recorded_at} state={efficiency !== null ? 'live' : 'unavailable'} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {lowVoltage && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/[0.07] px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Tensão em {fmtNum(voltage, 2)} V. Verifique o circuito de carga e o contato da palmilha.
                </p>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                Autonomia estimada: {autonomyH === null ? 'indisponível — o firmware precisa reportar consumo e nível do reservatório.' : `${fmtNum(autonomyH, 1)} h com base no consumo medido.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Potência × consumo · 24 h" subtitle="mW medidos, não energia acumulada">
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-secondary/50" />
          ) : power24h.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={power24h} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Line type="monotone" dataKey="gerado" stroke="hsl(var(--energy))" strokeWidth={1.8} dot={false} name="gerado (mW)" />
                  <Line type="monotone" dataKey="consumo" stroke="hsl(var(--primary))" strokeWidth={1.4} strokeDasharray="4 4" dot={false} name="consumo (mW)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Zap} title="Sem registros energéticos" description="A geração aparece aqui assim que o firmware enviar amostras ENERGY." />
          )}
        </Panel>

        <Panel title="Energia por dia · 7 dias" subtitle="mWh acumulados por dia">
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-secondary/50" />
          ) : dailyBars.some((d) => d.value > 0) ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBars} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} formatter={(v) => [`${v} mWh`, 'gerado']} />
                  <Bar dataKey="value" fill="hsl(var(--energy))" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Zap} title="Nenhuma geração registrada" description="Sem dados de geração nos últimos sete dias." />
          )}
        </Panel>
      </div>

      <Panel title="Leitura do laboratório" subtitle="como estes números são produzidos">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: 'Potência (mW)', d: 'Leitura instantânea do piezoelétrico, enviada no pacote ENERGY a cada segundo.' },
            { t: 'Energia (mWh)', d: 'Integração da potência no intervalo. É a soma do que foi efetivamente captado.' },
            { t: 'Eficiência (%)', d: `Razão calculada entre gerado e consumido medidos. ${efficiency === null ? 'Ainda não há consumo reportado.' : 'Não é especificação de fábrica.'}` },
          ].map((i) => (
            <div key={i.t} className="sv-panel-tight p-3">
              <p className="hud-label">{i.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{i.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[9px] leading-relaxed text-muted-foreground">
          Última amostra: {live?.energy ? fmtAgo(live.energy.at) : lastLog ? fmtAgo(lastLog.recorded_at) : 'nenhuma'} · pacotes válidos: {fmtInt(ble.packets)} · {demoMode ? 'modo demonstração ativo' : 'somente hardware real'}
        </p>
      </Panel>
    </div>
  );
}