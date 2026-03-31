"use client";

import { useMemo } from "react";
import { clNum } from "@/lib/formatters";
import type { DealAnalyzerInputs } from "@/types";
import { computeDealModel } from "@/lib/dealModel";

interface Props {
  inputs: DealAnalyzerInputs;
  ufClp: number;
  baseIrr: number;
}

function irrColor(v: number): string {
  if (v >= 5) return "text-green-700 font-semibold";
  if (v >= 3) return "text-amber-700 font-semibold";
  return "text-red-600 font-semibold";
}

function Cell({ irr, isBase }: { irr: number; isBase: boolean }) {
  return (
    <td className={`px-3 py-2 text-center font-mono text-xs border border-gray-100 ${isBase ? "bg-amber-50 ring-1 ring-amber-400 ring-inset" : ""} ${irrColor(irr)}`}>
      UF+{clNum(irr, 1)}%
    </td>
  );
}

export default function DealAnalyzerSensitivity({ inputs, ufClp, baseIrr }: Props) {
  // Base at center, 3 steps above (descuento), 3 steps below (sobreprecio)
  const priceDiscounts = [15, 10, 5, 0, -5, -10, -15]; // positive = discount (lower price), negative = premium
  const rentChanges = [30, 20, 10, 0, -10, -20, -30];

  // priceDiscounts: positive = buying at a discount (lower price), negative = paying premium
  const priceSensitivity = useMemo(() => {
    return priceDiscounts.map((discountPct) => {
      const newPrice = Math.round(inputs.valorUF * (1 - discountPct / 100));
      const result = computeDealModel({ ...inputs, valorUF: newPrice }, ufClp);
      return { discountPct, newPrice, irr: result.irrVal };
    });
  }, [inputs, ufClp]);

  const rentSensitivity = useMemo(() => {
    return rentChanges.map((changePct) => {
      const newRent = Math.round(inputs.rentaClp * (1 + changePct / 100));
      const result = computeDealModel({ ...inputs, rentaClp: newRent }, ufClp);
      return { changePct, newRent, irr: result.irrVal };
    });
  }, [inputs, ufClp]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Price discount sensitivity */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-3">
          Sensibilidad TIR vs precio de compra
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                Variación precio
              </th>
              <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                Precio (UF)
              </th>
              <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                TIR real
              </th>
            </tr>
          </thead>
          <tbody>
            {priceSensitivity.map(({ discountPct, newPrice, irr }, idx) => {
              const isBase = discountPct === 0;
              return (
                <tr key={discountPct} className={isBase ? "bg-amber-50 ring-1 ring-inset ring-amber-300" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 font-mono text-xs border border-gray-100 text-gray-700">
                    {discountPct > 0 ? `-${discountPct}% descuento` : discountPct < 0 ? `+${Math.abs(discountPct)}% premium` : "Base (sin descuento)"}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs border border-gray-100 text-gray-600">
                    {newPrice.toLocaleString("es-CL")}
                  </td>
                  <Cell irr={irr} isBase={isBase} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rent change sensitivity */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono mb-3">
          Sensibilidad TIR vs variación de arriendo
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                Variación arriendo
              </th>
              <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                Renta mensual
              </th>
              <th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wide text-gray-400 border border-gray-100">
                TIR real
              </th>
            </tr>
          </thead>
          <tbody>
            {rentSensitivity.map(({ changePct, newRent, irr }, idx) => {
              const isBase = changePct === 0;
              return (
                <tr key={changePct} className={isBase ? "bg-amber-50 ring-1 ring-inset ring-amber-300" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 font-mono text-xs border border-gray-100 text-gray-700">
                    {changePct > 0 ? `+${changePct}% arriendo` : changePct < 0 ? `${changePct}% arriendo` : "Base (arriendo actual)"}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-xs border border-gray-100 text-gray-600">
                    ${newRent.toLocaleString("es-CL")}
                  </td>
                  <Cell irr={irr} isBase={isBase} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
