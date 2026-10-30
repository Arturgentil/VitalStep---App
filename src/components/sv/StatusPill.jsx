import React from 'react';
import { cn } from '@/lib/utils';

const STYLES = {
  live: 'border-primary/40 bg-primary/10 text-primary',
  connected: 'border-success/40 bg-success/10 text-success',
  demo: 'border-energy/40 bg-energy/10 text-energy',
  warning: 'border-energy/40 bg-energy/10 text-energy',
  error: 'border-destructive/45 bg-destructive/10 text-destructive',
  idle: 'border-border bg-secondary/50 text-muted-foreground',
  info: 'border-accent/40 bg-accent/10 text-accent',
};

export default function StatusPill({ tone = 'idle', dot = true, pulse = false, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]',
        STYLES[tone] || STYLES.idle,
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full bg-current', pulse && 'anim-pulse-soft')}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}