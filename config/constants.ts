export const APP_NAME = 'Internal Location Tracker';
export const ANDROID_PACKAGE = 'com.internal.locationtracker';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
export const DATABASE_NAME = 'location_tracker.db';
export const DEVICE_ID_SECURE_KEY = 'persistent_device_id';

/**
 * Desired location interval. Android does not guarantee this exact frequency.
 * See docs/ANDROID_LIMITATIONS.md.
 */
export const DEFAULT_LOCATION_INTERVAL_MS = 10_000;
/** Auto-upload pending GPS points to Supabase while the app process is alive. */
export const DEFAULT_AUTO_SYNC_INTERVAL_MS = 30_000;
export const DEFAULT_DISTANCE_INTERVAL_M = 0;
export const DEFAULT_SYNC_BATCH_SIZE = 200;
export const DEFAULT_SHEETS_BATCH_SIZE = 500;
export const DEFAULT_MAX_SYNC_RETRIES = 6;
export const DEFAULT_RETENTION_DAYS = 7;
export const HISTORY_PAGE_SIZE = 50;
export const LOG_RETENTION_ROWS = 500;

export const FOREGROUND_SERVICE_NOTIFICATION = {
  notificationTitle: 'Location service active',
  notificationBody: 'Location tracking is running',
  notificationColor: '#1D4ED8',
  killServiceOnDestroy: false,
} as const;

export const SETTING_KEYS = {
  consentAccepted: 'consent_accepted',
  trackingEnabled: 'tracking_enabled',
  lastSyncAt: 'last_sync_at',
  lastApiError: 'last_api_error',
  lastLocationJson: 'last_location_json',
  locationIntervalMs: 'location_interval_ms',
  retentionDays: 'retention_days',
  driveFolderId: 'drive_folder_id',
  backendUrlOverride: 'backend_url_override',
  lastDriveError: 'last_drive_error',
} as const;

export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/drive.file',
] as const;

export const GOOGLE_TOKEN_KEYS = {
  accessToken: 'google_access_token',
  refreshToken: 'google_refresh_token',
  expiresAt: 'google_expires_at',
} as const;
