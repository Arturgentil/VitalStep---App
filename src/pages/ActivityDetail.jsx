import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, HeartPulse, MapPin, Route, Timer, Trash2, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useApp } from '@/lib/store';
import Panel from '@/components/sv/Panel';
import StatusPill from '@/components/sv/StatusPill';
import SectionTitle from '@/components/sv/SectionTitle';
import RouteTrace from '@/components/activity/RouteTrace';
import FootprintIntelligence from '@/components/visuals/FootprintIntelligence';
import { PanelSkeleton } from '@/components/sv/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtDistance, fmtDuration, fmtEnergy, fmtInt, fmtNum, fmtPace } from '@/lib/format';
import { exportCSV, exportGPX, exportPDF } from '@/lib/exports';

export default function ActivityDetail() {
  const { id } = useParams();
  const { operatorId, demoData } = useApp();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [zone, setZone] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    if (id?.startsWith('demo-')) {
      const list = demoData.activities;
      const found = list.find((a) => a.id === id) || null;
      setActivity(found);
      setPrevious(found ? list.find((a) => a.kind === found.kind && new Date(a.started_at) < new Date(found.started_at)) || null : null);
      setLoading(false);
      setNotFound(!found);
      return () => {
        alive = false;
      };
    }
    base44.entities.Activity.get(id)
      .then(async (record) => {
        if (!alive) return;
        setActivity(record);
        setLoading(false);
        if (record?.operator_id && record?.kind) {
          const page = await base44.entities.Activity.filter(
            { operator_id: record.operator_id, kind: record.kind },
            { sort: '-started_at', limit: 30 },
          );
          const prev = (page.items || []).find(
            (a) => a.id !== record.id && new Date(a.started_at) < new Date(record.started_at),
          );
          if (alive) setPrevious(prev || null);
        }
      })
      .catch(() => {
        if (!alive) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!notFound) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [notFound]);

  const remove = async () => {
    if (id?.startsWith('demo-')) {
      navigate('/atividade');
      return;
    }
    await base44.entities.Activity.delete(id);
    navigate('/atividade');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <PanelSkeleton rows={2} />
        <PanelSkeleton rows={5} />
      </div>
    );
  }

  if (notFound || !activity) {
    return (
      <div className="py-20 text-center">
        <p className="num text-4xl text-muted-foreground">404</p>
        <h1 className="mt-2 text-lg font-semibold">Sessão não encontrada</h1>
        <p className="mt-1 text-xs text-muted-foreground">O registro pode ter sido removido ou pertence a outro operador.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/atividade">Voltar ao histórico</Link>
        </Button>
      </div>
    );
  }

  const samples = (activity.samples || []).map((s) => ({
    label: fmtDuration(s.t),
    bpm: s.bpm,
    potencia: s.power_mw,
  }));
  const zones = Object.fromEntries((activity.pressure_zones || []).map((z) => [z.zone, z.pct]));

  const delta = (current, base) => {
    if (!base || !current) return null;
    return ((current - base) / base) * 100;
  };

  const comparisons = previous
    ? [
        { label: 'Distância', value: delta(activity.distance_m, previous.distance_m) },
        { label: 'Duração', value: delta(activity.duration_s, previous.duration_s) },
        { label: 'BPM médio', value: delta(activity.avg_bpm, previous.avg_bpm) },
        { label: 'Energia', value: delta(activity.energy_mwh, previous.energy_mwh) },
      ]
    : [];

  const csvRows = (activity.samples || []).map((s) => ({
    t_segundos: s.t,
    bpm: s.bpm ?? '',
    passos: s.steps ?? '',
    potencia_mw: s.power_mw ?? '',
  }));

  const pdf = () =>
    exportPDF({
      title: activity.title || activity.kind,
      subtitle: `${fmtDateTime(activity.started_at)} · ${activity.source === 'demo' ? 'dados de demonstração' : 'dados do dispositivo'}`,
      sections: [
        {
          heading: 'Resumo',
          lines: [
            `Duração: ${fmtDuration(activity.duration_s)}`,
            `Distância: ${fmtDistance(activity.distance_m)}${(activity.route || []).length < 2 ? ' (estimada por passos)' : ' (rota GPS registrada)'}`,
            `Passos: ${fmtInt(activity.steps)}`,
            `Ritmo médio: ${fmtPace(activity.avg_pace_s_km)}`,
            `BPM médio / máximo: ${activity.avg_bpm ? Math.round(activity.avg_bpm) : '—'} / ${activity.max_bpm ? Math.round(activity.max_bpm) : '—'}`,
            `Energia gerada registrada: ${fmtNum(activity.energy_mwh, 1)} mWh`,
          ],
        },
        {
          heading: 'Comparação com sessão anterior',
          lines: previous
            ? comparisons.map((c) => `${c.label}: ${c.value === null ? 'sem base' : `${c.value > 0 ? '+' : ''}${fmtNum(c.value, 1)}%`} em relação a ${fmtDateTime(previous.started_at)}`)
            : ['Nenhuma sessão anterior do mesmo tipo para comparar.'],
        },
        {
          heading: 'Limitações',
          lines: [
            'Valores de distância sem GPS são estimados a partir da contagem de passos e do comprimento de passada configurado.',
            'Este relatório descreve dados de um dispositivo vestível e não constitui avaliação clínica.',
          ],
        },
      ],
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/atividade">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Histórico
          </Link>
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportGPX(activity)} disabled={(activity.route || []).length < 2}>
            <Route className="mr-1.5 h-3.5 w-3.5" /> GPX
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(csvRows)} disabled={!csvRows.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={pdf}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <SectionTitle
        eyebrow={fmtDateTime(activity.started_at)}
        title={activity.title || activity.kind}
        description={`${activity.source === 'demo' ? 'Dados de demonstração' : 'Dados do dispositivo'} · ${(activity.route || []).length >= 2 ? 'rota GPS registrada' : 'sem GPS: distância estimada por passos'}`}
        right={<StatusPill tone={activity.source === 'demo' ? 'demo' : 'connected'}>{activity.source === 'demo' ? 'demo' : 'dispositivo'}</StatusPill>}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Timer, label: 'Duração', value: fmtDuration(activity.duration_s), unit: 'h:mm:ss' },
          { icon: MapPin, label: 'Distância', value: fmtDistance(activity.distance_m), unit: (activity.route || []).length >= 2 ? 'GPS' : 'estimada' },
          { icon: HeartPulse, label: 'BPM médio', value: activity.avg_bpm ? Math.round(activity.avg_bpm) : '—', unit: `máx ${activity.max_bpm ? Math.round(activity.max_bpm) : '—'}` },
          { icon: Zap, label: 'Energia', value: fmtEnergy(activity.energy_mwh).value, unit: fmtEnergy(activity.energy_mwh).unit },
          { icon: Timer, label: 'Ritmo', value: fmtPace(activity.avg_pace_s_km), unit: 'min/km' },
          { icon: MapPin, label: 'Passos', value: fmtInt(activity.steps), unit: 'passos' },
        ].map((m) => (
          <div key={m.label} className="sv-panel p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <m.icon className="h-3 w-3" />
              <span className="hud-label text-[8.5px]">{m.label}</span>
            </div>
            <p className="num mt-1.5 text-base text-foreground">{m.value}</p>
            <p className="font-mono text-[8.5px] text-muted-foreground">{m.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Trecho por trecho" subtitle="BPM e potência por amostra" className="lg:col-span-2">
          {samples.length >= 2 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={samples} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="det-bpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={34} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="bpm" stroke="hsl(var(--chart-5))" fill="url(#det-bpm)" strokeWidth={1.6} name="bpm" isAnimationActive animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-muted-foreground">
              Amostras insuficientes para desenhar o trecho (mínimo 2 registros de 5 s).
            </p>
          )}
        </Panel>

        <Panel title="Rota" subtitle="traçado registrado no dispositivo">
          <RouteTrace route={activity.route || []} height={150} />
          <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2">
            {comparisons.length ? (
              comparisons.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="flex items-center gap-1 font-mono text-foreground">
                    {c.value === null ? '—' : (
                      <>
                        {c.value > 0 ? <TrendingUp className="h-3 w-3 text-energy" /> : <TrendingDown className="h-3 w-3 text-primary" />}
                        {c.value > 0 ? '+' : ''}{fmtNum(c.value, 1)}%
                      </>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-muted-foreground">Sem sessão anterior do mesmo tipo para comparar.</p>
            )}
          </div>
        </Panel>
      </div>

      {Object.keys(zones).length > 0 && (
        <Panel title="Pressão plantar da sessão" subtitle="distribuição média registrada pelos FSRs">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <FootprintIntelligence zones={zones} onSelect={setZone} selected={zone} />
            <div className="space-y-1">
              {Object.entries(zones).map(([z, v]) => (
                <div key={z} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 text-muted-foreground">{z}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, v)}%` }} />
                  </div>
                  <span className="num w-10 text-right text-foreground">{fmtNum(v, 0)}</span>
                </div>
              ))}
              <p className="pt-1 font-mono text-[9px] text-muted-foreground">
                Valores relativos por zona. Não classificam tipo de pisada nem indicam condição clínica.
              </p>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}