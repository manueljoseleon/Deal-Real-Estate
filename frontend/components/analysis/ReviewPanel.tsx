"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PropertyDetail } from "@/types";
import { formatUF, formatCLP, formatStandardTitle } from "@/lib/formatters";
import { computeDealModel, defaultInputs, findLtvForDscr } from "@/lib/dealModel";

const REVIEW_HORIZ = 10;
const REVIEW_FIXED = {
  apreciacion: 2,
  tasaDeuda: 4.5,
  plazoAnios: 20,
  horiz: REVIEW_HORIZ,
};

interface Props {
  property: PropertyDetail;
  ufClp: number;
  propertyId: string;
  compsMedianRent?: number | null;
  triggerLabel?: string;
  triggerVariant?: "link" | "button";
}

/**
 * ReviewPanel — slide-in panel from the right with a narrative Q&A deal review.
 * Numbers are fully consistent with DealAnalyzerClient: same defaultInputs(),
 * same REVIEW_FIXED overrides, and the levered LTV uses findLtvForDscr(1.2)
 * exactly as DealAnalyzerClient does on mount.
 */
export default function ReviewPanel({
  property,
  ufClp,
  propertyId,
  compsMedianRent,
  triggerLabel = "Evalúa si es una buena inversión →",
  triggerVariant = "link",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  // Lock body scroll while panel is open; always restore on unmount so
  // navigating away (e.g. clicking the Deal Analyzer link) doesn't leave
  // overflow:hidden stuck on the next page.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const btl = property.btl;
  // Use live comps median when available — always consistent with what user sees in table
  const effectiveRent = compsMedianRent ?? btl?.estimated_monthly_rent_clp ?? null;
  const hasRent = effectiveRent != null && effectiveRent > 0;
  const standardTitle = formatStandardTitle(property.property_type, property.bedrooms, property.commune);

  // ---------------------------------------------------------------------------
  // Build models — same logic as DealAnalyzerClient initial state
  // ---------------------------------------------------------------------------
  let unlevered: ReturnType<typeof computeDealModel> | null = null;
  let levered: ReturnType<typeof computeDealModel> | null = null;
  let leveredLtv = 70; // fallback if DSCR calc fails

  if (hasRent && property.price_uf) {
    const base = defaultInputs({
      priceUF: property.price_uf,
      rentClp: effectiveRent!,
      contribClpAnnual: property.contributions_clp_annual,
      ufClp,
    });

    // NOI is ltv-independent; compute once with ltv=0 for efficiency
    unlevered = computeDealModel({ ...base, ...REVIEW_FIXED, ltv: 0 }, ufClp);

    // Use the same recommended LTV as DealAnalyzerClient (DSCR ≥ 1.2)
    const recommended = findLtvForDscr(
      unlevered.noi,
      base.valorUF,
      REVIEW_FIXED.tasaDeuda,
      REVIEW_FIXED.plazoAnios,
      1.2,
    );
    leveredLtv = recommended ?? base.ltv;
    levered = computeDealModel({ ...base, ...REVIEW_FIXED, ltv: leveredLtv }, ufClp);
  }

  // ---------------------------------------------------------------------------
  // Derived helpers
  // ---------------------------------------------------------------------------
  const isNegativeCashflow = levered ? levered.cuotaAnual > levered.noi : false;

  // Remaining debt and selling costs at horizon (for return breakdown)
  const leveredSaldoHoriz = levered?.annual[REVIEW_HORIZ - 1]?.saldoDeuda ?? 0;
  const leveredCorrVenta = levered?.corrVenta ?? 0;
  const unleveredCorrVenta = unlevered?.corrVenta ?? 0;

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={handleOpen}
        className={
          triggerVariant === "button"
            ? "w-full flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors text-sm"
            : "inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline transition-colors"
        }
      >
        {triggerLabel}
      </button>

      {/* ── Overlay ── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* ── Slide panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resumen de oportunidad"
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-1/2 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header — sticky (no CTA link here per request) */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm shrink-0">
          <div className="px-4 py-3 flex items-center gap-4">
            <button
              onClick={handleClose}
              aria-label="Cerrar panel"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 truncate">{standardTitle}</span>
          </div>
        </div>

        {/* Panel body — scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-6 space-y-6">

          {/* Page header */}
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
              Resumen de oportunidad
            </p>
            <h2 className="text-xl font-bold text-gray-900">{standardTitle}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {property.commune}
              {property.neighborhood ? ` · ${property.neighborhood}` : ""}
            </p>
          </div>

          {/* Italic prompt */}
          <p className="text-xs italic text-gray-500">
            Para simular tus retornos con más detalle, ver sensibilidades y más, anda a{" "}
            <Link
              href={`/properties/${propertyId}/analyze?uf=${ufClp}`}
              className="text-teal-700 hover:text-teal-900 underline not-italic font-medium"
            >
              Calculadora Financiera
            </Link>
            .
          </p>

          {/* Guard: no rent estimate */}
          {!hasRent && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">Sin renta estimada disponible</p>
              <p>
                No hay suficientes arrendamientos comparables en la zona. Ingresa una renta
                manualmente en la{" "}
                <Link href={`/properties/${propertyId}/analyze?uf=${ufClp}`} className="underline hover:text-amber-900">
                  Calculadora Financiera
                </Link>
                .
              </p>
            </div>
          )}

          {/* ── 1. ¿Qué estaría comprando? ── */}
          <Section
            title="¿Qué estaría comprando?"
            tooltip={
              "Invertir en inmobiliario es igual que en cualquier inversión: lo que compras es un flujo. Pregúntate:\n" +
              "• ¿Cuánto cuesta la propiedad?\n" +
              "• ¿Cuáles son los costos de cierre?\n" +
              "• ¿Cuánto ingresa anualmente?\n" +
              "• ¿Cuáles son los costos anuales?"
            }
          >
            {/* Price — UF only, no CLP */}
            <MetricRow label="Precio de compra" value={formatUF(property.price_uf, 0)} />

            {/* Rent with comparables note */}
            <MetricRow
              label="Renta mensual estimada"
              value={formatCLP(effectiveRent)}
              sub="Estimado con propiedades comparables del mercado"
            />

            {/* Cap rate bruto with formula */}
            <MetricRow
              label="Cap Rate Bruto"
              value={
                effectiveRent != null && property.price_clp != null && property.price_clp > 0
                  ? `${((effectiveRent * 12 / property.price_clp) * 100).toFixed(1)}%`
                  : btl?.gross_yield_pct != null ? `${btl.gross_yield_pct.toFixed(1)}%` : "—"
              }
              sub="Cap Rate = renta anual estimada / precio de compra"
            />

            {levered && (
              <>
                {/* Closing costs breakdown */}
                <div className="px-5 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Costos de cierre estimados</p>
                      <p className="text-xs text-gray-400 mt-0.5">Notaría, timbres, tasación, corretaje, otros</p>
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
                      <span>Reparaciones previas al arriendo</span>
                      <span className="tabular-nums">{formatUF(levered.repUF, 1)}</span>
                    </div>
                  </div>
                </div>

                {/* Opex with vacancy */}
                <div className="px-5 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-600">Gastos operativos anuales est.</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Administración, mantención, seguros, contribuciones, reserva capex
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatUF(levered.totalOpex, 1)}
                    </span>
                  </div>
                  <div className="mt-2 pl-3 border-l-2 border-gray-100 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Costo estimado de vacancia (7%)</span>
                      <span className="tabular-nums">{formatUF(levered.vacLoss, 1)}</span>
                    </div>
                  </div>
                </div>

                {/* NOI */}
                <MetricRow
                  label="NOI anual (ingreso neto operacional)"
                  value={formatUF(levered.noi, 1)}
                  valueColor={levered.noi >= 0 ? "text-green-700" : "text-red-600"}
                  sub="Renta anual – gastos operativos anuales"
                />

                {/* Cap rate neto — below NOI */}
                <MetricRow
                  label="Cap Rate Neto"
                  value={`${levered.capNeto.toFixed(1)}%`}
                  sub="NOI / precio de compra"
                />
              </>
            )}
          </Section>

          {/* ── 2. ¿Cuánto tendría que invertir? ── */}
          {levered && unlevered && (
            <Section title="¿Cuánto tendría que invertir?">
              <div className="px-5 py-2 text-xs text-gray-500 bg-gray-50/60">
                Depende de si lo haces con o sin deuda. Aquí tienes los dos escenarios.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/3" />
                      {/* Sin deuda first (left), Con Deuda second (right, highlighted) */}
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Sin deuda
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-teal-700 uppercase tracking-wide">
                        <span className="inline-flex items-center gap-1 justify-end">
                          Con Deuda
                          <InlineTooltip message={<>Deuda estimada de {leveredLtv}% del valor de la propiedad, considerando pago de dividendos con flujos de arriendo. Plazo estimado 20 años con tasa UF+4.5%. Para simular con más detalle ingresa a{" "}<Link href={`/properties/${propertyId}/analyze?uf=${ufClp}`} className="underline text-teal-300 hover:text-teal-100">Calculadora Financiera</Link></>} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Inversión (pie)</p>
                        <p className="text-xs text-gray-400">Pago inicial directo</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          {formatUF(unlevered.equity0UF, 0)}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {formatCLP(unlevered.equity0UF * ufClp)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          {formatUF(levered.equity0UF, 0)}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {formatCLP(levered.equity0UF * ufClp)}
                        </p>
                      </td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Deuda simulada</p>
                        <p className="text-xs text-gray-400">Crédito hipotecario</p>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400">—</td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          {formatUF(levered.debtUF, 0)}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {formatCLP(levered.debtUF * ufClp)}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Total a desembolsar</p>
                        <p className="text-xs text-gray-400">Pie + costos de cierre</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-700 tabular-nums">
                          {formatUF(unlevered.equityTotalUF, 0)}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {formatCLP(unlevered.equityTotalUF * ufClp)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-teal-700 tabular-nums">
                          {formatUF(levered.equityTotalUF, 0)}
                        </p>
                        <p className="text-xs text-gray-400 tabular-nums">
                          {formatCLP(levered.equityTotalUF * ufClp)}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── 3. ¿Y cuánto puedo ganar? ── */}
          {levered && unlevered && (
            <Section title="¿Y cuánto puedo ganar?">
              <div className="px-5 py-2.5 bg-gray-50/60 border-b border-gray-100">
                <p className="text-xs text-gray-500">
                  Estimación realizada con 10 años de inversión y apreciación de UF+2%. Para simular con más detalle ingresa a{" "}
                  <Link href={`/properties/${propertyId}/analyze?uf=${ufClp}`} className="text-teal-700 hover:underline font-medium">Calculadora Financiera</Link>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-1/3" />
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Sin deuda
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-teal-700 uppercase tracking-wide">
                        <span className="inline-flex items-center gap-1 justify-end">
                          Con Deuda
                          <InlineTooltip message={<>Deuda estimada de {leveredLtv}% del valor de la propiedad, considerando pago de dividendos con flujos de arriendo. Plazo estimado 20 años con tasa UF+4.5%. Para simular con más detalle ingresa a{" "}<Link href={`/properties/${propertyId}/analyze?uf=${ufClp}`} className="underline text-teal-300 hover:text-teal-100">Calculadora Financiera</Link></>} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">

                    {/* Retorno total: Venta + Flujos acumulados */}
                    <tr>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Retorno total</p>
                        <p className="text-xs text-gray-400">Venta + flujos acumulados</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          {formatUF(unlevered.saleVal + unlevered.flujoAcum, 0)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          {formatUF(levered.saleVal + levered.flujoAcum, 0)}
                        </p>
                      </td>
                    </tr>

                    {/* Inversión inicial */}
                    <tr className="bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Inversión inicial</p>
                        <p className="text-xs text-gray-400">Pie + costos de cierre</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          ({formatUF(unlevered.equityTotalUF, 0)})
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          ({formatUF(levered.equityTotalUF, 0)})
                        </p>
                      </td>
                    </tr>

                    {/* Deuda pendiente + gastos de venta */}
                    <tr>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Deuda pendiente + gastos venta</p>
                        <p className="text-xs text-gray-400">Al año {REVIEW_HORIZ}</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          ({formatUF(unleveredCorrVenta, 1)})
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold text-gray-800 tabular-nums">
                          ({formatUF(leveredSaldoHoriz + leveredCorrVenta, 0)})
                        </p>
                      </td>
                    </tr>

                    {/* Ganancia Neta */}
                    <tr className="bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">Ganancia Neta</p>
                        <p className="text-xs text-gray-400">A {REVIEW_HORIZ} años, en UF</p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xl font-black text-gray-700 tabular-nums">
                          {formatUF(unlevered.ganTotal, 0)}
                        </span>
                        <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                          {unlevered.moic.toFixed(2)}x lo invertido
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xl font-black text-teal-700 tabular-nums">
                          {formatUF(levered.ganTotal, 0)}
                        </span>
                        <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                          {levered.moic.toFixed(2)}x lo invertido
                        </p>
                      </td>
                    </tr>

                    {/* Rentabilidad Anual (TIR) */}
                    <tr>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-700">Rentabilidad Anual</p>
                        <p className="text-xs text-gray-400">
                          Tasa Interna de Retorno (TIR) — cuánto renta el activo cada año
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-xl font-black text-gray-700 tabular-nums">
                          UF+{unlevered.irrVal.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-xl font-black text-teal-700 tabular-nums">
                          UF+{levered.irrVal.toFixed(1)}%
                        </span>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── 4 + 5. ¿Cómo pago el crédito? (includes leverage education) ── */}
          {levered && (
            <Section title="¿Cómo pago el crédito?">
              <div className="px-5 py-4 space-y-3">

                {/* Dividendo anual en UF */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Dividendo anual del crédito</p>
                    <p className="text-xs text-gray-400 mt-0.5">Pago anual al banco, en UF</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                    {formatUF(levered.cuotaAnual, 1)}
                  </p>
                </div>

                {/* NOI anual en UF */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">NOI anual disponible</p>
                    <p className="text-xs text-gray-400 mt-0.5">Para pagar el crédito, en UF</p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums shrink-0 ${levered.noi >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatUF(levered.noi, 1)}
                  </p>
                </div>

                {/* Colchón / alerta — 3 casos */}
                <CushionAlert noi={levered.noi} cuotaAnual={levered.cuotaAnual} />

                {/* Educational note — collapsible via ? button */}
                <div className="pt-2 border-t border-gray-100">
                  <SectionInlineTooltip
                    label="¿Por qué mejora la inversión con deuda?"
                    message={
                      "Pones menos capital propio y el retorno se mide sobre ese monto menor, lo que amplifica la rentabilidad sobre tu equity.\n\n" +
                      `Mientras la tasa del crédito sea menor a lo que rinde el activo (Cap Rate Neto), la deuda mejora tu TIR. En este caso, si tu Cap Rate Neto es menor a ${REVIEW_FIXED.tasaDeuda}%, entonces tener deuda puede reducir tu retorno.`
                    }
                  />
                </div>
              </div>
            </Section>
          )}

          {/* ── 6. Supuestos ── */}
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
                  ¿Qué supuestos tiene este análisis?
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <span className="text-gray-500">Tasa de crédito</span>
                  <span className="font-medium text-gray-700">UF + {REVIEW_FIXED.tasaDeuda}% anual</span>
                  <span className="text-gray-500">Plazo crédito</span>
                  <span className="font-medium text-gray-700">{REVIEW_FIXED.plazoAnios} años</span>
                  <span className="text-gray-500">LTV (deuda / precio)</span>
                  <span className="font-medium text-gray-700">
                    {leveredLtv}% (DSCR ≥ 1,2)
                  </span>
                  <span className="text-gray-500">Horizonte análisis</span>
                  <span className="font-medium text-gray-700">{REVIEW_HORIZ} años</span>
                  <span className="text-gray-500">Apreciación anual</span>
                  <span className="font-medium text-gray-700">{REVIEW_FIXED.apreciacion}% real anual (en UF)</span>
                  <span className="text-gray-500">Vacancia</span>
                  <span className="font-medium text-gray-700">7%</span>
                  <span className="text-gray-500">Administración</span>
                  <span className="font-medium text-gray-700">8% de renta efectiva</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Los supuestos son conservadores. Puedes modificarlos en la Calculadora Financiera.
                </p>
              </div>
            </div>
          </section>

          {/* ── 7. CTA al final ── */}
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-900">
                ¿Quieres ajustar supuestos o ver el detalle año a año?
              </p>
              <p className="text-xs text-teal-700 mt-0.5">
                Sensibilidades, tabla anual y exportación a Excel.
              </p>
            </div>
            <Link
              href={`/properties/${propertyId}/analyze?uf=${ufClp}`}
              className="w-full sm:w-auto text-center px-3 py-2 bg-teal-700 text-white text-xs font-medium rounded-lg hover:bg-teal-800 transition-colors"
            >
              Calculadora Financiera
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Section wrapper with optional tooltip on the header title.
 * Tooltip is a simple toggle — no library dependency.
 */
function Section({
  title,
  tooltip,
  children,
}: {
  title: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTooltip((v) => !v)}
              aria-label="Más información"
              className="w-4 h-4 rounded-full bg-gray-300 text-gray-600 text-[10px] font-bold flex items-center justify-center hover:bg-gray-400 transition-colors leading-none"
            >
              ?
            </button>
            {showTooltip && (
              <div className="absolute left-0 top-6 z-20 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-pre-line">
                <button
                  onClick={() => setShowTooltip(false)}
                  className="absolute top-1.5 right-2 text-gray-400 hover:text-white text-base leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
                <p className="pr-4">{tooltip}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

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

/**
 * Small "?" badge in table headers that reveals a popover on click.
 * Used inside <th> elements — no absolute positioning issues.
 */
function InlineTooltip({ message }: { message: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="w-3.5 h-3.5 rounded-full bg-gray-300 text-gray-600 text-[9px] font-bold inline-flex items-center justify-center hover:bg-gray-400 transition-colors leading-none align-middle"
        aria-label="Más información"
      >
        ?
      </button>
      {show && (
        <span className="absolute right-0 top-5 z-30 w-64 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl normal-case font-normal whitespace-normal text-left">
          <button
            onClick={() => setShow(false)}
            className="absolute top-1 right-2 text-gray-400 hover:text-white text-sm leading-none"
          >×</button>
          <span className="pr-3">{message}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Inline label + "?" that reveals a multiline explanation below.
 * Used for the "¿Por qué mejora la inversión con deuda?" note.
 */
function SectionInlineTooltip({ label, message }: { label: string; message: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
      >
        {/* Solid triangle — points right (closed), rotates 90° to point down (open) */}
        <svg
          className={`w-2.5 h-2.5 text-gray-400 transition-transform duration-200 shrink-0 ${show ? "rotate-90" : "rotate-0"}`}
          viewBox="0 0 10 10"
          fill="currentColor"
        >
          <polygon points="0,0 10,5 0,10" />
        </svg>
        {label}
      </button>
      {show && (
        <div className="mt-2 text-xs text-gray-700 space-y-1.5 whitespace-pre-line pl-5 border-l-2 border-gray-100">
          {message}
        </div>
      )}
    </div>
  );
}

/**
 * Colchón / alerta — 3 states based on NOI vs annual debt service.
 *   positive & ≥ 20% buffer  → green
 *   positive & < 20% buffer  → amber warning
 *   NOI ≤ dividendo          → red
 */
function CushionAlert({ noi, cuotaAnual }: { noi: number; cuotaAnual: number }) {
  const cushion = noi - cuotaAnual;
  const bufferPct = cuotaAnual > 0 ? cushion / cuotaAnual : Infinity;

  if (cushion <= 0) {
    // NOI no cubre el dividendo
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
        <span className="font-semibold">Flujo negativo:</span>{" "}
        el dividendo supera tu NOI en{" "}
        <span className="font-semibold">{formatUF(Math.abs(cushion), 1)}</span>.
        Necesitarás aportar capital mensualmente para cubrir la diferencia.
        Considera reducir la deuda o buscar mayor arriendo.
      </div>
    );
  }

  if (bufferPct < 0.20) {
    // NOI cubre pero con margen menor al 20%
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <span className="font-semibold">
          NOI es {formatUF(cushion, 1)} mayor que el dividendo
        </span>
        , pero el margen es ajustado (menos del 20%). Cualquier período sin
        renta resultará en flujo negativo. Busca que el NOI sea al menos 20%
        mayor al dividendo.
      </div>
    );
  }

  // NOI cubre con margen saludable (≥ 20%)
  return (
    <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
      <span className="font-semibold">
        NOI es {formatUF(cushion, 1)} mayor que el dividendo
      </span>
      , lo que te deja un margen para períodos sin renta. Busca que el NOI
      sea al menos 20% mayor al dividendo.
    </div>
  );
}
