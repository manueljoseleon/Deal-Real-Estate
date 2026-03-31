/** Format a CLP amount: $ 1.250.000 */
export function formatCLP(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$ ${Math.round(value).toLocaleString("es-CL")}`;
}

/** Format a UF amount: UF 2.450 */
export function formatUF(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  return `UF ${value.toLocaleString("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format m²: 65 m² */
export function formatArea(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Math.round(value)} m²`;
}

/** Format yield: 5,2% */
export function formatYield(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

// ---------------------------------------------------------------------------
// Deal Analyzer helpers — pure-JS Chilean format (. miles, , decimales)
// Avoids toLocaleString("es-CL") which can be unreliable in SSR/Node.js
// ---------------------------------------------------------------------------

/**
 * Core formatter: produces Chilean numeric string.
 * e.g. clNum(1234.5, 2) → "1.234,50"  |  clNum(-8.2, 1) → "-8,2"
 */
export function clNum(v: number, decimals = 0): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  const sign = v < 0 ? "-" : "";
  const fixed = Math.abs(v).toFixed(decimals);        // always uses "." internally
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return sign + (decimals > 0 ? `${withDots},${decPart}` : withDots);
}

/** Format a percentage: 8,2% */
export function fmtPct(v: number, d = 1): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  return clNum(v, d) + "%";
}

/**
 * Format a compact UF numeric (no prefix).
 * Large values: 1.234,56  |  12.345 (integer rounded)  |  1,23M
 */
export function fmtUFNum(v: number, d = 2): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return s + clNum(abs / 1_000_000, d) + "M";
  if (abs >= 10_000)    return s + clNum(Math.round(abs), 0);
  return s + clNum(abs, d);
}

/** Format a compact CLP for display in tables: $ 1.25M */
export function formatCLPCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$ ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$ ${(value / 1_000_000).toFixed(1)}M`;
  return `$ ${Math.round(value).toLocaleString("es-CL")}`;
}

/** Shorten portal names for display */
export function formatPortal(portal: string): string {
  const map: Record<string, string> = {
    portal_inmobiliario: "Portal Inm.",
    yapo: "Yapo",
    toctoc: "TocToc",
  };
  return map[portal] ?? portal;
}

/** Standardized property title: "Depto. 3D · Providencia" */
export function formatStandardTitle(
  property_type: string,
  bedrooms: number | null,
  commune: string
): string {
  const typeMap: Record<string, string> = {
    apartment: "Depto.",
    house: "Casa",
    studio: "Estudio",
  };
  const label = typeMap[property_type] ?? "Prop.";
  const bedsStr = bedrooms != null ? ` ${bedrooms}D` : "";
  return `${label}${bedsStr} · ${commune}`;
}

/** Short confidence label from matching tier for card chips */
export function formatMatchingConfidence(tier: number | null | undefined): { label: string; color: string } {
  if (tier == null) return { label: "", color: "" };
  if (tier <= 2) return { label: "Alta confianza", color: "text-green-700 bg-green-50" };
  if (tier <= 4) return { label: "Zona media", color: "text-yellow-700 bg-yellow-50" };
  return { label: "Zona amplia", color: "text-gray-500 bg-gray-100" };
}

/** Format matching tier as a human-readable confidence label */
export function formatMatchingTier(tier: number | null | undefined): string {
  if (tier == null) return "—";
  const labels: Record<number, string> = {
    1: "<1.5km, tipo+dorm+área",
    2: "<1.5km, tipo+dorm",
    3: "<3km, tipo+dorm+área",
    4: "<3km, tipo",
    5: "comuna, tipo+dorm",
    6: "comuna, tipo+dorm ±1",
    7: "comuna, tipo (cualquier dorm.)",
  };
  return labels[tier] ?? `Tier ${tier}`;
}
