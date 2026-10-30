import React, { useMemo, useState } from 'react';
import { Download, FileText, Info, ScanLine } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '@/lib/store';
import useTelemetryData from '@/hooks/useTelemetryData';
import SectionTitle from '@/components/sv/SectionTitle';
import Panel from '@/components/sv/Panel';
import FootprintIntelligence from '@/components/visuals/FootprintIntelligence';
import DemoNotice from '@/components/sv/DemoNotice';
import EmptyState from '@/components/sv/EmptyState';
import StatusPill from '@/components/sv/StatusPill';
import { Button } from '@/components/ui/button';
import { asymmetry, normaliseZones, sum, zoneLabel } from '@/lib/metrics';
import { fmtDate, fmtNum } from '@/lib/format';
import { exportCSV, exportPDF } from '@/lib/exports';

const ZONE_INFO = {
  heel_l: 'FSR no calcanhar esquerdo — pico de carga na fase de apoio inicial.',
  mid_l: 'FSR no mediopé esquerdo — transferência de carga entre calcanhar e antepé.',
  fore_l: 'FSR no antepé esquerdo — carga na fase de propulsão.',
  heel_r: 'FSR no calcanhar direito — pico de carga na fase de apoio inicial.',
  mid_r: 'FSR no mediopé direito — transferência de carga entre calcanhar e antepé.',
  fore_r: 'FSR no antepé direito — carga na fase de propulsão.',
};

export default function Biomechanics() {
  const { live, operatorId } = useApp();
  const { activities, loading, demo } = useTelemetryData();
  const [selected, setSelected] = useState(null);

  const withZones = useMemo(
    () => activities.filter((a) => (a.pressure_zones || []).length > 0).slice(0, 12),
    [activities],
  );
  const latest = withZones[0];
  const liveZones = live?.pressure?.zones;
  const zones = useMemo(() => {
    if (liveZones) return liveZones;
    if (!latest) return null;
    return Object.fromEntries(latest.pressure_zones.map((z) => [z.zone, z.pct]));
  }, [liveZones, latest]);

  const totals = useMemo(() => {
    if (!zones) return null;
    const left = sum([zones.heel_l, zones.mid_l, zones.fore_l]);
    const right = sum([zones.heel_r, zones.mid_r, zones.fore_r]);
    const asy = asymmetry(left, right);
    const regions = ['heel', 'mid', 'fore'].map((r) => ({
      region: r,
      left: zones[`${r}_l`] || 0,
      right: zones[`${r}_r`] || 0,
    }));
    return { left, right, asy, regions };
  }, [zones]);

  const evolution = useMemo(
    () =>
      withZones
        .slice()
        .reverse()
        .map((a) => {
          const z = Object.fromEntries(a.pressure_zones.map((p) => [p.zone, p.pct]));
          const total = sum(Object.values(z)) || 1;
          return {
            label: fmtDate(a.started_at),
            calcanhar: Number(((((z.heel_l || 0) + (z.heel_r || 0)) / total) * 100).toFixed(1)),
            mediope: Number(((((z.mid_l || 0) + (z.mid_r || 0)) / total) * 100).toFixed(1)),
            antepe: Number(((((z.fore_l || 0) + (z.fore_r || 0)) / total) * 100).toFixed(1)),
          };
        }),
    [withZones],
  );

  const gaitAvailable = Boolean(latest?.samples?.length >= 6);
  const csvRows = withZones.flatMap((a) =>
    (a.pressure_zones || []).map((z) => ({
      sessao: a.started_at,
      tipo: a.kind,
      zona: zoneLabel(z.zone),
      valor_relativo: z.pct,
    })),
  );

  const pdf = () =>
    exportPDF({
      title: 'Relatório de marcha e pressão plantar',
      subtitle: `${withZones.length} sessões com dados de FSR${demo ? ' · demonstração' : ''}`,
      sections: [
        {
          heading: 'Distribuição de carga (sessão mais recente)',
          lines: latest
            ? [
                `Sessão: ${latest.title || latest.kind} · ${fmtDate(latest.started_at)}`,
                ...normaliseZones(Object.fromEntries(latest.pressure_zones.map((z) => [z.zone, z.pct]))).map(
                  (z) => `${zoneLabel(z.zone)}: ${fmtNum(z.pct, 1)}% da carga relativa`,
                ),
              ]
            : ['Nenhuma sessão com dados de pressão registrada.'],
        },
        {
          heading: 'Assimetria',
          lines: [
            totals ? `Diferença esquerda/direita: ${fmtNum(totals.asy, 1)}%` : 'Sem dados suficientes.',
            'Assimetria é uma diferença medida entre lados no período analisado. Não é diagnóstico nem classificação de pisada.',
          ],
        },
        {
          heading: 'Método',
          lines: [
            'Cada FSR entrega um valor relativo de carga por zona. O percentual exibido é a normalização desses valores dentro do conjunto de seis zonas.',
            'A análise temporal da passada só é exibida quando há amostras suficientes; antes disso a plataforma informa indisponibilidade em vez de estimar.',
          ],
        },
      ],
    });

  return (
    <div className="space-y-4">
      <SectionTitle
        eyebrow="Biomechanics Lab"
        title="Biomecânica"
        description="Pressão plantar medida por FSR nas seis zonas do par. Cada resultado mostra a fórmula aplicada e a qualidade dos sensores."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(csvRows)} disabled={!csvRows.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={pdf} disabled={!withZones.length}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        }
      />

      {demo && <DemoNotice />}

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          title="Footprint Intelligence"
          subtitle={liveZones ? 'leitura ao vivo dos FSRs' : latest ? `última sessão · ${fmtDate(latest.started_at)}` : 'sem leitura'}
          className="lg:col-span-3"
          right={<StatusPill tone={liveZones ? 'live' : 'idle'} pulse={Boolean(liveZones)}>{liveZones ? 'ao vivo' : 'histórico'}</StatusPill>}
        >
          {loading ? (
            <div className="h-64 animate-pulse rounded-lg bg-secondary/50" />
          ) : zones ? (
            <FootprintIntelligence zones={zones} selected={selected} onSelect={setSelected} />
          ) : (
            <EmptyState
              icon={ScanLine}
              title="Nenhum FSR reportou dados"
              description="A matriz de pressão só aparece quando o firmware envia o pacote PRESSURE. Sem hardware, use a demonstração identificada."
            />
          )}
          <p className="mt-3 flex items-start gap-1.5 font-mono text-[9px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {selected ? ZONE_INFO[selected] : 'Toque em uma zona para ver o que aquele sensor mede.'}
          </p>
        </Panel>

        <Panel title="Carga por lado e região" subtitle="normalizado nas seis zonas" className="lg:col-span-2">
          {totals ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="sv-panel-tight px-2 py-2">
                  <p className="hud-label text-[8px]">esquerdo</p>
                  <p className="num mt-1 text-sm text-primary">{fmtNum(totals.left, 0)}</p>
                </div>
                <div className="sv-panel-tight px-2 py-2">
                  <p className="hud-label text-[8px]">direito</p>
                  <p className="num mt-1 text-sm text-accent">{fmtNum(totals.right, 0)}</p>
                </div>
                <div className="sv-panel-tight px-2 py-2">
                  <p className="hud-label text-[8px]">assimetria</p>
                  <p className={`num mt-1 text-sm ${totals.asy > 15 ? 'text-energy' : 'text-success'}`}>{fmtNum(totals.asy, 1)}%</p>
                </div>
              </div>
              {totals.regions.map((r) => (
                <div key={r.region}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    <span>{r.region === 'heel' ? 'calcanhar' : r.region === 'mid' ? 'mediopé' : 'antepé'}</span>
                    <span className="num text-foreground">{fmtNum(r.left, 0)} / {fmtNum(r.right, 0)}</span>
                  </div>
                  <div className="flex h-1.5 gap-1">
                    <div className="flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.left)}%` }} />
                    </div>
                    <div className="flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, r.right)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <p className="font-mono text-[9px] leading-relaxed text-muted-foreground">
                Assimetria = |esquerdo − direito| ÷ (esquerdo + direito) × 100. Diferenças entre lados são comuns e não indicam patologia.
              </p>
            </div>
          ) : (
            <p className="py-8 text-center text-[11px] text-muted-foreground">Sem zonas de pressão para calcular.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Evolução da distribuição" subtitle="percentual por região nas últimas sessões">
          {evolution.length >= 2 ? (
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={44} unit="%" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }} />
                  <Line type="monotone" dataKey="calcanhar" stroke="hsl(var(--primary))" strokeWidth={1.6} dot={false} />
                  <Line type="monotone" dataKey="mediope" stroke="hsl(var(--accent))" strokeWidth={1.6} dot={false} />
                  <Line type="monotone" dataKey="antepe" stroke="hsl(var(--energy))" strokeWidth={1.6} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={ScanLine} title="Histórico insuficiente" description="São necessárias ao menos duas sessões com pressão plantar para traçar evolução." />
          )}
        </Panel>

        <Panel title="Análise temporal da passada" subtitle="exige amostras de pressão por passo">
          {gaitAvailable ? (
            <div className="space-y-2">
              {[
                ['Amostras de pressão na sessão', latest.samples.length],
                ['Duração analisada', `${Math.round(latest.duration_s / 60)} min`],
                ['Cadência média', latest.steps && latest.duration_s ? `${fmtNum((latest.steps / latest.duration_s) * 60, 0)} passos/min` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border/50 pb-1.5 text-[11px]">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="num text-foreground">{v}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                A cadência é derivada da contagem de passos e do tempo da sessão. A plataforma não infere fase de apoio
                ou tempo de contato sem série temporal de pressão por passo.
              </p>
            </div>
          ) : (
            <EmptyState
              icon={ScanLine}
              title="Dados insuficientes para análise temporal"
              description="O firmware precisa enviar amostras de pressão em série. Nenhum valor é estimado no lugar do dado ausente."
            />
          )}
        </Panel>
      </div>

      <Panel title="Sessões com mapa plantar" subtitle={`${withZones.length} registros`}>
        {withZones.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {withZones.map((a) => {
              const z = normaliseZones(Object.fromEntries(a.pressure_zones.map((p) => [p.zone, p.pct])));
              const top = z.slice().sort((x, y) => y.pct - x.pct)[0];
              return (
                <div key={a.id} className="sv-panel-tight p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-foreground">{a.title || a.kind}</p>
                    <span className="font-mono text-[9px] text-muted-foreground">{fmtDate(a.started_at)}</span>
                  </div>
                  <p className="mt-1 font-mono text-[9.5px] text-muted-foreground">
                    maior carga: <span className="text-foreground">{top ? zoneLabel(top.zone) : '—'}</span>
                  </p>
                  <div className="mt-2 flex gap-0.5">
                    {z.map((zone) => (
                      <span key={zone.zone} title={`${zoneLabel(zone.zone)}: ${fmtNum(zone.pct, 1)}%`} className="h-1.5 flex-1 rounded-full bg-primary" style={{ opacity: Math.max(0.15, zone.pct / 40) }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-[11px] text-muted-foreground">Nenhuma sessão com dados de pressão plantar.</p>
        )}
      </Panel>
    </div>
  );
}