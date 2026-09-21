import axios, { AxiosError } from 'axios';
import { z } from 'zod';

import { env } from '@/config/env';
import { locationsBatchUrl, resolveBackendUrl } from '@/services/api/endpoints';
import { logger } from '@/services/logger';
import { AppError } from '@/types/errors';
import type { BatchLocationRequest, BatchLocationResponse } from '@/types/api';

const locationSchema = z.object({
  id: z.uuid(),
  deviceId: z.uuid(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracy: z.number().nullable(),
  altitude: z.number().nullable(),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  recordedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid timestamp',
  }),
});

export const batchRequestSchema = z.object({
  deviceId: z.uuid(),
  locations: z.array(locationSchema).min(1).max(200),
});

const batchResponseSchema = z.object({
  success: z.literal(true),
  acceptedIds: z.array(z.string()),
});

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.supabaseAnonKey) {
    headers.Authorization = `Bearer ${env.supabaseAnonKey}`;
    headers.apikey = env.supabaseAnonKey;
  }
  return headers;
}

export function validateBatchRequest(payload: BatchLocationRequest): BatchLocationRequest {
  return batchRequestSchema.parse(payload);
}

export async function postLocationBatch(
  payload: BatchLocationRequest,
): Promise<BatchLocationResponse> {
  const baseUrl = await resolveBackendUrl();
  if (!baseUrl) {
    throw new AppError('backend_unconfigured', 'Backend URL is not configured.');
  }

  const body = validateBatchRequest(payload);

  try {
    const response = await axios.post(locationsBatchUrl(baseUrl), body, {
      headers: authHeaders(),
      timeout: 30_000,
    });
    const parsed = batchResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new AppError('malformed_response', 'Backend returned an unexpected payload.');
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      throw mapAxiosError(error);
    }
    throw new AppError('backend_unavailable', 'Backend request failed', error);
  }
}

function mapAxiosError(error: AxiosError): AppError {
  const status = error.response?.status;
  if (status === 429) {
    return new AppError('rate_limited', 'Backend rate limited the request', error);
  }
  if (status && status >= 500) {
    return new AppError('backend_unavailable', `Backend error ${status}`, error);
  }
  if (error.code === 'ERR_NETWORK' || error.message.includes('Network')) {
    return new AppError('network_unavailable', 'Network unavailable during upload', error);
  }
  logger.error('sync failure', error.message);
  return new AppError('backend_unavailable', error.message || 'Backend request failed', error);
}
