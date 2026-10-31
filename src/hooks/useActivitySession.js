import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/store';

const INITIAL = {
  status: 'idle', // idle | running | paused
  kind: 'walk',
  startedAt: null,
  elapsed: 0,
  steps: 0,
  distance: 0,
  energy: 0,
  power: 0,
  bpm: null,
  avgBpm: null,
  route: [],
  samples: [],
  zones: null,
  geo: false,
  gpsError: null,
};

/**
 * Live session engine: accumulates only what the transport actually delivers.
 * Distance without GPS is an estimate from step count and stride length, and the
 * UI labels it as such.
 */
export default function useActivitySession() {
  const { live, profile, demoMode } = useApp();
  const liveRef = useRef(live);
  const [state, setState] = useState(INITIAL);
  const timer = useRef(null);
  const geoWatch = useRef(null);
  const acc = useRef({ lastDeviceSteps: null, sessionSteps: 0, energy: 0, bpm: [], samples: [], route: [], zones: null, lastTick: 0 });
  const geoOn = useRef(false);
  const stateRef = useRef(state);
  const elapsedBeforePause = useRef(0);
  const segmentStartedAt = useRef(null);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const strideM = ((profile?.height_cm || 172) * 0.415) / 100;

  const stopGeo = useCallback(() => {
    if (geoWatch.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatch.current);
      geoWatch.current = null;
    }
    geoOn.current = false;
  }, []);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      stopGeo();
    },
    [stopGeo],
  );

  const tick = useCallback(() => {
    const t = liveRef.current?.telemetry;
    const e = liveRef.current?.energy;
    const p = liveRef.current?.pressure;
    const now = Date.now();
    const dt = acc.current.lastTick ? Math.min(5, (now - acc.current.lastTick) / 1000) : 1;
    acc.current.lastTick = now;

    if (e?.power_mw) acc.current.energy += (e.power_mw * dt) / 3600;
    if (p?.zones) acc.current.zones = p.zones;

    let steps = null;
    if (t?.steps != null && Number.isFinite(Number(t.steps))) {
      const rawSteps = Math.max(0, Math.floor(Number(t.steps)));
      const previousSteps = acc.current.lastDeviceSteps;

      if (previousSteps === null) {
        // Primeira leitura: estabelece a referência sem contar passos anteriores.
      } else if (rawSteps >= previousSteps) {
        acc.current.sessionSteps += rawSteps - previousSteps;
      } else {
        // O contador do dispositivo reiniciou.
        acc.current.sessionSteps += rawSteps;
      }

      acc.current.lastDeviceSteps = rawSteps;
      steps = acc.current.sessionSteps;

      if (t.bpm) acc.current.bpm.push(t.bpm);
    }

    setState((s) => {
      const elapsed = segmentStartedAt.current
        ? Math.round(elapsedBeforePause.current + (now - segmentStartedAt.current) / 1000)
        : Math.round(elapsedBeforePause.current);
      const nextSteps = steps ?? s.steps;
      if (elapsed > 0 && elapsed % 5 === 0) {
        acc.current.samples.push({
          t: elapsed,
          bpm: t?.bpm ?? null,
          steps: nextSteps,
          power_mw: e?.power_mw ?? null,
        });
        if (acc.current.samples.length > 400) acc.current.samples.shift();
      }
      const bpmValues = acc.current.bpm;
      return {
        ...s,
        elapsed,
        steps: nextSteps,
        distance: nextSteps * strideM,
        energy: acc.current.energy,
        power: e?.power_mw ?? 0,
        bpm: t?.bpm ?? s.bpm,
        avgBpm: bpmValues.length ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length) : s.avgBpm,
        route: [...acc.current.route],
        zones: acc.current.zones,
      };
    });
  }, [strideM]);

  const start = useCallback(
    (kind = 'walk') => {
      elapsedBeforePause.current = 0;
      segmentStartedAt.current = Date.now();
      const initialSteps = Number(liveRef.current?.telemetry?.steps);
      acc.current = {
        lastDeviceSteps: Number.isFinite(initialSteps) ? Math.max(0, Math.floor(initialSteps)) : null,
        sessionSteps: 0,
        energy: 0,
        bpm: [],
        samples: [],
        route: [],
        zones: liveRef.current?.pressure?.zones ?? null,
        lastTick: Date.now(),
      };
      setState({ ...INITIAL, status: 'running', kind, startedAt: Date.now(), geo: geoOn.current });
      clearInterval(timer.current);
      timer.current = setInterval(tick, 1000);
    },
    [tick],
  );

  const toggleGps = useCallback(
    (enabled) => {
      if (!enabled) {
        stopGeo();
        setState((s) => ({ ...s, geo: false }));
        return;
      }
      if (!navigator.geolocation) {
        setState((s) => ({ ...s, gpsError: 'Geolocalização não disponível neste navegador.' }));
        return;
      }
      geoOn.current = true;
      geoWatch.current = navigator.geolocation.watchPosition(
        (pos) => {
          acc.current.route.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            t: Date.now(),
            accuracy: pos.coords.accuracy,
          });
          if (acc.current.route.length > 2000) acc.current.route.shift();
          setState((s) => ({ ...s, route: [...acc.current.route], gpsError: null }));
        },
        (err) => setState((s) => ({ ...s, gpsError: err.message || 'Permissão de localização negada.' })),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 },
      );
      setState((s) => ({ ...s, geo: true, gpsError: null }));
    },
    [stopGeo],
  );

  const pause = useCallback(() => {
    clearInterval(timer.current);
    if (segmentStartedAt.current !== null) {
      elapsedBeforePause.current += (Date.now() - segmentStartedAt.current) / 1000;
      segmentStartedAt.current = null;
    }
    setState((s) => ({
      ...s,
      status: 'paused',
      elapsed: Math.round(elapsedBeforePause.current),
    }));
  }, []);

  const resume = useCallback(() => {
    segmentStartedAt.current = Date.now();
    acc.current.lastTick = Date.now();
    setState((s) => ({ ...s, status: 'running' }));
    clearInterval(timer.current);
    timer.current = setInterval(tick, 1000);
  }, [tick]);

  const finish = useCallback(() => {
    clearInterval(timer.current);
    stopGeo();
    const s = stateRef.current;
    const endedAt = Date.now();
    const elapsedSeconds = Math.max(0, Math.round(
      elapsedBeforePause.current +
      (segmentStartedAt.current !== null ? (endedAt - segmentStartedAt.current) / 1000 : 0)
    ));
    const bpmValues = acc.current.bpm;
    const summary = {
      kind: s.kind,
      title:
        s.kind === 'run' ? 'Corrida' : s.kind === 'trail' ? 'Trilha' : s.kind === 'custom' ? 'Sessão personalizada' : 'Caminhada',
      started_at: new Date(s.startedAt || Date.now()).toISOString(),
      ended_at: new Date(endedAt).toISOString(),
      duration_s: elapsedSeconds,
      steps: s.steps,
      distance_m: Math.round(s.distance),
      avg_bpm: bpmValues.length ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length) : null,
      max_bpm: bpmValues.length ? Math.max(...bpmValues) : null,
      avg_spo2: null,
      energy_mwh: Math.round(acc.current.energy * 10) / 10,
      avg_power_mw: elapsedSeconds ? Math.round((acc.current.energy / elapsedSeconds) * 3600 * 10) / 10 : null,
      avg_pace_s_km: s.distance > 5 ? Math.round(elapsedSeconds / (s.distance / 1000)) : null,
      source: demoMode ? 'demo' : 'ble',
      samples: acc.current.samples,
      route: acc.current.route.map(({ lat, lng, t }) => ({ lat, lng, t })),
      pressure_zones: acc.current.zones
        ? Object.entries(acc.current.zones).map(([zone, pct]) => ({ zone, pct }))
        : [],
    };
    elapsedBeforePause.current = 0;
    segmentStartedAt.current = null;
    setState({ ...INITIAL });
    return summary;
  }, [demoMode, stopGeo]);

  return { state, start, pause, resume, finish, toggleGps };
}