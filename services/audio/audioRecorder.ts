import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { UploadRepository } from '@/services/database/uploadRepository';
import { createUuid } from '@/services/ids';
import { logger } from '@/services/logger';
import { AppError } from '@/types/errors';
import type { PermissionState } from '@/types/location';

export const CALL_RECORDING_LIMITATION = {
  supported: false,
  reason:
    'Modern Android does not allow a normal third-party app to capture VOICE_CALL audio. Automatic incoming/outgoing call recording is blocked by the platform, Google Play policy, and (on Android 10+) privacy indicators. This app never bypasses those restrictions.',
  alternatives: [
    'Manual microphone recording that the user explicitly starts and stops.',
    'Import of an existing recording file created by the system Phone app or OEM recorder, via the system file picker.',
  ],
} as const;

function mapMicStatus(granted: boolean, status: string): PermissionState {
  if (granted) {
    return 'granted';
  }
  if (status === 'undetermined') {
    return 'undetermined';
  }
  return 'denied';
}

export async function getMicrophonePermission(): Promise<PermissionState> {
  const result = await getRecordingPermissionsAsync();
  return mapMicStatus(result.granted, result.status);
}

export async function requestMicrophonePermission(): Promise<PermissionState> {
  const result = await requestRecordingPermissionsAsync();
  logger.info('permission changes: microphone', result.status);
  return mapMicStatus(result.granted, result.status);
}

export async function prepareAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'duckOthers',
  });
}

function recordingsDirectory(): Directory {
  const directory = new Directory(Paths.document, 'recordings');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

export async function persistRecordingFile(
  sourceUri: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const directory = recordingsDirectory();
  const destination = new File(directory, fileName);
  const source = new File(sourceUri);
  if (!source.exists) {
    throw new AppError('unknown', 'Recording file was not found after stop.');
  }
  if (destination.exists) {
    destination.delete();
  }
  await source.copy(destination);
  await UploadRepository.insertUpload({
    id: createUuid(),
    localUri: destination.uri,
    fileName,
    mimeType,
  });
  logger.info('Queued audio upload', fileName);
  return destination.uri;
}

export async function importExistingAudioFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: ['audio/*', 'application/octet-stream'],
  });
  if (picked.canceled || !picked.result) {
    return null;
  }
  const file = picked.result;
  const fileName = file.name || `imported-${Date.now()}.m4a`;
  const mimeType = file.type || mimeFromName(fileName);
  await persistRecordingFile(file.uri, fileName, mimeType);
  return fileName;
}

function mimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  return 'audio/mp4';
}
