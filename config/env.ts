/**
 * Public client config only (never put service-role / DB password here).
 * Fallbacks exist because Gradle release bundling sometimes skips .env inlining.
 */
const FALLBACK_SUPABASE_URL = 'https://qnbcgvnujaasvzjjawtw.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_iovGuHM-USPLQ_D_S8LKbQ_fFNDFOMQ';
const FALLBACK_BACKEND_URL = `${FALLBACK_SUPABASE_URL}/functions/v1`;
const FALLBACK_DRIVE_FOLDER_ID = '18epXfD7u4EN6Tlkmp1bJilnIMTUH2UEc';

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export const env = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL') || FALLBACK_SUPABASE_URL,
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') || FALLBACK_ANON_KEY,
  backendUrl: readEnv('EXPO_PUBLIC_BACKEND_URL') || FALLBACK_BACKEND_URL,
  googleClientId: readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  googleAndroidClientId: readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  googleDriveFolderId: readEnv('EXPO_PUBLIC_GOOGLE_DRIVE_FOLDER_ID') || FALLBACK_DRIVE_FOLDER_ID,
};

export function getDefaultBackendUrl(): string {
  if (env.backendUrl) {
    return env.backendUrl.replace(/\/$/, '');
  }
  if (env.supabaseUrl) {
    return `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1`;
  }
  return FALLBACK_BACKEND_URL;
}

export function isBackendConfigured(): boolean {
  return getDefaultBackendUrl().length > 0 && env.supabaseAnonKey.length > 0;
}
