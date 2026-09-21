import { createClient } from 'npm:@supabase/supabase-js@2';

import { batchSchema } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const payload = batchSchema.parse(await request.json());
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: 'Server is missing Supabase credentials' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: deviceError } = await supabase.from('devices').upsert(
      {
        id: payload.deviceId,
        device_identifier: payload.deviceId,
        name: 'android-device',
      },
      { onConflict: 'id' },
    );
    if (deviceError) {
      return json({ success: false, error: deviceError.message }, 500);
    }

    const rows = payload.locations.map((location) => ({
      id: location.id,
      device_id: payload.deviceId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      altitude: location.altitude ?? null,
      speed: location.speed ?? null,
      heading: location.heading ?? null,
      recorded_at: location.recordedAt,
    }));

    // Idempotent: duplicate UUIDs are ignored.
    const { error: insertError } = await supabase.from('locations').upsert(rows, {
      onConflict: 'id',
      ignoreDuplicates: true,
    });
    if (insertError) {
      return json({ success: false, error: insertError.message }, 500);
    }

    const acceptedIds = payload.locations.map((location) => location.id);

    // Best-effort: push new rows to Google Sheets without blocking the phone upload.
    const sheetSync = fetch(`${supabaseUrl}/functions/v1/sync-google-sheet`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }).catch(() => undefined);
    try {
      // Keep the worker alive long enough for Sheets sync on Supabase Edge.
      // @ts-expect-error EdgeRuntime is provided by Supabase/Deno Deploy
      EdgeRuntime.waitUntil(sheetSync);
    } catch {
      void sheetSync;
    }

    return json({ success: true, acceptedIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request';
    return json({ success: false, error: message }, 400);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
