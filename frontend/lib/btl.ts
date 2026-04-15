import type { RentalCompItem } from "@/types";

/**
 * Iterative IQR outlier filter applied to rent_per_m2_clp.
 *
 * Removes comps whose $/m² is outside Q1 − 1.5×IQR … Q3 + 1.5×IQR.
 * Iterates up to 3 rounds (each round may expose a new outlier once the
 * previous extreme value is gone). Stops early when no new outliers are found
 * or when fewer than 3 comps would remain after removal.
 *
 * Returns the filtered array (outliers fully removed).
 */
export function filterOutlierComps(comps: RentalCompItem[]): RentalCompItem[] {
  let current = comps;

  for (let round = 0; round < 3; round++) {
    const withM2 = current.filter((c) => c.rent_per_m2_clp != null);
    if (withM2.length < 4) break; // not enough data to detect outliers

    const sorted = [...withM2].sort((a, b) => a.rent_per_m2_clp! - b.rent_per_m2_clp!);

    const q1 = percentile(sorted, 0.25);
    const q3 = percentile(sorted, 0.75);
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;

    const outlierIds = new Set(
      withM2
        .filter((c) => c.rent_per_m2_clp! < lo || c.rent_per_m2_clp! > hi)
        .map((c) => c.id)
    );

    if (outlierIds.size === 0) break; // converged

    const next = current.filter((c) => !outlierIds.has(c.id));
    if (next.length < 3) break; // guard: don't over-remove

    current = next;
  }

  return current;
}

function percentile(
  sorted: { rent_per_m2_clp: number | null }[],
  p: number
): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo].rent_per_m2_clp!;
  return (
    sorted[lo].rent_per_m2_clp! * (hi - idx) +
    sorted[hi].rent_per_m2_clp! * (idx - lo)
  );
}

/**
 * Compute estimated monthly rent from comps (already filtered).
 * Uses median of normalized_rent_clp (rent scaled to sale property size via $/m²).
 * This is the single source of truth — always consistent with what the user sees.
 */
export function computeMedianRentFromComps(comps: RentalCompItem[]): number | null {
  const rents = comps
    .map((c) => c.normalized_rent_clp)
    .filter((r): r is number => r != null);
  if (rents.length === 0) return null;
  const sorted = [...rents].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Check if the estimated rent for a property exceeds the highest actual rent
 * among its filtered comps. When true, the property's estimated rent is an
 * artifact of scaling — it's larger than any real comparable in absolute terms.
 */
export function isRentEstimateAnomalous(
  estimatedRent: number,
  filteredComps: RentalCompItem[]
): boolean {
  const rents = filteredComps
    .map((c) => c.rent_clp)
    .filter((r): r is number => r != null);
  if (rents.length === 0) return false;
  const maxCompRent = Math.max(...rents);
  return estimatedRent > maxCompRent;
}

/**
 * Compute gross yield from rent and price.
 */
export function computeGrossYield(monthlyRentClp: number, priceClp: number): number {
  return Math.round((monthlyRentClp * 12 / priceClp) * 10000) / 100;
}
