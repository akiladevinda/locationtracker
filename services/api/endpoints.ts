import { env, getDefaultBackendUrl } from '@/config/env';
import { getSetting } from '@/services/database/settingsRepository';
import { SETTING_KEYS } from '@/config/constants';

export const ENDPOINTS = {
  locationsBatch: '/locations-batch',
} as const;

export async function resolveBackendUrl(): Promise<string> {
  const override = await getSetting(SETTING_KEYS.backendUrlOverride);
  if (override && override.trim().length > 0) {
    return override.replace(/\/$/, '');
  }
  return getDefaultBackendUrl();
}

export function locationsBatchUrl(baseUrl: string): string {
  return `${baseUrl}${ENDPOINTS.locationsBatch}`;
}

/** Backend sync needs both the Edge Function base URL and the anon/publishable key. */
export async function isBackendUrlConfigured(): Promise<boolean> {
  const url = await resolveBackendUrl();
  return url.length > 0 && env.supabaseAnonKey.length > 0;
}
