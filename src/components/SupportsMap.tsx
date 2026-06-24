"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SupportPublicitaire, EtatSupport } from "@/types/dashboard";

const PIN_COLORS: Record<EtatSupport, string> = {
  Bon: "#10B981",
  Défraichi: "#F59E0B",
  Détérioré: "#EF4444",
};

function buildIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 16px; height: 16px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface SupportsMapProps {
  supports: SupportPublicitaire[];
  onEdit: (support: SupportPublicitaire) => void;
}

export default function SupportsMap({ supports, onEdit }: SupportsMapProps) {
  const withCoords = supports.filter((s) => s.latitude !== null && s.longitude !== null);
  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].latitude as number, withCoords[0].longitude as number]
      : [5.3364, -4.0267];

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((support) => (
        <Marker
          key={support.id}
          position={[support.latitude as number, support.longitude as number]}
          icon={buildIcon(PIN_COLORS[support.etatSupport])}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{support.nomSite}</p>
              <p style={{ margin: 0, color: "#475569" }}>
                {support.typeSupport} — {support.commune}
              </p>
              <p style={{ margin: "4px 0", color: "#475569" }}>État : {support.etatSupport}</p>
              <button
                onClick={() => onEdit(support)}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0B3C53",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Voir / Modifier →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}