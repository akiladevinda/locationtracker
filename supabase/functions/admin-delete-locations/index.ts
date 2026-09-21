import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Internal admin delete password. Override with ADMIN_DELETE_PASSWORD secret if needed. */
const DELETE_PASSWORD = (Deno.env.get('ADMIN_DELETE_PASSWORD') ?? 'nadeera').trim();

type DeleteMode = 'all' | 'older_than_1h' | 'time_window';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await request.json()) as {
      password?: string;
      deviceId?: string;
      mode?: DeleteMode;
      hours?: number;
    };

    const password = (body.password ?? '').trim();
    if (password !== DELETE_PASSWORD) {
      return json({ success: false, error: 'Incorrect password' }, 401);
    }

    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return json({ success: false, error: 'Select a device first' }, 400);
    }

    const mode: DeleteMode = body.mode ?? 'time_window';
    const hours = Number(body.hours ?? 24);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: 'Server is missing Supabase credentials' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase.from('locations').delete({ count: 'exact' }).eq('device_id', deviceId);

    if (mode === 'older_than_1h') {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query.lt('recorded_at', cutoff);
    } else if (mode === 'time_window') {
      if (!Number.isFinite(hours) || hours <= 0) {
        // "All loaded" with mode time_window → delete all for device
      } else {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte('recorded_at', since);
      }
    }
    // mode === 'all' → no time filter

    const { error, count } = await query;
    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    return json({
      success: true,
      deleted: count ?? 0,
      deviceId,
      mode,
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
