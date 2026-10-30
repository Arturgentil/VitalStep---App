import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * BioPulse — the signal trace drawn from the actual samples received.
 * When there is no signal it shows a flat baseline, never a fake waveform.
 */
export default function BioPulse({ samples = [], bpm = null, height = 64, color = 'primary', className }) {
  const stroke = color === 'energy' ? 'hsl(var(--energy))' : 'hsl(var(--primary))';

  const path = useMemo(() => {
    const values = samples.map((s) => (typeof s === 'number' ? s : s.bpm)).filter((v) => Number.isFinite(v));
    if (values.length < 2) return { line: '', area: '' };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const W = 300;
    const H = 60;
    const step = W / (values.length - 1);
    const pts = values.map((v, i) => [i * step, H - 6 - ((v - min) / span) * (H - 14)]);
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L${W} ${H} L0 ${H} Z`, min, max };
  }, [samples]);

  const beat = bpm ? Math.max(0.45, 60 / bpm) : 0;

  return (
    <div className={cn('relative w-full overflow-hidden', className)} style={{ height }}>
      <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1="0" y1={60 * p} x2="300" y2={60 * p} stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.5" />
        ))}
        {path.line ? (
          <>
            <path d={path.area} fill="url(#pulse-fill)" />
            <path d={path.line} fill="none" stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
            {beat > 0 && (
              <circle r="2.6" fill={stroke} className="anim-pulse-soft" style={{ animationDuration: `${beat}s` }}>
                <animateMotion dur={`${beat * 2}s`} repeatCount="indefinite" path={path.line} />
              </circle>
            )}
          </>
        ) : (
          <line x1="0" y1="32" x2="300" y2="32" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.6" />
        )}
      </svg>
      {!path.line && (
        <span className="absolute inset-0 grid place-items-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          sem sinal biométrico
        </span>
      )}
    </div>
  );
}