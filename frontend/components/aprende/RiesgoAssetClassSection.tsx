"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { TooltipProps } from "recharts";
import { activeMarket, type AssetClass } from "@/lib/markets";

// Midpoint return for scatter Y axis
function midReturn(ac: AssetClass) {
  return (ac.returnMin + ac.returnMax) / 2;
}

// Custom tooltip
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const ac: AssetClass = payload[0].payload.raw;
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-sm"
      style={{ fontFamily: "var(--font-josefin)" }}
    >
      <div className="font-semibold text-gray-900 mb-1">{ac.name}</div>
      <div className="text-gray-500">Retorno: {ac.returnMin}–{ac.returnMax}% anual</div>
      <div className="text-gray-500">Riesgo: {ac.riskScore}/10</div>
    </div>
  );
}

export default function RiesgoAssetClassSection() {
  const { assetClasses, noBrainerThreshold } = activeMarket;

  const data = assetClasses.map((ac) => ({
    x: ac.riskScore,
    y: midReturn(ac),
    raw: ac,
  }));

  return (
    <section id="riesgo" className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Comparación de activos
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Riesgo vs Retorno: ¿dónde encaja el inmobiliario?
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            El inmobiliario ofrece retornos atractivos para su nivel de riesgo,
            especialmente por su baja volatilidad vs acciones y el beneficio del
            apalancamiento.
          </p>
        </div>

        {/* Scatter chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-10">
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="x"
                name="Riesgo"
                domain={[0, 10]}
                label={{
                  value: "Nivel de riesgo (1–10)",
                  position: "insideBottom",
                  offset: -10,
                  style: { fontFamily: "var(--font-josefin)", fontSize: 11, fill: "#94a3b8" },
                }}
                tick={{ fontFamily: "var(--font-josefin)", fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Retorno"
                unit="%"
                domain={[0, 16]}
                label={{
                  value: "Retorno anual estimado (%)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontFamily: "var(--font-josefin)", fontSize: 11, fill: "#94a3b8" },
                }}
                tick={{ fontFamily: "var(--font-josefin)", fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Reference line at noBrainer Cap Rate */}
              <ReferenceLine
                y={noBrainerThreshold}
                stroke="#14b8a6"
                strokeDasharray="4 4"
                label={{
                  value: `"No brainer" ≥ ${noBrainerThreshold}%`,
                  position: "right",
                  style: { fontFamily: "var(--font-josefin)", fontSize: 10, fill: "#14b8a6" },
                }}
              />
              <Scatter data={data} r={16}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.raw.color} fillOpacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {assetClasses.map((ac) => (
              <div key={ac.name} className="flex items-center gap-1.5 text-xs text-gray-500"
                style={{ fontFamily: "var(--font-josefin)" }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ac.color }} />
                {ac.name}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-josefin)" }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Activo", "Retorno estimado", "Riesgo", "Liquidez", "Apalancamiento", "Requiere gestión"].map((h) => (
                    <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Cuenta de ahorro / DAP", ret: "3–5%", risk: "Muy bajo", liq: "Alta", lev: "No", mgmt: "No" },
                  { name: "Renta fija (bonos)", ret: "4–6%", risk: "Bajo", liq: "Media", lev: "No", mgmt: "Mínima" },
                  { name: "Inmobiliario (arriendo)", ret: "4–9%", risk: "Medio", liq: "Baja", lev: "Sí (80%)", mgmt: "Sí" },
                  { name: "REITs / Fondos inmob.", ret: "5–10%", risk: "Medio-alto", liq: "Media", lev: "Indirecto", mgmt: "No" },
                  { name: "Acciones (IPSA)", ret: "6–14%", risk: "Alto", liq: "Alta", lev: "Parcial", mgmt: "Media" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 px-5 font-medium text-gray-700">{row.name}</td>
                    <td className="py-3 px-5 text-teal-700 font-semibold">{row.ret}</td>
                    <td className="py-3 px-5 text-gray-500">{row.risk}</td>
                    <td className="py-3 px-5 text-gray-500">{row.liq}</td>
                    <td className="py-3 px-5 text-gray-500">{row.lev}</td>
                    <td className="py-3 px-5 text-gray-500">{row.mgmt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-5 text-xs text-gray-400 text-center leading-relaxed"
          style={{ fontFamily: "var(--font-josefin)" }}>
          Retornos estimados para el mercado chileno. El retorno inmobiliario incluye flujo de caja + apreciación.
          La comparación no considera costos de transacción ni impuestos.
        </p>
      </div>
    </section>
  );
}
