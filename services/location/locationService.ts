import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  BACKGROUND_LOCATION_TASK,
  DEFAULT_DISTANCE_INTERVAL_M,
  DEFAULT_LOCATION_INTERVAL_MS,
  FOREGROUND_SERVICE_NOTIFICATION,
  SETTING_KEYS,
} from '@/config/constants';
import { LocationRepository } from '@/services/database/locationRepository';
import { getSetting, getSettingNumber, setSetting } from '@/services/database/settingsRepository';
import { getOrCreateDeviceId } from '@/services/device/deviceId';
import { createUuid, nowIso } from '@/services/ids';
import {
  getLocationPermissionSnapshot,
  requestLocationPermissions,
} from '@/services/location/permissions';
import { canUseBackgroundTasks } from '@/services/runtime';
import { logger } from '@/services/logger';
import { AppError } from '@/types/errors';
import type {
  LocationInsert,
  LocationPermissionSnapshot,
  LocationRecord,
  LocationService as LocationServiceContract,
} from '@/types/location';

/**
 * Location frequency note:
 *
 * We request High accuracy, a 10 second timeInterval, and a 0 meter distanceInterval.
 * Android does not guarantee that interval. Actual delivery can be slower or batched because of:
 * - Android Doze / App Standby
 * - OEM battery optimization (Xiaomi, Oppo, Samsung, etc.)
 * - The user swiping the app away from Recents (treated as kill on many OEMs)
 * - Foreground-service restrictions on Android 14/15
 * - GPS unavailability (indoors, no fix)
 * - Force-stop from system settings, which permanently stops the service until the app is opened again
 */
function optionalCoordinate(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function sanitizeOptional(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

let foregroundSubscription: Location.LocationSubscription | null = null;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function stopNativeUpdates(): Promise<void> {
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
  try {
    const started = await withTimeout(
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK),
      1500,
    );
    if (started) {
      await withTimeout(Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK), 2500);
    }
  } catch {
    // Task manager is missing in Expo Go, or Android stopped responding.
  }
}

export async function saveLocation(input: LocationInsert): Promise<void> {
  // insertLocation also stores last_location_json in the same DB queue turn.
  await LocationRepository.insertLocation(input);
  logger.info('location recorded', `${input.latitude},${input.longitude}`);
}

export async function persistLocationsFromTask(
  locations: Location.LocationObject[],
): Promise<void> {
  if (locations.length === 0) {
    return;
  }
  try {
    const deviceId = await getOrCreateDeviceId();
    const payloads: LocationInsert[] = locations.map((location) => ({
      id: createUuid(),
      deviceId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: sanitizeOptional(location.coords.accuracy),
      altitude: sanitizeOptional(location.coords.altitude),
      speed: optionalCoordinate(location.coords.speed),
      heading: optionalCoordinate(location.coords.heading),
      recordedAt: new Date(location.timestamp).toISOString(),
    }));
    await LocationRepository.insertLocations(payloads);
    const last = payloads[payloads.length - 1];
    logger.info('location recorded', `${last.latitude},${last.longitude} x${payloads.length}`);
  } catch (error) {
    logger.error('Failed to persist background location', error);
  }
}

async function buildTrackingOptions(): Promise<Location.LocationTaskOptions> {
  const timeInterval = await getSettingNumber(
    SETTING_KEYS.locationIntervalMs,
    DEFAULT_LOCATION_INTERVAL_MS,
  );

  return {
    accuracy: Location.Accuracy.High,
    timeInterval,
    distanceInterval: DEFAULT_DISTANCE_INTERVAL_M,
    deferredUpdatesInterval: 0,
    deferredUpdatesDistance: 0,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: FOREGROUND_SERVICE_NOTIFICATION.notificationTitle,
      notificationBody: FOREGROUND_SERVICE_NOTIFICATION.notificationBody,
      notificationColor: FOREGROUND_SERVICE_NOTIFICATION.notificationColor,
      killServiceOnDestroy: FOREGROUND_SERVICE_NOTIFICATION.killServiceOnDestroy,
    },
  };
}

export async function startLocationTracking(): Promise<void> {
  // Always re-request so "Allow all the time" / background is offered before starting.
  const snapshot = await requestLocationPermissions();
  if (!snapshot.gpsEnabled) {
    throw new AppError('gps_disabled', 'Location services are disabled on this device.');
  }
  if (!snapshot.canTrackForeground) {
    throw new AppError('permission_denied', 'Foreground location permission is required.');
  }

  const canUseBackground = await canUseBackgroundTasks();
  if (canUseBackground && !snapshot.canTrackBackground) {
    throw new AppError(
      'permission_denied',
      'Background location is required. Choose “Allow all the time” (or Allow in settings), then tap Start again.',
    );
  }

  await stopNativeUpdates();

  if (canUseBackground) {
    const options = await buildTrackingOptions();
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, options);
    logger.info('background location tracking started (foreground service)');
  } else {
    // Expo Go cannot run Android background location or a foreground service.
    logger.warn(
      'Background location is unavailable in Expo Go. Recording continues only while the app is visible. Use a development build for background tracking.',
    );
    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: await getSettingNumber(
          SETTING_KEYS.locationIntervalMs,
          DEFAULT_LOCATION_INTERVAL_MS,
        ),
        distanceInterval: DEFAULT_DISTANCE_INTERVAL_M,
      },
      (location) => {
        void persistLocationsFromTask([location]).then(() => {
          void import('@/services/sync/syncService').then(({ syncService }) =>
            syncService.syncIfDue(),
          );
        });
      },
    );
  }

  await setSetting(SETTING_KEYS.trackingEnabled, 'true');
  logger.info('location tracking started');

  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await persistLocationsFromTask([current]);
    const { syncService } = await import('@/services/sync/syncService');
    void syncService.syncNow();
  } catch (error) {
    logger.warn('Could not read an immediate GPS fix', error);
  }
}

export async function stopLocationTracking(): Promise<void> {
  await stopNativeUpdates();
  await setSetting(SETTING_KEYS.trackingEnabled, 'false');
  logger.info('location tracking stopped');
}

export async function isLocationTrackingEnabled(): Promise<boolean> {
  const flag = await getSetting(SETTING_KEYS.trackingEnabled);
  if (foregroundSubscription != null) {
    return true;
  }
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false,
  );
  return flag === 'true' || started;
}

export async function restoreTrackingIfNeeded(): Promise<void> {
  const enabled = await getSetting(SETTING_KEYS.trackingEnabled);
  if (enabled !== 'true') {
    return;
  }
  const snapshot = await getLocationPermissionSnapshot();
  if (!snapshot.canTrackForeground) {
    logger.warn('Saved tracking state is ON, but location permission is no longer granted.');
    return;
  }
  let already = foregroundSubscription != null;
  try {
    already = already || (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK));
  } catch {
    already = already || false;
  }
  if (!already) {
    await startLocationTracking();
  }
}

export async function isBackgroundTaskRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function getLastKnownLocation(): Promise<LocationRecord | null> {
  const latest = await LocationRepository.getLatestLocation();
  if (latest) {
    return latest;
  }
  const cached = await getSetting(SETTING_KEYS.lastLocationJson);
  if (!cached) {
    return null;
  }
  try {
    const parsed = JSON.parse(cached) as {
      latitude: number;
      longitude: number;
      recordedAt: string;
    };
    return {
      id: 'cached',
      deviceId: await getOrCreateDeviceId(),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      accuracy: null,
      altitude: null,
      speed: null,
      heading: null,
      recordedAt: parsed.recordedAt,
      createdAt: parsed.recordedAt,
      uploadedAt: null,
      syncStatus: 'pending',
    };
  } catch {
    return null;
  }
}

export const locationService: LocationServiceContract = {
  startLocationTracking,
  stopLocationTracking,
  isLocationTrackingEnabled,
  requestLocationPermissions,
  saveLocation,
  async syncLocations() {
    const { syncService } = await import('@/services/sync/syncService');
    await syncService.syncLocations();
  },
};

export type { LocationPermissionSnapshot };
export { nowIso };
