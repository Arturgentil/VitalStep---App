export function fmtInt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString('pt-BR');
}

export function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Energy values are stored in milliwatt-hours. */
export function fmtEnergy(mwh, digits = 1) {
  if (mwh === null || mwh === undefined || Number.isNaN(mwh)) return { value: '—', unit: 'mWh' };
  if (Math.abs(mwh) >= 1000) return { value: fmtNum(mwh / 1000, 2), unit: 'Wh' };
  return { value: fmtNum(mwh, digits), unit: 'mWh' };
}

/** Power values are stored in milliwatts. */
export function fmtPower(mw, digits = 1) {
  if (mw === null || mw === undefined || Number.isNaN(mw)) return { value: '—', unit: 'mW' };
  if (Math.abs(mw) >= 1000) return { value: fmtNum(mw / 1000, 2), unit: 'W' };
  return { value: fmtNum(mw, digits), unit: 'mW' };
}

export function fmtDistance(m) {
  if (m === null || m === undefined || Number.isNaN(m)) return '—';
  if (m >= 1000) return `${fmtNum(m / 1000, 2)} km`;
  return `${fmtInt(m)} m`;
}

export function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Pace in seconds per kilometre. */
export function fmtPace(secPerKm) {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function fmtClock(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function fmtDateTime(dateLike) {
  if (!dateLike) return '—';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${d.toLocaleTimeString(
    'pt-BR',
    { hour: '2-digit', minute: '2-digit' },
  )}`;
}

export function fmtAgo(dateLike) {
  if (!dateLike) return 'sem registro';
  const then = new Date(dateLike).getTime();
  if (Number.isNaN(then)) return 'sem registro';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

export function isToday(dateLike) {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function startOfDay(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

export function todayISO() {
  return startOfDay(0).toISOString();
}