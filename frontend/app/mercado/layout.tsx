import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Análisis de mercado",
  description:
    "Mapa interactivo con el precio promedio por m² en cada zona de Santiago. Identifica comunas con mejor relación arriendo/precio para invertir.",
  openGraph: {
    title: "Análisis de mercado inmobiliario en Santiago",
    description:
      "Precios por m², tiempo en mercado, concentración de stock y matriz de yield por comuna y tipología.",
  },
};

export default function MercadoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
