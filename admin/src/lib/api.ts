import type { AdminLocationsResponse } from "@/lib/types";

const DEFAULT_SUPABASE_URL = "https://qnbcgvnujaasvzjjawtw.supabase.co";
const DEFAULT_ADMIN_API_URL = `${DEFAULT_SUPABASE_URL}/functions/v1/admin-locations`;
const DEFAULT_DELETE_API_URL = `${DEFAULT_SUPABASE_URL}/functions/v1/admin-delete-locations`;

function resolveSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "sb_publishable_iovGuHM-USPLQ_D_S8LKbQ_fFNDFOMQ"
  );
}

function resolveAdminApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  if (supabaseUrl.startsWith("http")) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-locations`;
  }

  return DEFAULT_ADMIN_API_URL;
}

function resolveDeleteApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ADMIN_DELETE_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  if (supabaseUrl.startsWith("http")) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/admin-delete-locations`;
  }

  return DEFAULT_DELETE_API_URL;
}

export async function fetchAdminLocations(params?: {
  limit?: number;
  deviceId?: string;
  since?: string;
}): Promise<AdminLocationsResponse> {
  const base = resolveAdminApiUrl();
  const key = resolveSupabaseKey();

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

export type DeleteLocationsMode = "all" | "older_than_1h" | "time_window";

export async function deleteAdminLocations(input: {
  password: string;
  deviceId: string;
  mode: DeleteLocationsMode;
  hours?: number;
}): Promise<{ deleted: number }> {
  const key = resolveSupabaseKey();
  const response = await fetch(resolveDeleteApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = (await response.json()) as {
    success?: boolean;
    deleted?: number;
    error?: string;
  };

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `Delete failed (${response.status})`);
  }

  return { deleted: json.deleted ?? 0 };
}
