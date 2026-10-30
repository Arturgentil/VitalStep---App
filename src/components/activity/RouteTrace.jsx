import React from 'react';
import { cn } from '@/lib/utils';

/** Minimal route renderer: no tiles, no network, works offline. */
export default function RouteTrace({ route = [], className, height = 150 }) {
  if (!route || route.length < 2) {
    return (
      <div className={cn('grid place-items-center rounded-lg border border-dashed border-border', className)} style={{ height }}>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">sem rota registrada</span>
      </div>
    );
  }
  const lats = route.map((p) => p.lat);
  const lngs = route.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1e-6;
  const spanLng = maxLng - minLng || 1e-6;
  const W = 300;
  const H = 130;
  const pts = route.map((p) => {
    const x = 10 + ((p.lng - minLng) / spanLng) * (W - 20);
    const y = H - 10 - ((p.lat - minLat) / spanLat) * (H - 20);
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-secondary/25', className)} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="route-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--energy))" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#route-grad)" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx={sx} cy={sy} r="3" fill="hsl(var(--primary))" />
        <circle cx={ex} cy={ey} r="3.2" fill="hsl(var(--energy))" />
      </svg>
      <span className="absolute bottom-1.5 right-2 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
        {route.length} pontos · sem mapa base
      </span>
    </div>
  );
}