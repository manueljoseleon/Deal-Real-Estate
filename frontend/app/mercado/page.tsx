import type { Metadata } from "next";
import MercadoClient from "./MercadoClient";

export const metadata: Metadata = {
  title: "Análisis de Mercado — Deal Inmobiliario",
  description: "Visualizaciones de cap rates y oportunidades de inversión inmobiliaria en Chile.",
};

export default function MercadoPage() {
  return <MercadoClient />;
}
