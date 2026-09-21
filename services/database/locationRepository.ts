import { DEFAULT_RETENTION_DAYS, SETTING_KEYS } from '@/config/constants';
import { withDatabase } from '@/services/database/database';
import { nowIso } from '@/services/ids';
import type { LocationInsert, LocationRecord, SyncStatus } from '@/types/location';

interface LocationRow {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  created_at: string;
  uploaded_at: string | null;
  sync_status: SyncStatus;
}

function mapRow(row: LocationRow): LocationRecord {
  return {
    id: row.id,
    deviceId: row.device_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    speed: row.speed,
    heading: row.heading,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at,
    syncStatus: row.sync_status,
  };
}

export const LocationRepository = {
  async insertLocation(input: LocationInsert): Promise<void> {
    await this.insertLocations([input]);
  },

  async insertLocations(inputs: LocationInsert[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await withDatabase(async (db) => {
      const createdAt = nowIso();
      for (const input of inputs) {
        await db.runAsync(
          `INSERT OR IGNORE INTO locations (
            id, device_id, latitude, longitude, accuracy, altitude, speed, heading,
            recorded_at, created_at, uploaded_at, sync_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending')`,
          [
            input.id,
            input.deviceId,
            input.latitude,
            input.longitude,
            input.accuracy,
            input.altitude,
            input.speed,
            input.heading,
            input.recordedAt,
            createdAt,
          ],
        );
      }
      const last = inputs[inputs.length - 1];
      await db.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [
          SETTING_KEYS.lastLocationJson,
          JSON.stringify({
            latitude: last.latitude,
            longitude: last.longitude,
            recordedAt: last.recordedAt,
          }),
        ],
      );
    });
  },

  async getPendingLocations(limit: number): Promise<LocationRecord[]> {
    return withDatabase(async (db) => {
      const rows = await db.getAllAsync<LocationRow>(
        `SELECT * FROM locations
         WHERE sync_status IN ('pending', 'failed')
         ORDER BY recorded_at ASC
         LIMIT ?`,
        [limit],
      );
      return rows.map(mapRow);
    });
  },

  async markUploaded(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await withDatabase(async (db) => {
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE locations
         SET sync_status = 'uploaded', uploaded_at = ?
         WHERE id IN (${placeholders})`,
        [nowIso(), ...ids],
      );
    });
  },

  async markFailed(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await withDatabase(async (db) => {
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE locations SET sync_status = 'failed' WHERE id IN (${placeholders})`,
        [...ids],
      );
    });
  },

  async getPendingCount(): Promise<number> {
    return withDatabase(async (db) => {
      const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM locations WHERE sync_status IN ('pending', 'failed')`,
      );
      return row?.count ?? 0;
    });
  },

  async getRecentLocations(limit: number, offset: number): Promise<LocationRecord[]> {
    return withDatabase(async (db) => {
      const rows = await db.getAllAsync<LocationRow>(
        `SELECT * FROM locations ORDER BY recorded_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      );
      return rows.map(mapRow);
    });
  },

  async getLatestLocation(): Promise<LocationRecord | null> {
    return withDatabase(async (db) => {
      const row = await db.getFirstAsync<LocationRow>(
        `SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 1`,
      );
      return row ? mapRow(row) : null;
    });
  },

  async getDashboardSnapshot(): Promise<{
    pendingLocations: number;
    pendingFiles: number;
    latest: LocationRecord | null;
    lastSyncAt: string | null;
    lastApiError: string | null;
  }> {
    return withDatabase(async (db) => {
      const pendingLocations =
        (
          await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM locations WHERE sync_status IN ('pending', 'failed')`,
          )
        )?.count ?? 0;
      const pendingFiles =
        (
          await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM uploads WHERE sync_status IN ('pending', 'failed', 'uploading')`,
          )
        )?.count ?? 0;
      const latestRow = await db.getFirstAsync<LocationRow>(
        `SELECT * FROM locations ORDER BY recorded_at DESC LIMIT 1`,
      );
      const lastSyncAt =
        (
          await db.getFirstAsync<{ value: string | null }>(
            'SELECT value FROM app_settings WHERE key = ?',
            [SETTING_KEYS.lastSyncAt],
          )
        )?.value ?? null;
      const lastApiError =
        (
          await db.getFirstAsync<{ value: string | null }>(
            'SELECT value FROM app_settings WHERE key = ?',
            [SETTING_KEYS.lastApiError],
          )
        )?.value ?? null;
      return {
        pendingLocations,
        pendingFiles,
        latest: latestRow ? mapRow(latestRow) : null,
        lastSyncAt,
        lastApiError: lastApiError && lastApiError.length > 0 ? lastApiError : null,
      };
    });
  },

  async deleteOldUploadedLocations(retentionDays = DEFAULT_RETENTION_DAYS): Promise<number> {
    return withDatabase(async (db) => {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const result = await db.runAsync(
        `DELETE FROM locations
         WHERE sync_status = 'uploaded'
           AND uploaded_at IS NOT NULL
           AND uploaded_at < ?`,
        [cutoff],
      );
      return result.changes;
    });
  },

  async getUploadedCount(): Promise<number> {
    return withDatabase(async (db) => {
      const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM locations WHERE sync_status = 'uploaded'`,
      );
      return row?.count ?? 0;
    });
  },
};
