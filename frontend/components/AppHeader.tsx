"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHowItWorks } from "@/contexts/HowItWorksContext";

export default function AppHeader() {
  const pathname = usePathname();
  const { setOpen } = useHowItWorks();
  if (pathname === "/landing") return null;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <Link
          href="/landing"
          className="text-lg font-semibold tracking-wide text-gray-900 hover:text-teal-700 transition-colors"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          <span className="font-light italic">Deal</span>{" "}
          <span className="font-bold not-italic">Inmobiliario</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-teal-700 transition-colors"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Oportunidades
          </Link>
          <Link
            href="/mercado"
            className="text-xs text-gray-400 hover:text-teal-700 transition-colors"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Mercado
          </Link>
          <Link
            href="/aprende"
            className="text-xs text-gray-400 hover:text-teal-700 transition-colors"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Aprende
          </Link>
          <button
            onClick={() => setOpen(true)}
            title="¿Cómo funciona el sitio?"
            className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:border-teal-700 hover:text-teal-700 transition-colors flex items-center justify-center text-[10px] font-bold leading-none"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            ?
          </button>
        </nav>
      </div>
    </header>
  );
}
