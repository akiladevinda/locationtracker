import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '500'), 2000);
    const deviceId = url.searchParams.get('deviceId');
    const since = url.searchParams.get('since');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: 'Server is missing Supabase credentials' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from('locations')
      .select(
        'id, device_id, latitude, longitude, accuracy, altitude, speed, heading, recorded_at, created_at, sheet_synced, devices(device_identifier, name)',
      )
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }
    if (since) {
      query = query.gte('recorded_at', since);
    }

    const { data, error } = await query;
    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    const locations = (data ?? []).map((row) => {
      const device = row.devices as
        | { device_identifier?: string; name?: string }
        | { device_identifier?: string; name?: string }[]
        | null;
      const deviceInfo = Array.isArray(device) ? device[0] : device;
      return {
        id: row.id,
        deviceId: row.device_id,
        deviceIdentifier: deviceInfo?.device_identifier ?? row.device_id,
        deviceName: deviceInfo?.name ?? 'android-device',
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy,
        altitude: row.altitude,
        speed: row.speed,
        heading: row.heading,
        recordedAt: row.recorded_at,
        createdAt: row.created_at,
        sheetSynced: row.sheet_synced,
      };
    });

    const { data: devices } = await supabase
      .from('devices')
      .select('id, device_identifier, name, created_at')
      .order('created_at', { ascending: false });

    return json({
      success: true,
      count: locations.length,
      locations,
      devices: devices ?? [],
    });
  } catch (error) {
    return json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
