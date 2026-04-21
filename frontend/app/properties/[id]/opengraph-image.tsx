import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import { formatStandardTitle, formatUF } from "@/lib/formatters";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let title = "Propiedad en Santiago";
  let commune = "";
  let priceLabel = "";
  let capRateLabel = "";
  let areaLabel = "";
  let propertyTypeLabel = "";

  try {
    const property = await api.properties.get(id);
    title = formatStandardTitle(
      property.property_type,
      property.bedrooms,
      property.commune
    );
    commune = property.commune;
    priceLabel = property.price_uf ? formatUF(property.price_uf) : "";
    capRateLabel =
      property.btl?.gross_yield_pct != null
        ? `${property.btl.gross_yield_pct.toFixed(1)}%`
        : "";
    areaLabel = property.useful_area_m2
      ? `${property.useful_area_m2} m²`
      : "";
    const typeMap: Record<string, string> = {
      apartment: "Departamento",
      house: "Casa",
      studio: "Estudio",
    };
    propertyTypeLabel = typeMap[property.property_type] ?? "Propiedad";
  } catch {
    // fallback values already set
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "60px",
        }}
      >
        {/* Header branding */}
        <div
          style={{
            fontSize: 20,
            color: "#64748b",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: "auto",
          }}
        >
          Deal Inmobiliario
        </div>

        {/* Property type badge */}
        {propertyTypeLabel && (
          <div
            style={{
              display: "flex",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: 16,
                color: "#38bdf8",
                background: "rgba(56,189,248,0.1)",
                border: "1px solid rgba(56,189,248,0.3)",
                borderRadius: "6px",
                padding: "4px 14px",
              }}
            >
              {propertyTypeLabel} · {commune}
            </div>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: "#f8fafc",
            letterSpacing: "-1px",
            lineHeight: 1.1,
            marginBottom: "32px",
          }}
        >
          {title}
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            priceLabel && { label: "Precio", value: priceLabel, highlight: false },
            capRateLabel && { label: "Cap rate", value: capRateLabel, highlight: true },
            areaLabel && { label: "Superficie", value: areaLabel, highlight: false },
          ]
            .filter(Boolean)
            .map((metric) => {
              if (!metric) return null;
              return (
                <div
                  key={metric.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: metric.highlight
                      ? "rgba(56,189,248,0.12)"
                      : "rgba(255,255,255,0.06)",
                    border: metric.highlight
                      ? "1px solid rgba(56,189,248,0.3)"
                      : "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "18px 28px",
                    minWidth: "180px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color: metric.highlight ? "#38bdf8" : "#f8fafc",
                    }}
                  >
                    {metric.value}
                  </div>
                  <div style={{ fontSize: 15, color: "#64748b", marginTop: "4px" }}>
                    {metric.label}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    ),
    size
  );
}
