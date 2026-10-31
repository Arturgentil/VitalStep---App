import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Download, FileText, Info, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import MetricTabs from '@/components/health/MetricTabs';
import MeasurementChart from '@/components/health/MeasurementChart';
import EmptyState from '@/components/sv/EmptyState';
import StatusPill from '@/components/sv/StatusPill';
import { PanelSkeleton } from '@/components/sv/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DemoNotice from '@/components/sv/DemoNotice';
import { avg, findGaps, median, trend } from '@/lib/metrics';
import { fmtDateTime, fmtNum } from '@/lib/format';
import { exportCSV, exportPDF } from '@/lib/exports';

const META = {
  bpm: {
    label: 'Frequência cardíaca',
    unit: 'bpm',
    about:
      'Estimada por fotopletismografia (PPG): o sensor óptico detecta variações de volume sanguíneo. Movimento intenso e má fixação reduzem a qualidade do sinal.',
  },
  spo2: {
    label: 'Saturação de oxigênio',
    unit: '%',
    about:
      'SpO₂ por PPG é uma estimativa de tendência, não um oxímetro médico. Esmalte, perfusão baixa e movimento podem distorcer a leitura.',
  },
  temp_c: {
    label: 'Temperatura de contato',
    unit: '°C',
    about:
      'Medida por termômetro de contato na palmilha. Reflete a temperatura da superfície do pé, não a temperatura corporal central.',
  },
};

export default function Health() {
  const { profile, patchProfile, operatorId, demoMode, live } = useApp();
  const { loading, measurements, demo } = useTelemetryData();
  const [metric, setMetric] = useState('bpm');
  const [range, setRange] = useState('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [notes, setNotes] = useState([]);
  const [noteBody, setNoteBody] = useState('');
  const [noteError, setNoteError] = useState('');
  const [thresholds, setThresholds] = useState({
    bpm_alert_min: profile?.bpm_alert_min ?? 50,
    bpm_alert_max: profile?.bpm_alert_max ?? 165,
    spo2_alert_min: profile?.spo2_alert_min ?? 92,
    temp_alert_max: profile?.temp_alert_max ?? 38,
  });
  const [savedThresholds, setSavedThresholds] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    setThresholds({
      bpm_alert_min: profile.bpm_alert_min ?? 50,
      bpm_alert_max: profile.bpm_alert_max ?? 165,
      spo2_alert_min: profile.spo2_alert_min ?? 92,
      temp_alert_max: profile.temp_alert_max ?? 38,
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;

    const loadNotes = async () => {
      if (!operatorId || !supabase) {
        setNotes([]);
        return;
      }

      const { data, error } = await supabase
        .from('health_notes')
        .select('*')
        .eq('operator_id', operatorId)
        .order('note_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (alive) setNotes(data || []);
    };

    loadNotes().catch((error) => {
      console.error('Erro ao carregar observações de saúde:', error);
      if (alive) setNoteError('Não foi possível carregar as observações.');
    });

    return () => {
      alive = false;
    };
  }, [operatorId]);

  const series = useMemo(() => {
    const now = Date.now();
    const cutoff = range === 'day' ? 864e5 : range === 'week' ? 7 * 864e5 : 30 * 864e5;
    return measurements
      .filter((m) => m.metric === metric)
      .filter((m) => {
        const t = new Date(m.measured_at).getTime();
        if (range === 'custom') {
          const fromT = from ? new Date(from).getTime() : 0;
          const toT = to ? new Date(`${to}T23:59:59`).getTime() : now;
          return t >= fromT && t <= toT;
        }
        return now - t <= cutoff;
      })
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  }, [measurements, metric, range, from, to]);

  const values = series.map((m) => m.value);
  const stats = {
    latest: series.length ? series[series.length - 1] : null,
    average: avg(values),
    median: median(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    direction: trend(values.slice(-14)).direction,
  };
  const qualityCount = series.reduce(
    (acc, m) => ({ ...acc, [m.quality || 'high']: (acc[m.quality || 'high'] || 0) + 1 }),
    {},
  );
  const gaps = findGaps(series, range === 'day' ? 25 : 240);
  const meta = META[metric];

  const addNote = async () => {
    if (!noteBody.trim() || !operatorId || !supabase) return;

    setNoteError('');

    try {
      const { data: created, error } = await supabase
        .from('health_notes')
        .insert({
          operator_id: operatorId,
          body: noteBody.trim(),
          note_at: new Date().toISOString(),
          metric,
        })
        .select('*')
        .single();

      if (error) throw error;

      setNotes((prev) => [created, ...prev].slice(0, 20));
      setNoteBody('');
    } catch (error) {
      console.error('Erro ao salvar observação de saúde:', error);
      setNoteError(error?.message || 'Não foi possível salvar a observação.');
    }
  };

  const saveThresholds = async () => {
    await patchProfile(thresholds);
    setSavedThresholds(true);
    setTimeout(() => setSavedThresholds(false), 2200);
  };

  const csvRows = series.map((m) => ({
    medido_em: m.measured_at,
    metrica: m.metric,
    valor: m.value,
    unidade: meta.unit,
    qualidade: m.quality || 'high',
    fonte: m.source || 'ble',
  }));

  const pdf = () =>
    exportPDF({
      title: `Relatório biométrico — ${meta.label}`,
      subtitle: `Período: ${range === 'custom' ? `${from || '—'} a ${to || '—'}` : `últimos ${range === 'day' ? '24 h' : range === 'week' ? '7 dias' : '30 dias'}`} · ${series.length} amostras`,
      sections: [
        {
          heading: 'Estatísticas',
          lines: [
            `Última leitura: ${stats.latest ? `${fmtNum(stats.latest.value, 1)} ${meta.unit}` : 'sem dados'} (${stats.latest ? fmtDateTime(stats.latest.measured_at) : '—'})`,
            `Média: ${stats.average ? fmtNum(stats.average, 1) : '—'} ${meta.unit}`,
            `Mediana: ${stats.median ? fmtNum(stats.median, 1) : '—'} ${meta.unit}`,
            `Mínimo / máximo: ${stats.min ?? '—'} / ${stats.max ?? '—'} ${meta.unit}`,
            `Tendência recente: ${stats.direction === 'up' ? 'alta' : stats.direction === 'down' ? 'queda' : 'estável'}`,
          ],
        },
        {
          heading: 'Qualidade e cobertura',
          lines: [
            `Amostras com qualidade alta: ${qualityCount.high || 0}`,
            `Média: ${qualityCount.medium || 0} · Baixa: ${qualityCount.low || 0}`,
            `Lacunas identificadas: ${gaps.length}`,
          ],
        },
        {
          heading: 'Limitações',
          lines: [
            meta.about,
            'Este relatório descreve medições de um dispositivo vestível e não constitui diagnóstico médico. Procure avaliação profissional para interpretação clínica.',
          ],
        },
      ],
    });

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Biometric Intelligence"
        title="Saúde"
        description="Histórico biométrico com origem, qualidade e lacunas explícitas. Nenhuma leitura aqui é diagnóstica."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(csvRows)} disabled={!series.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={pdf} disabled={!series.length}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        }
      />

      {demo && <DemoNotice />}

      <Panel
        title={meta.label}
        subtitle={`${series.length} amostras · ${series.filter((s) => s.source === 'ble').length} do dispositivo`}
        right={<StatusPill tone={live?.telemetry ? 'live' : 'idle'}>{live?.telemetry ? 'telemetria ativa' : 'somente histórico'}</StatusPill>}
      >
        <MetricTabs metric={metric} onMetric={setMetric} range={range} onRange={setRange} />
        {range === 'custom' && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="hud-label" htmlFor="from">de</label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-9 w-auto" />
            </div>
            <div>
              <label className="hud-label" htmlFor="to">até</label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-9 w-auto" />
            </div>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <PanelSkeleton rows={6} />
          ) : series.length ? (
            <MeasurementChart points={series} metric={metric} unit={meta.unit} />
          ) : (
            <EmptyState
              icon={Activity}
              title="Nenhuma amostra neste período"
              description="Conecte o tênis ou registre medições em uma sessão de atividade. Sem dados, nenhum gráfico é desenhado."
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['Última leitura', stats.latest ? `${fmtNum(stats.latest.value, metric === 'temp_c' ? 1 : 0)}` : '—'],
            ['Média', stats.average ? fmtNum(stats.average, 1) : '—'],
            ['Mediana', stats.median ? fmtNum(stats.median, 1) : '—'],
            ['Mín / Máx', stats.min !== null ? `${fmtNum(stats.min, 0)} / ${fmtNum(stats.max, 0)}` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="sv-panel-tight px-2.5 py-2">
              <p className="hud-label text-[8.5px]">{label}</p>
              <p className="num mt-1 text-sm text-foreground">{value}</p>
              <p className="font-mono text-[8.5px] text-muted-foreground">{meta.unit}</p>
            </div>
          ))}
          <div className="sv-panel-tight flex items-center gap-2 px-2.5 py-2">
            {stats.direction === 'up' ? <TrendingUp className="h-4 w-4 text-energy" /> : stats.direction === 'down' ? <TrendingDown className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="hud-label text-[8.5px]">tendência</p>
              <p className="text-[11px] text-foreground">{stats.direction === 'up' ? 'alta' : stats.direction === 'down' ? 'queda' : 'estável'}</p>
            </div>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 font-mono text-[9px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" /> Última leitura é um valor instantâneo; média e mediana resumem o período selecionado. Valores instantâneos e médias nunca são misturados na mesma linha.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Qualidade e lacunas" subtitle="o que está faltando nos dados">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Alta', qualityCount.high || 0, 'text-success'],
                ['Média', qualityCount.medium || 0, 'text-energy'],
                ['Baixa', qualityCount.low || 0, 'text-destructive'],
              ].map(([label, count, color]) => (
                <div key={label} className="sv-panel-tight px-2 py-1.5 text-center">
                  <p className="hud-label text-[8px]">{label}</p>
                  <p className={`num mt-0.5 text-sm ${color}`}>{count}</p>
                </div>
              ))}
            </div>
            {gaps.length ? (
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {gaps.slice(0, 6).map((g, i) => (
                  <div key={i} className="rounded-md border border-energy/30 bg-energy/[0.06] px-2 py-1.5 font-mono text-[9.5px] text-muted-foreground">
                    lacuna de {g.minutes} min · {fmtDateTime(g.from)} → {fmtDateTime(g.to)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhuma lacuna acima do limite para o período.</p>
            )}
          </div>
        </Panel>

        <Panel title="Limites e notificações" subtitle="aplicados aos alertas do painel">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['bpm_alert_min', 'BPM mínimo'],
              ['bpm_alert_max', 'BPM máximo'],
              ['spo2_alert_min', 'SpO₂ mínimo (%)'],
              ['temp_alert_max', 'Temp. máxima (°C)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="hud-label" htmlFor={key}>{label}</label>
                <Input
                  id={key}
                  type="number"
                  value={thresholds[key]}
                  onChange={(e) => setThresholds((t) => ({ ...t, [key]: Number(e.target.value) }))}
                  className="mt-1 h-9"
                />
              </div>
            ))}
          </div>
          <Button onClick={saveThresholds} size="sm" className="mt-3 w-full">
            {savedThresholds ? 'Limites salvos' : 'Salvar limites'}
          </Button>
        </Panel>

        <Panel title="Eventos e observações" subtitle="registro manual do operador">
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Ex.: leitura após subida íngreme; sensor reposicionado."
            className="min-h-[64px] text-xs"
          />
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={addNote} disabled={!noteBody.trim() || !operatorId}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Registrar observação
          </Button>
          {noteError && <p role="alert" className="mt-2 text-xs text-destructive">{noteError}</p>}
          <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {notes.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhuma observação registrada.</p>}
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border border-border/70 px-2 py-1.5">
                <p className="text-[11px] text-foreground/90">{n.body}</p>
                <p className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">{fmtDateTime(n.note_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Sobre esta métrica" subtitle="como o número é obtido e onde ele falha">
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">{meta.about}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {demoMode
            ? 'Em modo de demonstração, todos os valores são gerados por simulação e não representam seu corpo.'
            : 'Somente leituras vindas do dispositivo são contabilizadas aqui. Se o sensor não responder, a métrica permanece indisponível.'}
        </p>
      </Panel>
    </div>
  );
}