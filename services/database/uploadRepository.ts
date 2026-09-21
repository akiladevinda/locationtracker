import { dbGetAll, dbGetFirst, dbRun } from '@/services/database/database';
import { nowIso } from '@/services/ids';
import type { UploadRecord, UploadSyncStatus } from '@/types/upload';

interface UploadRow {
  id: string;
  local_uri: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  uploaded_at: string | null;
  drive_file_id: string | null;
  sync_status: UploadSyncStatus;
}

function mapRow(row: UploadRow): UploadRecord {
  return {
    id: row.id,
    localUri: row.local_uri,
    fileName: row.file_name,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at,
    driveFileId: row.drive_file_id,
    syncStatus: row.sync_status,
  };
}

export const UploadRepository = {
  async insertUpload(input: {
    id: string;
    localUri: string;
    fileName: string;
    mimeType: string;
  }): Promise<void> {
    await dbRun(
      `INSERT INTO uploads (
        id, local_uri, file_name, mime_type, created_at, uploaded_at, drive_file_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'pending')`,
      [input.id, input.localUri, input.fileName, input.mimeType, nowIso()],
    );
  },

  async getPendingUploads(limit = 10): Promise<UploadRecord[]> {
    const rows = await dbGetAll<UploadRow>(
      `SELECT * FROM uploads
       WHERE sync_status IN ('pending', 'failed')
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit],
    );
    return rows.map(mapRow);
  },

  async markUploading(id: string): Promise<void> {
    await dbRun(`UPDATE uploads SET sync_status = 'uploading' WHERE id = ?`, [id]);
  },

  async markUploaded(id: string, driveFileId: string): Promise<void> {
    await dbRun(
      `UPDATE uploads
       SET sync_status = 'uploaded', uploaded_at = ?, drive_file_id = ?
       WHERE id = ?`,
      [nowIso(), driveFileId, id],
    );
  },

  async markFailed(id: string): Promise<void> {
    await dbRun(`UPDATE uploads SET sync_status = 'failed' WHERE id = ?`, [id]);
  },

  async getPendingCount(): Promise<number> {
    const row = await dbGetFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM uploads WHERE sync_status IN ('pending', 'failed', 'uploading')`,
    );
    return row?.count ?? 0;
  },
};
