import { dbGetAll, dbExec, dbRun } from '@/services/database/database';
import { nowIso } from '@/services/ids';

export async function insertLog(level: string, message: string): Promise<void> {
  await dbRun('INSERT INTO debug_logs (level, message, created_at) VALUES (?, ?, ?)', [
    level,
    message,
    nowIso(),
  ]);
}

export async function trimLogs(keep: number): Promise<void> {
  await dbRun(
    `DELETE FROM debug_logs WHERE id NOT IN (
      SELECT id FROM debug_logs ORDER BY id DESC LIMIT ?
    )`,
    [keep],
  );
}

export async function getRecentLogs(limit = 200): Promise<
  Array<{ id: number; level: string; message: string; createdAt: string }>
> {
  const rows = await dbGetAll<{
    id: number;
    level: string;
    message: string;
    created_at: string;
  }>('SELECT id, level, message, created_at FROM debug_logs ORDER BY id DESC LIMIT ?', [limit]);
  return rows.map((row) => ({
    id: row.id,
    level: row.level,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function clearLogs(): Promise<void> {
  await dbExec('DELETE FROM debug_logs');
}
