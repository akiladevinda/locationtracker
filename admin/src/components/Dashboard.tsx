"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminLocations, deleteAdminLocations, type DeleteLocationsMode } from "@/lib/api";
import type { AdminDevice, AdminLocation } from "@/lib/types";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      Loading Sri Lanka map…
    </div>
  ),
});

function formatNumber(value: number | null, digits = 2, suffix = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

export default function Dashboard() {
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [hours, setHours] = useState("24");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteLocationsMode>("time_window");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sinceHours = Number(hours);
      const since =
        Number.isFinite(sinceHours) && sinceHours > 0
          ? new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
          : undefined;
      const data = await fetchAdminLocations({
        limit: 1000,
        deviceId: deviceId || undefined,
        since,
      });
      setLocations(data.locations ?? []);
      setDevices(data.devices ?? []);
      setUpdatedAt(new Date().toLocaleTimeString());
      if (data.locations?.[0]) {
        setSelectedId((current) => current ?? data.locations![0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [deviceId, hours]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const selected = useMemo(
    () => locations.find((item) => item.id === selectedId) ?? null,
    [locations, selectedId],
  );

  async function runDelete(): Promise<void> {
    if (!deviceId) {
      setDeleteMessage("Select a device first.");
      return;
    }
    if (!deletePassword.trim()) {
      setDeleteMessage("Enter the delete password.");
      return;
    }

    const label =
      deleteMode === "all"
        ? "ALL records for this device"
        : deleteMode === "older_than_1h"
          ? "records older than 1 hour"
          : hours === "0"
            ? "ALL records for this device (time window = All)"
            : `records in the last ${hours} hour(s)`;

    const confirmed = window.confirm(
      `Delete ${label}?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteMessage(null);
    try {
      const result = await deleteAdminLocations({
        password: deletePassword.trim(),
        deviceId,
        mode: deleteMode,
        hours: Number(hours),
      });
      setDeleteMessage(`Deleted ${result.deleted} row(s).`);
      setDeletePassword("");
      await load();
    } catch (err) {
      setDeleteMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
              Internal admin
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">Location Tracker · Sri Lanka</h1>
            <p className="mt-1 text-sm text-slate-500">
              Free OpenStreetMap · auto-refresh every 60s
              {updatedAt ? ` · updated ${updatedAt}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">Filters</h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-500">Device</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
              >
                <option value="">All devices</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {(device.name || "device") + " · " + device.device_identifier.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Time window</span>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              >
                <option value="1">Last 1 hour</option>
                <option value="6">Last 6 hours</option>
                <option value="24">Last 24 hours</option>
                <option value="72">Last 3 days</option>
                <option value="168">Last 7 days</option>
                <option value="0">All loaded</option>
              </select>
            </label>
          </section>

          {deviceId ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <h2 className="mb-2 font-semibold text-red-900">Delete records</h2>
              <p className="mb-3 text-xs text-red-700">
                Requires password. Deletes from Supabase for the selected device only.
              </p>
              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-600">What to delete</span>
                <select
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2"
                  value={deleteMode}
                  onChange={(event) =>
                    setDeleteMode(event.target.value as DeleteLocationsMode)
                  }
                >
                  <option value="time_window">Match time window above</option>
                  <option value="older_than_1h">Older than 1 hour</option>
                  <option value="all">All records for this device</option>
                </select>
              </label>
              <label className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-600">Password</span>
                <input
                  type="password"
                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Delete password"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void runDelete()}
                className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete from Supabase"}
              </button>
              {deleteMessage ? (
                <p className="mt-3 text-sm text-red-800">{deleteMessage}</p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <p className="text-3xl font-bold text-sky-700">{locations.length}</p>
            <p className="text-sm text-slate-500">points shown on map</p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </section>

          {selected ? (
            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <h2 className="mb-2 font-semibold text-sky-900">Selected point</h2>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Time</dt>
                  <dd className="text-right font-medium">
                    {new Date(selected.recordedAt).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Latitude</dt>
                  <dd className="font-mono">{selected.latitude.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Longitude</dt>
                  <dd className="font-mono">{selected.longitude.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Accuracy</dt>
                  <dd>{formatNumber(selected.accuracy, 0, " m")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Altitude</dt>
                  <dd>{formatNumber(selected.altitude, 1, " m")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Speed</dt>
                  <dd>{formatNumber(selected.speed, 2, " m/s")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Heading</dt>
                  <dd>{formatNumber(selected.heading, 0, "°")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Device</dt>
                  <dd className="truncate font-mono text-xs">{selected.deviceIdentifier}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Sheet synced</dt>
                  <dd>{selected.sheetSynced ? "Yes" : "No"}</dd>
                </div>
              </dl>
              <a
                className="mt-3 inline-block text-sm font-semibold text-sky-700 underline"
                href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=16/${selected.latitude}/${selected.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in OpenStreetMap
              </a>
            </section>
          ) : null}
        </aside>

        <section className="space-y-4">
          <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[560px]">
            <LocationMap
              locations={locations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Location details</h2>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Lat</th>
                    <th className="px-3 py-2">Lng</th>
                    <th className="px-3 py-2">Acc</th>
                    <th className="px-3 py-2">Alt</th>
                    <th className="px-3 py-2">Speed</th>
                    <th className="px-3 py-2">Heading</th>
                    <th className="px-3 py-2">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((item) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer border-t border-slate-100 hover:bg-sky-50 ${
                        selectedId === item.id ? "bg-sky-50" : ""
                      }`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(item.recordedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono">{item.latitude.toFixed(5)}</td>
                      <td className="px-3 py-2 font-mono">{item.longitude.toFixed(5)}</td>
                      <td className="px-3 py-2">{formatNumber(item.accuracy, 0, "m")}</td>
                      <td className="px-3 py-2">{formatNumber(item.altitude, 0, "m")}</td>
                      <td className="px-3 py-2">{formatNumber(item.speed, 2)}</td>
                      <td className="px-3 py-2">{formatNumber(item.heading, 0, "°")}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.deviceIdentifier.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                  {locations.length === 0 && !loading ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-slate-500" colSpan={8}>
                        No locations yet. Start tracking on the Android app.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
