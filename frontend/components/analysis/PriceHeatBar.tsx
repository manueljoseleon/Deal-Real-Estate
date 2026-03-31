import { formatUF } from "@/lib/formatters";

interface Props {
  priceUf: number | null | undefined;
  zoneAvgUfPerM2: number | null | undefined;
  usefulAreaM2: number | null | undefined;
  /** (zone_avg - price) / zone_avg * 100 — positive = cheaper than market */
  vsZona: number | null;
  priceUfPerM2?: number | null;
  zoneAvgSampleCount?: number | null;
}

function getInterpretation(vsZona: number): { title: string; body: string; color: string } {
  if (vsZona >= 15)
    return {
      title: "Puedes pagar menos por algo que vale más",
      body: "Propiedades así suelen venderse rápido. Si te interesa, no la dejes pasar.",
      color: "text-green-700",
    };
  if (vsZona >= 5)
    return {
      title: "El precio está ligeramente bajo el mercado",
      body: "Hay algo de margen respecto a propiedades similares en la zona.",
      color: "text-green-600",
    };
  if (vsZona >= -5)
    return {
      title: "El precio está en línea con el mercado",
      body: "Cotiza en torno al promedio de propiedades similares en la zona.",
      color: "text-gray-700",
    };
  if (vsZona >= -15)
    return {
      title: "El precio está un poco sobre el mercado",
      body: "Puede haber margen para negociar. Vale la pena intentarlo.",
      color: "text-amber-700",
    };
  return {
    title: "El precio está alto",
    body: "Pero eso puede abrir la puerta a una negociación. Habla con el vendedor, quién sabe.",
    color: "text-red-600",
  };
}

export default function PriceHeatBar({ priceUf, zoneAvgUfPerM2, usefulAreaM2, vsZona, priceUfPerM2, zoneAvgSampleCount }: Props) {
  if (vsZona === null || zoneAvgUfPerM2 == null || usefulAreaM2 == null || priceUf == null) {
    return null;
  }

  const { title, body, color } = getInterpretation(vsZona);

  // Dot position on bar: 0% = very cheap (green left), 100% = very expensive (red right)
  // vsZona +30 → 5%, vsZona 0 → 50%, vsZona -30 → 95%
  const rawPos = 50 - (vsZona / 70) * 50;
  const dotPct = Math.min(95, Math.max(5, rawPos));

  const zoneEstUf = zoneAvgUfPerM2 * usefulAreaM2;
  const rangeMin = zoneEstUf * 0.85;
  const rangeMax = zoneEstUf * 1.15;

  const absPct = Math.abs(vsZona).toFixed(1);
  const diffLabel = vsZona >= 0
    ? <span className="font-semibold text-green-600">{absPct}% más bajo</span>
    : <span className="font-semibold text-red-500">{absPct}% más alto</span>;

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-gray-800">Ventas comparables</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
      {/* Price per m² comparison rows */}
      {priceUfPerM2 != null && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Precio / m² esta venta</span>
            <span className="font-medium text-gray-800 tabular-nums">UF {priceUfPerM2.toFixed(1)} /m²</span>
          </div>
          <div className="flex justify-between" title="Promedio propiedades en venta en 1,5km">
            <span className="text-gray-500">
              Promedio zona
              {zoneAvgSampleCount != null && (
                <span className="text-gray-400 ml-1">({zoneAvgSampleCount} propiedades)</span>
              )}
            </span>
            <span className="tabular-nums text-gray-600">UF {zoneAvgUfPerM2.toFixed(1)} /m²</span>
          </div>
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* Left: interpretation */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-snug ${color}`}>{title}</p>
          <p className="text-xs text-gray-500 mt-1 leading-snug">{body}</p>
        </div>

        {/* Right: numbers + bar */}
        <div className="shrink-0 w-48 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
            </svg>
            Precio estimado zona
          </div>
          <p className="text-lg font-bold text-gray-900 tabular-nums leading-none">
            {formatUF(zoneEstUf)}
          </p>
          <p className="text-xs">{diffLabel} del estimado de zona</p>

          {/* Heat bar */}
          <div className="relative h-2.5 rounded-full overflow-visible mt-1"
            style={{ background: "linear-gradient(to right, #22c55e, #eab308, #ef4444)" }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
              style={{
                left: `${dotPct}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: dotPct < 40 ? "#16a34a" : dotPct < 60 ? "#ca8a04" : "#dc2626",
              }}
            />
          </div>

          {/* Range */}
          <div>
            <p className="text-xs text-gray-400">Rango estimado zona</p>
            <p className="text-xs font-medium text-gray-700 tabular-nums">
              {formatUF(rangeMin)} – {formatUF(rangeMax)}
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
