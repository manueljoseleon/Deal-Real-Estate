"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHowItWorks } from "@/contexts/HowItWorksContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function AppHeader() {
  const pathname = usePathname();
  const { setOpen: setHowItWorksOpen } = useHowItWorks();
  const { user, signOut, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (pathname === "/" || pathname === "/landing") return null;

  // Close dropdown on outside click
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarInitial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-wide text-gray-900 hover:text-teal-700 transition-colors"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            <span className="font-light italic">Deal</span>{" "}
            <span className="font-bold not-italic">Inmobiliario</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/oportunidades"
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
            <Link
              href="/metodologia"
              className="text-xs text-gray-400 hover:text-teal-700 transition-colors"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              Metodología
            </Link>
            <button
              onClick={() => setHowItWorksOpen(true)}
              title="¿Cómo funciona el sitio?"
              className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:border-teal-700 hover:text-teal-700 transition-colors flex items-center justify-center text-[10px] font-bold leading-none"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              ?
            </button>

            {/* Auth area */}
            {!loading && (
              user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="w-7 h-7 rounded-full bg-teal-700 text-white text-[11px] font-semibold flex items-center justify-center hover:bg-teal-800 transition-colors"
                    title={user.email ?? "Mi cuenta"}
                  >
                    {avatarInitial}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-9 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/favoritos"
                        className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Mis favoritos
                      </Link>
                      <button
                        onClick={() => { signOut(); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="text-xs text-teal-700 border border-teal-200 rounded-full px-3 py-1 hover:bg-teal-50 transition-colors"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  Regístrate
                </button>
              )
            )}
          </nav>
        </div>
      </header>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
