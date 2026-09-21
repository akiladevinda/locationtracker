export type AdminLocation = {
  id: string;
  deviceId: string;
  deviceIdentifier: string;
  deviceName: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  createdAt: string;
  sheetSynced: boolean;
};

export type AdminDevice = {
  id: string;
  device_identifier: string;
  name: string | null;
  created_at: string;
};

export type AdminLocationsResponse = {
  success: boolean;
  count?: number;
  locations?: AdminLocation[];
  devices?: AdminDevice[];
  error?: string;
};

export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const SRI_LANKA_ZOOM = 7;
