import { AppState } from 'react-native';

import { DEFAULT_RETENTION_DAYS, SETTING_KEYS } from '@/config/constants';
import { getDatabase } from '@/services/database/database';
import { LocationRepository } from '@/services/database/locationRepository';
import { getSettingNumber } from '@/services/database/settingsRepository';
import { getOrCreateDeviceId } from '@/services/device/deviceId';
import { restoreTrackingIfNeeded } from '@/services/location/locationService';
import { logger } from '@/services/logger';
import { startNetworkMonitor, subscribeToNetwork } from '@/services/network/networkService';
import { syncService } from '@/services/sync/syncService';

let bootstrapped = false;
let unsubscribeNetwork: (() => void) | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export async function bootstrapApp(): Promise<void> {
  if (bootstrapped) {
    return;
  }

  try {
    // Open + migrate through the serial queue before anything else touches SQLite.
    await getDatabase();
    await getOrCreateDeviceId();
    try {
      const retentionDays = await getSettingNumber(SETTING_KEYS.retentionDays, DEFAULT_RETENTION_DAYS);
      const deleted = await LocationRepository.deleteOldUploadedLocations(retentionDays);
      if (deleted > 0) {
        logger.info('retention cleanup deleted uploaded rows', String(deleted));
      }
    } catch (error) {
      logger.warn('Retention cleanup skipped', error);
    }
  } catch (error) {
    logger.error('Bootstrap failed while opening storage', error);
    throw error;
  }

  bootstrapped = true;

  // Network + sync only after DB is ready (avoids startup lock storms).
  startNetworkMonitor();
  unsubscribeNetwork = subscribeToNetwork((online) => {
    if (online) {
      void syncService.syncNow().catch(() => undefined);
    }
  });
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void restoreTrackingIfNeeded().catch(() => undefined);
      void syncService.syncNow().catch(() => undefined);
    }
  });

  try {
    await restoreTrackingIfNeeded();
  } catch (error) {
    logger.warn('Could not restore tracking on launch', error);
  }

  syncService.start();
  // Always flush pending uploads as soon as the app is usable.
  void syncService.syncNow().catch(() => undefined);
}

export function teardownApp(): void {
  unsubscribeNetwork?.();
  unsubscribeNetwork = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  syncService.stop();
  bootstrapped = false;
}
