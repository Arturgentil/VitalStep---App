import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getOperatorId } from '@/lib/operator';
import { StepVoltBLE, isBluetoothSupported } from '@/lib/ble/StepVoltBLE';
import { buildDemoDataset, createDemoStream } from '@/lib/demo/demoData';

const AppContext = createContext(null);
const DEMO_KEY = 'stepvolt.demo_mode';

export function AppProvider({ children }) {
  const [operatorId, setOperatorId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [demoMode, setDemoModeState] = useState(() => {
    try {
      return localStorage.getItem(DEMO_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [ble, setBle] = useState({
    supported: isBluetoothSupported(),
    status: 'idle',
    detail: null,
    packets: 0,
    duplicates: 0,
    errors: 0,
    rejected: 0,
    rssi: null,
    info: null,
    deviceName: null,
    deviceId: null,
    lastPacketAt: null,
  });
  const [live, setLive] = useState({ telemetry: null, energy: null, pressure: null, source: null, at: null });
  const [events, setEvents] = useState([]);
  const bleRef = useRef(null);

  /* ---------------------------------------------------------------- profile */
  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getOperatorId();
      if (!alive) return;
      setOperatorId(id);
      const rows = await base44.entities.StepVoltProfile.filter({ operator_id: id });
      if (!alive) return;
      setProfile(rows[0] || null);
      setProfileLoading(false);
    })().catch(() => {
      if (alive) setProfileLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const patchProfile = useCallback(
    async (patch) => {
      const id = operatorId || (await getOperatorId());
      if (profile?.id) {
        const updated = await base44.entities.StepVoltProfile.update(profile.id, patch);
        setProfile((prev) => ({ ...prev, ...(updated || patch) }));
        return updated;
      }
      const created = await base44.entities.StepVoltProfile.create({ operator_id: id, ...patch });
      setProfile(created);
      return created;
    },
    [operatorId, profile],
  );

  /* ------------------------------------------------------------------ theme */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', profile?.theme === 'light');
    root.dataset.reducedMotion = profile?.reduced_motion ? 'true' : 'false';
  }, [profile?.theme, profile?.reduced_motion]);

  /* -------------------------------------------------------------- demo mode */
  const setDemoMode = useCallback((value) => {
    setDemoModeState(value);
    try {
      localStorage.setItem(DEMO_KEY, value ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const demoData = useMemo(() => buildDemoDataset(), []);

  /* -------------------------------------------------------------------- BLE */
  const pushEvent = useCallback((evt) => {
    setEvents((prev) => [evt, ...prev].slice(0, 60));
    if (operatorId) {
      base44.entities.DeviceEvent.create({
        operator_id: operatorId,
        kind: evt.kind,
        detail: evt.detail,
        rssi: evt.rssi ?? null,
        at: evt.at || new Date().toISOString(),
      }).catch(() => {});
    }
  }, [operatorId]);

  useEffect(() => {
    const instance = new StepVoltBLE();
    bleRef.current = instance;
    const sync = () => setBle((prev) => ({ ...prev, supported: isBluetoothSupported(), ...instance.snapshot() }));
    const offs = [
      instance.on('status', () => sync()),
      instance.on('rssi', () => sync()),
      instance.on('telemetry', (t) =>
        setLive((prev) => ({ ...prev, telemetry: t, source: 'ble', at: t.at })),
      ),
      instance.on('energy', (e) => setLive((prev) => ({ ...prev, energy: e, source: 'ble', at: e.at }))),
      instance.on('pressure', (p) => setLive((prev) => ({ ...prev, pressure: p, source: 'ble', at: p.at }))),
      instance.on('device-info', () => sync()),
      instance.on('packet', () => sync()),
      instance.on('device-event', (evt) => pushEvent(evt)),
      instance.on('stale', (s) => {
        setBle((prev) => ({
          ...prev,
          status: prev.status === 'connected' ? 'stale' : prev.status,
          detail: `Sem pacotes há ${Math.round(s.sinceMs / 1000)}s`,
        }));
      }),
    ];
    return () => {
      offs.forEach((off) => off && off());
      instance.disconnect({ manual: true }).catch(() => {});
    };
  }, [pushEvent]);

  const connect = useCallback(async () => {
    if (!bleRef.current) return null;
    return bleRef.current.requestDevice();
  }, []);

  const disconnect = useCallback(async () => {
    await bleRef.current?.disconnect({ manual: true });
  }, []);

  const sendCommand = useCallback(async (type, extra) => {
    if (!bleRef.current) throw new Error('Transporte indisponível');
    return bleRef.current.sendCommand(type, extra);
  }, []);

  /* ---------------------------------------------------- demo live stream */
  useEffect(() => {
    if (!demoMode) return undefined;
    setLive((prev) => ({ ...prev, source: 'demo' }));
    const stop = createDemoStream(({ telemetry, energy, pressure }) => {
      if (bleRef.current?.status === 'connected') return; // real device always wins
      setLive({ telemetry, energy, pressure, source: 'demo', at: telemetry.at });
    });
    return stop;
  }, [demoMode]);

  /* -------------------------------------------------------------- online */
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const value = useMemo(
    () => ({
      operatorId,
      profile,
      profileLoading,
      patchProfile,
      refreshProfile: async () => {
        if (!operatorId) return;
        const rows = await base44.entities.StepVoltProfile.filter({ operator_id: operatorId });
        setProfile(rows[0] || null);
      },
      demoMode,
      setDemoMode,
      demoData,
      ble,
      live,
      events,
      connect,
      disconnect,
      sendCommand,
      online,
    }),
    [
      operatorId,
      profile,
      profileLoading,
      patchProfile,
      demoMode,
      setDemoMode,
      demoData,
      ble,
      live,
      events,
      connect,
      disconnect,
      sendCommand,
      online,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}