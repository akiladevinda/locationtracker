export type UploadSyncStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface UploadRecord {
  id: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  uploadedAt: string | null;
  driveFileId: string | null;
  syncStatus: UploadSyncStatus;
}
