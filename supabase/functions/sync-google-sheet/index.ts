import { createClient } from 'npm:@supabase/supabase-js@2';

import { getGoogleAccessToken } from '../_shared/google.ts';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const BATCH_SIZE = 500;
const HEADER = [
  'Device ID',
  'Timestamp',
  'Latitude',
  'Longitude',
  'Accuracy',
  'Altitude',
  'Speed',
  'Heading',
];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID') ?? '10VCfYb0pfZnw8mJkm5zgX76CHussUA8i52BhDTATvWQ';
    const range = Deno.env.get('GOOGLE_SHEET_RANGE') ?? 'Sheet1!A1';
    if (!supabaseUrl || !serviceKey || !sheetId) {
      return json({ success: false, error: 'Missing GOOGLE_SHEET_ID or Supabase secrets' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('locations')
      .select(
        'id, device_id, latitude, longitude, accuracy, altitude, speed, heading, recorded_at, devices!inner(device_identifier)',
      )
      .eq('sheet_synced', false)
      .order('recorded_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      return json({ success: false, error: error.message }, 500);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return json({ success: true, appended: 0, ids: [] });
    }

    const values = rows.map((row) => {
      const device = row.devices as { device_identifier?: string } | { device_identifier?: string }[] | null;
      const identifier = Array.isArray(device)
        ? device[0]?.device_identifier
        : device?.device_identifier;
      return [
        identifier ?? row.device_id,
        row.recorded_at,
        row.latitude,
        row.longitude,
        row.accuracy,
        row.altitude,
        row.speed,
        row.heading,
      ];
    });

    const accessToken = await getGoogleAccessToken([SHEETS_SCOPE]);

    // Ensure header row exists when the sheet is empty.
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A1:H1')}`;
    const metaResponse = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaResponse.ok) {
      const meta = (await metaResponse.json()) as { values?: string[][] };
      if (!meta.values || meta.values.length === 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A1')}:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [HEADER] }),
          },
        );
      }
    }

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const sheetsResponse = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });
    if (!sheetsResponse.ok) {
      return json(
        { success: false, error: `Sheets API ${sheetsResponse.status}: ${await sheetsResponse.text()}` },
        502,
      );
    }

    const ids = rows.map((row) => row.id);
    const { error: updateError } = await supabase
      .from('locations')
      .update({ sheet_synced: true })
      .in('id', ids);
    if (updateError) {
      return json({ success: false, error: updateError.message }, 500);
    }

    return json({ success: true, appended: ids.length, ids });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
