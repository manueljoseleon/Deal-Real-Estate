"use client";

import type { YieldMatrixResponse } from "@/types";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Depto",
  house: "Casa",
  studio: "Studio",
};

function yieldColor(yield_pct: number): string {
  if (yield_pct >= 6) return "bg-emerald-600 text-white";
  if (yield_pct >= 5) return "bg-emerald-400 text-white";
  if (yield_pct >= 4) return "bg-lime-300 text-gray-800";
  if (yield_pct >= 3) return "bg-yellow-200 text-gray-800";
  if (yield_pct >= 2) return "bg-orange-200 text-gray-800";
  return "bg-red-200 text-gray-800";
}

interface Props {
  data: YieldMatrixResponse;
}

export default function YieldMatrix({ data }: Props) {
  if (!data.matrix.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Yield por Tipo y Dormitorios</h2>
        <p className="text-sm text-gray-400">Sin datos suficientes para los filtros seleccionados.</p>
      </div>
    );
  }

  // Build axis values
  const types = [...new Set(data.matrix.map((r) => r.property_type))].sort();
  const bedrooms = [...new Set(data.matrix.map((r) => r.bedrooms))].sort((a, b) => a - b);

  // Index by type+bedrooms for O(1) lookup
  const index = new Map(data.matrix.map((r) => [`${r.property_type}:${r.bedrooms}`, r]));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Yield por Tipo y Dormitorios</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Yield bruto mediano por segmento · verde = mayor retorno
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Tipo</th>
              {bedrooms.map((b) => (
                <th key={b} className="text-center text-xs font-semibold text-gray-500 pb-2 px-2">
                  {b >= 5 ? "5+ dorm." : `${b} dorm.`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type}>
                <td className="py-1 pr-4 text-xs font-medium text-gray-700">
                  {PROPERTY_TYPE_LABELS[type] ?? type}
                </td>
                {bedrooms.map((b) => {
                  const cell = index.get(`${type}:${b}`);
                  return (
                    <td key={b} className="py-1 px-2 text-center">
                      {cell ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-semibold ${yieldColor(cell.median_yield)}`}
                          title={`Promedio: ${cell.avg_yield}% · n=${cell.count}`}
                        >
                          {cell.median_yield}%
                        </span>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> ≥6%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> 5–6%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-lime-300 inline-block" /> 4–5%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> 3–4%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> 2–3%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> &lt;2%</span>
        <span className="ml-2 italic">Hover = promedio y muestra</span>
      </div>
    </div>
  );
}
