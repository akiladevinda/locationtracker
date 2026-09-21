import * as Location from 'expo-location';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

import { logger } from '@/services/logger';
import type { LocationPermissionSnapshot, PermissionState } from '@/types/location';

function isAndroid13OrNewer(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 33;
}

function mapStatus(status: Location.PermissionStatus | string): PermissionState {
  if (status === 'granted') {
    return 'granted';
  }
  if (status === 'undetermined') {
    return 'undetermined';
  }
  return 'denied';
}

async function getNotificationPermission(): Promise<PermissionState> {
  if (!isAndroid13OrNewer()) {
    return 'granted';
  }
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return granted ? 'granted' : 'denied';
}

export async function getLocationPermissionSnapshot(): Promise<LocationPermissionSnapshot> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  const notifications = await getNotificationPermission();
  let gpsEnabled = true;
  try {
    gpsEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    gpsEnabled = false;
  }

  const snapshot: LocationPermissionSnapshot = {
    foreground: mapStatus(foreground.status),
    background: mapStatus(background.status),
    notifications,
    gpsEnabled,
    canTrackForeground: foreground.status === 'granted' && gpsEnabled,
    canTrackBackground:
      foreground.status === 'granted' && background.status === 'granted' && gpsEnabled,
  };
  return snapshot;
}

export async function requestForegroundLocationPermission(): Promise<PermissionState> {
  const result = await Location.requestForegroundPermissionsAsync();
  logger.info('permission changes: foreground location', result.status);
  return mapStatus(result.status);
}

export async function requestBackgroundLocationPermission(): Promise<PermissionState> {
  const result = await Location.requestBackgroundPermissionsAsync();
  logger.info('permission changes: background location', result.status);
  return mapStatus(result.status);
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!isAndroid13OrNewer()) {
    return 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Location notification',
      message:
        'Android requires a visible notification while background location tracking is running.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  logger.info('permission changes: notifications', result);
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'denied';
  }
  return 'denied';
}

export async function requestLocationPermissions(): Promise<LocationPermissionSnapshot> {
  const foreground = await requestForegroundLocationPermission();
  if (foreground !== 'granted') {
    return getLocationPermissionSnapshot();
  }

  // Android 13+ requires POST_NOTIFICATIONS for the required foreground-service notification.
  await requestNotificationPermission();

  // Android requires foreground location to be granted before background location can be requested.
  await requestBackgroundLocationPermission();
  return getLocationPermissionSnapshot();
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}

export function describePermissionImpact(snapshot: LocationPermissionSnapshot): string[] {
  const notes: string[] = [];
  if (!snapshot.gpsEnabled) {
    notes.push('GPS/location services are off. Location collection cannot run until they are enabled.');
  }
  if (snapshot.foreground !== 'granted') {
    notes.push('Foreground location is denied. The app cannot read GPS at all.');
  }
  if (snapshot.foreground === 'granted' && snapshot.background !== 'granted') {
    notes.push(
      'Background location is denied. Tracking only works while the app is visible, not when it is backgrounded or the screen is locked.',
    );
  }
  if (snapshot.notifications !== 'granted') {
    notes.push(
      'Notification permission is denied. Android may hide or block the required location foreground-service notification, which reduces background reliability.',
    );
  }
  return notes;
}
