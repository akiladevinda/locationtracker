"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import type { AdminLocation } from "@/lib/types";
import { SRI_LANKA_CENTER, SRI_LANKA_ZOOM } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ locations }: { locations: AdminLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) {
      map.setView(SRI_LANKA_CENTER, SRI_LANKA_ZOOM);
      return;
    }
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(
      locations.map((item) => [item.latitude, item.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.2));
  }, [locations, map]);
  return null;
}

export default function LocationMap({
  locations,
  selectedId,
  onSelect,
}: {
  locations: AdminLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={SRI_LANKA_CENTER}
      zoom={SRI_LANKA_ZOOM}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom
    >
      {/* Free OpenStreetMap tiles — no API key */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locations={locations} />
      {locations.map((item) => (
        <Marker
          key={item.id}
          position={[item.latitude, item.longitude]}
          icon={markerIcon}
          opacity={selectedId && selectedId !== item.id ? 0.45 : 1}
          eventHandlers={{
            click: () => onSelect(item.id),
          }}
        >
          <Popup>
            <div className="min-w-[200px] space-y-1 text-sm">
              <p className="font-semibold">{new Date(item.recordedAt).toLocaleString()}</p>
              <p>
                {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
              </p>
              <p>Accuracy: {item.accuracy != null ? `${Math.round(item.accuracy)} m` : "n/a"}</p>
              <p>Altitude: {item.altitude != null ? `${item.altitude.toFixed(1)} m` : "n/a"}</p>
              <p>Speed: {item.speed != null ? `${item.speed.toFixed(2)} m/s` : "n/a"}</p>
              <p>Heading: {item.heading != null ? `${Math.round(item.heading)}°` : "n/a"}</p>
              <p>Device: {item.deviceIdentifier.slice(0, 8)}…</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
