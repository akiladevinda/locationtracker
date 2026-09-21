function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export const env = {
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  backendUrl: readEnv('EXPO_PUBLIC_BACKEND_URL'),
  googleClientId: readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  googleAndroidClientId: readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  googleDriveFolderId: readEnv('EXPO_PUBLIC_GOOGLE_DRIVE_FOLDER_ID'),
};

export function getDefaultBackendUrl(): string {
  if (env.backendUrl) {
    return env.backendUrl.replace(/\/$/, '');
  }
  if (env.supabaseUrl) {
    return `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1`;
  }
  return '';
}

export function isBackendConfigured(): boolean {
  return getDefaultBackendUrl().length > 0 && env.supabaseAnonKey.length > 0;
}
