"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useRouter } from "next/navigation";
import type { MapPinItem } from "@/types";
import { formatUF } from "@/lib/formatters";

// Fix Leaflet default icon broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Pin colors per yield band
const bandColor: Record<string, string> = {
  excellent: "#16a34a",
  good:      "#4ade80",
  moderate:  "#facc15",
  weak:      "#ef4444",
};

function propertyIcon(band: string | null | undefined, isHovered: boolean, grossYieldPct: number | null) {
  const bg = band ? (bandColor[band] ?? "#6b7280") : "#6b7280";

  if (isHovered && grossYieldPct != null) {
    // Pill-shaped label showing Cap Rate % when hovered
    const label = `${grossYieldPct.toFixed(1)}%`;
    return L.divIcon({
      className: "",
      html: `<div style="
        background:${bg};color:#fff;
        border:2px solid #fff;border-radius:9999px;
        padding:2px 6px;font-size:10px;font-weight:700;
        white-space:nowrap;line-height:1.4;
        box-shadow:0 0 0 3px rgba(20,184,166,0.35),0 2px 6px rgba(0,0,0,0.4);
        transform:translateX(-50%);
      ">${label}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }

  const size = isHovered ? 18 : 13;
  const border = isHovered ? "3px" : "2px";
  const shadow = isHovered
    ? "0 0 0 3px rgba(20,184,166,0.35), 0 2px 6px rgba(0,0,0,0.4)"
    : "0 1px 4px rgba(0,0,0,0.35)";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};border:${border} solid #fff;
      box-shadow:${shadow};
      transition:all 0.15s ease;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

interface Props {
  pins: MapPinItem[];
  hoveredId: string | null;
}

export default function PropertiesMap({ pins, hoveredId }: Props) {
  const router = useRouter();

  const center: [number, number] = pins.length > 0
    ? [pins[0].lat, pins[0].lng]
    : [-33.45, -70.67]; // Santiago fallback

  const allPoints: [number, number][] = pins.map((p) => [p.lat, p.lng]);

  // No pins — show informative empty state
  if (pins.length === 0) {
    return (
      <div className="flex flex-col h-full rounded-xl border border-gray-200 overflow-hidden bg-gray-50 items-center justify-center gap-2 text-center p-6">
        <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
        <p className="text-sm text-gray-500 font-medium">Sin coordenadas</p>
        <p className="text-xs text-gray-400">No hay propiedades con los filtros actuales</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <MapContainer
        center={center}
        zoom={13}
        style={{ flex: 1, minHeight: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds points={allPoints} />

        {pins.map((p) => {
          const isHovered = p.id === hoveredId;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={propertyIcon(p.yield_band, isHovered, p.gross_yield_pct)}
              zIndexOffset={isHovered ? 1000 : 0}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[170px]">
                  {/* Title: bedrooms + commune */}
                  <p className="font-semibold text-gray-800 leading-tight">
                    {[p.bedrooms != null ? `${p.bedrooms}D` : null, p.commune].filter(Boolean).join(" · ")}
                  </p>
                  {/* Price + Cap Rate */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900 tabular-nums">{formatUF(p.price_uf, 0)}</span>
                    {p.gross_yield_pct != null && (
                      <span className="font-bold text-teal-700 tabular-nums">
                        {p.gross_yield_pct.toFixed(1)}% Cap Rate
                      </span>
                    )}
                  </div>
                  {/* Area */}
                  {p.area_m2 != null && (
                    <p className="text-gray-500">{Math.round(p.area_m2)} m²</p>
                  )}
                  <button
                    onClick={() => router.push(`/properties/${p.id}`)}
                    className="w-full text-center text-teal-700 hover:text-teal-900 font-medium cursor-pointer"
                  >
                    Ver propiedad →
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400">
        <span>{pins.length} propiedades en mapa</span>
        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> Excelente</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Moderado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Bajo</span>
        </div>
      </div>
    </div>
  );
}
