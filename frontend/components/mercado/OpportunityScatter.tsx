"use client";

import { useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ZAxis,
} from "recharts";
import type { ScatterPoint } from "@/types";
import { fmtPct, formatUF } from "@/lib/formatters";

// Reference lines that define the 4 quadrants
const YIELD_THRESHOLD = 5;   // X axis split (cap rate %)
const DISCOUNT_THRESHOLD = 0; // Y axis split (discount % vs zone)

// Quadrant colors
const Q_COLORS = {
  best:       "#16a34a", // Q1: bajo mercado + alta renta → verde
  lowRent:    "#d97706", // Q2: bajo mercado + baja renta → amber
  highRent:   "#3b82f6", // Q3: sobre mercado + alta renta → azul
  avoid:      "#d1d5db", // Q4: sobre mercado + baja renta → gris
};

interface EnrichedPoint {
  yield_pct: number;
  discount_pct: number;
  id: string;
  title: string | null;
  commune: string;
  price_uf: number | null;
}

function ScatterTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: EnrichedPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isOpportunity = d.yield_pct >= YIELD_THRESHOLD && d.discount_pct >= DISCOUNT_THRESHOLD;
  return (
    <div className="bg-gray-900 rounded-md px-3 py-2 border border-gray-700 text-xs font-mono max-w-[200px]">
      {isOpportunity && (
        <p className="text-green-400 font-bold mb-1">Oportunidad ★</p>
      )}
      <p className="text-white truncate mb-1">{d.title ?? d.commune}</p>
      <p className="text-gray-300">{d.commune}</p>
      <p className="text-amber-400 mt-1">Cap Rate: {fmtPct(d.yield_pct, 1)}</p>
      <p className={d.discount_pct >= 0 ? "text-green-400" : "text-red-400"}>
        {d.discount_pct >= 0 ? "↓" : "↑"} {fmtPct(Math.abs(d.discount_pct), 1)} vs zona
      </p>
      {d.price_uf != null && (
        <p className="text-gray-400 mt-1">{formatUF(d.price_uf)}</p>
      )}
    </div>
  );
}

interface Props {
  data: ScatterPoint[];
}

export default function OpportunityScatter({ data }: Props) {
  const axisStyle = { fontSize: 10, fontFamily: "monospace", fill: "#9ca3af" };

  // Compute discount_pct for each point and split by quadrant
  const { q1, q2, q3, q4 } = useMemo(() => {
    const q1: EnrichedPoint[] = [];
    const q2: EnrichedPoint[] = [];
    const q3: EnrichedPoint[] = [];
    const q4: EnrichedPoint[] = [];

    for (const p of data) {
      const discount = ((p.zone_avg_price_uf_per_m2 - p.price_per_m2_uf) / p.zone_avg_price_uf_per_m2) * 100;
      const point: EnrichedPoint = {
        yield_pct: p.gross_yield_pct,
        discount_pct: parseFloat(discount.toFixed(2)),
        id: p.id,
        title: p.title,
        commune: p.commune,
        price_uf: p.price_uf,
      };
      if (p.gross_yield_pct >= YIELD_THRESHOLD && discount >= DISCOUNT_THRESHOLD) q1.push(point);
      else if (p.gross_yield_pct < YIELD_THRESHOLD && discount >= DISCOUNT_THRESHOLD) q2.push(point);
      else if (p.gross_yield_pct >= YIELD_THRESHOLD && discount < DISCOUNT_THRESHOLD) q3.push(point);
      else q4.push(point);
    }
    return { q1, q2, q3, q4 };
  }, [data]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">
            Cuadrante de Oportunidades
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.length.toLocaleString("es-CL")} propiedades con datos de zona
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wide">Mejores oportunidades</p>
          <p className="text-sm font-bold text-green-700 font-mono">{q1.length} propiedades</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 36 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="yield_pct"
            type="number"
            name="Cap Rate"
            tick={axisStyle}
            tickFormatter={(v: number) => `${v}%`}
            label={{ value: "Cap Rate Bruto (%)", position: "insideBottom", offset: -12, fontSize: 10, fill: "#9ca3af", fontFamily: "monospace" }}
          />
          <YAxis
            dataKey="discount_pct"
            type="number"
            name="Descuento vs zona"
            tick={axisStyle}
            tickFormatter={(v: number) => `${v}%`}
            label={{ value: "Descuento vs zona (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#9ca3af", fontFamily: "monospace" }}
            width={50}
          />
          <ZAxis range={[20, 20]} />
          <Tooltip content={<ScatterTooltip />} />

          {/* Reference lines that draw the 4 quadrants */}
          <ReferenceLine x={YIELD_THRESHOLD} stroke="#6b7280" strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine y={DISCOUNT_THRESHOLD} stroke="#6b7280" strokeDasharray="4 2" strokeWidth={1.5} />

          {/* Q1: precio bajo mercado + renta alta — BEST */}
          <Scatter name="Mejor oportunidad" data={q1} fill={Q_COLORS.best} opacity={0.75} />
          {/* Q2: precio bajo mercado + renta baja */}
          <Scatter name="Precio ok, renta baja" data={q2} fill={Q_COLORS.lowRent} opacity={0.65} />
          {/* Q3: precio sobre mercado + renta alta */}
          <Scatter name="Renta ok, precio alto" data={q3} fill={Q_COLORS.highRent} opacity={0.65} />
          {/* Q4: precio sobre mercado + renta baja — AVOID */}
          <Scatter name="Evitar" data={q4} fill={Q_COLORS.avoid} opacity={0.5} />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 10, fontFamily: "monospace", paddingTop: 24 }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant summary grid */}
      {(() => {
        const total = data.length;
        const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%";
        const quadrants = [
          { label: "Precio bajo + renta alta", sublabel: "Mejores oportunidades", count: q1.length, color: Q_COLORS.best,     border: "border-green-200",  bg: "bg-green-50" },
          { label: "Precio bajo + renta baja", sublabel: "Mixto",                 count: q2.length, color: Q_COLORS.lowRent,  border: "border-amber-200",  bg: "bg-amber-50" },
          { label: "Precio alto + renta alta", sublabel: "Mixto",                 count: q3.length, color: Q_COLORS.highRent, border: "border-blue-200",   bg: "bg-blue-50" },
          { label: "Precio alto + renta baja", sublabel: "Evitar",                count: q4.length, color: Q_COLORS.avoid,    border: "border-gray-200",   bg: "bg-gray-50" },
        ];
        return (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {quadrants.map((q) => (
              <div key={q.label} className={`rounded border ${q.border} ${q.bg} px-3 py-2 flex items-center gap-2`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: q.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-gray-500 truncate">{q.label}</p>
                  <p className="text-[10px] font-mono text-gray-400">{q.sublabel}</p>
                </div>
                <div className="ml-auto text-right flex-shrink-0">
                  <p className="text-xs font-bold font-mono text-gray-700">{q.count.toLocaleString("es-CL")}</p>
                  <p className="text-[10px] font-mono text-gray-400">{pct(q.count)}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <p className="text-[10px] text-gray-400 font-mono mt-2">
        Eje Y positivo = precio por m² bajo el promedio de zona (descuento). Eje X = cap rate bruto estimado.
      </p>
    </div>
  );
}
