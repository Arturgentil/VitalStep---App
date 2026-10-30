import React from 'react';
import { cn } from '@/lib/utils';
import { fmtClock } from '@/lib/format';

const ACCENT = {
  cyan: 'text-primary',
  energy: 'text-energy',
  alert: 'text-destructive',
  neutral: 'text-foreground',
};

const QUALITY = {
  high: 'bg-success',
  medium: 'bg-energy',
  low: 'bg-destructive',
};

/**
 * Every metric on StepVolt is rendered through this card so unit, last update,
 * availability and signal quality are never hidden from the operator.
 */
export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  accent = 'cyan',
  quality,
  updatedAt,
  state = 'live',
  hint,
  className,
  footer,
}) {
  const unavailable = state === 'unavailable' || value === null || value === undefined;
  return (
    <div className={cn('sv-panel group relative p-3.5 transition-colors hover:border-primary/40', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="hud-label truncate">{label}</span>
        <span className="flex items-center gap-1.5">
          {quality && !unavailable && (
            <span
              className={cn('h-1.5 w-1.5 rounded-full', QUALITY[quality] || 'bg-muted-foreground')}
              title={`Qualidade do sinal: ${quality}`}
            />
          )}
          {Icon && <Icon className={cn('h-3.5 w-3.5 opacity-70', ACCENT[accent])} />}
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className={cn('num text-[26px] font-semibold leading-none', unavailable ? 'text-muted-foreground' : ACCENT[accent])}>
          {unavailable ? '—' : value}
        </span>
        {unit && <span className="font-mono text-[11px] text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="truncate">{hint || (unavailable ? 'indisponível' : state === 'stale' ? 'sem atualização' : 'medido')}</span>
        <span className="shrink-0">{updatedAt ? fmtClock(updatedAt) : '—'}</span>
      </div>
      {footer}
    </div>
  );
}