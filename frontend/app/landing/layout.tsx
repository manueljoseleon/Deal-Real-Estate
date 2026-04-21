import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deal Inmobiliario — Inversión inmobiliaria inteligente en Santiago",
  description:
    "Compara cap rate, yield y flujo de caja de departamentos y casas en Las Condes, Providencia, Ñuñoa y más comunas. Datos actualizados de los principales portales inmobiliarios.",
  openGraph: {
    title: "Deal Inmobiliario — Inversión inmobiliaria inteligente en Santiago",
    description:
      "Encuentra las propiedades más rentables de Santiago. Análisis de cap rate, comparables de arriendo y flujo de caja en tiempo real.",
    type: "website",
  },
};

// The landing page has its own full-screen navbar — suppress the root layout header.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
