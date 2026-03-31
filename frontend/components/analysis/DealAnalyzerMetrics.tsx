"use client";

import type { DealAnalyzerResult, DealAnalyzerInputs } from "@/types";
import { clNum } from "@/lib/formatters";

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
function irrColor(v: number) {
  if (v > 8) return { bg: "bg-green-700", badge: "bg-green-100 text-green-900" };
  if (v >= 5) return { bg: "bg-green-600", badge: "bg-green-100 text-green-800" };
  if (v >= 3) return { bg: "bg-amber-500", badge: "bg-amber-100 text-amber-800" };
  return { bg: "bg-red-500", badge: "bg-red-100 text-red-800" };
}
function statusDot(v: number, excellent: number, good: number, mid: number): string {
  if (v >= excellent) return "text-green-700";
  if (v >= good) return "text-green-600";
  if (v >= mid) return "text-amber-600";
  return "text-red-500";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MiniMetric({ label, value, colorClass = "text-gray-800", sub }: {
  label: string; value: string; colorClass?: string; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-mono">{label}</span>
      <span className={`text-base font-bold font-mono leading-none ${colorClass}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 font-mono">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  result: DealAnalyzerResult;
  inputs: DealAnalyzerInputs;
}

export default function DealAnalyzerMetrics({ result, inputs }: Props) {
  const irr = result.irrVal;
  const irrC = irrColor(irr);
  const roi = result.equityTotalUF > 0 ? (result.ganTotal / result.equityTotalUF) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr]">

        {/* ── Hero: IRR ────────────────────────────────────────────────── */}
        <div className={`${irrC.bg} px-6 py-5 flex flex-col justify-center min-w-[180px]`}>
          <span className="text-[9px] uppercase tracking-widest font-mono opacity-75 text-white mb-1">
            IRR real · {inputs.horiz}a
          </span>
          <span className="text-4xl font-bold font-mono text-white leading-none">
            UF+{clNum(irr, 1)}%
          </span>
          <span className="text-[10px] font-mono mt-2 opacity-70 text-white">
            Flujo operacional + plusvalía
          </span>
          <span className={`mt-3 self-start text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${irrC.badge}`}>
            {irr > 8 ? "TIR excelente" : irr >= 5 ? "Buena TIR" : irr >= 3 ? "TIR moderada" : "TIR baja"}
          </span>
        </div>

        {/* ── Supporting metrics ───────────────────────────────────────── */}
        <div className="divide-y divide-gray-100">

          {/* Row 1: Yield */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 font-mono mb-2">Rentabilidad del activo</p>
              <div className="flex gap-5">
                <MiniMetric
                  label="Cap Rate Bruto"
                  value={clNum(result.capBruto, 1) + "%"}
                  colorClass={statusDot(result.capBruto, 6, 5, 4)}
                  sub="Renta / precio"
                />
                <MiniMetric
                  label="Cap Rate Neto"
                  value={clNum(result.capNeto, 1) + "%"}
                  colorClass={statusDot(result.capNeto, 4, 3, 2)}
                  sub="Tras opex"
                />
                <MiniMetric
                  label="Cash-on-cash"
                  value={clNum(result.coc, 1) + "%"}
                  colorClass={statusDot(result.coc, 4, 2, 0)}
                  sub="Año 1"
                />
              </div>
            </div>

            {/* Row 2: Return + Equity */}
            <div className="px-5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 font-mono mb-2">Retorno de capital · {inputs.horiz}a</p>
              <div className="flex gap-5 flex-wrap">
                <MiniMetric
                  label="Equity inicial"
                  value={clNum(result.equityTotalUF, 0) + " UF"}
                  sub={`Pie ${clNum(result.equity0UF, 0)} + costos ${clNum(result.totalEntradaUF, 0)}`}
                />
                <MiniMetric
                  label="Ganancia neta"
                  value={(result.ganTotal >= 0 ? "+" : "") + clNum(result.ganTotal, 0) + " UF"}
                  colorClass={result.ganTotal >= 0 ? "text-green-600" : "text-red-500"}
                  sub="Flujos+venta−equity"
                />
                <MiniMetric
                  label="ROI"
                  value={clNum(roi, 0) + "%"}
                  colorClass={statusDot(roi, 80, 50, 20)}
                  sub="Ganancia / equity"
                />
                <MiniMetric
                  label="MOIC"
                  value={clNum(result.moic, 2) + "x"}
                  colorClass={statusDot(result.moic, 2, 1.5, 1.1)}
                  sub="(Flujos+venta)/equity"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
