import type { Metadata } from "next";
import { Suspense } from "react";
import MercadoClient from "./MercadoClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Análisis de Mercado — Deal Inmobiliario",
  description: "Visualizaciones de cap rates y oportunidades de inversión inmobiliaria en Chile.",
};

export default function MercadoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Cargando...</div>}>
      <MercadoClient />
    </Suspense>
  );
}
