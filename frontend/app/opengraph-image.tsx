import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Deal Inmobiliario — Inversión inmobiliaria inteligente en Santiago";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)",
          padding: "80px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#f8fafc",
            letterSpacing: "-2px",
            marginBottom: "24px",
          }}
        >
          Deal Inmobiliario
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
            marginBottom: "48px",
          }}
        >
          Cap rate, yield y flujo de caja de propiedades en Santiago — actualizados a diario
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
          }}
        >
          {[
            { label: "Cap rate", value: "hasta 8%" },
            { label: "Comunas", value: "10+" },
            { label: "Datos", value: "actualizados" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "20px 36px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: "#38bdf8" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 16, color: "#64748b", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
