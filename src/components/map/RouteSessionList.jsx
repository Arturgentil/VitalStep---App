import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmptyState from '@/components/sv/EmptyState';
import { ACTIVE_COLOR } from '@/lib/geo';
import { fmtClock, fmtDistance } from '@/lib/format';

const KIND_LABEL = { walk: 'Caminhada', run: 'Corrida', trail: 'Trilha', custom: 'Personalizada' };

export default function RouteSessionList({ routes, activeId, onSelect }) {
  if (!routes.length) {
    return (
      <EmptyState
        icon={MapPin}
        title="Nenhuma trajetória"
        description="Sessões só entram no mapa quando o GPS está ativo durante a atividade. Ajuste os filtros ou grave uma nova sessão com GPS."
      />
    );
  }

  return (
    <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
      {routes.map((route) => {
        const active = route.id === activeId;
        return (
          <li
            key={route.id}
            className={cn(
              'rounded-lg border transition-colors',
              active ? 'border-primary/60 bg-primary/[0.07]' : 'border-border/60 bg-secondary/25 hover:border-primary/30',
            )}
          >
            <button type="button" onClick={() => onSelect(route.id)} className="flex w-full items-center gap-2 p-2 text-left">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: active ? ACTIVE_COLOR : route.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-medium text-foreground">
                  {route.activity.title || KIND_LABEL[route.activity.kind] || 'Sessão'}
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {fmtClock(route.activity.started_at)} · {route.points.length} pts
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[11px] text-foreground">{fmtDistance(route.distanceM)}</span>
                {route.partial && (
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.1em] text-energy">trecho</span>
                )}
              </span>
            </button>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {new Date(route.activity.started_at).toLocaleDateString('pt-BR')}
              </span>
              <Link
                to={`/atividade/${route.id}`}
                className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-primary hover:underline"
              >
                sessão <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}