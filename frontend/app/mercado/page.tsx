"use client";

import dynamic from "next/dynamic";

const MercadoClient = dynamic(() => import("./MercadoClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      Cargando...
    </div>
  ),
});

export default function MercadoPage() {
  return <MercadoClient />;
}
