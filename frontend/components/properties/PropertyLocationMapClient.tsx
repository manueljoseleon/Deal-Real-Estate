"use client";

import { useState, useEffect, type FC } from "react";

interface Props {
  lat: number;
  lng: number;
  label: string;
}

const Placeholder = () => (
  <div
    className="rounded-xl border border-gray-200 bg-gray-100 animate-pulse flex items-center justify-center"
    style={{ height: 280 }}
  >
    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  </div>
);

// Leaflet uses browser-only APIs (window, document) so we can't import it during SSR.
// useEffect only runs on the client, so the dynamic import is safe here.
export default function PropertyLocationMapClient(props: Props) {
  const [MapComponent, setMapComponent] = useState<FC<Props> | null>(null);

  useEffect(() => {
    import("./PropertyLocationMap").then((mod) => {
      setMapComponent(() => mod.default as FC<Props>);
    });
  }, []);

  if (!MapComponent) return <Placeholder />;
  return <MapComponent {...props} />;
}
