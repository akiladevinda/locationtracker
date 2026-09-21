import { SETTING_KEYS } from '@/config/constants';
import { UploadRepository } from '@/services/database/uploadRepository';
import { setSetting } from '@/services/database/settingsRepository';
import { isGoogleSignedIn } from '@/services/google/googleAuth';
import { uploadFile } from '@/services/google/googleDrive';
import { logger } from '@/services/logger';
import { isOnline } from '@/services/network/networkService';

export async function uploadPendingAudio(): Promise<void> {
  if (!(await isOnline())) {
    return;
  }
  if (!(await isGoogleSignedIn())) {
    const pending = await UploadRepository.getPendingCount();
    if (pending > 0) {
      logger.info('Drive upload skipped because Google is not connected');
    }
    return;
  }

  const pending = await UploadRepository.getPendingUploads(5);
  for (const item of pending) {
    try {
      await UploadRepository.markUploading(item.id);
      const result = await uploadFile(item.localUri, item.fileName, item.mimeType);
      await UploadRepository.markUploaded(item.id, result.driveFileId);
    } catch (error) {
      await UploadRepository.markFailed(item.id);
      const message = error instanceof Error ? error.message : String(error);
      await setSetting(SETTING_KEYS.lastDriveError, message);
      logger.error('Drive upload failed for queued file', message);
    }
  }
}
