import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/store';

/**
 * Loads the operator's real records, or the isolated demo dataset when demo mode is on.
 * Demo and real data never coexist in the same response.
 */
export default function useTelemetryData() {
  const { operatorId, demoMode, demoData } = useApp();

  const [state, setState] = useState({
    loading: true,
    error: null,
    demo: demoMode,
    activities: [],
    measurements: [],
    energyLogs: [],
  });

  useEffect(() => {
    let alive = true;

    if (demoMode) {
      setState({
        loading: false,
        error: null,
        demo: true,
        activities: demoData.activities,
        measurements: demoData.measurements,
        energyLogs: demoData.energyLogs,
      });

      return () => {
        alive = false;
      };
    }

    if (!operatorId || !supabase) {
      setState({
        loading: false,
        error: null,
        demo: false,
        activities: [],
        measurements: [],
        energyLogs: [],
      });

      return () => {
        alive = false;
      };
    }

    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
      demo: false,
    }));

    async function loadTelemetry() {
      try {
        const [activitiesResult, measurementsResult, energyResult] =
          await Promise.all([
            supabase
              .from('activities')
              .select('*')
              .eq('operator_id', operatorId)
              .order('started_at', { ascending: false })
              .limit(200),

            supabase
              .from('measurements')
              .select('*')
              .eq('operator_id', operatorId)
              .order('measured_at', { ascending: false })
              .limit(600),

            supabase
              .from('energy_logs')
              .select('*')
              .eq('operator_id', operatorId)
              .order('recorded_at', { ascending: false })
              .limit(600),
          ]);

        const results = [
          activitiesResult,
          measurementsResult,
          energyResult,
        ];

        const failedResult = results.find((result) => result.error);

        if (failedResult) {
          throw failedResult.error;
        }

        if (!alive) return;

        setState({
          loading: false,
          error: null,
          demo: false,
          activities: activitiesResult.data ?? [],
          measurements: measurementsResult.data ?? [],
          energyLogs: energyResult.data ?? [],
        });
      } catch (error) {
        if (!alive) return;

        setState((previous) => ({
          ...previous,
          loading: false,
          error,
          demo: false,
        }));
      }
    }

    loadTelemetry();

    return () => {
      alive = false;
    };
  }, [operatorId, demoMode, demoData]);

  return state;
}
