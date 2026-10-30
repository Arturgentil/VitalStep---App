import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, ChevronRight, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE = {
  alert: { icon: AlertTriangle, ring: 'border-destructive/40 bg-destructive/[0.07]', text: 'text-destructive' },
  warn: { icon: BellRing, ring: 'border-energy/40 bg-energy/[0.07]', text: 'text-energy' },
  info: { icon: Info, ring: 'border-border bg-secondary/30', text: 'text-primary' },
  ok: { icon: ShieldCheck, ring: 'border-success/35 bg-success/[0.06]', text: 'text-success' },
};

export default function AlertsPanel({ alerts = [] }) {
  if (!alerts.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
        Nenhum alerta ativo.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {alerts.map((a, i) => {
        const tone = TONE[a.tone] || TONE.info;
        const Icon = tone.icon;
        const content = (
          <>
            <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone.text)} />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium leading-tight text-foreground">{a.title}</p>
              {a.detail && <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{a.detail}</p>}
            </div>
            {a.to && <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </>
        );
        return (
          <li key={`${a.title}-${i}`}>
            {a.to ? (
              <Link to={a.to} className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors hover:bg-secondary/40', tone.ring)}>
                {content}
              </Link>
            ) : (
              <div className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-2', tone.ring)}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}