import React from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Rendered wherever synthetic data is on screen. Never optional. */
export default function DemoNotice({ className, compact = false }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-energy/35 bg-energy/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-energy',
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      {compact ? 'Modo demonstração' : 'Modo demonstração — dados simulados, não são medições'}
    </div>
  );
}