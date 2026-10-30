import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

const STROKE = {
  primary: 'hsl(var(--primary))',
  energy: 'hsl(var(--energy))',
  accent: 'hsl(var(--accent))',
  bpm: 'hsl(var(--chart-5))',
};

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 shadow-lg backdrop-blur">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{payload[0].payload.label}</p>
      <p className="num text-xs text-foreground">
        {payload[0].value} <span className="text-[10px] text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

export default function SeriesChart({ data = [], color = 'primary', unit = '', height = 170, className, decimals = 0 }) {
  const stroke = STROKE[color] || STROKE.primary;
  const gradientId = `grad-${color}`;
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.42} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.45} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={46} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'hsl(var(--border))' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            dot={{ r: 2, fill: stroke, strokeWidth: 0 }}
            activeDot={{ r: 3.5 }}
            isAnimationActive
            animationDuration={650}
            formatter={(v) => Number(v).toFixed(decimals)}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}