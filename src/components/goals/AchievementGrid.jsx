import React from 'react';
import { Lock, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER = {
  bronze: 'from-amber-700/30 to-amber-500/10 border-amber-600/40 text-amber-500',
  silver: 'from-slate-400/25 to-slate-300/10 border-slate-400/40 text-slate-300',
  gold: 'from-yellow-500/30 to-yellow-300/10 border-yellow-500/45 text-yellow-400',
};

export default function AchievementGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((a) => {
        const pct = a.threshold ? Math.min(100, (a.progress / a.threshold) * 100) : 0;
        const unlocked = Boolean(a.unlocked_at);
        return (
          <div
            key={a.key}
            className={cn(
              'relative overflow-hidden rounded-xl border bg-gradient-to-br p-3 transition-all',
              unlocked ? TIER[a.tier] || TIER.bronze : 'border-border bg-none',
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn('grid h-8 w-8 place-items-center rounded-full border', unlocked ? 'border-current/40 bg-current/10' : 'border-border text-muted-foreground')}>
                {unlocked ? <Medal className={cn('h-4 w-4', unlocked && 'anim-pulse-soft')} /> : <Lock className="h-3.5 w-3.5" />}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{a.tier}</span>
            </div>
            <p className={cn('mt-2 text-[11.5px] font-semibold', unlocked ? 'text-foreground' : 'text-muted-foreground')}>{a.title}</p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{a.description}</p>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full', unlocked ? 'bg-current' : 'bg-primary/60')} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 font-mono text-[8.5px] text-muted-foreground">
              {Math.round(a.progress)} / {a.threshold}
            </p>
          </div>
        );
      })}
    </div>
  );
}