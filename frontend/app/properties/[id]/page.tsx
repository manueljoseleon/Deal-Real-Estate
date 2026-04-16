import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { filterOutlierComps, computeMedianRentFromComps } from "@/lib/btl";
import type { PropertyDetail } from "@/types";
import { formatUF, formatCLP, formatArea, formatStandardTitle, formatPortal } from "@/lib/formatters";
import BTLSummary from "@/components/analysis/BTLSummary";
import RentalCompsTable from "@/components/analysis/RentalCompsTable";
import ReviewPanel from "@/components/analysis/ReviewPanel";
import PriceHeatBar from "@/components/analysis/PriceHeatBar";
import ImageGallery from "@/components/properties/ImageGallery";
import ZoneCard from "@/components/properties/ZoneCard";
import BackButton from "@/components/properties/BackButton";
import AttrIcon from "@/components/properties/AttrIcon";
import PropertyLocationMap from "@/components/properties/PropertyLocationMapClient";
import { getZoneData } from "@/lib/zones";

function formatTimeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "hace 1 semana";
  if (weeks < 4) return `hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  return `hace ${months} meses`;
}

interface Props {
  params: Promise<{ id: string }>;
}

const pvLabels: Record<string, string> = {
  "alta":                 "alta",
  "media-alta":           "media-alta",
  "media":                "media",
  "orientada al retorno": "orientada al retorno",
};

function buildCtaTier(
  capRate: number | null | undefined,
  vsZona: number | null,
  commune: string | null | undefined
) {
  const zoneData = commune ? getZoneData(commune) : null;
  const pvLabel = zoneData ? (pvLabels[zoneData.plusvalia.perspectiva] ?? null) : null;

  const bullets: string[] = [];
  if (capRate != null) bullets.push(`Cap rate ${capRate.toFixed(1)}%`);
  if (vsZona != null && vsZona > 1) bullets.push(`Precio ${vsZona.toFixed(1)}% más bajo que la zona`);
  if (pvLabel && commune) bullets.push(`Plusvalía ${pvLabel} en ${commune}`);

  if (capRate == null) {
    return {
      bg: "bg-gray-50", border: "border-gray-200", titleColor: "text-gray-700",
      title: "Explora el potencial de esta propiedad",
      bullets: [] as string[],
      ctaLabel: "Explora tus retornos",
    };
  }
  if (capRate >= 6) {
    return {
      bg: "bg-teal-50", border: "border-teal-200", titleColor: "text-teal-900",
      title: "Esta es una excelente oportunidad de inversión:",
      bullets,
      ctaLabel: "¿Cuánto puedo ganar?",
    };
  }
  if (capRate >= 5) {
    return {
      bg: "bg-green-50", border: "border-green-200", titleColor: "text-green-900",
      title: "Buena rentabilidad con características de zona atractivas:",
      bullets,
      ctaLabel: "¿Cuánto puedo ganar?",
    };
  }
  if (capRate >= 4) {
    return {
      bg: "bg-amber-50", border: "border-amber-200", titleColor: "text-amber-900",
      title: "Retorno moderado — arriendos en la zona están bajos para el precio de venta. Se debe explorar subir arriendos o bajar precio de compra para mejorar inversión.",
      bullets,
      ctaLabel: "Explora tus retornos",
    };
  }
  return {
    bg: "bg-gray-50", border: "border-gray-200", titleColor: "text-gray-700",
    title: "Retorno bajo — arriendos en la zona están bajos para el precio de venta. Se debe explorar subir arriendos o bajar precio de compra para que sea una buena inversión.",
    bullets,
    ctaLabel: "Explora tus retornos",
  };
}

function buildNarrativeText(
  capRate: number | null,
  vsZona: number | null,
  commune: string | null | undefined
): string | undefined {
  if (capRate == null) return undefined;

  const zoneData = commune ? getZoneData(commune) : null;
  const pvPerspectiva = zoneData?.plusvalia.perspectiva ?? null;
  const pvLabel = pvPerspectiva ? pvLabels[pvPerspectiva] : null;
  const isHighPlusv = pvPerspectiva === "alta" || pvPerspectiva === "media-alta";
  const isCheap = vsZona != null && vsZona > 5;
  const isVeryCheap = vsZona != null && vsZona > 10;

  if (capRate >= 6) {
    if (isCheap && isHighPlusv && pvLabel && commune) {
      return `Cap rate de ${capRate.toFixed(1)}%, precio ${vsZona!.toFixed(1)}% bajo el mercado y plusvalía ${pvLabel} en ${commune}. Triple ventaja: buena renta, buen precio y potencial de valorización.`;
    }
    return `Cap rate de ${capRate.toFixed(1)}%, gran oportunidad con retorno en el primer decil del mercado.`;
  }

  if (capRate >= 5) {
    if (isCheap && isHighPlusv && pvLabel && commune) {
      return `Buena rentabilidad con precio ${vsZona!.toFixed(1)}% bajo el mercado. El potencial de plusvalía ${pvLabel} en ${commune} suma atractivo a largo plazo.`;
    }
    return `Cap rate de ${capRate.toFixed(1)}%, buena oportunidad con retorno en el primer cuartil del mercado.`;
  }

  if (capRate >= 4) {
    return `Cap rate de ${capRate.toFixed(1)}% es moderado. Puede mejorar considerablemente si se negocia el precio a la baja o arriendo más alto, simula los números para analizar los escenarios de inversión.`;
  }

  // < 4% — solo narrativa si hay precio muy bajo y alta plusvalía
  if (isVeryCheap && pvPerspectiva === "alta" && pvLabel && commune) {
    return `Cap rate bajo para invertir. El potencial de plusvalía ${pvLabel} en ${commune} es un gran atractivo para el largo plazo, pero se debe intentar subir los arriendos y negociar el precio para que la inversión mejore.`;
  }

  return undefined;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;

  let property: PropertyDetail;
  let comps: Awaited<ReturnType<typeof api.properties.comps>>;
  let ufClp = 40000;
  try {
    const [prop, compsResult, ufData] = await Promise.all([
      api.properties.get(id),
      api.properties.comps(id),
      api.analysis.ufValue().catch(() => ({ uf_clp: 40000 })),
    ]);
    property = prop;
    comps = compsResult;
    ufClp = ufData.uf_clp;
  } catch {
    notFound();
  }

  // Remove IQR outliers first, then compute median from the clean set.
  const filteredComps = filterOutlierComps(comps);
  const compsMedianRent = computeMedianRentFromComps(filteredComps);

  const standardTitle = formatStandardTitle(property.property_type, property.bedrooms, property.commune);

  const vsZona =
    property.price_uf_per_m2 != null && property.zone_avg_price_uf_per_m2 != null
      ? ((property.zone_avg_price_uf_per_m2 - property.price_uf_per_m2) /
          property.zone_avg_price_uf_per_m2) * 100
      : null;

  const hasLocation = property.lat != null && property.lng != null;

  // Use the stored DB cap rate so dashboard and detail page always show the
  // same number. The DB value is updated (with IQR) by /analysis/recalculate.
  const capRate = property.btl?.gross_yield_pct ?? null;

  const cta = buildCtaTier(capRate, vsZona, property.commune);

  const narrativeText = buildNarrativeText(capRate, vsZona, property.commune);

  return (
    <>
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <BackButton label="← Oportunidades" />
          <span className="text-sm font-medium text-gray-700 truncate">{standardTitle}</span>
          <div className="w-16 shrink-0" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ── (order-2 on mobile so BTL shows first) */}
          <div className="space-y-5 order-2 lg:order-1">
            <ImageGallery images={property.images} alt={standardTitle} />

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900 leading-tight" style={{ fontFamily: "var(--font-cormorant)" }}>{standardTitle}</h1>
                <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {formatPortal(property.portal)}
                </span>
              </div>
              {property.title && (
                <p className="text-xs text-gray-400 mt-1 leading-snug">{property.title}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {property.commune}
                {property.neighborhood && ` · ${property.neighborhood}`}
                {property.region && ` · ${property.region}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">Publicada {formatTimeAgo(property.first_seen_at)}</p>
            </div>

            {/* Attributes card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 text-sm shadow-sm">
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5" style={{ fontFamily: "var(--font-josefin)" }}>
                <svg className="w-4 h-4 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
                </svg>
                Resumen propiedad en venta
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <AttrIcon label="Precio" value={formatUF(property.price_uf)} icon="currency" />
                <AttrIcon label="Precio CLP" value={formatCLP(property.price_clp)} icon="currency" />
                <AttrIcon label="Área útil" value={formatArea(property.useful_area_m2)} icon="area" />
                {property.total_area_m2 && (
                  <AttrIcon label="Área total" value={formatArea(property.total_area_m2)} icon="area" />
                )}
                <AttrIcon label="Dormitorios" value={property.bedrooms != null ? String(property.bedrooms) : "—"} icon="bed" />
                <AttrIcon label="Baños" value={property.bathrooms != null ? String(property.bathrooms) : "—"} icon="bath" />
                {property.floor != null && (
                  <AttrIcon label="Piso" value={String(property.floor)} icon="floor" />
                )}
                {property.parking && (
                  <AttrIcon label="Estacionamiento" value="Sí" icon="parking" />
                )}
                {property.storage && (
                  <AttrIcon label="Bodega" value="Sí" icon="storage" />
                )}
                {property.hoa_fee_clp != null && (
                  <AttrIcon label="Gastos comunes" value={formatCLP(property.hoa_fee_clp) + "/mes"} icon="fee" />
                )}
                {property.contributions_clp_annual != null && (
                  <AttrIcon label="Contribuciones" value={formatCLP(property.contributions_clp_annual) + "/año"} icon="fee" />
                )}
              </div>

              {/* Portal link at bottom of summary card */}
              <div className="pt-3 border-t border-gray-100">
                <a
                  href={property.url?.startsWith("https://") ? property.url : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 hover:underline font-medium"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Ver publicación en {formatPortal(property.portal)}
                </a>
              </div>
            </div>

            {property.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descripción</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {hasLocation && (
              <div id="location-map-section">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ubicación</h2>
                <PropertyLocationMap lat={property.lat!} lng={property.lng!} label={standardTitle} />
              </div>
            )}

            <ZoneCard commune={property.commune} neighborhood={property.neighborhood} mode="indicators" />
          </div>

          {/* ── RIGHT COLUMN ── (order-1 on mobile = shows first) */}
          <div className="space-y-5 order-1 lg:order-2">
            <BTLSummary
              btl={property.btl}
              price_clp={property.price_clp}
              price_uf={property.price_uf}
              usefulAreaM2={property.useful_area_m2}
              compsCount={filteredComps.length}
              compsMedianRent={compsMedianRent}
              narrativeText={narrativeText}
              reviewTrigger={
                <ReviewPanel
                  property={property}
                  ufClp={ufClp}
                  propertyId={id}
                  compsMedianRent={compsMedianRent}
                  triggerLabel="Ver análisis de inversión completo →"
                  triggerVariant="link"
                />
              }
            />

            <RentalCompsTable
              comps={filteredComps}
              btl={property.btl}
              propertyLat={property.lat}
              propertyLng={property.lng}
              compsMedianRent={compsMedianRent}
              saleUsefulAreaM2={property.useful_area_m2}
              saleBedrooms={property.bedrooms}
              ufClp={ufClp}
              alignBottomWithId={hasLocation ? "location-map-section" : undefined}
            />

            <PriceHeatBar
              priceUf={property.price_uf}
              zoneAvgUfPerM2={property.zone_avg_price_uf_per_m2}
              usefulAreaM2={property.useful_area_m2}
              vsZona={vsZona}
              priceUfPerM2={property.price_uf_per_m2}
              zoneAvgSampleCount={property.zone_avg_sample_count}
            />

            <ZoneCard commune={property.commune} neighborhood={property.neighborhood} mode="plusvalia" />

            {/* ── CTA block — always visible, color-coded by cap rate ── */}
            <div className={`rounded-xl border ${cta.border} ${cta.bg} p-5 space-y-4`}>
              <div>
                <p className={`text-sm font-bold ${cta.titleColor} leading-snug`}>{cta.title}</p>
                {cta.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {cta.bullets.map((b) => (
                      <li key={b} className={`text-xs font-medium flex items-center gap-1.5 ${cta.titleColor}`}>
                        <span className="text-base leading-none">·</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <ReviewPanel
                  property={property}
                  ufClp={ufClp}
                  propertyId={id}
                  compsMedianRent={compsMedianRent}
                  triggerLabel={cta.ctaLabel}
                  triggerVariant="button"
                />
                <p className="text-xs text-gray-500 text-center">
                  Si quieres un análisis más detallado revisa la{" "}
                  <Link
                    href={`/properties/${id}/analyze`}
                    className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    Calculadora Financiera
                  </Link>
                  {" "}y simula tu inversión.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Repeated CTA — mobile only (desktop has it in right column already) ── */}
        <div className="mt-6 lg:hidden">
          <ReviewPanel
            property={property}
            ufClp={ufClp}
            propertyId={id}
            compsMedianRent={compsMedianRent}
            triggerLabel="Ver análisis de inversión completo →"
            triggerVariant="button"
          />
        </div>

        {/* ── FULL WIDTH — Portal CTA ── */}
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-sm text-gray-600 flex-1">
            ¿Te gusta esta propiedad?{" "}
            <a
              href={property.url?.startsWith("https://") ? property.url : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Ingresa a su publicación en {formatPortal(property.portal)}
            </a>
            {" "}y contacta al vendedor directamente.
          </p>
        </div>
      </main>
    </>
  );
}

