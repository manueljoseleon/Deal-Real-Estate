import Link from "next/link";
import type { PropertyListItem } from "@/types";
import { formatUF, formatCLP, formatArea, formatPortal } from "@/lib/formatters";
import YieldBadge from "./YieldBadge";

interface Props {
  items: PropertyListItem[];
}

export default function PropertyTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No hay propiedades con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Propiedad</th>
            <th className="px-4 py-3 text-right">Precio</th>
            <th className="px-4 py-3 text-right">Área</th>
            <th className="px-4 py-3 text-right">Dorm.</th>
            <th className="px-4 py-3 text-right">Renta est.</th>
            <th className="px-4 py-3 text-center">Yield</th>
            <th className="px-4 py-3 text-left">Portal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 max-w-xs">
                <Link href={`/properties/${p.id}`} className="hover:text-blue-600">
                  <p className="font-medium text-gray-900 truncate leading-tight">
                    {p.title ?? p.external_id}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.commune}{p.neighborhood ? ` · ${p.neighborhood}` : ""}
                  </p>
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <p className="font-semibold text-gray-900">{formatUF(p.price_uf)}</p>
                <p className="text-xs text-gray-400">{formatCLP(p.price_clp)}</p>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                {formatArea(p.useful_area_m2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {p.bedrooms ?? "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                {p.btl?.estimated_monthly_rent_clp
                  ? formatCLP(p.btl.estimated_monthly_rent_clp)
                  : "—"}
                {p.btl?.comparable_rent_count != null && (
                  <p className="text-xs text-gray-400">{p.btl.comparable_rent_count} comp.</p>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <YieldBadge
                  yield_pct={p.btl?.gross_yield_pct}
                  band={p.btl?.yield_band ?? null}
                />
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                  {formatPortal(p.portal)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
