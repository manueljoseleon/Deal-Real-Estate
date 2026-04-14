import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { computeMedianRentFromComps } from "@/lib/btl";
import DealAnalyzerClient from "@/components/analysis/DealAnalyzerClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uf?: string }>;
}

export default async function AnalyzePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { uf: ufParam } = await searchParams;

  let property;
  let compsMedianRent: number | null = null;
  try {
    const [prop, compsResult] = await Promise.all([
      api.properties.get(id),
      api.properties.comps(id).catch(() => []),
    ]);
    property = prop;
    compsMedianRent = computeMedianRentFromComps(compsResult);
  } catch {
    notFound();
  }

  // If the caller passed ?uf=XXXXX (e.g. from ReviewPanel), use that value so
  // both views use the exact same UF rate and NOI matches perfectly.
  let ufData = { uf_clp: 40000, date: new Date().toISOString().slice(0, 10) };
  const ufFromParam = ufParam ? parseFloat(ufParam) : NaN;
  if (!isNaN(ufFromParam) && ufFromParam > 0) {
    ufData.uf_clp = ufFromParam;
  } else {
    try {
      ufData = await api.analysis.ufValue();
    } catch {
      // stale server or mindicador.cl down — fallback is acceptable
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex gap-2">
        <Link href="/oportunidades" className="hover:text-gray-800">Listado</Link>
        <span>›</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-800 truncate max-w-xs">
          {property.title ?? property.external_id}
        </Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">Calculadora Financiera</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Calculadora Financiera</h1>
        <p className="text-sm text-gray-500 mt-1">
          {property.commune}
          {property.neighborhood && ` · ${property.neighborhood}`}
          {" · "}
          {property.price_uf != null ? `${property.price_uf.toLocaleString("es-CL", { maximumFractionDigits: 0 })} UF` : "precio no disponible"}
        </p>
      </div>

      <DealAnalyzerClient
        property={property}
        ufClp={ufData.uf_clp}
        ufDate={ufData.date}
        compsMedianRent={compsMedianRent}
      />
    </main>
  );
}
