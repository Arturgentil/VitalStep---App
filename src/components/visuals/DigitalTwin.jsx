import React from 'react';
import { cn } from '@/lib/utils';

const MARKERS = [
  { key: 'fsr', label: 'FSR plantar', x: 96, y: 132 },
  { key: 'piezo', label: 'Piezo energia', x: 150, y: 156 },
  { key: 'imu', label: 'IMU', x: 196, y: 96 },
  { key: 'ppg', label: 'PPG', x: 214, y: 138 },
  { key: 'temp', label: 'Temp', x: 232, y: 112 },
];

/** Digital Twin — side profile of the smart shoe with its sensor map. */
export default function DigitalTwin({ sensors = [], active = false, className }) {
  const byKey = Object.fromEntries((sensors || []).map((s) => [s.key, s]));
  return (
    <div className={cn('relative w-full', className)}>
      <svg viewBox="0 0 300 200" className="w-full">
        <defs>
          <linearGradient id="shoe-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="shoe-sole" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.65" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <ellipse cx="150" cy="176" rx="118" ry="8" fill="hsl(var(--primary))" opacity={active ? 0.14 : 0.06} />
        <path
          d="M34 152 C30 128 44 116 66 112 C84 108 96 96 112 78 C126 62 142 52 166 54 C190 56 206 68 214 84 C222 100 236 104 252 112 C270 120 276 134 272 150 C268 164 252 168 236 166 L52 166 C40 166 34 160 34 152 Z"
          fill="url(#shoe-body)"
          stroke="hsl(var(--border))"
          strokeWidth="1.4"
        />
        <path
          d="M34 152 C46 158 62 160 84 160 L240 160 C256 160 268 156 272 150 C270 160 262 168 244 168 L52 166 C42 166 36 160 34 152 Z"
          fill="url(#shoe-sole)"
        />
        <path d="M120 76 C140 68 166 68 186 78" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M126 90 C146 82 170 84 188 92" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeOpacity="0.45" />
        <path d="M100 118 C130 110 176 112 218 124" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.8" strokeOpacity="0.16" strokeDasharray="4 4" />
        <rect x="176" y="88" width="26" height="18" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="189" y="100" textAnchor="middle" style={{ fontSize: 6, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}>
          ESP32
        </text>

        {MARKERS.map((m) => {
          const sensor = byKey[m.key];
          const available = sensor ? sensor.available : true;
          return (
            <g key={m.key}>
              <circle
                cx={m.x}
                cy={m.y}
                r="4.2"
                fill={available ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                stroke="hsl(var(--card))"
                strokeWidth="1.5"
                className={available && active ? 'anim-pulse-soft' : ''}
              />
              <circle cx={m.x} cy={m.y} r="9" fill="none" stroke="hsl(var(--primary))" strokeOpacity={available ? 0.35 : 0.1} />
            </g>
          );
        })}
      </svg>

      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {(sensors?.length ? sensors : []).map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px]">
            <span className={cn('h-1.5 w-1.5 rounded-full', s.available ? 'bg-primary' : 'bg-muted-foreground/50')} />
            <span className={s.available ? 'text-foreground/80' : 'text-muted-foreground line-through'}>{s.label}</span>
          </div>
        ))}
        {!sensors?.length && (
          <span className="col-span-full text-[10px] text-muted-foreground">
            Mapa de sensores indisponível — nenhum dispositivo conectado.
          </span>
        )}
      </div>
    </div>
  );
}