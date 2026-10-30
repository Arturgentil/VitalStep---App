import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { fmtDistance, fmtDuration } from '@/lib/format';
import { dayKey } from '@/lib/metrics';

const KIND_COLOR = {
  walk: 'bg-primary',
  run: 'bg-accent',
  trail: 'bg-energy',
  custom: 'bg-chart-4',
};

/** Performance Timeline — 14-day interactive strip of the recorded sessions. */
export default function PerformanceTimeline({ activities = [], days = 14, onSelect, className }) {
  const buckets = useMemo(() => {
    const now = new Date();
    const list = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      list.push({ date: d, key: dayKey(d), items: [] });
    }
    const map = new Map(list.map((b) => [b.key, b]));
    activities.forEach((a) => {
      const b = map.get(dayKey(a.started_at));
      if (b) b.items.push(a);
    });
    return list;
  }, [activities, days]);

  const maxDuration = Math.max(1800, ...activities.map((a) => a.duration_s || 0));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-end gap-1 overflow-x-auto scrollbar-none">
        {buckets.map((b) => (
          <div key={b.key} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full flex-col justify-end gap-1">
              {b.items.length === 0 && <div className="h-1 w-full rounded-full bg-border/60" />}
              {b.items.map((a) => (
                <button
                  key={a.id || `${a.started_at}-${a.kind}`}
                  type="button"
                  title={`${a.title || a.kind} · ${fmtDuration(a.duration_s)} · ${fmtDistance(a.distance_m)}`}
                  onClick={() => onSelect?.(a)}
                  className={cn(
                    'w-full rounded-sm transition-all hover:brightness-125 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                    KIND_COLOR[a.kind] || 'bg-primary',
                  )}
                  style={{ height: Math.max(6, ((a.duration_s || 0) / maxDuration) * 88) }}
                />
              ))}
            </div>
            <span className="font-mono text-[8px] uppercase text-muted-foreground">
              {b.date.toLocaleDateString('pt-BR', { day: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {Object.entries(KIND_COLOR).map(([kind, color]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
            {kind === 'walk' ? 'caminhada' : kind === 'run' ? 'corrida' : kind === 'trail' ? 'trilha' : 'personalizada'}
          </span>
        ))}
      </div>
    </div>
  );
}