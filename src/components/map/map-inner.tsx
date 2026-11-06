import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

import type { MapMarker, MapViewProps } from "./map-types";

const COLORS: Record<string, string> = {
  eligible: "#3a7d5c",
  ineligible: "#8a8a8a",
  center: "#b5332a",
  ok: "#3a7d5c",
  low: "#d9a441",
  critical: "#b5332a",
  me: "#1f3a5f",
};

export function MapInner({ center, zoom = 6, markers }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m: MapMarker, i) => (
        <CircleMarker
          key={`${m.label}-${i}`}
          center={[m.latitude, m.longitude]}
          radius={
            m.kind === "center" || m.kind === "ok" || m.kind === "low" || m.kind === "critical"
              ? 10
              : 7
          }
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: COLORS[m.kind ?? "eligible"],
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>{m.label}</strong>
            {m.detail ? <div>{m.detail}</div> : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
