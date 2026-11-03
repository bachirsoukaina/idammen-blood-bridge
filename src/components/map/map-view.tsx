import { useEffect, useState, type ComponentType } from 'react';

import type { MapViewProps } from './map-types';

/**
 * Browser-only wrapper around Leaflet. The map module (which imports Leaflet)
 * is loaded dynamically after mount, so SSR never touches browser-only code
 * and the placeholder markup matches between server and client.
 */
export function MapView(props: MapViewProps) {
  const [Inner, setInner] = useState<ComponentType<MapViewProps> | null>(null);

  useEffect(() => {
    let alive = true;
    void import('./map-inner').then((m) => {
      if (alive) setInner(() => m.MapInner);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={`map-frame${props.large ? ' large' : ''}`}>
      {Inner ? (
        <Inner {...props} />
      ) : (
        <div aria-hidden="true" style={{ height: '100%', background: 'var(--muted)' }} />
      )}
    </div>
  );
}
