import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PropertyDetail } from "@/types";
import { formatUF, formatCLP, formatArea, formatStandardTitle, formatPortal } from "@/lib/formatters";
import BTLSummary from "@/components/analysis/BTLSummary";
import RentalCompsTable from "@/components/analysis/RentalCompsTable";
import ReviewPanel from "@/components/analysis/ReviewPanel";
import PriceHeatBar from "@/components/analysis/PriceHeatBar";
import ImageGallery from "@/components/properties/ImageGallery";
import ZoneCard from "@/components/properties/ZoneCard";
import PropertyLocationMap from "@/components/properties/PropertyLocationMapClient";
import { getZoneData } from "@/lib/zones";

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

  const standardTitle = formatStandardTitle(property.property_type, property.bedrooms, property.commune);

  const vsZona =
    property.price_uf_per_m2 != null && property.zone_avg_price_uf_per_m2 != null
      ? ((property.zone_avg_price_uf_per_m2 - property.price_uf_per_m2) /
          property.zone_avg_price_uf_per_m2) * 100
      : null;

  const hasLocation = property.lat != null && property.lng != null;
  const capRate = property.btl?.gross_yield_pct ?? null;
  const cta = buildCtaTier(capRate, vsZona, property.commune);

  const narrativeText = buildNarrativeText(capRate, vsZona, property.commune);

  return (
    <>
      {/* Sticky nav bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-700 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
          <span className="text-sm font-medium text-gray-700 truncate">{standardTitle}</span>
          <div className="w-16 shrink-0" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
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
            </div>

            {property.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Descripción</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {hasLocation && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ubicación</h2>
                <PropertyLocationMap lat={property.lat!} lng={property.lng!} label={standardTitle} />
              </div>
            )}

            <ZoneCard commune={property.commune} neighborhood={property.neighborhood} mode="indicators" />
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">
            <BTLSummary
              btl={property.btl}
              price_clp={property.price_clp}
              price_uf={property.price_uf}
              compsCount={comps.length}
              narrativeText={narrativeText}
              reviewTrigger={
                <ReviewPanel
                  property={property}
                  ufClp={ufClp}
                  propertyId={id}
                  triggerLabel="Ver análisis de inversión completo →"
                  triggerVariant="link"
                />
              }
            />

            <RentalCompsTable
              comps={comps}
              btl={property.btl}
              propertyLat={property.lat}
              propertyLng={property.lng}
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

        {/* ── FULL WIDTH — Portal CTA ── */}
        <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-sm text-gray-600 flex-1">
            ¿Te gusta esta propiedad?{" "}
            <a
              href={property.url}
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

const iconPaths: Record<string, React.ReactNode> = {
  currency: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />,
  area: <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5-5-5m5 5v-4m0 4h-4" />,
  bed: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V8a2 2 0 012-2h14a2 2 0 012 2v4M3 12v6h18v-6" />,
  bath: <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V6a2 2 0 012-2h8a2 2 0 012 2v7.5M3 13.5h18v1.5a4.5 4.5 0 01-4.5 4.5h-9A4.5 4.5 0 013 15v-1.5z" />,
  floor: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18" />,
  parking: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />,
  storage: <><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v2" /></>,
  fee: <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
};

function AttrIcon({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-2">
      <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {iconPaths[icon] ?? iconPaths.fee}
      </svg>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-medium text-gray-800 text-sm">{value}</p>
      </div>
    </div>
  );
}
