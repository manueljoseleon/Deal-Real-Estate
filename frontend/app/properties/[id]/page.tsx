import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatUF, formatCLP, formatArea } from "@/lib/formatters";
import BTLSummary from "@/components/analysis/BTLSummary";
import RentalCompsTable from "@/components/analysis/RentalCompsTable";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;

  let property, comps;
  try {
    [property, comps] = await Promise.all([
      api.properties.get(id),
      api.properties.comps(id),
    ]);
  } catch {
    notFound();
  }

  const mainImage = property.images?.[0];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">← Volver al listado</Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {property.title ?? property.external_id}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {property.commune}
          {property.neighborhood && ` · ${property.neighborhood}`}
          {property.region && ` · ${property.region}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: images + attributes */}
        <div className="space-y-5">
          {/* Image */}
          {mainImage && (
            <div className="rounded-lg overflow-hidden bg-gray-100 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mainImage}
                alt={property.title ?? "Propiedad"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Attributes grid */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
            <Attr label="Precio" value={formatUF(property.price_uf)} />
            <Attr label="Precio CLP" value={formatCLP(property.price_clp)} />
            <Attr label="Área útil" value={formatArea(property.useful_area_m2)} />
            {property.total_area_m2 && (
              <Attr label="Área total" value={formatArea(property.total_area_m2)} />
            )}
            <Attr label="Dormitorios" value={property.bedrooms != null ? String(property.bedrooms) : "—"} />
            <Attr label="Baños" value={property.bathrooms != null ? String(property.bathrooms) : "—"} />
            {property.floor != null && (
              <Attr label="Piso" value={String(property.floor)} />
            )}
            <Attr label="Estacionamiento" value={property.parking ? "Sí" : "No"} />
            <Attr label="Bodega" value={property.storage ? "Sí" : "No"} />
            {property.hoa_fee_clp != null && (
              <Attr label="Gastos comunes" value={formatCLP(property.hoa_fee_clp) + "/mes"} />
            )}
            {property.contributions_clp_annual != null && (
              <Attr label="Contribuciones" value={formatCLP(property.contributions_clp_annual) + "/año"} />
            )}
          </div>

          {/* Gallery thumbnails */}
          {property.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {property.images.slice(1, 7).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-20 w-28 rounded object-cover flex-shrink-0 bg-gray-100"
                />
              ))}
            </div>
          )}

          <a
            href={property.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            Ver en {property.portal} →
          </a>
        </div>

        {/* Right: BTL analysis + comps */}
        <div className="space-y-5">
          <BTLSummary btl={property.btl} price_clp={property.price_clp} />
          <RentalCompsTable comps={comps} />
        </div>
      </div>
    </main>
  );
}

function Attr({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}
