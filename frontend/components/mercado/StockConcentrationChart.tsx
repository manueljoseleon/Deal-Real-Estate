"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import type { StockConcentrationResponse } from "@/types";

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { opportunity_pct: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  const oppPct = payload[0]?.payload?.opportunity_pct ?? 0;
  return (
    <div className="bg-gray-900 rounded-md px-3 py-2 border border-gray-700 text-xs font-mono">
      <p className="text-amber-400 mb-1 font-semibold">{label}</p>
      <p className="text-white">{total.toLocaleString("es-CL")} propiedades</p>
      <p className="text-emerald-400">{oppPct}% oportunidades (yield ≥5%)</p>
    </div>
  );
}

interface Props {
  data: StockConcentrationResponse;
}

export default function StockConcentrationChart({ data }: Props) {
  // Show top 15 by total count for readability; sort by opportunity_pct (already sorted from backend)
  const chartData = data.communes.slice(0, 15).map((c) => ({
    commune: c.commune.replace("Gran Santiago: ", "").replace("Santiago: ", ""),
    high_yield: c.high_yield_count,
    regular: c.total_count - c.high_yield_count,
    opportunity_pct: c.opportunity_pct,
    total_count: c.total_count,
    median_price_uf: c.median_price_uf,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Concentración de Stock por Comuna</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Propiedades activas · Ordenado por % de oportunidades (yield ≥5%)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="commune" tick={{ fontSize: 11 }} width={90} />
          <Tooltip content={<TooltipContent />} cursor={{ fill: "#f9fafb" }} />
          <Legend
            formatter={(value) => value === "high_yield" ? "Yield ≥5%" : "Resto"}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar dataKey="regular" name="Resto" stackId="a" fill="#e5e7eb" radius={[0, 0, 0, 0]} />
          <Bar dataKey="high_yield" name="Yield ≥5%" stackId="a" fill="#0f766e" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.opportunity_pct >= 10 ? "#059669" : "#0f766e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Quick table with opportunity % per commune */}
      <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-3 gap-x-4 gap-y-1">
        {data.communes.slice(0, 9).map((c) => (
          <div key={c.commune} className="flex items-center justify-between text-xs">
            <span className="text-gray-600 truncate">{c.commune}</span>
            <span className={`font-mono font-semibold ml-2 shrink-0 ${c.opportunity_pct >= 10 ? "text-emerald-600" : c.opportunity_pct >= 5 ? "text-yellow-600" : "text-gray-500"}`}>
              {c.opportunity_pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
