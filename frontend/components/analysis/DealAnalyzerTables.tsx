"use client";

import type { DealAnalyzerResult, DealAnalyzerInputs } from "@/types";
import { clNum } from "@/lib/formatters";

// ---------------------------------------------------------------------------
// Formatting helpers — pure-JS Chilean format
// ---------------------------------------------------------------------------
function fmt(v: number, d = 2): string {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return s + clNum(abs / 1_000_000, d) + "M";
  if (abs >= 10_000) return s + clNum(Math.round(abs), 0);
  return s + clNum(abs, d);
}
function pct(v: number, d = 1): string {
  if (isNaN(v) || !isFinite(v)) return "—";
  return clNum(v, d) + "%";
}

// ---------------------------------------------------------------------------
// Generic table
// ---------------------------------------------------------------------------
interface TableRow {
  label: string;
  v1: string;
  v2?: string;
  bold?: boolean;
  indent?: boolean;
  red?: boolean;
  green?: boolean;
  highlight?: boolean;
}

function DataTable({ title, rows }: { title: string; rows: TableRow[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-2">{title}</p>
      <table className="w-full border-collapse text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={[
                r.bold ? "bg-gray-100" : r.highlight ? "bg-green-50" : r.red ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50",
                "border-b border-gray-100",
              ].join(" ")}
            >
              <td className={`py-1.5 px-2 ${r.indent ? "pl-5 text-gray-500" : "text-gray-700"} ${r.bold ? "font-semibold" : ""}`}>
                {r.label}
              </td>
              <td className={`py-1.5 px-2 text-right font-mono ${r.bold || r.highlight ? "font-semibold" : ""} ${r.red ? "text-red-600" : r.green ? "text-green-700" : "text-gray-800"}`}>
                {r.v1}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-400 text-[11px]">{r.v2 ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default function DealAnalyzerTables({ result, inputs }: Props) {
  const r = result;

  const plRows: TableRow[] = [
    { label: "Renta bruta", v1: fmt(r.rentaUFanual), v2: "100%" },
    { label: "Vacancia", v1: fmt(-r.vacLoss), v2: `-${inputs.vacancia}%`, indent: true, red: true },
    { label: "Renta efectiva", v1: fmt(r.rentaEfec), v2: pct((r.rentaEfec / r.rentaUFanual) * 100, 0), indent: true },
    { label: "Gastos operac.", v1: fmt(-r.totalOpex), v2: `-${((r.totalOpex / r.rentaUFanual) * 100).toFixed(0)}%` },
    { label: "Administración", v1: fmt(-r.admUF), v2: "", indent: true, red: true },
    { label: "Contribuciones", v1: fmt(-r.contUF), v2: "", indent: true, red: true },
    { label: "Mantención", v1: fmt(-inputs.mantUF), v2: "", indent: true, red: true },
    { label: "Seguros", v1: fmt(-inputs.segUF), v2: "", indent: true, red: true },
    { label: "CAPEX reserva", v1: fmt(-r.capexUF), v2: "", indent: true, red: true },
    { label: "NOI", v1: fmt(r.noi), v2: pct((r.noi / r.rentaUFanual) * 100, 0), bold: true },
    { label: "Dividendo del crédito (año 1)", v1: fmt(-r.cuotaAnual), v2: "", indent: true, red: true },
    { label: "  — Interés", v1: fmt(-r.interesY1), v2: "", indent: true, red: true },
    { label: "  — Amortización", v1: fmt(-r.amortY1), v2: "", indent: true, red: true },
    {
      label: "Flujo al equity (año 1)",
      v1: fmt(r.noi - r.cuotaAnual),
      v2: pct(((r.noi - r.cuotaAnual) / r.rentaUFanual) * 100, 0),
      bold: true,
      highlight: r.noi - r.cuotaAnual >= 0,
      red: r.noi - r.cuotaAnual < 0,
    },
  ];

  const entradaRows: TableRow[] = [
    { label: "Equity base (pie)", v1: fmt(r.equity0UF), v2: `${(100 - inputs.ltv).toFixed(0)}%`, bold: true },
    { label: "Notaría / escritura", v1: fmt(r.notUF), indent: true, red: true },
    { label: "Timbres y estampillas", v1: fmt(r.timUF), indent: true, red: true },
    { label: "Tasación + originación", v1: fmt(r.tasUF), indent: true, red: true },
    { label: "Abogados / DD", v1: fmt(r.ddUF), indent: true, red: true },
    { label: "Corredor compra", v1: fmt(r.corUF), indent: true, red: true },
    { label: "CAPEX inicial", v1: fmt(r.repUF), indent: true, red: true },
    {
      label: "Equity total inicial",
      v1: fmt(r.equityTotalUF),
      v2: pct((r.equityTotalUF / inputs.valorUF) * 100, 1),
      bold: true,
    },
  ];

  const waterfallRows: TableRow[] = [
    { label: "Precio de venta", v1: fmt(r.saleVal), v2: "100%", bold: true },
    { label: "Cancelación deuda residual", v1: fmt(-(r.annual[inputs.horiz - 1]?.saldoDeuda ?? 0)), v2: `-${pct(((r.annual[inputs.horiz - 1]?.saldoDeuda ?? 0) / r.saleVal) * 100, 1)}`, indent: true, red: true },
    { label: "Corredor de venta", v1: fmt(-r.corrVenta), v2: `-${inputs.cvPct.toFixed(1)}%`, indent: true, red: true },
    { label: "Neto al equity (venta)", v1: fmt(r.netSale), v2: pct((r.netSale / r.saleVal) * 100, 1), bold: true, highlight: r.netSale >= 0 },
    { label: "Flujos acum. operac.", v1: fmt(r.flujoAcum), v2: `${inputs.horiz}a` },
    { label: "Total retorno bruto", v1: fmt(r.flujoAcum + r.netSale), bold: true },
    { label: "Equity invertido", v1: fmt(-r.equityTotalUF), red: true },
    {
      label: "Ganancia neta",
      v1: fmt(r.ganTotal),
      v2: pct((r.ganTotal / r.equityTotalUF) * 100, 0),
      bold: true,
      highlight: r.ganTotal >= 0,
      red: r.ganTotal < 0,
    },
    { label: "MOIC", v1: `${r.moic.toFixed(2)}x`, bold: true, highlight: r.moic >= 1.5 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DataTable title="P&L operacional anual (UF)" rows={plRows} />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DataTable title="Inversión de entrada (UF)" rows={entradaRows} />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DataTable title={`Waterfall de salida — año ${inputs.horiz} (UF)`} rows={waterfallRows} />
      </div>
    </div>
  );
}
