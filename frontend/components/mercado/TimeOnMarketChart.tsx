"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { TimeOnMarketResponse } from "@/types";

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; payload: { pct: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 rounded-md px-3 py-2 border border-gray-700 text-xs font-mono">
      <p className="text-amber-400 mb-1">{label}</p>
      <p className="text-white">{payload[0].value.toLocaleString("es-CL")} propiedades</p>
      <p className="text-gray-400">{payload[0].payload.pct}% del total</p>
    </div>
  );
}

interface Props {
  data: TimeOnMarketResponse;
}

export default function TimeOnMarketChart({ data }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Tiempo en Mercado
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {data.total.toLocaleString("es-CL")} propiedades analizadas
          {data.median_days !== null && (
            <> · Mediana: <span className="font-semibold text-gray-700">{data.median_days} días</span></>
          )}
        </p>
      </div>

      {/* Histogram */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.histogram} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip content={<TooltipContent />} cursor={{ fill: "#f9fafb" }} />
          <Bar dataKey="count" fill="#0f766e" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="pct"
              position="top"
              formatter={(v: number) => `${v}%`}
              style={{ fontSize: 10, fill: "#6b7280" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top communes table */}
      {data.by_commune.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Mediana por comuna (días en mercado)
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {data.by_commune.slice(0, 10).map((row) => (
              <div key={row.commune} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{row.commune}</span>
                <span className="font-mono font-semibold text-gray-900 ml-2 shrink-0">
                  {row.median_days}d
                  <span className="text-gray-400 font-normal ml-1">({row.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
