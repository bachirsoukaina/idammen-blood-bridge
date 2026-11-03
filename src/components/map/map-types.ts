export interface MapMarker {
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
  kind?: 'eligible' | 'ineligible' | 'center';
}

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  large?: boolean;
}
