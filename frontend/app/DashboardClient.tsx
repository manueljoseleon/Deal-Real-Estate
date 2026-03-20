"use client";

import { useEffect, useState } from "react";
import { useQueryStates, parseAsArrayOf, parseAsString, parseAsInteger, parseAsFloat } from "nuqs";
import { api } from "@/lib/api";
import type { PropertyListResponse } from "@/types";
import FilterBar from "@/components/properties/FilterBar";
import PropertyTable from "@/components/properties/PropertyTable";
import Pagination from "@/components/Pagination";

const filterParsers = {
  commune:   parseAsArrayOf(parseAsString).withDefault([]),
  bedrooms:  parseAsString.withDefault(""),
  min_yield: parseAsFloat.withDefault(0),
  sort_by:   parseAsString.withDefault("yield_desc"),
  page:      parseAsInteger.withDefault(1),
};

export default function DashboardClient() {
  const [filters, setFilters] = useQueryStates(filterParsers, { shallow: false });
  const [data, setData] = useState<PropertyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.properties
      .list({
        commune: filters.commune.length ? filters.commune : undefined,
        bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
        min_yield: filters.min_yield || undefined,
        sort_by: filters.sort_by,
        page: filters.page,
        page_size: 25,
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters.commune, filters.bedrooms, filters.min_yield, filters.sort_by, filters.page]);

  return (
    <div className="space-y-4">
      <FilterBar />

      {/* Stats bar */}
      {data && !loading && (
        <div className="text-sm text-gray-500">
          {data.total.toLocaleString("es-CL")} propiedades
          {filters.commune.length > 0 && ` en ${filters.commune.join(", ")}`}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">
          Error al cargar propiedades: {error}
          <br />
          <span className="text-gray-400">¿Está corriendo el backend en localhost:8000?</span>
        </div>
      ) : data ? (
        <>
          <PropertyTable items={data.items} />
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            onPage={(p) => setFilters({ page: p })}
          />
        </>
      ) : null}
    </div>
  );
}
