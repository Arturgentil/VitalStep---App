import React from 'react';
import { cn } from '@/lib/utils';

const METRICS = [
  { key: 'bpm', label: 'BPM', unit: 'bpm' },
  { key: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'temp_c', label: 'Temp.', unit: '°C' },
];

const RANGES = [
  { key: 'day', label: '24 h' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: '30 dias' },
  { key: 'custom', label: 'Período' },
];

export default function MetricTabs({ metric, onMetric, range, onRange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onMetric(m.key)}
            className={cn(
              'rounded-md px-3 py-1 text-[11px] font-medium transition-colors',
              metric === m.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex rounded-lg border border-border bg-secondary/40 p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onRange(r.key)}
            className={cn(
              'rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors',
              range === r.key ? 'bg-card text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}