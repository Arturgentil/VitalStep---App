import React from 'react';
import { cn } from '@/lib/utils';

export default function Panel({ title, subtitle, right, children, className, bodyClassName, grid = false }) {
  return (
    <section className={cn('sv-panel overflow-hidden', className)}>
      {grid && <div className="pointer-events-none absolute inset-0 sv-grid opacity-[0.35]" />}
      {(title || right) && (
        <header className="relative flex items-start justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground/90">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>
      )}
      <div className={cn('relative px-4 pb-4 pt-1 sm:px-5', bodyClassName)}>{children}</div>
    </section>
  );
}