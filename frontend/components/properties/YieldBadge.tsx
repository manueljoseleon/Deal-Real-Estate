import type { YieldBand } from "@/types";
import { formatYield } from "@/lib/formatters";

interface Props {
  yield_pct: number | null | undefined;
  band: YieldBand;
  size?: "sm" | "md";
}

const bandStyles: Record<NonNullable<YieldBand>, string> = {
  excellent: "bg-green-700 text-white",
  good:      "bg-green-500 text-white",
  moderate:  "bg-yellow-400 text-yellow-900",
  weak:      "bg-red-500 text-white",
};

export default function YieldBadge({ yield_pct, band, size = "md" }: Props) {
  if (yield_pct == null) {
    return (
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-500 ${size === "sm" ? "text-xs" : "text-sm"}`}>
        sin datos
      </span>
    );
  }

  const style = band ? bandStyles[band] : "bg-gray-300 text-gray-700";
  return (
    <span className={`inline-block rounded px-2 py-0.5 font-semibold tabular-nums ${style} ${size === "sm" ? "text-xs" : "text-sm"}`}>
      {formatYield(yield_pct)}
    </span>
  );
}
