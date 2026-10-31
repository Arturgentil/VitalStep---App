import React from 'react';
import { cn } from '@/lib/utils';
import './DigitalTwin.css';

const MARKERS = [
  { key: 'fsr', label: 'FSR plantar', x: 175, y: 289 },
  { key: 'piezo', label: 'Piezo energia', x: 310, y: 292 },
  { key: 'imu', label: 'IMU', x: 398, y: 234 },
  { key: 'ppg', label: 'PPG', x: 494, y: 246 },
  { key: 'temp', label: 'Temperatura', x: 515, y: 210 },
  { key: 'gps', label: 'GNSS', x: 546, y: 242 },
];

const AXES = [
  { key: 'x', label: 'Rolagem' },
  { key: 'y', label: 'Inclinação' },
  { key: 'z', label: 'Direção' },
];

function ShoeProfile({ sensors, active }) {
  const byKey = Object.fromEntries(sensors.map((sensor) => [sensor.key, sensor]));

  return (
    <svg viewBox="0 70 640 290" className="block w-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="hsl(var(--primary))">
        {/* Heel opening, padded tongue and the full upper silhouette. */}
        <path d="M399 195 Q417 177 434 190 Q475 212 522 183 Q540 177 544 195" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M343 152 L348 145 Q358 136 370 147 L386 173" strokeWidth="1.5" strokeOpacity="0.65" />
        <path d="M351 151 Q359 145 366 154" strokeOpacity="0.35" />
        <path d="M65 264 Q73 245 115 241 L230 217 Q271 206 321 173 L352 151 Q365 146 379 164 L409 199 Q449 218 490 200 L529 184 Q550 180 554 211 L568 268 Q535 285 494 280 L152 284 Q95 283 65 274 Z" strokeWidth="1.8" strokeOpacity="0.85" />

        {/* Toe reinforcement and stitched panels keep the outline readable. */}
        <g strokeWidth="1.1" strokeOpacity="0.4">
          <path d="M68 259 Q117 236 181 239 L213 273 M80 256 Q132 245 178 249 L197 271" />
          <path d="M213 276 L244 220 Q267 206 281 203 L264 263 L315 275" />
          <path d="M290 269 L305 228 M330 234 L380 208 L414 217 L365 270" />
          <path d="M398 213 L423 226 L429 238 M439 265 L447 279 M413 281 L389 239" />
          <path d="M485 211 Q516 207 539 190 M485 211 L477 254 L491 281" />
          <path d="M503 220 Q531 214 546 207 M493 232 Q530 229 551 219" />
          <path d="M498 265 L548 250 L565 259 M499 280 L560 274" />
        </g>
        <path d="M269 244 L306 258 L350 224 L365 234 L308 275 L261 258 Z" strokeWidth="1.6" strokeOpacity="0.65" />
        <path d="M119 274 Q192 278 245 272 M368 273 L406 274 M455 277 L483 276" strokeOpacity="0.3" strokeDasharray="3 4" />

        <path d="M247 217 L333 164 Q348 152 359 163 L377 191 L292 240 Z" strokeWidth="1.2" strokeOpacity="0.6" />
        {[0, 1, 2, 3, 4].map((index) => {
          const x = 271 + index * 17;
          const y = 218 - index * 11;
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="3.7" strokeOpacity="0.45" />
              <circle cx={x + 25} cy={y + 11} r="3.7" strokeOpacity="0.45" />
              <path d={`M${x} ${y} L${x + 25} ${y + 11} M${x + 4} ${y - 3} L${x + 21} ${y + 13}`} strokeWidth="1.6" strokeOpacity="0.85" />
            </g>
          );
        })}
        <path d="M354 169 C332 145 332 179 355 177 C378 143 390 167 360 178 L376 188 M355 178 L347 193" strokeWidth="1.7" strokeOpacity="0.85" />

        {/* Midsole and rubber tread stay separate in the wireframe. */}
        <path d="M64 269 Q101 282 164 278 L374 277 Q420 271 467 277 Q525 284 568 263 L569 284 Q543 309 490 306 L143 306 Q85 303 65 287 Z" strokeWidth="1.5" strokeOpacity="0.8" />
        <path d="M68 277 Q109 291 165 286 L371 285 Q424 280 470 286 Q528 293 565 274" strokeWidth="1.2" strokeOpacity="0.5" />
        <path d="M69 291 Q99 304 146 301 L491 302 Q537 304 566 284 L563 298 Q537 316 490 314 L143 314 Q95 312 73 301 Z" strokeWidth="1.4" strokeOpacity="0.65" />
        {[115, 153, 191, 229, 377, 415, 453, 491, 529].map((x) => (
          <path key={x} d={`M${x} 302 l-3 10`} strokeOpacity="0.35" />
        ))}
        <path d="M268 300 Q306 293 343 301" strokeOpacity="0.4" />
        <rect x="420" y="241" width="44" height="21" rx="5" strokeOpacity="0.45" />
      </g>
      <text x="442" y="254.5" textAnchor="middle" fill="hsl(var(--primary))" fillOpacity="0.65" fontSize="8" fontFamily="var(--font-mono)">ESP32</text>

      {MARKERS.map((marker) => {
        const available = Boolean(byKey[marker.key]?.available);
        return (
          <g key={marker.key} stroke={available ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} opacity={available ? 0.9 : 0.3}>
            <title>{`${marker.label}: ${available ? 'disponível' : 'indisponível'}`}</title>
            <circle cx={marker.x} cy={marker.y} r="7" strokeWidth="1.5" />
            <circle cx={marker.x} cy={marker.y} r="2.5" strokeWidth="1" opacity={active ? 1 : 0.5} />
          </g>
        );
      })}
    </svg>
  );
}

export default function DigitalTwin({ sensors = [], active = false, demo = false, className = '' }) {
  const simulating = demo && active && sensors.some((sensor) => sensor.key === 'imu' && sensor.available);
  let motionLabel = 'Conecte o tênis para consultar os sensores.';
  if (simulating) motionLabel = 'Simulação de rotação nos três eixos.';
  else if (active) motionLabel = 'Orientação não recebida do dispositivo.';

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <div
        className={cn('digital-twin-stage rounded-xl', simulating && 'digital-twin-stage--demo')}
        role="img"
        aria-label="Contorno azul de um tênis esportivo com cadarços, sola em camadas e mapa dos sensores."
      >
        <div className="absolute left-3 top-3 z-10 font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[9px]">
          Giroscópio <span className="ml-1 text-primary">X / Y / Z</span>
        </div>
        <svg viewBox="0 70 640 290" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <ellipse cx="321" cy="318" rx="244" ry="18" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.12" />
          <path d="M46 319 H595 M321 305 V334" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 7" />
          <g fill="none" strokeWidth="1" strokeDasharray="5 7">
            <ellipse className="digital-twin-axis--x" cx="320" cy="262" rx="275" ry="62" stroke="hsl(var(--primary))" transform="rotate(-10 320 262)" />
            <ellipse className="digital-twin-axis--y" cx="350" cy="228" rx="140" ry="108" stroke="hsl(var(--accent))" transform="rotate(-24 350 228)" />
            <path className="digital-twin-axis--z" d="M92 222 C57 129 155 68 286 87 M284 80 L293 87 L282 92" stroke="hsl(var(--primary))" />
          </g>
          <g fontFamily="var(--font-mono)" fontSize="10">
            <text x="594" y="235" fill="hsl(var(--primary))">X</text>
            <text x="444" y="116" fill="hsl(var(--accent))">Y</text>
            <text x="260" y="84" fill="hsl(var(--primary))">Z</text>
          </g>
        </svg>
        <div className={cn('digital-twin-pose', simulating && 'digital-twin-pose--demo')}>
          <ShoeProfile sensors={sensors} active={active} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/50 px-1 pb-3">
        <div className="flex gap-3 font-mono text-[9px] sm:gap-4">
          {AXES.map((axis) => (
            <span key={axis.key} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-semibold uppercase text-foreground/80">{axis.key}</span>
              {axis.label}
            </span>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground">{motionLabel}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {sensors.map((sensor) => (
          <div key={sensor.key} className="flex items-center gap-1.5 text-[10px]">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', sensor.available ? 'bg-primary' : 'bg-muted-foreground/50')} />
            <span className={sensor.available ? 'text-foreground/80' : 'text-muted-foreground line-through'}>{sensor.label}</span>
          </div>
        ))}
        {!sensors.length && (
          <span className="col-span-full text-[10px] text-muted-foreground">
            {active
              ? 'Mapa de sensores indisponível. Aguardando informações do dispositivo.'
              : 'Mapa de sensores indisponível. Nenhum dispositivo conectado.'}
          </span>
        )}
      </div>
    </div>
  );
}
