export interface MapMarker {
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
  /** eligible / ineligible: donors; center; ok / low / critical: center colored by its reserves; me: the viewer. */
  kind?: "eligible" | "ineligible" | "center" | "ok" | "low" | "critical" | "me";
}

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  large?: boolean;
}
