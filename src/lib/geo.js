/**
 * StepVolt — trajectory helpers. Pure geometry, no map or network dependency.
 */

const EARTH_R = 6371000;

export const ACTIVE_COLOR = '#22d3ee';

const HUES = [190, 45, 265, 330, 155, 20];

export function routeColor(index) {
  const hue = HUES[index % HUES.length];
  return `hsl(${hue} 88% 64%)`;
}

export function haversineM(a, b) {
  if (!a || !b) return 0;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeLengthM(points = []) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineM(points[i - 1], points[i]);
  return Math.round(total);
}

export const PERIODS = [
  { key: 'day', label: 'Hoje' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: '30 dias' },
  { key: 'all', label: 'Tudo' },
];

export const TIME_WINDOWS = [
  { key: 'all', label: 'Dia todo', from: 0, to: 24 },
  { key: 'dawn', label: '0–6h', from: 0, to: 6 },
  { key: 'morning', label: '6–12h', from: 6, to: 12 },
  { key: 'afternoon', label: '12–18h', from: 12, to: 18 },
  { key: 'evening', label: '18–24h', from: 18, to: 24 },
];

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function rangeFor(period, day) {
  const now = Date.now();
  if (day) {
    const fromMs = startOfDay(new Date(`${day}T12:00:00`));
    return { fromMs, toMs: fromMs + 86400000 };
  }
  if (period === 'day') return { fromMs: startOfDay(now), toMs: Infinity };
  if (period === 'week') return { fromMs: now - 7 * 86400000, toMs: Infinity };
  if (period === 'month') return { fromMs: now - 30 * 86400000, toMs: Infinity };
  return { fromMs: 0, toMs: Infinity };
}

/** Keeps only the route points inside the requested period and hour window. */
export function clipRoute(route, { fromMs = 0, toMs = Infinity, fromHour = 0, toHour = 24 } = {}) {
  if (!Array.isArray(route)) return [];
  const allDay = fromHour === 0 && toHour === 24;
  return route.filter((p) => {
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
    if (typeof p.t !== 'number') return allDay && fromMs === 0;
    if (p.t < fromMs || p.t > toMs) return false;
    if (!allDay) {
      const hour = new Date(p.t).getHours();
      if (hour < fromHour || hour >= toHour) return false;
    }
    return true;
  });
}