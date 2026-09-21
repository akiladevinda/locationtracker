import type { LocationInsert } from './location';

export interface BatchLocationRequest {
  deviceId: string;
  locations: LocationInsert[];
}

export interface BatchLocationResponse {
  success: true;
  acceptedIds: string[];
}

export interface ApiErrorBody {
  success?: false;
  error?: string;
  details?: unknown;
}

export interface DriveUploadResult {
  driveFileId: string;
  uploadedAt: string;
}
