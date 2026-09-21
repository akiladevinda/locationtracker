-- Internal Location Tracker — Supabase schema
-- Run this in the SQL editor or via `supabase db push`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY,
  device_identifier TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sheet_synced BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_locations_device_id ON public.locations (device_id);
CREATE INDEX IF NOT EXISTS idx_locations_recorded_at ON public.locations (recorded_at);
CREATE INDEX IF NOT EXISTS idx_locations_device_recorded ON public.locations (device_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_locations_sheet_synced ON public.locations (sheet_synced) WHERE sheet_synced = FALSE;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Mobile clients use the anon key only to invoke Edge Functions.
-- Direct table access is denied. The Edge Functions use the service role key.
REVOKE ALL ON public.devices FROM anon, authenticated;
REVOKE ALL ON public.locations FROM anon, authenticated;
