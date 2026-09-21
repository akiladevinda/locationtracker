import { useCallback, useEffect, useState } from 'react';

import {
  getLocationPermissionSnapshot,
  requestLocationPermissions,
} from '@/services/location/permissions';
import type { LocationPermissionSnapshot } from '@/types/location';

const empty: LocationPermissionSnapshot = {
  foreground: 'undetermined',
  background: 'undetermined',
  notifications: 'undetermined',
  gpsEnabled: true,
  canTrackForeground: false,
  canTrackBackground: false,
};

export function usePermissions() {
  const [snapshot, setSnapshot] = useState<LocationPermissionSnapshot>(empty);

  const refresh = useCallback(async () => {
    setSnapshot(await getLocationPermissionSnapshot());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async () => {
    const next = await requestLocationPermissions();
    setSnapshot(next);
    return next;
  }, []);

  return { snapshot, refresh, request };
}
