"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon broken by webpack/Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#0d9488;border:3px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function SetView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [map, lat, lng]);
  return null;
}

// Leaflet may initialize before the layout has fully settled (e.g. while images
// or fonts are still loading), causing tiles to render at the wrong size or
// leaving grey patches. invalidateSize() triggers a size recalculation and
// redraws any missing tiles.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export default function PropertyLocationMap({ lat, lng, label }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm relative" style={{ height: 280 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <SetView lat={lat} lng={lng} />
        <MapResizer />
        <Marker position={[lat, lng]} icon={pinIcon}>
          <Popup>
            <span className="text-xs font-medium text-gray-800">{label}</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
