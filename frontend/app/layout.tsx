import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Cormorant_Garamond, Josefin_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next";
import AppHeader from "@/components/AppHeader";
import { HowItWorksProvider } from "@/contexts/HowItWorksContext";
import HowItWorksModal from "@/components/HowItWorksModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Deal Inmobiliario",
  description: "Análisis BTL de propiedades en Chile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${cormorant.variable} ${josefin.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <HowItWorksProvider>
          <AppHeader />
          <HowItWorksModal />
          <NuqsAdapter>{children}</NuqsAdapter>
          <Analytics />
        </HowItWorksProvider>
      </body>
    </html>
  );
}
