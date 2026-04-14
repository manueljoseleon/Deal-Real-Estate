import type { BTLAnalysis } from "@/types";
import type { ReactNode } from "react";
import { formatCLP, formatUF, formatYield } from "@/lib/formatters";
import TooltipIcon from "@/components/TooltipIcon";

const bandStyle: Record<string, { bar: string; text: string; bg: string; label: string }> = {
  excellent: { bar: "border-green-600",  text: "text-green-700",  bg: "bg-green-50",  label: "Excelente" },
  good:      { bar: "border-green-400",  text: "text-green-600",  bg: "bg-green-50",  label: "Bueno" },
  moderate:  { bar: "border-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50", label: "Moderado" },
  weak:      { bar: "border-red-500",    text: "text-red-600",    bg: "bg-red-50",    label: "Bajo" },
};

interface Props {
  btl: BTLAnalysis | null;
  price_clp: number | null;
  price_uf?: number | null;
  compsCount?: number;
  compsMedianRent?: number | null;
  reviewTrigger?: ReactNode;
  narrativeText?: string;
}

export default function BTLSummary({ btl, price_clp, price_uf, compsCount, compsMedianRent, reviewTrigger, narrativeText }: Props) {
  if (!btl || btl.gross_yield_pct == null) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
        Sin análisis BTL disponible — necesita arriendo estimado.
      </div>
    );
  }

  // Use live-computed median from displayed comps when available — always consistent with table
  const estimatedRent = compsMedianRent ?? btl.estimated_monthly_rent_clp;
  const annualRent = estimatedRent ? estimatedRent * 12 : null;

  // Recompute yield from live rent if compsMedianRent is available
  const grossYield = (compsMedianRent != null && price_clp != null && price_clp > 0)
    ? Math.round((compsMedianRent * 12 / price_clp) * 10000) / 100
    : btl.gross_yield_pct;
  const yieldBand = grossYield >= 7 ? "excellent" : grossYield >= 5 ? "good" : grossYield >= 3 ? "moderate" : "weak";
  const style = bandStyle[yieldBand];

  return (
    <div className={`rounded-xl border border-l-4 ${style.bar} bg-white shadow-sm overflow-hidden`}>
      {/* Yield hero */}
      <div className={`px-6 py-5 ${style.bg}`}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Análisis de rentabilidad</p>
        <div className="flex items-end gap-3">
          <span className={`text-5xl font-black tabular-nums leading-none ${style.text}`}>
            {formatYield(grossYield)}
          </span>
          <span className={`text-sm font-semibold mb-1 ${style.text}`}>{style.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="divide-y divide-gray-100">
        {price_clp != null && (
          <div className="flex items-center justify-between px-6 py-3 text-sm">
            <span className="text-gray-500">Precio</span>
            <div className="text-right">
              <p className="font-medium text-gray-800 tabular-nums">{formatCLP(price_clp)}</p>
              {price_uf != null && (
                <p className="text-xs text-gray-400 tabular-nums">{formatUF(price_uf)}</p>
              )}
            </div>
          </div>
        )}
        <StatRow
          label={
            <span className="flex items-center">
              Renta estimada / mes
              <TooltipIcon text="Renta estimada utilizando arriendos comparables de mercado considerando tipo de propiedad, ubicación, área y dormitorios." />
            </span>
          }
          value={formatCLP(estimatedRent)}
        />
        <StatRow label="Renta estimada / año" value={formatCLP(annualRent)} />
      </div>

      <p className="text-xs text-gray-400 px-6 py-3 bg-gray-50 border-t border-gray-100">
        Cap Rate = (renta anual estimada / precio de compra) × 100. No incluye gastos comunes, contribuciones ni vacancia.
      </p>

      {(narrativeText || reviewTrigger) && (
        <div className="px-6 py-4 border-t border-gray-100 bg-white space-y-3">
          {narrativeText && (
            <p className="text-sm text-gray-600 leading-relaxed">{narrativeText}</p>
          )}
          {reviewTrigger}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, small = false }: { label: ReactNode; value: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm">
      <span className="text-gray-500 flex items-center">{label}</span>
      <span className={`font-medium text-gray-800 tabular-nums text-right ${small ? "text-xs" : ""}`}>{value}</span>
    </div>
  );
}
