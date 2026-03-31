// ─── Chile Market Configuration ───────────────────────────────────────────────
// All benchmark values are calibrated to the Chilean real estate market.
// To add a new market (e.g. Mexico), create mx.ts with the same MarketConfig
// shape and re-export it from index.ts.

export interface CapRateTier {
  label: string;
  color: "green" | "yellow" | "red";
  min?: number; // inclusive lower bound (%)
  max?: number; // exclusive upper bound (%)
  description: string;
}

export interface AssetClass {
  name: string;
  returnMin: number; // % annual
  returnMax: number; // % annual
  riskScore: number; // 1–10 scale
  color: string;    // hex for chart dot
}

export interface MarketConfig {
  id: string;
  name: string;
  currency: string;           // display symbol, e.g. "UF"
  currencyFull: string;       // e.g. "Unidad de Fomento (UF)"

  // Cap Rate benchmarks
  capRateTiers: CapRateTier[];
  noBrainerThreshold: number; // Cap Rate % — clearly worth pursuing
  noGoThreshold: number;      // Cap Rate % — clearly avoid

  // Mortgage
  mortgageRateMin: number;    // % annual
  mortgageRateMax: number;    // % annual
  typicalLTV: number;         // % of purchase price financed
  minDSCR: number;            // minimum NOI / annual debt service

  // Appreciation
  appreciationMin: number;    // % real annual
  appreciationMax: number;    // % real annual

  // Typical entry/exit costs (% of property value)
  entryCostsPct: number;
  exitCostsPct: number;

  // Typical vacancy rate assumption
  typicalVacancyPct: number;

  // Asset class comparison data for scatter chart
  assetClasses: AssetClass[];
}

export const clMarket: MarketConfig = {
  id: "cl",
  name: "Chile",
  currency: "UF",
  currencyFull: "Unidad de Fomento (UF)",

  // ─── Cap Rate Benchmarks ─────────────────────────────────────────────────
  capRateTiers: [
    {
      label: "Excelente",
      color: "green",
      min: 6,
      description: "Retorno muy por sobre el mercado. Alta generación de flujo de caja. Excelente punto de entrada.",
    },
    {
      label: "Bueno",
      color: "green",
      min: 5,
      max: 6,
      description: "Retorno sobre el promedio. Flujo de caja positivo con hipoteca típica.",
    },
    {
      label: "Moderado",
      color: "yellow",
      min: 3.5,
      max: 5,
      description: "Zona gris. Puede funcionar con buen financiamiento, apreciación futura o mejoras al inmueble.",
    },
    {
      label: "Bajo",
      color: "red",
      max: 3.5,
      description: "Difícil generar flujo positivo. Solo justificable por apreciación especulativa o uso del inmueble.",
    },
  ],
  noBrainerThreshold: 6,
  noGoThreshold: 3.5,

  // ─── Mortgage ────────────────────────────────────────────────────────────
  mortgageRateMin: 4.0,
  mortgageRateMax: 5.5,
  typicalLTV: 80,
  minDSCR: 1.2,

  // ─── Appreciation ────────────────────────────────────────────────────────
  appreciationMin: 2,
  appreciationMax: 4,

  // ─── Transaction Costs ───────────────────────────────────────────────────
  entryCostsPct: 3,   // notaría, impuestos, gestoría, tasación ≈ 2–4%
  exitCostsPct: 3,    // comisión corredora + impuesto ganancia capital ≈ 2–4%

  // ─── Vacancy ─────────────────────────────────────────────────────────────
  typicalVacancyPct: 5, // ~0.6 meses vacíos al año

  // ─── Asset Class Comparison ──────────────────────────────────────────────
  // riskScore: 1 = muy bajo, 10 = muy alto
  assetClasses: [
    {
      name: "Cuenta de ahorro / DAP",
      returnMin: 3,
      returnMax: 5,
      riskScore: 1,
      color: "#64748b",
    },
    {
      name: "Renta fija (bonos)",
      returnMin: 4,
      returnMax: 6,
      riskScore: 2,
      color: "#0ea5e9",
    },
    {
      name: "Inmobiliario (arriendo)",
      returnMin: 4,
      returnMax: 9,
      riskScore: 4,
      color: "#14b8a6",
    },
    {
      name: "REITs / Fondos inmobiliarios",
      returnMin: 5,
      returnMax: 10,
      riskScore: 5,
      color: "#8b5cf6",
    },
    {
      name: "Acciones (IPSA)",
      returnMin: 6,
      returnMax: 14,
      riskScore: 8,
      color: "#f59e0b",
    },
  ],
};
