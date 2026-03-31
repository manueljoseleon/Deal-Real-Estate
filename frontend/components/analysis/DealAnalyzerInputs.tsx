"use client";

import { useRef } from "react";
import type { DealAnalyzerInputs } from "@/types";
import { clNum } from "@/lib/formatters";

// ---------------------------------------------------------------------------
// Generic slider row
// ---------------------------------------------------------------------------
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  sublabel?: string;
  onChange: (v: number) => void;
}

function SliderInput({ label, value, min, max, step, display, sublabel, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-mono">{label}</span>
        <span className="text-sm font-semibold text-gray-800 font-mono">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-amber-600"
      />
      {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2 font-mono">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtClp(v: number) {
  if (!v) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1e6) return s + "$" + clNum(abs / 1e6, 1) + "M";
  if (abs >= 1e3) return s + "$" + clNum(Math.round(abs / 1e3), 0) + "k";
  return s + "$" + clNum(Math.round(abs), 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  inputs: DealAnalyzerInputs;
  model: { rentaUFmes: number; capBruto: number; debtUF: number; intUFanual?: number; notUF: number; timUF: number; tasUF: number; ddUF: number; corUF: number; repUF: number; dscr12Ltv: number | null };
  onChange: (patch: Partial<DealAnalyzerInputs>) => void;
}

export default function DealAnalyzerInputs({ inputs, model, onChange }: Props) {
  const o = onChange;
  // Freeze the max values at mount so the slider scale stays stable while dragging
  const priceMax = useRef(Math.max(20000, Math.ceil(inputs.valorUF * 1.5 / 500) * 500)).current;
  const rentMax = useRef(Math.max(3000000, Math.ceil(inputs.rentaClp * 1.5 / 100000) * 100000)).current;
  return (
    <div className="flex flex-col gap-4">

      <Section title="Activo y financiamiento">
        <SliderInput label="Valor activo" value={inputs.valorUF} min={500}
          max={priceMax} step={100}
          display={`${inputs.valorUF.toLocaleString("es-CL")} UF`}
          onChange={(v) => o({ valorUF: v })} />
        <SliderInput label="Renta mensual" value={inputs.rentaClp} min={100000} max={rentMax} step={25000}
          display={fmtClp(inputs.rentaClp)}
          sublabel={`≈ ${clNum(model.rentaUFmes, 1)} UF/mes · Cap Rate ${clNum(model.capBruto, 1)}%`}
          onChange={(v) => o({ rentaClp: v })} />
        <SliderInput label="LTV (deuda / activo)" value={inputs.ltv} min={0} max={85} step={5}
          display={`${inputs.ltv}%`}
          sublabel={`Deuda: ${clNum(model.debtUF, 0)} UF · LTV recomendado (DSCR 1.2): ${model.dscr12Ltv !== null ? model.dscr12Ltv + "%" : "NOI insuficiente"}`}
          onChange={(v) => o({ ltv: v })} />
        <SliderInput label="Tasa crédito (UF + %)" value={inputs.tasaDeuda} min={1} max={8} step={0.25}
          display={`UF + ${clNum(inputs.tasaDeuda, 2)}%`}
          onChange={(v) => o({ tasaDeuda: v })} />
        <SliderInput label="Plazo crédito" value={inputs.plazoAnios} min={5} max={30} step={5}
          display={`${inputs.plazoAnios} años`}
          onChange={(v) => o({ plazoAnios: v })} />
        <SliderInput label="Apreciación real anual" value={inputs.apreciacion} min={0} max={8} step={0.1}
          display={`UF + ${clNum(inputs.apreciacion, 1)}%`}
          sublabel="Sobre precio en UF (real)"
          onChange={(v) => o({ apreciacion: v })} />
        <SliderInput label="Horizonte inversión" value={inputs.horiz} min={1} max={20} step={1}
          display={`${inputs.horiz} años`}
          onChange={(v) => o({ horiz: v })} />
      </Section>

      <Section title="Costos operacionales anuales">
        <SliderInput label="Vacancia efectiva" value={inputs.vacancia} min={0} max={20} step={1}
          display={`${inputs.vacancia}%`} onChange={(v) => o({ vacancia: v })} />
        <SliderInput label="Administración (% renta efec.)" value={inputs.admPct} min={0} max={15} step={1}
          display={`${inputs.admPct}%`} onChange={(v) => o({ admPct: v })} />
        <SliderInput label="Contribuciones (% valor UF)" value={inputs.contribPct} min={0} max={2} step={0.1}
          display={`${clNum(inputs.contribPct, 1)}%`} onChange={(v) => o({ contribPct: v })} />
        <SliderInput label="Mantención anual" value={inputs.mantUF} min={0} max={50} step={1}
          display={`${inputs.mantUF} UF`} onChange={(v) => o({ mantUF: v })} />
        <SliderInput label="Seguros anuales" value={inputs.segUF} min={0} max={30} step={1}
          display={`${inputs.segUF} UF`} onChange={(v) => o({ segUF: v })} />
        <SliderInput label="CAPEX reserva (% valor UF)" value={inputs.capexPct} min={0} max={2} step={0.1}
          display={`${inputs.capexPct.toFixed(1)}%`} onChange={(v) => o({ capexPct: v })} />
      </Section>

      <Section title="Costos de entrada (CLP → UF)">
        <SliderInput label="Notaría / escritura" value={inputs.notClp} min={100000} max={2000000} step={50000}
          display={fmtClp(inputs.notClp)} sublabel={`${model.notUF.toFixed(1)} UF`}
          onChange={(v) => o({ notClp: v })} />
        <SliderInput label="Timbres y estampillas (% crédito)" value={inputs.timPct} min={0} max={1.2} step={0.1}
          display={`${inputs.timPct.toFixed(1)}%`} sublabel={`${model.timUF.toFixed(1)} UF`}
          onChange={(v) => o({ timPct: v })} />
        <SliderInput label="Tasación + originación banco" value={inputs.tasClp} min={100000} max={2000000} step={100000}
          display={fmtClp(inputs.tasClp)} sublabel={`${model.tasUF.toFixed(1)} UF`}
          onChange={(v) => o({ tasClp: v })} />
        <SliderInput label="Abogados / due diligence" value={inputs.ddClp} min={0} max={5000000} step={200000}
          display={fmtClp(inputs.ddClp)} sublabel={`${model.ddUF.toFixed(1)} UF`}
          onChange={(v) => o({ ddClp: v })} />
        <SliderInput label="Corredor compra (% valor)" value={inputs.corPct} min={0} max={4} step={0.5}
          display={`${inputs.corPct.toFixed(1)}%`} sublabel={`${model.corUF.toFixed(1)} UF`}
          onChange={(v) => o({ corPct: v })} />
        <SliderInput label="CAPEX / reparación inicial" value={inputs.repClp} min={0} max={20000000} step={500000}
          display={fmtClp(inputs.repClp)} sublabel={`${model.repUF.toFixed(1)} UF`}
          onChange={(v) => o({ repClp: v })} />
      </Section>

      <Section title="Costos de salida">
        <SliderInput label="Corredor venta (% valor)" value={inputs.cvPct} min={0} max={4} step={0.5}
          display={`${inputs.cvPct.toFixed(1)}%`} onChange={(v) => o({ cvPct: v })} />
      </Section>

    </div>
  );
}
