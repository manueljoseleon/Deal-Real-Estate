import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Cormorant_Garamond, Josefin_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next";
import AppHeader from "@/components/AppHeader";
import FeedbackWidget from "@/components/FeedbackWidget";
import { HowItWorksProvider } from "@/contexts/HowItWorksContext";
import HowItWorksModal from "@/components/HowItWorksModal";
import { AuthProvider } from "@/contexts/AuthContext";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deal Inmobiliario",
    template: "%s · Deal Inmobiliario",
  },
  description:
    "Encuentra propiedades para invertir en Santiago. Cap rate, yield y flujo de caja actualizados para Las Condes, Providencia, Ñuñoa y más comunas.",
  openGraph: {
    siteName: "Deal Inmobiliario",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/Logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${cormorant.variable} ${josefin.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider>
          <HowItWorksProvider>
            <AppHeader />
            <HowItWorksModal />
            <NuqsAdapter>{children}</NuqsAdapter>
            <FeedbackWidget />
            <Analytics />
          </HowItWorksProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
