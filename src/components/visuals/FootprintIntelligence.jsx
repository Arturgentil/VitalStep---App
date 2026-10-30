import React from 'react';
import { cn } from '@/lib/utils';
import { zoneLabel } from '@/lib/metrics';

const ZONES = [
  { key: 'heel', label: 'Calcanhar', cy: 206, rx: 26, ry: 26 },
  { key: 'mid', label: 'Mediopé', cy: 142, rx: 21, ry: 30 },
  { key: 'fore', label: 'Antepé', cy: 64, rx: 30, ry: 30 },
];

function Sole({ side, zones, onSelect, selected }) {
  const prefix = side === 'l' ? '_l' : '_r';
  const total = ZONES.reduce((acc, z) => acc + (zones?.[z.key + prefix] || 0), 0) || 1;
  return (
    <svg viewBox="0 0 120 260" className="w-full max-w-[132px]">
      <defs>
        <linearGradient id={`sole-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path
        d="M60 16 C78 16 89 32 89 56 C89 78 81 92 79 112 C77 134 83 150 83 172 C83 202 71 238 58 242 C45 246 33 226 32 198 C31 170 38 150 36 128 C34 104 30 88 31 62 C32 32 43 16 60 16 Z"
        fill={`url(#sole-${side})`}
        stroke="hsl(var(--border))"
        strokeWidth="1.6"
      />
      {ZONES.map((z) => {
        const value = zones?.[z.key + prefix] || 0;
        const pct = (value / total) * 100;
        const isSelected = selected === z.key + prefix;
        return (
          <g key={z.key} onClick={() => onSelect?.(z.key + prefix)} className={onSelect ? 'cursor-pointer' : ''}>
            <ellipse
              cx="60"
              cy={z.cy}
              rx={z.rx}
              ry={z.ry}
              fill={pct >= 40 ? 'hsl(var(--destructive))' : pct >= 27 ? 'hsl(var(--energy))' : 'hsl(var(--primary))'}
              fillOpacity={0.16 + Math.min(0.72, pct / 55)}
              stroke={isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--primary))'}
              strokeOpacity={isSelected ? 0.9 : 0.35}
              strokeWidth={isSelected ? 1.8 : 1}
              style={{ transition: 'fill-opacity 500ms ease' }}
            />
            <text x="60" y={z.cy + 3} textAnchor="middle" className="num" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}>
              {zones ? `${Math.round(pct)}%` : '—'}
            </text>
          </g>
        );
      })}
      <text x="60" y="256" textAnchor="middle" style={{ fontSize: 7, letterSpacing: 2, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}>
        {side === 'l' ? 'ESQUERDO' : 'DIREITO'}
      </text>
    </svg>
  );
}

/** Footprint Intelligence — plantar pressure map built from FSR zone readings. */
export default function FootprintIntelligence({ zones, onSelect, selected, className }) {
  return (
    <div className={cn('flex items-end justify-center gap-2 sm:gap-6', className)}>
      <Sole side="l" zones={zones} onSelect={onSelect} selected={selected} />
      <Sole side="r" zones={zones} onSelect={onSelect} selected={selected} />
      <div className="mb-6 hidden flex-col gap-1.5 sm:flex">
        {[
          { c: 'bg-primary', l: 'Baixa carga' },
          { c: 'bg-energy', l: 'Média' },
          { c: 'bg-destructive', l: 'Alta' },
        ].map((i) => (
          <span key={i.l} className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full', i.c)} /> {i.l}
          </span>
        ))}
      </div>
    </div>
  );
}

FootprintIntelligence.zoneLabel = zoneLabel;