import type { Metadata } from "next";
import { Suspense } from "react";
import { api } from "@/lib/api";
import DashboardClient from "@/app/DashboardClient";
import type { PropertyListResponse } from "@/types";

export const metadata: Metadata = {
  title: "Oportunidades de inversión",
  description:
    "Compara cap rate, yield y flujo de caja de propiedades para invertir en Las Condes, Providencia, Ñuñoa y más comunas de Santiago. Datos actualizados.",
  openGraph: {
    title: "Oportunidades de inversión inmobiliaria en Santiago",
    description:
      "Filtra por cap rate, precio y comuna. Encuentra los departamentos más rentables para comprar y arrendar en Santiago.",
  },
};

// Next.js 15+ passes searchParams as a Promise
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OportunidadesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse URL filter params — defaults match nuqs filterParsers in FilterBar
  const commune = params.commune
    ? (Array.isArray(params.commune) ? params.commune : [params.commune])
    : ["Las Condes", "Providencia"];
  const property_type = typeof params.property_type === "string" ? params.property_type : "apartment";
  const bedrooms = typeof params.bedrooms === "string" ? params.bedrooms : "";
  const min_yield = typeof params.min_yield === "string" ? parseFloat(params.min_yield) : 0;
  const sort_by = typeof params.sort_by === "string" ? params.sort_by : "yield_desc";

  // Prefetch the first page server-side — eliminates the blank loading flash
  let initialData: PropertyListResponse | null = null;
  try {
    initialData = await api.properties.list({
      commune: commune.length ? commune : undefined,
      property_type: property_type || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      min_yield: min_yield || undefined,
      sort_by,
      page: 1,
      page_size: 20,
    });
  } catch {
    // If backend is down during SSR, fall back to client-side fetch gracefully
    initialData = null;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-5 min-h-dvh">
      <div className="flex items-center justify-between">
        <div className="border-l-4 border-teal-700 pl-4">
          <h1
            className="text-3xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            <span className="font-light italic">Oportunidades:</span>{" "}
            <span className="font-bold">Compra para arrendar</span>
          </h1>
          <p
            className="text-xs text-gray-500 mt-0.5 tracking-wide uppercase"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Haz tu búsqueda por{" "}
            <span className="font-bold text-teal-700">Cap Rate</span>
          </p>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "var(--font-josefin)" }}>
            ¿No sabes qué es el Cap Rate?{" "}
            <a href="/aprende" className="text-teal-600 hover:text-teal-800 underline underline-offset-2 font-medium">
              Aprende aquí y mejora tu inversión →
            </a>
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>}>
        <DashboardClient initialData={initialData} />
      </Suspense>
    </main>
  );
}
