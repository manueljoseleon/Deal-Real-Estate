"use client";

import { useState, useEffect, type FC } from "react";

interface Props {
  lat: number;
  lng: number;
  label: string;
}

const Placeholder = () => (
  <div className="rounded-xl border border-gray-200 bg-gray-50" style={{ height: 280 }} />
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
