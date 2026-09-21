import { useCallback, useEffect, useState } from 'react';

import {
  isLocationTrackingEnabled,
  restoreTrackingIfNeeded,
  startLocationTracking,
  stopLocationTracking,
} from '@/services/location/locationService';
import { toErrorMessage } from '@/types/errors';

export function useTracking() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setEnabled(await isLocationTrackingEnabled());
  }, []);

  useEffect(() => {
    void restoreTrackingIfNeeded().finally(() => {
      void refresh();
    });
  }, [refresh]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    setEnabled(true);
    try {
      await startLocationTracking();
      await refresh();
    } catch (err) {
      setEnabled(false);
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const stop = useCallback(async () => {
    // Flip UI immediately so Stop never feels stuck.
    setEnabled(false);
    setBusy(false);
    setError(null);
    try {
      await stopLocationTracking();
    } catch (err) {
      setError(toErrorMessage(err));
      await refresh();
    }
  }, [refresh]);

  return { enabled, busy, error, start, stop, refresh };
}
