import * as SecureStore from 'expo-secure-store';

import { DEVICE_ID_SECURE_KEY, SETTING_KEYS } from '@/config/constants';
import { getSetting, setSetting } from '@/services/database/settingsRepository';
import { createUuid } from '@/services/ids';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const fromSettings = await getSetting('device_id');
  if (fromSettings) {
    cachedDeviceId = fromSettings;
    return fromSettings;
  }

  let fromSecure: string | null = null;
  try {
    fromSecure = await SecureStore.getItemAsync(DEVICE_ID_SECURE_KEY, secureOptions);
  } catch {
    fromSecure = null;
  }

  const deviceId = fromSecure ?? createUuid();
  cachedDeviceId = deviceId;
  await setSetting('device_id', deviceId);
  try {
    await SecureStore.setItemAsync(DEVICE_ID_SECURE_KEY, deviceId, secureOptions);
  } catch {
    // SQLite copy is enough for tracking to continue.
  }
  return deviceId;
}

export { SETTING_KEYS };
