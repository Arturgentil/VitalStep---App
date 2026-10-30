import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
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
    if (demoMode) {
      setState({
        loading: false,
        error: null,
        demo: true,
        activities: demoData.activities,
        measurements: demoData.measurements,
        energyLogs: demoData.energyLogs,
      });
      return undefined;
    }
    if (!operatorId) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true, demo: false }));
    Promise.all([
      base44.entities.Activity.filter({ operator_id: operatorId }, { sort: '-started_at', limit: 200 }),
      base44.entities.Measurement.filter({ operator_id: operatorId }, { sort: '-measured_at', limit: 600 }),
      base44.entities.EnergyLog.filter({ operator_id: operatorId }, { sort: '-recorded_at', limit: 600 }),
    ])
      .then(([activities, measurements, energyLogs]) => {
        if (!alive) return;
        setState({
          loading: false,
          error: null,
          demo: false,
          activities: activities.items || [],
          measurements: measurements.items || [],
          energyLogs: energyLogs.items || [],
        });
      })
      .catch((error) => {
        if (alive) setState((s) => ({ ...s, loading: false, error }));
      });
    return () => {
      alive = false;
    };
  }, [operatorId, demoMode, demoData]);

  return state;
}