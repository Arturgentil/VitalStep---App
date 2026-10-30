import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERIODS, TIME_WINDOWS } from '@/lib/geo';

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary/60 bg-primary/12 text-primary'
          : 'border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export default function MapFilters({ period, onPeriod, windowKey, onWindow, day, onDay }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="hud-label mr-0.5 hidden text-[9px] sm:inline">Período</span>
        {PERIODS.map((item) => (
          <Chip key={item.key} active={!day && period === item.key} onClick={() => { onDay(''); onPeriod(item.key); }}>
            {item.label}
          </Chip>
        ))}

        <label
          className={cn(
            'ml-0.5 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1',
            day ? 'border-primary/60 bg-primary/12' : 'border-border/70 bg-secondary/30',
          )}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">dia</span>
          <input
            type="date"
            value={day}
            onChange={(e) => onDay(e.target.value)}
            aria-label="Escolher um dia específico"
            className="sv-date w-[108px] bg-transparent font-mono text-[10.5px] text-foreground outline-none"
          />
        </label>
        {day && (
          <button
            type="button"
            onClick={() => onDay('')}
            aria-label="Limpar dia específico"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="hud-label mr-0.5 hidden text-[9px] sm:inline">Horário</span>
        {TIME_WINDOWS.map((item) => (
          <Chip key={item.key} active={windowKey === item.key} onClick={() => onWindow(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}