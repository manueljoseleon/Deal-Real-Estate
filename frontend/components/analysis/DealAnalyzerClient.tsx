"use client";

import { useState, useMemo, useCallback } from "react";
import type { PropertyDetail, DealAnalyzerInputs } from "@/types";
import { computeDealModel, defaultInputs, exportDealToExcel, findLtvForDscr } from "@/lib/dealModel";
import { clNum } from "@/lib/formatters";
import DealAnalyzerInputsPanel from "./DealAnalyzerInputs";
import DealAnalyzerMetrics from "./DealAnalyzerMetrics";
import DealAnalyzerTables from "./DealAnalyzerTables";
import DealAnalyzerCharts from "./DealAnalyzerCharts";
import DealAnalyzerAnnualTable from "./DealAnalyzerAnnualTable";
import DealAnalyzerSensitivity from "./DealAnalyzerSensitivity";

interface Props {
  property: PropertyDetail;
  ufClp: number;
  ufDate: string;
}

// ---------------------------------------------------------------------------
// Recommendation logic based on IRR real (UF + X%)
// ---------------------------------------------------------------------------
type RecLevel = "great" | "good" | "conditional" | "pass";

function getRecommendation(irr: number): {
  level: RecLevel;
  title: string;
  body: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  badgeColor: string;
} {
  const irrFmt = clNum(irr, 1);
  if (irr > 8) return {
    level: "great",
    title: "Gran oportunidad — no dejes pasar esta propiedad",
    body: `Con una TIR real de UF+${irrFmt}% este activo es una excelente inversión, superando ampliamente el costo de oportunidad del capital. La rentabilidad ajustada al riesgo del activo inmobiliario es muy atractiva.`,
    borderColor: "border-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-900",
    badgeColor: "bg-green-600 text-white",
  };
  if (irr >= 5) return {
    level: "good",
    title: "Buena oportunidad — se recomienda avanzar",
    body: `Con una TIR real de UF+${irrFmt}% esta propiedad ofrece un retorno atractivo para su perfil de riesgo. Vale la pena continuar el proceso para invertir.`,
    borderColor: "border-teal-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-900",
    badgeColor: "bg-teal-600 text-white",
  };
  if (irr >= 3) return {
    level: "conditional",
    title: "Avanza, pero intenta mejorar las condiciones de entrada",
    body: `Con una TIR real de UF+${irrFmt}% la rentabilidad está en el rango medio/bajo de lo esperado. Antes de comprometerte, intenta negociar un menor precio de compra, mejores condiciones de crédito o buscar alternativas para aumentar el arriendo estimado.`,
    borderColor: "border-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-900",
    badgeColor: "bg-amber-500 text-white",
  };
  return {
    level: "pass",
    title: "No conviene bajo este escenario",
    body: `Con una TIR real de UF+${irrFmt}% un depósito a plazo o renta fija puede ofrecer rentabilidad similar o mejor con menor riesgo. Ajusta el precio o los supuestos de arriendo y revisa si el proyecto puede mejorar.`,
    borderColor: "border-red-400",
    bgColor: "bg-red-50",
    textColor: "text-red-900",
    badgeColor: "bg-red-500 text-white",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DealAnalyzerClient({ property, ufClp, ufDate }: Props) {
  const [inputs, setInputs] = useState<DealAnalyzerInputs>(() => {
    const base = defaultInputs({
      priceUF: property.price_uf ?? 3000,
      rentClp: property.btl?.estimated_monthly_rent_clp ?? 500_000,
      contribClpAnnual: property.contributions_clp_annual,
      ufClp,
    });
    // Start LTV at DSCR-1.2 recommendation instead of the fixed 70%
    const tempResult = computeDealModel(base, ufClp);
    const recommendedLtv = findLtvForDscr(tempResult.noi, base.valorUF, base.tasaDeuda, base.plazoAnios, 1.2);
    return { ...base, ltv: recommendedLtv ?? base.ltv };
  });

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleChange = useCallback((patch: Partial<DealAnalyzerInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }));
  }, []);

  const result = useMemo(() => computeDealModel(inputs, ufClp), [inputs, ufClp]);

  const dscr12Ltv = useMemo(
    () => findLtvForDscr(result.noi, inputs.valorUF, inputs.tasaDeuda, inputs.plazoAnios, 1.2),
    [result.noi, inputs.valorUF, inputs.tasaDeuda, inputs.plazoAnios],
  );

  const modelForInputs = {
    rentaUFmes: result.rentaUFmes,
    capBruto: result.capBruto,
    debtUF: result.debtUF,
    notUF: result.notUF,
    timUF: result.timUF,
    tasUF: result.tasUF,
    ddUF: result.ddUF,
    corUF: result.corUF,
    repUF: result.repUF,
    dscr12Ltv,
  };

  const rec = getRecommendation(result.irrVal);
  const showNextSteps = rec.level !== "pass";
  const propertyAppUrl = `/properties/${property.id}`;

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportDealToExcel(inputs, result, ufClp, property.title ?? property.external_id);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* UF disclaimer */}
      <p className="text-xs text-gray-400 font-mono">
        UF utilizada: <span className="font-semibold text-gray-600">{ufClp.toLocaleString("es-CL")} CLP</span>
        {" "}· fecha: {ufDate}
      </p>

      {/* Recommendation banner */}
      <div className={`rounded-xl border-l-4 p-4 ${rec.borderColor} ${rec.bgColor}`}>
        <div className="flex items-start gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap mt-0.5 ${rec.badgeColor}`}>
            {rec.level === "great" ? "Gran oportunidad" : rec.level === "good" ? "Buena" : rec.level === "conditional" ? "Condicional" : "No conviene"}
          </span>
          <div>
            <p className={`text-sm font-semibold ${rec.textColor}`}>{rec.title}</p>
            <p className={`text-xs mt-1 ${rec.textColor} opacity-80`}>{rec.body}</p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <DealAnalyzerMetrics result={result} inputs={inputs} />

      {/* Main layout: inputs left, results right */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* Left: sliders */}
        <DealAnalyzerInputsPanel inputs={inputs} model={modelForInputs} onChange={handleChange} />

        {/* Right: tables + charts + sensitivity + annual table */}
        <div className="space-y-6">
          <DealAnalyzerTables result={result} inputs={inputs} />
          <DealAnalyzerSensitivity inputs={inputs} ufClp={ufClp} baseIrr={result.irrVal} />
          <DealAnalyzerCharts result={result} inputs={inputs} />
          <DealAnalyzerAnnualTable annual={result.annual} />

          {/* Export */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {exporting ? "Exportando…" : "Exportar a Excel"}
            </button>
            {exportError && (
              <p className="text-xs text-red-500">{exportError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Next steps — only when the deal is worth pursuing */}
      {showNextSteps && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-4">
            Próximos pasos recomendados
          </p>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Contacta al vendedor y visita la propiedad</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirma el estado del activo en terreno.{" "}
                  <a href={propertyAppUrl} className="text-amber-600 underline hover:text-amber-700">
                    Ver ficha de la propiedad →
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Valida los supuestos financieros</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cotiza el arriendo real con corredores de la zona y ajusta vacancia, opex y contribuciones con datos reales.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Revisa el estado físico de la propiedad</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Evalúa vicios ocultos, instalaciones eléctricas, humedad y potenciales remodelaciones para ajustar el CAPEX inicial.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">4</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Contacta al menos 3 bancos y negocia el crédito hipotecario</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Compara tasa, plazo, LTV y costos de originación. Una diferencia de 0.5% en tasa puede impactar significativamente la TIR.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">5</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Haz una oferta, cierra la compra y disfruta los beneficios de la inversión inmobiliaria</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Con due diligence completo, negocia el precio con los datos en la mano.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ¿Necesitas ayuda con alguno de estos pasos?{" "}
              <span className="font-semibold text-amber-700">En Deal Inmobiliario estamos para ayudarte</span>{" "}
              — desde la evaluación financiera hasta el cierre.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
