import type { Metadata } from "next";
import { activeMarket } from "@/lib/markets";
import HeroAprende from "@/components/aprende/HeroAprende";
import BasicsSection from "@/components/aprende/BasicsSection";
import GlosarioSection from "@/components/aprende/GlosarioSection";
import BenchmarkCapRateSection from "@/components/aprende/BenchmarkCapRateSection";
import CreditoHipotecarioSection from "@/components/aprende/CreditoHipotecarioSection";
import RiesgoAssetClassSection from "@/components/aprende/RiesgoAssetClassSection";
import DecisionTable from "@/components/aprende/DecisionTable";

export const metadata: Metadata = {
  title: `Aprende a Invertir en Bienes Raíces · Deal Inmobiliario`,
  description: `Guía completa de inversión inmobiliaria para el mercado ${activeMarket.name}: Cap Rate, NOI, crédito hipotecario, benchmarks y umbrales de decisión.`,
};

export default function AprendePage() {
  return (
    <main>
      <HeroAprende />
      <BasicsSection />
      <GlosarioSection />
      <BenchmarkCapRateSection />
      <CreditoHipotecarioSection />
      <RiesgoAssetClassSection />
      <DecisionTable />
    </main>
  );
}
