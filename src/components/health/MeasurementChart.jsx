import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtDateTime } from '@/lib/format';

const COLOR = {
  bpm: 'hsl(var(--chart-5))',
  spo2: 'hsl(var(--primary))',
  temp_c: 'hsl(var(--energy))',
};

function Tip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 shadow-xl">
      <p className="font-mono text-[9px] text-muted-foreground">{fmtDateTime(p.at)}</p>
      <p className="num text-xs text-foreground">
        {p.value} <span className="text-[10px] text-muted-foreground">{unit}</span>
      </p>
      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">qualidade {p.quality}</p>
    </div>
  );
}

export default function MeasurementChart({ points, metric, unit, height = 260 }) {
  const data = points.map((m) => ({
    at: m.measured_at,
    label: new Date(m.measured_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    value: m.value,
    quality: m.quality || 'high',
  }));
  const stroke = COLOR[metric] || COLOR.bpm;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 8.5, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={46} domain={['auto', 'auto']} />
          <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: 'hsl(var(--border))' }} />
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.7} dot={false} activeDot={{ r: 3 }} isAnimationActive animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}