"use client";

import type { DealAnnualRow } from "@/types";
import { clNum } from "@/lib/formatters";

function f(v: number, d = 1): string {
  if (isNaN(v) || !isFinite(v)) return "—";
  return clNum(v, d);
}

function Cell({ v, red, green, bold }: { v: string; red?: boolean; green?: boolean; bold?: boolean }) {
  return (
    <td className={`px-2 py-1.5 text-right font-mono text-xs whitespace-nowrap
      ${red ? "text-red-600" : green ? "text-green-700" : "text-gray-700"}
      ${bold ? "font-semibold" : ""}`}>
      {v}
    </td>
  );
}

interface Props {
  annual: DealAnnualRow[];
}

export default function DealAnalyzerAnnualTable({ annual }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-3">
        Proyección año a año (UF)
      </p>
      <table className="w-full border-collapse text-xs min-w-[800px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Año", "Renta bruta", "Opex", "NOI", "Dividendo", "Interés", "Amort.", "Saldo deuda", "Flujo equity", "Valor activo"].map((h) => (
              <th key={h} className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wide text-gray-400 first:text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {annual.map((a, i) => (
            <tr key={a.year} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-2 py-1.5 font-mono text-xs font-semibold text-gray-500">{a.year}</td>
              <Cell v={f(a.rentaBruta)} />
              <Cell v={f(-a.totalOpex)} red />
              <Cell v={f(a.noi)} green={a.noi >= 0} red={a.noi < 0} bold />
              <Cell v={f(-a.cuota)} red />
              <Cell v={f(-a.interes)} red />
              <Cell v={f(-a.amort)} />
              <Cell v={f(a.saldoDeuda, 0)} />
              <Cell v={f(a.cashflow)} bold green={a.cashflow >= 0} red={a.cashflow < 0} />
              <Cell v={f(a.saleVal, 0)} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
