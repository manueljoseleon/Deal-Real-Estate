import type { RentalCompItem } from "@/types";
import { formatCLP, formatUF, formatArea, formatPortal } from "@/lib/formatters";

interface Props {
  comps: RentalCompItem[];
}

export default function RentalCompsTable({ comps }: Props) {
  if (comps.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Sin arriendos comparables encontrados.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-gray-800">Arriendos comparables</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Ubicación</th>
              <th className="px-3 py-2 text-right">Área</th>
              <th className="px-3 py-2 text-right">Dorm.</th>
              <th className="px-3 py-2 text-right">Arriendo</th>
              <th className="px-3 py-2 text-right">Distancia</th>
              <th className="px-3 py-2 text-left">Portal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {comps.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">
                  {c.neighborhood ?? c.commune}
                  {c.neighborhood && (
                    <span className="text-xs text-gray-400 ml-1">({c.commune})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                  {formatArea(c.useful_area_m2)}
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {c.bedrooms ?? "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <p className="font-medium text-gray-900">{formatCLP(c.rent_clp)}</p>
                  <p className="text-xs text-gray-400">{formatUF(c.rent_uf, 1)}</p>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500 text-xs">
                  {c.distance_m == null
                    ? <span className="text-gray-300">—</span>
                    : c.distance_m >= 1000
                      ? `${(c.distance_m / 1000).toFixed(1)} km`
                      : `${c.distance_m} m`}
                </td>
                <td className="px-3 py-2 text-xs">
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
