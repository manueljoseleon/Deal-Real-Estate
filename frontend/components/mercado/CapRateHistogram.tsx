"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { CapRateBucket } from "@/types";

// Highlight threshold: buckets at or above this yield are "opportunities"
const HIGHLIGHT_THRESHOLD_PCT = 5;

function ChartTooltip({ active, payload, label, total }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
  return (
    <div className="bg-gray-900 rounded-md px-3 py-2 border border-gray-700 text-xs font-mono">
      <p className="text-amber-400 mb-1">Cap Rate {label}</p>
      <p className="text-white">{count.toLocaleString("es-CL")} propiedades</p>
      <p className="text-gray-400">{pct}% del total</p>
    </div>
  );
}

interface Props {
  data: CapRateBucket[];
  totalProperties: number;
}

export default function CapRateHistogram({ data, totalProperties }: Props) {
  const axisStyle = { fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" };

  // Count how many properties have cap rate >= threshold
  const highYieldCount = data
    .filter((b) => parseFloat(b.bucket) >= HIGHLIGHT_THRESHOLD_PCT || b.bucket === "5–6%" || b.bucket === "6%+")
    .reduce((sum, b) => sum + b.count, 0);
  const highYieldPct = totalProperties > 0 ? ((highYieldCount / totalProperties) * 100).toFixed(1) : "0";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">
            Distribución de Cap Rates
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalProperties.toLocaleString("es-CL")} propiedades activas
          </p>
        </div>
        {/* Callout: shows how rare high-yield properties are */}
        <div className="text-right">
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wide">≥ 5% cap rate</p>
          <p className="text-sm font-bold text-green-700 font-mono">{highYieldPct}% del stock</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="bucket" tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={(v: number) => v.toLocaleString("es-CL")} width={40} />
          <Tooltip content={<ChartTooltip total={totalProperties} />} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              formatter={(v: unknown) =>
                totalProperties > 0 ? `${(((v as number) / totalProperties) * 100).toFixed(1)}%` : ""
              }
              style={{ fontSize: 9, fontFamily: "monospace", fill: "#6b7280" }}
            />
            {data.map((entry) => {
              const isHighYield = entry.bucket === "5–6%" || entry.bucket === "6%+";
              return (
                <Cell
                  key={entry.bucket}
                  fill={isHighYield ? "#16a34a" : "#d1d5db"}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-gray-400 font-mono mt-2">
        Las barras verdes representan oportunidades de inversión con cap rate superior al 5%.
      </p>
    </div>
  );
}
