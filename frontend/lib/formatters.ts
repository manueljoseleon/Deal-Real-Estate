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

/** Format yield: 5.2% */
export function formatYield(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
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

/** Format matching tier as a human-readable confidence label */
export function formatMatchingTier(tier: number | null | undefined): string {
  if (tier == null) return "—";
  const labels: Record<number, string> = {
    1: "<1.5km, tipo+dorm+área",
    2: "<1.5km, tipo+dorm",
    3: "<3km, tipo+dorm+área",
    4: "<3km, tipo",
    5: "comuna, tipo+dorm",
    6: "comuna, tipo",
  };
  return labels[tier] ?? `Tier ${tier}`;
}
