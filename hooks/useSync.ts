import { useCallback, useEffect, useState } from 'react';

import { LocationRepository } from '@/services/database/locationRepository';
import { syncService } from '@/services/sync/syncService';
import { toErrorMessage } from '@/types/errors';
import type { LocationRecord } from '@/types/location';

export function useSync() {
  const [pendingLocations, setPendingLocations] = useState(0);
  const [pendingFiles, setPendingFiles] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [latest, setLatest] = useState<LocationRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await LocationRepository.getDashboardSnapshot();
      setPendingLocations(snapshot.pendingLocations);
      setPendingFiles(snapshot.pendingFiles);
      setLastSyncAt(snapshot.lastSyncAt);
      setLastError(snapshot.lastApiError);
      setLatest(snapshot.latest);
    } catch {
      // Never crash UI polling on a transient DB lock.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      await syncService.syncNow();
      await refresh();
    } catch (error) {
      setLastError(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return {
    pendingLocations,
    pendingFiles,
    lastSyncAt,
    lastError,
    latest,
    busy,
    syncNow,
    refresh,
  };
}
