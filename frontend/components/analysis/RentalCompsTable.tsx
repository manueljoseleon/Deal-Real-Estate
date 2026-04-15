"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { RentalCompItem, BTLAnalysis } from "@/types";
import { formatCLP, formatUF, formatArea, formatPortal } from "@/lib/formatters";

// Leaflet accesses window — load only on the client, no SSR
const CompsMap = dynamic(() => import("./CompsMap"), { ssr: false });

interface Props {
  comps: RentalCompItem[];
  btl?: BTLAnalysis | null;
  propertyLat?: number | null;
  propertyLng?: number | null;
  compsMedianRent?: number | null;
  saleUsefulAreaM2?: number | null;
}

type Row =
  | { type: "comp"; data: RentalCompItem; rentPerM2: number | null }
  | { type: "sale"; rentPerM2: number | null };

export default function RentalCompsTable({ comps, btl, propertyLat, propertyLng, compsMedianRent, saleUsefulAreaM2 }: Props) {
  const [view, setView] = useState<"list" | "map">("list");

  const canShowMap = propertyLat != null && propertyLng != null;

  // $/m² for the sale property row (median rent / sale area)
  const saleRentPerM2 =
    compsMedianRent != null && saleUsefulAreaM2 != null && saleUsefulAreaM2 > 0
      ? Math.round(compsMedianRent / saleUsefulAreaM2)
      : null;

  if (comps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Sin arriendos comparables encontrados.
      </div>
    );
  }

  // Build unified rows array: comps + sale property row, sorted by $/m² asc
  const rows: Row[] = comps.map((c) => ({
    type: "comp",
    data: c,
    rentPerM2: c.rent_per_m2_clp,
  }));

  // Insert sale row only in list view and when we have median rent
  const saleRow: Row | null =
    compsMedianRent != null
      ? { type: "sale", rentPerM2: saleRentPerM2 }
      : null;

  const allRows: Row[] = saleRow
    ? [...rows, saleRow].sort((a, b) => (a.rentPerM2 ?? Infinity) - (b.rentPerM2 ?? Infinity))
    : [...rows].sort((a, b) => (a.rentPerM2 ?? Infinity) - (b.rentPerM2 ?? Infinity));

  // For the map, we still need the comp list (no sale row in map)
  const medianCompId: string | null = (() => {
    const estimatedRent = btl?.estimated_monthly_rent_clp;
    if (estimatedRent == null) return null;
    let minDiff = Infinity;
    let id: string | null = null;
    for (const c of comps) {
      const rent = c.normalized_rent_clp ?? c.rent_clp;
      if (rent == null) continue;
      const diff = Math.abs(rent - estimatedRent);
      if (diff < minDiff) { minDiff = diff; id = c.id; }
    }
    return id;
  })();

  return (
    <div className="space-y-2">
      {/* Header with list/map toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Arriendos comparables</h2>
        {canShowMap && (
          <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 transition-colors ${
                view === "list" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              ≡ Lista
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                view === "map" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              ⊙ Mapa
            </button>
          </div>
        )}
      </div>

      {/* Map view */}
      {view === "map" && canShowMap && (
        <CompsMap
          comps={comps}
          propertyLat={propertyLat!}
          propertyLng={propertyLng!}
          medianCompId={medianCompId}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-center w-6">#</th>
                  <th className="px-2 py-2 text-left w-28">Ubicación</th>
                  <th className="px-2 py-2 text-right">Área</th>
                  <th className="px-2 py-2 text-right">Dorm.</th>
                  <th className="px-2 py-2 text-right">Arriendo</th>
                  <th className="px-2 py-2 text-right">$/m²</th>
                  <th className="px-2 py-2 text-right">Dist.</th>
                  <th className="px-2 py-2 text-left">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allRows.map((row, i) => {
                  if (row.type === "sale") {
                    return (
                      <tr key="__sale__" className="bg-teal-50 border-y border-teal-200">
                        <td className="px-2 py-2 text-center text-xs text-teal-400 tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-2 py-2 max-w-[7rem]">
                          <p className="text-xs font-bold text-teal-700 truncate">Propiedad en Venta</p>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-teal-700 text-xs font-medium">
                          {saleUsefulAreaM2 != null ? formatArea(saleUsefulAreaM2) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right text-teal-600 text-xs">—</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          <p className="text-xs font-semibold text-teal-700">{formatCLP(compsMedianRent)}</p>
                          <p className="text-xs text-teal-500">Mediana comps</p>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {saleRentPerM2 != null ? (
                            <p className="text-xs font-semibold text-teal-700">{formatCLP(saleRentPerM2)}/m²</p>
                          ) : (
                            <span className="text-xs text-teal-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className="text-xs text-teal-500 italic">← mediana</span>
                        </td>
                        <td className="px-2 py-2 text-xs text-teal-300">—</td>
                      </tr>
                    );
                  }

                  const c = row.data;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-xs text-gray-400 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-2 py-2 text-gray-700 max-w-[7rem]">
                        <p className="truncate text-xs" title={c.neighborhood ?? c.commune ?? ""}>
                          {c.neighborhood ?? c.commune}
                        </p>
                        {c.neighborhood && (
                          <p className="truncate text-xs text-gray-400" title={c.commune ?? ""}>{c.commune}</p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-600 text-xs">
                        {formatArea(c.useful_area_m2)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600 text-xs">
                        {c.bedrooms ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        <p className="text-xs font-medium text-gray-900">{formatCLP(c.rent_clp)}</p>
                        <p className="text-xs text-gray-400">{formatUF(c.rent_uf, 1)}</p>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {c.rent_per_m2_clp != null ? (
                          <>
                            <p className="text-xs font-medium text-gray-900">{formatCLP(c.rent_per_m2_clp)}/m²</p>
                            {c.rent_per_m2_uf != null && (
                              <p className="text-xs text-gray-400">
                                UF {c.rent_per_m2_uf.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-500 text-xs">
                        {c.distance_m == null
                          ? <span className="text-gray-300">—</span>
                          : c.distance_m >= 1000
                            ? `${(c.distance_m / 1000).toFixed(1)} km`
                            : `${c.distance_m} m`}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {formatPortal(c.portal)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 border-t border-gray-100">
              Arriendos comparables se ajustan al tamaño de la propiedad en venta · ordenados por $/m²
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
