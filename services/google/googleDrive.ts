import axios from 'axios';
import { File } from 'expo-file-system';

import { SETTING_KEYS } from '@/config/constants';
import { env } from '@/config/env';
import { getSetting } from '@/services/database/settingsRepository';
import { getValidAccessToken } from '@/services/google/googleAuth';
import { logger } from '@/services/logger';
import { AppError } from '@/types/errors';
import type { DriveUploadResult } from '@/types/api';

async function resolveFolderId(): Promise<string> {
  const override = await getSetting(SETTING_KEYS.driveFolderId);
  if (override && override.trim().length > 0) {
    return override.trim();
  }
  return env.googleDriveFolderId;
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<DriveUploadResult> {
  const accessToken = await getValidAccessToken();
  const folderId = await resolveFolderId();
  const file = new File(fileUri);
  if (!file.exists) {
    throw new AppError('google_api_error', `Local file does not exist: ${fileName}`);
  }

  const base64 = await file.base64();
  const metadata: Record<string, unknown> = { name: fileName };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = `internaltracker_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n` +
    `--${boundary}--`;

  try {
    const response = await axios.post<{ id: string }>(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        timeout: 60_000,
        maxBodyLength: Infinity,
      },
    );
    const uploadedAt = new Date().toISOString();
    logger.info('Drive upload', response.data.id);
    return {
      driveFileId: response.data.id,
      uploadedAt,
    };
  } catch (error) {
    logger.error('Drive upload failed', error);
    throw new AppError('google_api_error', 'Google Drive upload failed', error);
  }
}
