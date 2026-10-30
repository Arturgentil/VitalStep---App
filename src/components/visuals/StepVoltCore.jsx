import React, { useId } from 'react';
import { cn } from '@/lib/utils';

const NODES = [
  { key: 'body', label: 'CORPO', angle: -90 },
  { key: 'shoe', label: 'TÊNIS', angle: 0 },
  { key: 'energy', label: 'ENERGIA', angle: 90 },
  { key: 'app', label: 'APP', angle: 180 },
];

/**
 * StepVolt Core — the animated nucleus that represents the body ↔ shoe ↔ energy ↔ app link.
 * It reacts to real connection state and live power; when idle it stays slow and dim.
 */
export default function StepVoltCore({ connected = false, powerMw = 0, bpm = null, demo = false, size = 210 }) {
  const uid = useId().replace(/:/g, '');
  const active = connected;
  const intensity = Math.min(1, (powerMw || 0) / 10);
  const nodes = NODES.map((n) => {
    const rad = (n.angle * Math.PI) / 180;
    const r = 82;
    return { ...n, x: 100 + Math.cos(rad) * r, y: 100 + Math.sin(rad) * r };
  });

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
            <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--energy))" stopOpacity="0.85" />
          </linearGradient>
          <filter id={`blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <circle cx="100" cy="100" r="92" fill="none" stroke={`hsl(var(--border))`} strokeWidth="0.6" strokeOpacity="0.7" />
        <g className="anim-spin-slow" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke={`url(#ring-${uid})`}
            strokeWidth="1.1"
            strokeDasharray="2 9"
            strokeOpacity={active ? 0.95 : 0.35}
          />
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="8"
              x2="100"
              y2={i % 6 === 0 ? 15 : 11}
              stroke="hsl(var(--primary))"
              strokeOpacity={active ? 0.5 : 0.2}
              strokeWidth="1"
              transform={`rotate(${i * 15} 100 100)`}
            />
          ))}
        </g>

        <g className="anim-spin-rev" style={{ transformOrigin: '100px 100px' }}>
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="1"
            strokeDasharray="18 12"
            strokeOpacity={active ? 0.65 : 0.25}
          />
        </g>

        <circle
          cx="100"
          cy="100"
          r={54 + intensity * 10}
          fill={`url(#core-${uid})`}
          className={active ? 'anim-pulse-soft' : ''}
          opacity={active ? 1 : 0.45}
        />

        <g stroke="hsl(var(--border))" strokeWidth="0.8" strokeDasharray="3 4">
          {nodes.map((n) => (
            <line key={n.key} x1="100" y1="100" x2={n.x} y2={n.y} strokeOpacity={active ? 0.9 : 0.4} />
          ))}
        </g>

        {nodes.map((n) => (
          <g key={n.key}>
            <circle
              cx={n.x}
              cy={n.y}
              r="7"
              fill="hsl(var(--card))"
              stroke={n.key === 'energy' ? 'hsl(var(--energy))' : 'hsl(var(--primary))'}
              strokeWidth="1.2"
              strokeOpacity={active ? 0.95 : 0.4}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r="2.4"
              fill={n.key === 'energy' ? 'hsl(var(--energy))' : 'hsl(var(--primary))'}
              opacity={active ? 1 : 0.4}
              className={active ? 'anim-pulse-soft' : ''}
            />
          </g>
        ))}

        <g>
          <circle cx="100" cy="100" r="30" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
          <circle
            cx="100"
            cy="100"
            r="24"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.4"
            strokeOpacity={0.8}
            strokeDasharray={`${Math.PI * 48 * 0.34} ${Math.PI * 48}`}
            transform="rotate(-90 100 100)"
          />
          <text
            x="100"
            y="97"
            textAnchor="middle"
            className="num"
            style={{ fontSize: 15, fill: 'hsl(var(--foreground))' }}
          >
            {bpm ? Math.round(bpm) : active ? '•••' : '--'}
          </text>
          <text
            x="100"
            y="110"
            textAnchor="middle"
            style={{ fontSize: 6, letterSpacing: 1.4, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
          >
            {bpm ? 'BPM VIVO' : active ? 'SINCRONIZANDO' : 'EM ESPERA'}
          </text>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <span className={cn('font-mono text-[9px] uppercase tracking-[0.28em]', demo ? 'text-energy' : connected ? 'text-primary' : 'text-muted-foreground')}>
          {demo ? 'demo' : connected ? 'link ativo' : 'aguardando enlace'}
        </span>
      </div>
    </div>
  );
}