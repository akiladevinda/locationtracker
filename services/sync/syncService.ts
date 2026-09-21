import {
  DEFAULT_AUTO_SYNC_INTERVAL_MS,
  DEFAULT_MAX_SYNC_RETRIES,
  DEFAULT_SYNC_BATCH_SIZE,
  SETTING_KEYS,
} from '@/config/constants';
import { postLocationBatch } from '@/services/api/api';
import { isBackendUrlConfigured } from '@/services/api/endpoints';
import { LocationRepository } from '@/services/database/locationRepository';
import { setSetting, setSettings } from '@/services/database/settingsRepository';
import { getOrCreateDeviceId } from '@/services/device/deviceId';
import { logger } from '@/services/logger';
import { isOnline } from '@/services/network/networkService';
import { backoffDelayMs } from '@/services/sync/syncQueue';
import { uploadPendingAudio } from '@/services/audio/audioUpload';
import { AppError } from '@/types/errors';

function isBusyError(message: string): boolean {
  return /database is locked|SQLITE_BUSY|finalizeAsync|already released/i.test(message);
}

export class SyncService {
  private syncing = false;
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private maxRetries = DEFAULT_MAX_SYNC_RETRIES;
  private loggedMissingBackend = false;
  private lastAutoSyncAt = 0;

  start(): void {
    void this.syncNow();
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
    this.autoSyncTimer = setInterval(() => {
      void this.syncNow().catch(() => undefined);
    }, DEFAULT_AUTO_SYNC_INTERVAL_MS);
    logger.info('auto sync every 30s enabled');
  }

  stop(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  /** Used from background GPS task — uploads at most once per 30s. */
  async syncIfDue(minIntervalMs = DEFAULT_AUTO_SYNC_INTERVAL_MS): Promise<void> {
    const now = Date.now();
    if (now - this.lastAutoSyncAt < minIntervalMs) {
      return;
    }
    this.lastAutoSyncAt = now;
    await this.syncNow();
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  async syncNow(): Promise<void> {
    if (this.syncing) {
      return;
    }
    if (!(await isOnline())) {
      return;
    }

    this.syncing = true;
    this.lastAutoSyncAt = Date.now();
    try {
      const backendReady = await isBackendUrlConfigured();
      if (backendReady) {
        this.loggedMissingBackend = false;
        await this.syncLocations();
      } else {
        try {
          await setSetting(
            SETTING_KEYS.lastApiError,
            'Backend URL is not configured. Add EXPO_PUBLIC_SUPABASE_URL in .env or set Backend URL in Settings.',
          );
        } catch {
          // ignore DB contention while recording config warning
        }
        if (!this.loggedMissingBackend) {
          this.loggedMissingBackend = true;
          logger.warn(
            'Location sync skipped until EXPO_PUBLIC_SUPABASE_ANON_KEY is set in .env (API Keys in Supabase). Locations stay on-device.',
          );
        }
      }
      await this.syncFiles();
      this.retryAttempt = 0;
      if (backendReady) {
        try {
          await setSettings([
            { key: SETTING_KEYS.lastSyncAt, value: new Date().toISOString() },
            { key: SETTING_KEYS.lastApiError, value: '' },
          ]);
        } catch {
          // ignore DB contention after a successful upload
        }
        logger.info('sync success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await setSetting(SETTING_KEYS.lastApiError, message);
      } catch {
        // ignore
      }
      const unconfigured =
        error instanceof AppError && error.code === 'backend_unconfigured';
      if (unconfigured) {
        logger.warn(message);
      } else if (isBusyError(message)) {
        logger.warn('sync deferred — database busy, will retry');
        this.scheduleRetry();
      } else {
        logger.warn('sync failure', message);
        this.scheduleRetry();
      }
    } finally {
      this.syncing = false;
    }
  }

  async syncLocations(): Promise<void> {
    if (!(await isBackendUrlConfigured())) {
      return;
    }
    if (!(await isOnline())) {
      throw new AppError('network_unavailable', 'Network disappeared during location sync.');
    }

    let processed = 0;
    while (await isOnline()) {
      const batch = await LocationRepository.getPendingLocations(DEFAULT_SYNC_BATCH_SIZE);
      if (batch.length === 0) {
        break;
      }

      logger.info('sync batch count', String(batch.length));
      const deviceId = await getOrCreateDeviceId();
      const response = await postLocationBatch({
        deviceId,
        locations: batch.map((item) => ({
          id: item.id,
          deviceId: item.deviceId,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy: item.accuracy,
          altitude: item.altitude,
          speed: item.speed,
          heading: item.heading,
          recordedAt: item.recordedAt,
        })),
      });

      const accepted = new Set(response.acceptedIds);
      const confirmed = batch.map((item) => item.id).filter((id) => accepted.has(id));
      const rejected = batch.map((item) => item.id).filter((id) => !accepted.has(id));

      await LocationRepository.markUploaded(confirmed);
      if (rejected.length > 0) {
        logger.warn('Backend did not accept some location IDs; leaving them pending', rejected.length);
      }
      processed += confirmed.length;

      if (confirmed.length === 0) {
        break;
      }
    }

    logger.info('location sync processed', String(processed));
  }

  async syncFiles(): Promise<void> {
    if (!(await isOnline())) {
      return;
    }
    await uploadPendingAudio();
  }

  private scheduleRetry(): void {
    if (this.retryAttempt >= this.maxRetries) {
      logger.warn('Max sync retries reached. Waiting for the next network event or manual sync.');
      this.retryAttempt = 0;
      return;
    }
    this.retryAttempt += 1;
    const delay = backoffDelayMs(this.retryAttempt);
    logger.info(`retrying sync in ${delay}ms (attempt ${this.retryAttempt})`);
    this.retryTimer = setTimeout(() => {
      void this.syncNow().catch(() => undefined);
    }, delay);
  }
}

export const syncService = new SyncService();
