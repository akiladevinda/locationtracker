import { z } from 'npm:zod@3.24.2';

export const locationSchema = z.object({
  id: z.string().uuid(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracy: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  recordedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid timestamp',
  }),
});

export const batchSchema = z.object({
  deviceId: z.string().uuid(),
  locations: z.array(locationSchema).min(1).max(200),
});

export type BatchPayload = z.infer<typeof batchSchema>;
