"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RentalCompItem } from "@/types";
import { formatCLP, formatArea, formatPortal } from "@/lib/formatters";

// Fix Leaflet's default icon paths broken by webpack/Next.js bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Sale property pin — blue
const saleIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#2563eb;border:3px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Rental comp pin — gray, highlighted (median) in amber
function compIcon(_isMedian: boolean) {
  const bg = "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${bg};border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// Fit map bounds to include all markers on mount
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

interface Props {
  comps: RentalCompItem[];
  propertyLat: number;
  propertyLng: number;
  medianCompId: string | null;
}

export default function CompsMap({ comps, propertyLat, propertyLng, medianCompId }: Props) {
  const compsWithCoords = comps.filter((c) => c.lat != null && c.lng != null);

  const allPoints: [number, number][] = [
    [propertyLat, propertyLng],
    ...compsWithCoords.map((c) => [c.lat!, c.lng!] as [number, number]),
  ];

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden" style={{ height: 380 }}>
      <MapContainer
        center={[propertyLat, propertyLng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds points={allPoints} />

        {/* Sale property pin */}
        <Marker position={[propertyLat, propertyLng]} icon={saleIcon}>
          <Popup>
            <span className="font-semibold text-blue-700">Esta propiedad</span>
          </Popup>
        </Marker>

        {/* Rental comp pins */}
        {compsWithCoords.map((c) => {
          const isMedian = c.id === medianCompId;
          const dist = c.distance_m == null ? null
            : c.distance_m >= 1000 ? `${(c.distance_m / 1000).toFixed(1)} km`
            : `${c.distance_m} m`;
          return (
            <Marker
              key={c.id}
              position={[c.lat!, c.lng!]}
              icon={compIcon(isMedian)}
            >
              <Popup>
                <div className="text-xs space-y-0.5 min-w-[140px]">
                  <p className="font-medium">{formatCLP(c.rent_clp)}/mes</p>
                  <p className="text-gray-500">{formatArea(c.useful_area_m2)} · {c.bedrooms} dorm.</p>
                  {dist && <p className="text-gray-400">{dist}</p>}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {formatPortal(c.portal)}
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {compsWithCoords.length < comps.length && (
        <p className="text-xs text-gray-400 px-3 py-1 bg-gray-50 border-t border-gray-200">
          {comps.length - compsWithCoords.length} comparable(s) sin coordenadas no se muestran en el mapa.
        </p>
      )}
    </div>
  );
}
