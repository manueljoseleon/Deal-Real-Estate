"use client";

import { useEffect, useState } from "react";
import { useQueryStates, parseAsArrayOf, parseAsString, parseAsInteger } from "nuqs";
import { api } from "@/lib/api";
import type {
  MarketStatsResponse,
  TimeOnMarketResponse,
  YieldMatrixResponse,
  StockConcentrationResponse,
} from "@/types";
import CapRateHistogram from "@/components/mercado/CapRateHistogram";
import OpportunityScatter from "@/components/mercado/OpportunityScatter";
import TimeOnMarketChart from "@/components/mercado/TimeOnMarketChart";
import YieldMatrix from "@/components/mercado/YieldMatrix";
import StockConcentrationChart from "@/components/mercado/StockConcentrationChart";

const COMMUNES = ["Providencia", "Las Condes", "Ñuñoa", "Santiago", "Vitacura", "San Miguel"];

const filterParsers = {
  commune:       parseAsArrayOf(parseAsString).withDefault([]),
  property_type: parseAsString.withDefault(""),
  bedrooms:      parseAsString.withDefault(""),
  min_price:     parseAsInteger.withDefault(0),
  max_price:     parseAsInteger.withDefault(0),
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg font-semibold text-gray-700 mt-8 mb-4 border-b border-gray-100 pb-2"
      style={{ fontFamily: "var(--font-josefin)" }}
    >
      {children}
    </h2>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center h-64 text-gray-400 text-sm font-mono">
      Cargando…
    </div>
  );
}

export default function MercadoClient() {
  const [filters, setFilters] = useQueryStates(filterParsers, { shallow: false });

  // Chart data states
  const [stats, setStats] = useState<MarketStatsResponse | null>(null);
  const [tom, setTom] = useState<TimeOnMarketResponse | null>(null);
  const [yieldMatrix, setYieldMatrix] = useState<YieldMatrixResponse | null>(null);
  const [stockConc, setStockConc] = useState<StockConcentrationResponse | null>(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSprint1, setLoadingSprint1] = useState(true);

  // Filters for the main scatter/histogram (price-aware)
  const statsParams = {
    commune: filters.commune.length ? filters.commune : undefined,
    property_type: filters.property_type || undefined,
    bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
    min_price: filters.min_price || undefined,
    max_price: filters.max_price || undefined,
  };

  // Filters for sprint 1 (no price filter — stock/time analyses shouldn't be price-gated)
  const baseParams = {
    commune: filters.commune.length ? filters.commune : undefined,
    property_type: filters.property_type || undefined,
    bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
  };

  useEffect(() => {
    setLoadingStats(true);
    api.mercado.stats(statsParams).then(setStats).finally(() => setLoadingStats(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.commune, filters.property_type, filters.bedrooms, filters.min_price, filters.max_price]);

  useEffect(() => {
    setLoadingSprint1(true);
    Promise.all([
      api.mercado.timeOnMarket(baseParams).then(setTom),
      api.mercado.yieldMatrix({ commune: baseParams.commune, property_type: baseParams.property_type }).then(setYieldMatrix),
      api.mercado.stockConcentration({ commune: baseParams.commune, property_type: baseParams.property_type }).then(setStockConc),
    ]).finally(() => setLoadingSprint1(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.commune, filters.property_type, filters.bedrooms]);

  function toggleCommune(c: string) {
    const next = filters.commune.includes(c)
      ? filters.commune.filter((x) => x !== c)
      : [...filters.commune, c];
    setFilters({ commune: next });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-2">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Análisis de Mercado
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualizaciones basadas en las propiedades activas del sitio. Usa los filtros para segmentar el análisis.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Communes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-josefin)" }}>
            Comuna
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCommune(c)}
                className={`px-3 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
                  filters.commune.includes(c)
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-teal-400 hover:text-teal-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Property type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>
              Tipo
            </label>
            <select
              value={filters.property_type}
              onChange={(e) => setFilters({ property_type: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Todos</option>
              <option value="apartment">Departamento</option>
              <option value="house">Casa</option>
              <option value="studio">Studio</option>
            </select>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>
              Dorm.
            </label>
            <select
              value={filters.bedrooms}
              onChange={(e) => setFilters({ bedrooms: e.target.value })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Todos</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={String(n)}>{n} dorm.</option>
              ))}
            </select>
          </div>

          {/* Price range — only affects Charts 1 & 2 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>
              Precio mín. (UF)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={filters.min_price || ""}
              onChange={(e) => setFilters({ min_price: e.target.value ? parseInt(e.target.value) : 0 })}
              placeholder="0"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>
              Precio máx. (UF)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={filters.max_price || ""}
              onChange={(e) => setFilters({ max_price: e.target.value ? parseInt(e.target.value) : 0 })}
              placeholder="Sin límite"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Reset */}
          <button
            onClick={() => setFilters({ commune: [], property_type: "", bedrooms: "", min_price: 0, max_price: 0 })}
            className="text-sm text-teal-700 hover:text-teal-900 cursor-pointer underline"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* ── Section 1: Precio y Yield (Charts 1 & 2) ── */}
      <SectionTitle>Distribución de Precios y Yield</SectionTitle>
      {loadingStats ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CapRateHistogram data={stats.histogram} totalProperties={stats.total_properties} />
          <OpportunityScatter data={stats.scatter} />
        </div>
      ) : (
        <p className="text-sm text-gray-400">No hay datos disponibles.</p>
      )}

      {/* ── Section 2: Tiempo en Mercado ── */}
      <SectionTitle>Tiempo en Mercado</SectionTitle>
      {loadingSprint1 ? (
        <LoadingCard />
      ) : tom ? (
        <TimeOnMarketChart data={tom} />
      ) : (
        <p className="text-sm text-gray-400">No hay datos disponibles.</p>
      )}

      {/* ── Section 3: Yield por Segmento + Stock por Comuna ── */}
      <SectionTitle>Yield por Segmento y Stock por Comuna</SectionTitle>
      {loadingSprint1 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {yieldMatrix && <YieldMatrix data={yieldMatrix} />}
          {stockConc && <StockConcentrationChart data={stockConc} />}
        </div>
      )}
    </div>
  );
}
