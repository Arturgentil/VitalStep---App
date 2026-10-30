/**
 * Aggregations shared by every screen. Pure functions — no side effects.
 */

export function sum(values) {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

export function avg(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (!valid.length) return null;
  return sum(valid) / valid.length;
}

export function median(values) {
  const valid = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!valid.length) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

export function dayKey(dateLike) {
  const d = new Date(dateLike);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Buckets a list of {at, value} into the last `days` calendar days. */
export function dailySeries(points, days = 7, reducer = sum) {
  const buckets = new Map();
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.set(dayKey(d), { key: dayKey(d), date: d, values: [] });
  }
  points.forEach((p) => {
    const key = dayKey(p.at);
    if (buckets.has(key)) buckets.get(key).values.push(p.value);
  });
  return [...buckets.values()].map((b) => ({
    key: b.key,
    date: b.date,
    label: b.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    value: b.values.length ? reducer(b.values) : 0,
    count: b.values.length,
  }));
}

/** Linear slope per sample, used for trend chips. */
export function trend(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length < 2) return { slope: 0, pct: 0, direction: 'flat' };
  const n = valid.length;
  const xMean = (n - 1) / 2;
  const yMean = sum(valid) / n;
  let num = 0;
  let den = 0;
  valid.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const pct = yMean === 0 ? 0 : ((slope * n) / yMean) * 100;
  return { slope, pct, direction: Math.abs(pct) < 2 ? 'flat' : pct > 0 ? 'up' : 'down' };
}

/** Finds gaps larger than `maxGapMinutes` between consecutive measurements. */
export function findGaps(measurements, maxGapMinutes = 25) {
  const sorted = measurements
    .map((m) => new Date(m.measured_at).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const mins = (sorted[i] - sorted[i - 1]) / 60000;
    if (mins > maxGapMinutes) {
      gaps.push({ from: new Date(sorted[i - 1]), to: new Date(sorted[i]), minutes: Math.round(mins) });
    }
  }
  return gaps;
}

export function currentStreak(activities) {
  const days = new Set(activities.map((a) => dayKey(a.started_at)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor)) && streak < 400) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Estimated calories from distance and body mass (MET-based approximation). */
export function estimateCalories({ kind, distance_m, duration_s, weight_kg = 72 }) {
  const met = kind === 'run' ? 9.8 : kind === 'trail' ? 8.5 : 3.8;
  const hours = (duration_s || 0) / 3600;
  if (!hours) return null;
  return Math.round(met * weight_kg * hours);
}

/** Plantar load distribution sanity check: returns normalised percentages. */
export function normaliseZones(zones) {
  const entries = Object.entries(zones || {}).filter(([, v]) => Number.isFinite(v));
  const total = sum(entries.map(([, v]) => v));
  if (!total) return [];
  return entries.map(([zone, v]) => ({ zone, pct: (v / total) * 100 }));
}

export function zoneLabel(zone) {
  const map = {
    heel_l: 'Calcanhar E',
    mid_l: 'Mediopé E',
    fore_l: 'Antepé E',
    heel_r: 'Calcanhar D',
    mid_r: 'Mediopé D',
    fore_r: 'Antepé D',
  };
  return map[zone] || zone;
}

export function asymmetry(leftPct, rightPct) {
  if (!Number.isFinite(leftPct) || !Number.isFinite(rightPct)) return null;
  const total = leftPct + rightPct;
  if (!total) return null;
  return Math.abs(leftPct - rightPct) / total * 100;
}