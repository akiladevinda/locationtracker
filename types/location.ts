export type SyncStatus = 'pending' | 'uploaded' | 'failed';

export interface LocationRecord {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  createdAt: string;
  uploadedAt: string | null;
  syncStatus: SyncStatus;
}

export interface LocationInsert {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

export interface LocationService {
  startLocationTracking(): Promise<void>;
  stopLocationTracking(): Promise<void>;
  isLocationTrackingEnabled(): Promise<boolean>;
  requestLocationPermissions(): Promise<LocationPermissionSnapshot>;
  saveLocation(input: LocationInsert): Promise<void>;
  syncLocations(): Promise<void>;
}

export interface LocationPermissionSnapshot {
  foreground: PermissionState;
  background: PermissionState;
  notifications: PermissionState;
  gpsEnabled: boolean;
  canTrackForeground: boolean;
  canTrackBackground: boolean;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';
