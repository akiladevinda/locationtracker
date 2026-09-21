import * as TaskManager from 'expo-task-manager';
import type * as Location from 'expo-location';

import { BACKGROUND_LOCATION_TASK } from '@/config/constants';

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

try {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      const { logger } = await import('@/services/logger');
      logger.error('Background location task error', error.message);
      return;
    }

    const taskData = data as LocationTaskData | undefined;
    const locations = taskData?.locations ?? [];
    if (locations.length === 0) {
      return;
    }

    try {
      const { persistLocationsFromTask } = await import('@/services/location/locationService');
      await persistLocationsFromTask(locations);
      // Upload pending points while the background service is alive (throttled to ~30s).
      try {
        const { syncService } = await import('@/services/sync/syncService');
        await syncService.syncIfDue();
      } catch {
        // Never crash the GPS task on a sync/DB race.
      }
    } catch (taskError) {
      const { logger } = await import('@/services/logger');
      logger.error('Background location persist failed', taskError);
    }
  });
} catch (error) {
  console.warn(
    '[tracker] Background location task is unavailable in this runtime (Expo Go). Use a development build for background GPS.',
    error,
  );
}
