import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { getOperatorId } from '@/lib/operator';
import { StepVoltBLE, isBluetoothSupported } from '@/lib/ble/StepVoltBLE';
import { buildDemoDataset, createDemoStream } from '@/lib/demo/demoData';

const AppContext = createContext(null);
const DEMO_KEY = 'stepvolt.demo_mode';

const VALID_EVENT_KINDS = new Set([
  'scan',
  'connect',
  'disconnect',
  'error',
  'notify',
  'command',
]);

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

  const [live, setLive] = useState({
    telemetry: null,
    energy: null,
    pressure: null,
    source: null,
    at: null,
  });

  const [events, setEvents] = useState([]);
  const bleRef = useRef(null);

  /* --------------------------------------------------------------- profile */

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    const id = await getOperatorId();

    if (!id) {
      setOperatorId(null);
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    setOperatorId(id);

    const { data, error } = await supabase
      .from('stepvolt_profiles')
      .select('*')
      .eq('operator_id', id)
      .maybeSingle();

    if (error) throw error;

    setProfile(data);
    setProfileLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!supabase) {
          if (alive) {
            setProfile(null);
            setProfileLoading(false);
          }
          return;
        }

        const id = await getOperatorId();

        if (!alive) return;

        if (!id) {
          setOperatorId(null);
          setProfile(null);
          setProfileLoading(false);
          return;
        }

        setOperatorId(id);

        const { data, error } = await supabase
          .from('stepvolt_profiles')
          .select('*')
          .eq('operator_id', id)
          .maybeSingle();

        if (error) throw error;
        if (!alive) return;

        setProfile(data);
        setProfileLoading(false);
      } catch (error) {
        console.error('[StepVolt] Falha ao carregar perfil:', error);
        if (alive) setProfileLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const patchProfile = useCallback(
    async (patch) => {
      if (!supabase) {
        throw new Error('Supabase não está configurado.');
      }

      const id = operatorId || (await getOperatorId());

      if (!id) {
        throw new Error('É necessário estar autenticado para salvar o perfil.');
      }

      setOperatorId(id);

      const safePatch = { ...patch };

      if (Object.prototype.hasOwnProperty.call(safePatch, 'consent_ai')) {
        safePatch.consent_ai = Boolean(safePatch.consent_ai);
        safePatch.consent_at = safePatch.consent_ai
          ? new Date().toISOString()
          : null;
      } else {
        delete safePatch.consent_at;
      }

      const { data, error } = await supabase
        .from('stepvolt_profiles')
        .upsert(
          {
            ...safePatch,
            operator_id: id,
          },
          { onConflict: 'operator_id' },
        )
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return data;
    },
    [operatorId],
  );

  /* ---------------------------------------------------------------- theme */

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

  const pushEvent = useCallback(
    (evt) => {
      setEvents((prev) => [evt, ...prev].slice(0, 60));

      if (!supabase || !operatorId || !VALID_EVENT_KINDS.has(evt.kind)) {
        return;
      }

      supabase
        .from('device_events')
        .insert({
          operator_id: operatorId,
          kind: evt.kind,
          detail: evt.detail ?? null,
          rssi: evt.rssi ?? null,
          at: evt.at || new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) {
            console.error('[StepVolt] Falha ao salvar evento BLE:', error);
          }
        });
    },
    [operatorId],
  );

  useEffect(() => {
    const instance = new StepVoltBLE();
    bleRef.current = instance;

    const sync = () =>
      setBle((prev) => ({
        ...prev,
        supported: isBluetoothSupported(),
        ...instance.snapshot(),
      }));

    const offs = [
      instance.on('status', sync),
      instance.on('rssi', sync),
      instance.on('telemetry', (t) =>
        setLive((prev) => ({ ...prev, telemetry: t, source: 'ble', at: t.at })),
      ),
      instance.on('energy', (e) =>
        setLive((prev) => ({ ...prev, energy: e, source: 'ble', at: e.at })),
      ),
      instance.on('pressure', (p) =>
        setLive((prev) => ({ ...prev, pressure: p, source: 'ble', at: p.at })),
      ),
      instance.on('device-info', sync),
      instance.on('packet', sync),
      instance.on('device-event', pushEvent),
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
    if (!bleRef.current) {
      throw new Error('Transporte indisponível');
    }

    return bleRef.current.sendCommand(type, extra);
  }, []);

  /* ---------------------------------------------------- demo live stream */

  useEffect(() => {
    if (!demoMode) return undefined;

    setLive((prev) => ({ ...prev, source: 'demo' }));

    const stop = createDemoStream(({ telemetry, energy, pressure }) => {
      if (bleRef.current?.status === 'connected') return;

      setLive({
        telemetry,
        energy,
        pressure,
        source: 'demo',
        at: telemetry.at,
      });
    });

    return stop;
  }, [demoMode]);

  /* -------------------------------------------------------------- online */

  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

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
      refreshProfile,
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
      refreshProfile,
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

  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return ctx;
}
