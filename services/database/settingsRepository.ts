import { dbGetFirst, dbRun, withDatabase } from '@/services/database/database';

export async function getSetting(key: string): Promise<string | null> {
  const row = await dbGetFirst<{ value: string | null }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await dbRun(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

/** Write several settings in one serial DB turn (avoids lock churn during sync). */
export async function setSettings(entries: Array<{ key: string; value: string }>): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  await withDatabase(async (db) => {
    for (const entry of entries) {
      await db.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [entry.key, entry.value],
      );
    }
  });
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
