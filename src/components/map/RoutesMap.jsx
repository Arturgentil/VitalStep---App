import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ACTIVE_COLOR } from '@/lib/geo';

const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY?.trim() || '';
const tileUrl = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`;

function ViewController({ routes, activeId }) {
  const map = useMap();

  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 160);
    return () => clearTimeout(id);
  }, [map]);

  useEffect(() => {
    const target = routes.find((r) => r.id === activeId);
    const points = target ? target.points : routes.flatMap((r) => r.points);
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
      return;
    }
    map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [26, 26], maxZoom: 17 });
  }, [map, routes, activeId]);

  return null;
}

export default function RoutesMap({ routes = [], activeId, onSelect, height = 420 }) {
  const dimOthers = Boolean(activeId);

  return (
    <div className="sv-map relative isolate z-0 overflow-hidden rounded-xl border border-border" style={{ height }}>
      <MapContainer
        center={[-23.5615, -46.6565]}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url={tileUrl}
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />

        {routes.map((route) => {
          const isActive = route.id === activeId;
          return (
            <Polyline
              key={route.id}
              positions={route.points.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: isActive ? ACTIVE_COLOR : route.color,
                weight: isActive ? 5 : 3,
                opacity: dimOthers && !isActive ? 0.28 : 1,
              }}
              eventHandlers={{ click: () => onSelect?.(route.id) }}
            />
          );
        })}

        {routes.map((route) => {
          const first = route.points[0];
          const isActive = route.id === activeId;
          return (
            <CircleMarker
              key={`${route.id}-start`}
              center={[first.lat, first.lng]}
              radius={isActive ? 5 : 3}
              pathOptions={{
                color: '#06121c',
                weight: 1,
                fillColor: route.color,
                fillOpacity: dimOthers && !isActive ? 0.4 : 1,
              }}
            />
          );
        })}

        {routes.map((route) => {
          const last = route.points[route.points.length - 1];
          const isActive = route.id === activeId;
          return (
            <CircleMarker
              key={`${route.id}-end`}
              center={[last.lat, last.lng]}
              radius={isActive ? 5 : 3}
              pathOptions={{
                color: '#06121c',
                weight: 1,
                fillColor: isActive ? ACTIVE_COLOR : '#f8fafc',
                fillOpacity: dimOthers && !isActive ? 0.4 : 1,
              }}
            />
          );
        })}

        <ViewController routes={routes} activeId={activeId} />
      </MapContainer>

      {!routes.length && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            nenhum traçado no filtro
          </span>
        </div>
      )}
    </div>
  );
}
