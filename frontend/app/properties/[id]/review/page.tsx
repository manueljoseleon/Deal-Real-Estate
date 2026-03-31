import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PropertyDetail } from "@/types";
import { formatUF, formatCLP, formatStandardTitle } from "@/lib/formatters";
import { computeDealModel, defaultInputs } from "@/lib/dealModel";

interface Props {
  params: Promise<{ id: string }>;
}

// Fixed assumptions — conservative, labeled clearly to the user
const REVIEW_HORIZ = 10;
const REVIEW_FIXED = {
  apreciacion: 2,    // 2% annual real appreciation in UF terms
  tasaDeuda: 4.5,    // UF + 4.5% annual
  plazoAnios: 20,
  horiz: REVIEW_HORIZ,
};

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;

  let property: PropertyDetail;
  try {
    property = await api.properties.get(id);
  } catch {
    notFound();
  }

  // UF rate — same fallback pattern as analyze/page.tsx
  let ufClp = 40000;
  try {
    const ufData = await api.analysis.ufValue();
    ufClp = ufData.uf_clp;
  } catch { /* stale server or mindicador.cl down — fallback acceptable */ }

  const btl = property.btl;
  const hasRent =
    btl?.estimated_monthly_rent_clp != null && btl.estimated_monthly_rent_clp > 0;

  const standardTitle = formatStandardTitle(
    property.property_type,
    property.bedrooms,
    property.commune,
  );

  // "vs zona" — same logic as the property detail page price breakdown
  const vsZona =
    property.price_uf_per_m2 != null && property.zone_avg_price_uf_per_m2 != null
      ? ((property.zone_avg_price_uf_per_m2 - property.price_uf_per_m2) /
          property.zone_avg_price_uf_per_m2) *
        100
      : null;

  // Compute unlevered (LTV=0) and levered (LTV=50) models when rent is available
  let unlevered: ReturnType<typeof computeDealModel> | null = null;
  let levered: ReturnType<typeof computeDealModel> | null = null;

  if (hasRent && property.price_uf) {
    const base = defaultInputs({
      priceUF: property.price_uf,
      rentClp: btl!.estimated_monthly_rent_clp!,
      contribClpAnnual: property.contributions_clp_annual,
      ufClp,
    });
    unlevered = computeDealModel({ ...base, ...REVIEW_FIXED, ltv: 0 }, ufClp);
    levered = computeDealModel({ ...base, ...REVIEW_FIXED, ltv: 50 }, ufClp);
  }

  return (
    <>
      {/* Sticky nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href={`/properties/${id}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
          <span className="text-sm font-medium text-gray-700 truncate">{standardTitle}</span>
          <Link
            href={`/properties/${id}/analyze`}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
          >
            Calculadora completa →
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
            Resumen de oportunidad
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{standardTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {property.commune}
            {property.neighborhood ? ` · ${property.neighborhood}` : ""}
          </p>
        </div>

        {/* Guard: no rent estimate available */}
        {!hasRent && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-semibold mb-1">Sin renta estimada disponible</p>
            <p>
              No hay suficientes arrendamientos comparables en la zona para calcular los
              retornos automáticamente. Puedes ingresar una renta manualmente en la{" "}
              <Link
                href={`/properties/${id}/analyze`}
                className="underline hover:text-amber-900"
              >
                calculadora de rentabilidad
              </Link>
              .
            </p>
          </div>
        )}

        {/* ── Section 1: Property & Costs ─────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Propiedad y costos estimados</h2>
          </div>
          <div className="divide-y divide-gray-100">

            <MetricRow label="Precio de compra" value={formatUF(property.price_uf, 0)} sub={formatCLP(property.price_clp)} />

            {vsZona !== null && vsZona > 0 && (
              <MetricRow
                label="Precio vs. zona"
                value={`${vsZona.toFixed(1)}% más barato`}
                valueColor="text-green-600"
                sub={`UF ${property.zone_avg_price_uf_per_m2?.toFixed(1)}/m² promedio zona (${property.zone_avg_sample_count ?? "?"} prop.)`}
              />
            )}

            <MetricRow
              label="Renta mensual estimada"
              value={formatCLP(btl?.estimated_monthly_rent_clp)}
              sub={
                btl?.comparable_rent_count != null
                  ? `Basado en ${btl.comparable_rent_count} arrendamientos similares`
                  : undefined
              }
            />

            <MetricRow
              label="Cap rate bruto"
              value={btl?.gross_yield_pct != null ? `${btl.gross_yield_pct.toFixed(1)}%` : "—"}
            />

            {levered && (
              <>
                {/* Closing costs with breakdown */}
                <div className="px-5 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Costos de cierre estimados</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Notaría, timbres, tasación, corretaje, otros
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatUF(levered.totalEntradaUF, 0)}
                    </span>
                  </div>
                  <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Notaría / escritura</span>
                      <span className="tabular-nums">{formatUF(levered.notUF, 1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timbres y estampillas</span>
                      <span className="tabular-nums">{formatUF(levered.timUF, 1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasación + originación</span>
                      <span className="tabular-nums">{formatUF(levered.tasUF, 1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corretaje comprador (2%)</span>
                      <span className="tabular-nums">{formatUF(levered.corUF, 1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reserva inicial</span>
                      <span className="tabular-nums">{formatUF(levered.repUF, 1)}</span>
                    </div>
                  </div>
                </div>

                <MetricRow
                  label="Gastos operativos anuales est."
                  value={formatUF(levered.totalOpex, 1)}
                  sub="Administración, mantención, seguros, contribuciones, reserva capex"
                />

                <MetricRow
                  label="NOI anual (ingreso neto operacional)"
                  value={formatUF(levered.noi, 1)}
                  valueColor={levered.noi >= 0 ? "text-green-700" : "text-red-600"}
                  sub={formatCLP(levered.noi * ufClp)}
                />
              </>
            )}
          </div>
        </section>

        {/* ── Section 2: Returns table ────────────────────────────────────── */}
        {levered && unlevered && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">
                Retorno estimado — horizonte {REVIEW_HORIZ} años
              </h2>
            </div>

            {/* 4×3 table: metric | con 50% deuda | sin deuda */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/3" />
                    <th className="text-right px-5 py-3 text-xs font-semibold text-teal-700 uppercase tracking-wide">
                      Con 50% deuda
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Sin deuda
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">ROI</p>
                      <p className="text-xs text-gray-400">Cap rate neto (anual)</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-xl font-black text-teal-700 tabular-nums">
                        {levered.coc.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-xl font-black text-gray-700 tabular-nums">
                        {unlevered.capNeto.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">TIR</p>
                      <p className="text-xs text-gray-400">A {REVIEW_HORIZ} años, en UF</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-xl font-black text-teal-700 tabular-nums">
                        UF +{levered.irrVal.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-xl font-black text-gray-700 tabular-nums">
                        UF +{unlevered.irrVal.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">Dividendo</p>
                      <p className="text-xs text-gray-400">Pago mensual crédito</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold text-gray-800 tabular-nums">
                        {formatCLP((levered.cuotaAnual / 12) * ufClp)}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {formatUF(levered.cuotaAnual / 12, 1)}/mes
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-gray-400">—</span>
                    </td>
                  </tr>
                  <tr className="bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-700">Equity requerido</p>
                      <p className="text-xs text-gray-400">Pie + costos de cierre</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold text-gray-800 tabular-nums">
                        {formatUF(levered.equityTotalUF, 0)}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {formatCLP(levered.equityTotalUF * ufClp)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="font-semibold text-gray-800 tabular-nums">
                        {formatUF(unlevered.equityTotalUF, 0)}
                      </p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {formatCLP(unlevered.equityTotalUF * ufClp)}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Section 3: Assumptions box ──────────────────────────────────── */}
        <section className="rounded-xl bg-gray-50 border border-gray-200 p-5">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="w-full">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Supuestos utilizados en este análisis
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <span className="text-gray-500">Tasa de crédito</span>
                <span className="font-medium text-gray-700">UF + 4,5% anual</span>
                <span className="text-gray-500">Plazo crédito</span>
                <span className="font-medium text-gray-700">20 años</span>
                <span className="text-gray-500">LTV (deuda / precio)</span>
                <span className="font-medium text-gray-700">50%</span>
                <span className="text-gray-500">Horizonte análisis</span>
                <span className="font-medium text-gray-700">10 años</span>
                <span className="text-gray-500">Apreciación anual</span>
                <span className="font-medium text-gray-700">2% real anual (en UF)</span>
                <span className="text-gray-500">Vacancia</span>
                <span className="font-medium text-gray-700">7%</span>
                <span className="text-gray-500">Administración</span>
                <span className="font-medium text-gray-700">8% de renta efectiva</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Los supuestos son conservadores. Puedes modificarlos en la calculadora completa.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA to full deal analyzer ────────────────────────────────────── */}
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-900">
              ¿Quieres ajustar los supuestos o ver el detalle año a año?
            </p>
            <p className="text-xs text-teal-700 mt-0.5">
              La calculadora de rentabilidad te permite personalizar cada parámetro.
            </p>
          </div>
          <Link
            href={`/properties/${id}/analyze`}
            className="shrink-0 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            Ir a la calculadora →
          </Link>
        </div>

      </main>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="px-5 py-3 flex justify-between items-start gap-4">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm font-semibold tabular-nums shrink-0 ${valueColor ?? "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

