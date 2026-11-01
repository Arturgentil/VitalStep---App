/**
 * VitalStep: demonstration dataset.
 * Everything produced here is synthetic and MUST always be labelled as demo.
 * It never touches the database and never mixes with real device data.
 */

export const DEMO_NOTICE = 'Dados simulados de demonstração — não são medições do seu dispositivo.';

function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS = ['walk', 'run', 'trail', 'custom'];
const DEMO_ROUTE_POINTS = [
  [-16.010791, -48.075042],
  [-16.011021, -48.074597],
  [-16.010600, -48.074343],
  [-16.011571, -48.072730],
  [-16.010485, -48.071998],
  [-16.009281, -48.071225],
];

export function buildDemoDataset(seed = 20261028) {
  const rand = mulberry32(seed);
  const now = Date.now();
  const day = 86400000;

  const activities = [];
  for (let d = 29; d >= 0; d -= 1) {
    if (rand() < 0.32) continue; // rest days
    const kind = KINDS[Math.floor(rand() * KINDS.length)];
    const base = new Date(now - d * day);
    base.setHours(6 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
    const duration = Math.round((kind === 'run' ? 22 : 34) + rand() * 34) * 60;
    const cadence = kind === 'run' ? 158 : 112;
    const steps = Math.round((duration / 60) * cadence * (0.92 + rand() * 0.16));
    const distance = Math.round(steps * (kind === 'run' ? 1.06 : 0.72));
    const avgBpm = Math.round((kind === 'run' ? 138 : 104) + rand() * 16);
    const energyMwh = Math.round((duration / 60) * (6 + rand() * 7) * 10) / 10;
    const samples = [];
    for (let m = 0; m < duration / 60; m += 1) {
      samples.push({
        t: m * 60,
        bpm: Math.round(avgBpm - 12 + rand() * 26),
        steps: Math.round((m + 1) * (steps / (duration / 60))),
        power_mw: Math.round((3 + rand() * 5) * 10) / 10,
      });
    }
    const route = kind === 'custom'
      ? []
      : DEMO_ROUTE_POINTS.map(([lat, lng], index) => ({
        lat,
        lng,
        t: base.getTime() + index * (duration * 1000) / (DEMO_ROUTE_POINTS.length - 1),
      }));
    activities.push({
      id: `demo-${d}-${activities.length}`,
      kind,
      title:
        kind === 'run'
          ? 'Corrida de rua'
          : kind === 'trail'
            ? 'Trilha'
            : kind === 'walk'
              ? 'Caminhada'
              : 'Sessão personalizada',
      started_at: base.toISOString(),
      ended_at: new Date(base.getTime() + duration * 1000).toISOString(),
      duration_s: duration,
      steps,
      distance_m: distance,
      avg_bpm: avgBpm,
      max_bpm: avgBpm + 14 + Math.round(rand() * 12),
      avg_spo2: Math.round(95 + rand() * 3),
      energy_mwh: energyMwh,
      avg_power_mw: Math.round((energyMwh * 60000) / duration * 10) / 10,
      avg_pace_s_km: Math.round(duration / (distance / 1000)),
      source: 'demo',
      samples,
      route,
      pressure_zones: [
        { zone: 'heel_l', pct: 22 + Math.round(rand() * 8) },
        { zone: 'mid_l', pct: 26 + Math.round(rand() * 8) },
        { zone: 'fore_l', pct: 22 + Math.round(rand() * 8) },
        { zone: 'heel_r', pct: 20 + Math.round(rand() * 8) },
        { zone: 'mid_r', pct: 27 + Math.round(rand() * 8) },
        { zone: 'fore_r', pct: 23 + Math.round(rand() * 8) },
      ],
    });
  }

  const measurements = [];
  for (let d = 6; d >= 0; d -= 1) {
    const base = new Date(now - d * day);
    [8, 12, 18, 21].forEach((hour, idx) => {
      for (let i = 0; i < 6; i += 1) {
        const at = new Date(base);
        at.setHours(hour, i * 9, 0, 0);
        const load = idx === 2 ? 26 : 8;
        measurements.push({
          metric: 'bpm',
          value: Math.round(72 + rand() * 18 + load),
          unit: 'bpm',
          quality: rand() > 0.9 ? 'medium' : 'high',
          source: 'demo',
          measured_at: at.toISOString(),
        });
        if (i % 2 === 0) {
          measurements.push({
            metric: 'spo2',
            value: Math.round(95 + rand() * 3),
            unit: '%',
            quality: 'high',
            source: 'demo',
            measured_at: at.toISOString(),
          });
          measurements.push({
            metric: 'temp_c',
            value: Math.round((36.3 + rand() * 0.6) * 10) / 10,
            unit: '°C',
            quality: 'medium',
            source: 'demo',
            measured_at: at.toISOString(),
          });
        }
      }
    });
  }

  const energyLogs = [];
  for (let d = 6; d >= 0; d -= 1) {
    const base = new Date(now - d * day);
    for (let i = 0; i < 24; i += 1) {
      const at = new Date(base);
      at.setHours(i, 0, 0, 0);
      const active = i >= 7 && i <= 20;
      const power = active ? 2.4 + rand() * 5.6 : 0.2 + rand() * 0.5;
      energyLogs.push({
        power_mw: Math.round(power * 10) / 10,
        energy_mwh: Math.round(power * 60 * 10) / 10,
        voltage_v: Math.round((3.9 + rand() * 0.5) * 100) / 100,
        current_ma: Math.round(20 + rand() * 90),
        battery_pct: Math.min(100, Math.round(58 + d * -1.2 + rand() * 8)),
        consumed_mw: Math.round((18 + rand() * 12) * 10) / 10,
        recorded_at: at.toISOString(),
        source: 'demo',
      });
    }
  }

  return { activities, measurements, energyLogs };
}

/** Live synthetic stream used while demo mode is on. Emits ~1 Hz. */
export function createDemoStream(onSample) {
  const rand = mulberry32(Date.now() % 100000);
  let steps = 3200;
  let energy = 42.5;
  let zone = 0;
  let t = 0;
  const timer = setInterval(() => {
    t += 1;
    steps += 1 + Math.round(rand() * 3);
    const bpm = Math.round(96 + Math.sin(t / 9) * 12 + rand() * 6);
    const telemetry = {
      steps,
      bpm,
      spo2: Math.round(96 + rand() * 2),
      temp_c: Math.round((36.4 + rand() * 0.4) * 10) / 10,
      battery_pct: 76,
      quality: 'high',
      at: new Date().toISOString(),
      source: 'demo',
    };
    const energySample = {
      power_mw: Math.round((3.6 + Math.sin(t / 6) * 2 + rand() * 1.6) * 10) / 10,
      voltage_v: 3.94 + rand() * 0.05,
      current_ma: Math.round(60 + rand() * 40),
      energy_mwh: (energy += 0.06 + rand() * 0.05),
      battery_pct: 76,
      at: new Date().toISOString(),
      source: 'demo',
    };
    zone = (zone + 1) % 6;
    const base = [30, 24, 21, 27, 22, 19];
    const pressure = {
      zones: Object.fromEntries(
        ['heel_l', 'mid_l', 'fore_l', 'heel_r', 'mid_r', 'fore_r'].map((k, i) => [
          k,
          Math.round(base[i] + (i === zone ? 26 : 0) + rand() * 6),
        ]),
      ),
      total_load_g: Math.round(620 + rand() * 180),
      at: new Date().toISOString(),
      source: 'demo',
    };
    onSample({ telemetry, energy: energySample, pressure, source: 'demo' });
  }, 1000);
  return () => clearInterval(timer);
}
