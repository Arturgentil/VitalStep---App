import React, { useMemo } from 'react';
import { dayKey } from '@/lib/metrics';
import { cn } from '@/lib/utils';

/** 8-week consistency calendar: each cell is a real day with recorded activity. */
export default function ConsistencyCalendar({ activities = [], weeks = 8 }) {
  const map = useMemo(() => {
    const acc = new Map();
    activities.forEach((a) => {
      const k = dayKey(a.started_at);
      acc.set(k, (acc.get(k) || 0) + (a.steps || 0));
    });
    return acc;
  }, [activities]);

  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  for (let i = 0; i < weeks * 7; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const steps = map.get(dayKey(d)) || 0;
    days.push({ date: d, steps, future: d > today });
  }

  const level = (steps) => {
    if (!steps) return 'bg-secondary/60';
    if (steps < 3000) return 'bg-primary/25';
    if (steps < 6000) return 'bg-primary/45';
    if (steps < 9000) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <div>
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {days.map((d) => (
          <span
            key={d.date.toISOString()}
            title={`${d.date.toLocaleDateString('pt-BR')} · ${d.steps} passos`}
            className={cn('h-3 w-3 rounded-[3px]', d.future ? 'bg-transparent' : level(d.steps))}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
        menos
        <span className="h-2 w-2 rounded-[2px] bg-secondary/60" />
        <span className="h-2 w-2 rounded-[2px] bg-primary/25" />
        <span className="h-2 w-2 rounded-[2px] bg-primary/45" />
        <span className="h-2 w-2 rounded-[2px] bg-primary/70" />
        <span className="h-2 w-2 rounded-[2px] bg-primary" />
        mais
      </div>
    </div>
  );
}