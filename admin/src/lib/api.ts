import type { AdminLocationsResponse } from "@/lib/types";

export async function fetchAdminLocations(params?: {
  limit?: number;
  deviceId?: string;
  since?: string;
}): Promise<AdminLocationsResponse> {
  const base =
    process.env.NEXT_PUBLIC_ADMIN_API_URL ??
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-locations`;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const url = new URL(base);
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
