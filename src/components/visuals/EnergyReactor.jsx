import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { fmtNum } from '@/lib/format';

/** Energy Reactor — reacts to the power actually measured by the piezo harvester. */
export default function EnergyReactor({ powerMw = 0, energyMwh = 0, batteryPct = null, maxScale = 12, live = true, className }) {
  const uid = useId().replace(/:/g, '');
  const ratio = Math.max(0, Math.min(1, (powerMw || 0) / maxScale));
  const C = 2 * Math.PI * 76;
  const arc = C * 0.75;

  return (
    <div className={cn('relative mx-auto grid place-items-center', className)} style={{ width: 220, height: 220 }}>
      <svg viewBox="0 0 200 200" width="220" height="220">
        <defs>
          <radialGradient id={`reactor-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--energy))" stopOpacity={0.25 + ratio * 0.55} />
            <stop offset="100%" stopColor="hsl(var(--energy))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`bar-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--energy))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r={62 + ratio * 16} fill={`url(#reactor-${uid})`} className={live ? 'anim-pulse-soft' : ''} />
        <circle cx="100" cy="100" r="76" fill="none" stroke="hsl(var(--border))" strokeWidth="7" strokeDasharray={`${arc} ${C}`} strokeLinecap="round" transform="rotate(135 100 100)" />
        <circle
          cx="100"
          cy="100"
          r="76"
          fill="none"
          stroke={`url(#bar-${uid})`}
          strokeWidth="7"
          strokeDasharray={`${arc * ratio} ${C}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
          style={{ transition: 'stroke-dasharray 700ms ease' }}
        />
        <g className="anim-spin-slow" style={{ transformOrigin: '100px 100px' }} opacity={0.5}>
          {Array.from({ length: 36 }).map((_, i) => (
            <line key={i} x1="100" y1="16" x2="100" y2={i % 3 === 0 ? 24 : 20} stroke="hsl(var(--energy))" strokeOpacity={i / 44} strokeWidth="1" transform={`rotate(${i * 10} 100 100)`} />
          ))}
        </g>

        <text x="100" y="88" textAnchor="middle" className="num" style={{ fontSize: 26, fill: 'hsl(var(--energy))' }}>
          {fmtNum(powerMw || 0, 1)}
        </text>
        <text x="100" y="102" textAnchor="middle" style={{ fontSize: 7, letterSpacing: 2, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}>
          mW AGORA
        </text>
        <text x="100" y="124" textAnchor="middle" className="num" style={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}>
          {fmtNum(energyMwh || 0, 1)} mWh
        </text>
        <text x="100" y="136" textAnchor="middle" style={{ fontSize: 6.5, letterSpacing: 1.6, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}>
          {batteryPct === null || batteryPct === undefined ? 'BATERIA —' : `BATERIA ${Math.round(batteryPct)}%`}
        </text>
      </svg>
    </div>
  );
}