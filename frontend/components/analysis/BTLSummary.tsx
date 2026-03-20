import type { BTLAnalysis } from "@/types";
import { formatCLP, formatYield, formatMatchingTier } from "@/lib/formatters";
import YieldBadge from "@/components/properties/YieldBadge";

interface Props {
  btl: BTLAnalysis | null;
  price_clp: number | null;
}

export default function BTLSummary({ btl, price_clp }: Props) {
  if (!btl || btl.gross_yield_pct == null) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-400">
        Sin análisis BTL disponible — necesita arriendo estimado.
      </div>
    );
  }

  const annualRent = btl.estimated_monthly_rent_clp
    ? btl.estimated_monthly_rent_clp * 12
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Análisis BTL</h2>

      {/* Yield hero */}
      <div className="flex items-center gap-3">
        <YieldBadge yield_pct={btl.gross_yield_pct} band={btl.yield_band} size="md" />
        <span className="text-sm text-gray-500">Yield bruto anual</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Stat label="Renta estimada / mes" value={formatCLP(btl.estimated_monthly_rent_clp)} />
        <Stat label="Renta estimada / año" value={formatCLP(annualRent)} />
        <Stat label="Comparables usados" value={btl.comparable_rent_count != null ? `${btl.comparable_rent_count} arriendos` : "—"} />
        <Stat label="Método de matching" value={formatMatchingTier(btl.matching_tier)} />
        {btl.rent_min_clp != null && btl.rent_max_clp != null && (
          <Stat
            label="Rango arriendos"
            value={`${formatCLP(btl.rent_min_clp)} – ${formatCLP(btl.rent_max_clp)}`}
            className="col-span-2"
          />
        )}
      </div>

      <p className="text-xs text-gray-400">
        Yield bruto = (renta anual estimada / precio de compra) × 100. No incluye gastos comunes, contribuciones ni vacancia.
      </p>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}
