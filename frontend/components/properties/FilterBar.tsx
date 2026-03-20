"use client";

import { useQueryStates, parseAsString, parseAsArrayOf, parseAsInteger, parseAsFloat } from "nuqs";

const COMMUNES = ["Providencia", "Las Condes", "Ñuñoa", "Santiago", "Vitacura", "San Miguel"];
const SORT_OPTIONS = [
  { value: "yield_desc",       label: "Mayor yield" },
  { value: "price_asc",        label: "Menor precio" },
  { value: "price_desc",       label: "Mayor precio" },
  { value: "price_per_m2_asc", label: "Menor UF/m²" },
  { value: "last_seen_desc",   label: "Más reciente" },
];

export const filterParsers = {
  commune:       parseAsArrayOf(parseAsString).withDefault([]),
  property_type: parseAsString.withDefault(""),
  bedrooms:      parseAsString.withDefault(""),
  min_yield:     parseAsFloat.withDefault(0),
  max_yield:     parseAsFloat.withDefault(0),
  min_price:     parseAsInteger.withDefault(0),
  max_price:     parseAsInteger.withDefault(0),
  sort_by:       parseAsString.withDefault("yield_desc"),
  page:          parseAsInteger.withDefault(1),
};

export function useFilters() {
  return useQueryStates(filterParsers, { shallow: false });
}

export default function FilterBar() {
  const [filters, setFilters] = useFilters();

  function toggleCommune(c: string) {
    const current = filters.commune;
    const next = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    setFilters({ commune: next, page: 1 });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Communes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comuna</p>
        <div className="flex flex-wrap gap-2">
          {COMMUNES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCommune(c)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filters.commune.includes(c)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {/* Bedrooms */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Dorm.</label>
          <select
            value={filters.bedrooms}
            onChange={(e) => setFilters({ bedrooms: e.target.value, page: 1 })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={String(n)}>{n} dorm.</option>
            ))}
          </select>
        </div>

        {/* Yield range */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Yield mín. (%)</label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={filters.min_yield || ""}
            onChange={(e) => setFilters({ min_yield: e.target.value ? parseFloat(e.target.value) : 0, page: 1 })}
            placeholder="0"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Ordenar por</label>
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters({ sort_by: e.target.value, page: 1 })}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={() => setFilters({ commune: [], property_type: "", bedrooms: "", min_yield: 0, max_yield: 0, min_price: 0, max_price: 0, sort_by: "yield_desc", page: 1 })}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
