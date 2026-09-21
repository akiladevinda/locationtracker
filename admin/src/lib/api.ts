import type { AdminLocationsResponse } from "@/lib/types";

const DEFAULT_SUPABASE_URL = "https://qnbcgvnujaasvzjjawtw.supabase.co";
const DEFAULT_ADMIN_API_URL = `${DEFAULT_SUPABASE_URL}/functions/v1/admin-locations`;

function resolveAdminApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  if (supabaseUrl.startsWith("http")) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-locations`;
  }

  return DEFAULT_ADMIN_API_URL;
}

export async function fetchAdminLocations(params?: {
  limit?: number;
  deviceId?: string;
  since?: string;
}): Promise<AdminLocationsResponse> {
  const base = resolveAdminApiUrl();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    // Public client key (same as mobile EXPO_PUBLIC_*). Prefer setting on Vercel.
    "sb_publishable_iovGuHM-USPLQ_D_S8LKbQ_fFNDFOMQ";

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(
      "Admin API URL is invalid. In Vercel → Settings → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then Redeploy.",
    );
  }

  url.searchParams.set("limit", String(params?.limit ?? 500));
  if (params?.deviceId) {
    url.searchParams.set("deviceId", params.deviceId);
  }
  if (params?.since) {
    url.searchParams.set("since", params.since);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    cache: "no-store",
  });

  const json = (await response.json()) as AdminLocationsResponse;
  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `Request failed (${response.status})`);
  }
  return json;
}
