"use client";

import { clNum } from "@/lib/formatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Line,
} from "recharts";
import type { DealAnalyzerResult, DealAnalyzerInputs } from "@/types";

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 rounded-md px-3 py-2 border border-gray-700 text-xs font-mono">
      <p className="text-amber-400 mb-1">Año {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value >= 0 ? "" : "-"}{clNum(Math.abs(p.value), 2)} UF
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart section wrapper
// ---------------------------------------------------------------------------
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-4">{title}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  result: DealAnalyzerResult;
  inputs: DealAnalyzerInputs;
}

export default function DealAnalyzerCharts({ result, inputs }: Props) {
  const { annual } = result;
  const axisStyle = { fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" };

  // Chart 1: NOI vs Dividendo del crédito
  const noiVsDividendoData = annual.map((a) => ({
    year: a.year,
    NOI: +a.noi.toFixed(2),
    "Dividendo": +a.cuota.toFixed(2),
  }));

  // Chart 2: Retorno acumulado si se vende en año X
  // "Neto venta" as the base stack (always positive, always visible).
  // "Flujos acum." stacked on top — clamped to ≥0 so bars never dip below zero.
  // When cumulative cashflows are negative (early years), only the blue bar shows.
  const retornoData = annual.map((a) => {
    const flujosCum = annual.slice(0, a.year).reduce((s, x) => s + x.cashflow, 0);
    return {
      year: a.year,
      "Neto venta": +a.netSale.toFixed(2),
      "Flujos acum.": +Math.max(0, flujosCum).toFixed(2),
    };
  });

  // Chart 3: Amortización del crédito — saldo outstanding + interest/amort composition
  const amortData = annual.map((a) => ({
    year: a.year,
    Interés: +a.interes.toFixed(2),
    Amortización: +a.amort.toFixed(2),
    "Saldo deuda": +a.saldoDeuda.toFixed(0),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* NOI vs Dividendo del crédito */}
      <ChartCard title="NOI vs dividendo del crédito (UF/año)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={noiVsDividendoData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} />
            <YAxis tick={axisStyle} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
            <Bar dataKey="NOI" fill="#16a34a" radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar dataKey="Dividendo" fill="#dc2626" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Retorno acumulado si se vende en año X */}
      <ChartCard title="Retorno total acumulado si se vende en año X (UF)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={retornoData} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} />
            <YAxis tick={axisStyle} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1} />
            <ReferenceLine
              y={result.equityTotalUF}
              stroke="#dc2626"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: "Equity inv.", position: "insideRight", fontSize: 9, fill: "#dc2626" }}
            />
            {/* Neto venta as base (blue) */}
            <Bar dataKey="Neto venta" stackId="a" fill="#3b82f6" opacity={0.85} />
            {/* Flujos acum. stacked on top (orange) — always ≥0 */}
            <Bar dataKey="Flujos acum." stackId="a" fill="#b45309" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              content={() => (
                <div className="flex gap-3 justify-center text-[10px] font-mono mt-1">
                  {[
                    { label: "Neto venta", color: "#3b82f6", type: "square" },
                    { label: "Flujos acum.", color: "#b45309", type: "square" },
                    { label: "Equity invertido", color: "#dc2626", type: "line" },
                  ].map(({ label, color, type }) => (
                    <span key={label} className="flex items-center gap-1">
                      {type === "line"
                        ? <span style={{ width: 12, height: 2, background: color, display: "inline-block" }} />
                        : <span style={{ width: 10, height: 10, background: color, display: "inline-block" }} />
                      }
                      {label}
                    </span>
                  ))}
                </div>
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Amortización del crédito: composición del dividendo + saldo outstanding */}
      <ChartCard title="Repago del crédito (UF/año)">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={amortData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="year" tick={axisStyle} />
            <YAxis yAxisId="left" tick={axisStyle} tickFormatter={(v: number) => v.toFixed(0)} />
            <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip content={<ChartTooltip />} />
            <Bar yAxisId="left" dataKey="Interés" stackId="div" fill="#dc2626" opacity={0.8} />
            <Bar yAxisId="left" dataKey="Amortización" stackId="div" fill="#16a34a" opacity={0.8} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Saldo deuda" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}
