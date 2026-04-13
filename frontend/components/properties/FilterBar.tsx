"use client";

import { useEffect, useState } from "react";
import { useQueryStates, parseAsString, parseAsArrayOf, parseAsInteger, parseAsFloat } from "nuqs";
import { api } from "@/lib/api";
import CommuneMultiSelect from "@/components/mercado/CommuneMultiSelect";
const SORT_OPTIONS = [
  { value: "yield_desc",       label: "Mayor Cap Rate" },
  { value: "price_asc",        label: "Menor precio" },
  { value: "price_desc",       label: "Mayor precio" },
  { value: "price_per_m2_asc", label: "Menor UF/m²" },
  { value: "last_seen_desc",   label: "Más reciente" },
];

// `page` intentionally excluded — infinite scroll manages page as local state
export const filterParsers = {
  commune:       parseAsArrayOf(parseAsString).withDefault(["Las Condes", "Providencia"]),
  property_type: parseAsString.withDefault("apartment"),
  bedrooms:      parseAsString.withDefault(""),
  min_yield:     parseAsFloat.withDefault(0),
  max_yield:     parseAsFloat.withDefault(0),
  min_price:     parseAsInteger.withDefault(0),
  max_price:     parseAsInteger.withDefault(0),
  sort_by:       parseAsString.withDefault("yield_desc"),
};

export function useFilters() {
  // shallow: true — filter changes only update the URL, no SSR re-render.
  // DashboardClient handles all data fetching client-side via useEffect.
  return useQueryStates(filterParsers, { shallow: true });
}

export default function FilterBar() {
  const [filters, setFilters] = useFilters();
  const [communeOptions, setCommuneOptions] = useState<string[]>([]);

  useEffect(() => {
    api.mercado.communes().then((r) => setCommuneOptions(r.communes));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Communes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-josefin)" }}>Comuna</p>
        <CommuneMultiSelect
          options={communeOptions}
          value={filters.commune}
          onChange={(next) => setFilters({ commune: next })}
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Property type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>Tipo</label>
          <select
            value={filters.property_type}
            onChange={(e) => setFilters({ property_type: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Todos</option>
            <option value="apartment">Departamento</option>
            <option value="house">Casa</option>
          </select>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>Dorm.</label>
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

        {/* Cap Rate range */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>Cap Rate mín. (%)</label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={filters.min_yield || ""}
            onChange={(e) => { setFilters({ min_yield: e.target.value ? parseFloat(e.target.value) : 0 }); setFilters({ page: 1 } as Parameters<typeof setFilters>[0]); }}
            placeholder="0"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1" style={{ fontFamily: "var(--font-josefin)" }}>Ordenar por</label>
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters({ sort_by: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={() => setFilters({ commune: ["Las Condes", "Providencia"], property_type: "apartment", bedrooms: "", min_yield: 0, max_yield: 0, min_price: 0, max_price: 0, sort_by: "yield_desc" })}
          className="text-sm text-teal-700 hover:text-teal-900 cursor-pointer underline"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
