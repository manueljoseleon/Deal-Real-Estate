"use client";

import { useState, useEffect } from "react";
import { useHowItWorks } from "@/contexts/HowItWorksContext";

const STORAGE_KEY = "how_it_works_seen";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="36" height="28" rx="3" stroke="#0f766e" strokeWidth="2.5" fill="#f0fdfa"/>
        <rect x="10" y="14" width="10" height="10" rx="1.5" fill="#0f766e" opacity="0.2"/>
        <rect x="10" y="14" width="10" height="10" rx="1.5" stroke="#0f766e" strokeWidth="1.5"/>
        <line x1="24" y1="16" x2="38" y2="16" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="24" y1="20" x2="34" y2="20" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="10" y1="30" x2="38" y2="30" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="10" y1="34" x2="30" y2="34" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="36" cy="36" r="8" fill="#0f766e"/>
        <line x1="33" y1="36" x2="39" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="36" y1="33" x2="36" y2="39" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Explora propiedades",
    description: "Explora las propiedades que quieras comprar. Tenemos cientos de opciones actualizadas del mercado chileno.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="36" height="36" rx="3" stroke="#0f766e" strokeWidth="2.5" fill="#f0fdfa"/>
        <polyline points="10,34 18,24 24,28 32,16 38,20" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="38" cy="14" r="4" fill="#0f766e"/>
        <text x="36.5" y="16.5" fontSize="5" fill="white" fontWeight="bold">%</text>
        <line x1="10" y1="38" x2="38" y2="38" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      </svg>
    ),
    title: "Entiende su potencial",
    description: "Todas las propiedades tienen información de rentabilidad o Cap Rate, estimada automáticamente con comparables reales del mercado.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="20" r="12" stroke="#0f766e" strokeWidth="2.5" fill="#f0fdfa"/>
        <line x1="32.5" y1="28.5" x2="42" y2="38" stroke="#0f766e" strokeWidth="3" strokeLinecap="round"/>
        <line x1="18" y1="20" x2="30" y2="20" stroke="#0f766e" strokeWidth="2" strokeLinecap="round"/>
        <polyline points="22,16 18,20 22,24" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Filtra y ordena",
    description: "Busca la mejor propiedad filtrando por comuna, dormitorios, rentabilidad mínima y ordena por los criterios que más te importan.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="6" width="22" height="28" rx="2.5" stroke="#0f766e" strokeWidth="2.5" fill="#f0fdfa"/>
        <line x1="13" y1="14" x2="25" y2="14" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="13" y1="19" x2="25" y2="19" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="13" y1="24" x2="20" y2="24" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="22" y="20" width="18" height="22" rx="2.5" fill="#0f766e" opacity="0.1" stroke="#0f766e" strokeWidth="2"/>
        <line x1="27" y1="27" x2="35" y2="27" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="27" y1="31" x2="35" y2="31" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="27" y1="35" x2="31" y2="35" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Revisa el detalle",
    description: "Selecciona la propiedad que más te interesa y revisa toda su ficha: fotos, ubicación, comparables de arriendo y métricas clave.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="8" width="36" height="32" rx="3" stroke="#0f766e" strokeWidth="2.5" fill="#f0fdfa"/>
        <line x1="6" y1="18" x2="42" y2="18" stroke="#0f766e" strokeWidth="1.5" opacity="0.3"/>
        <rect x="11" y="23" width="6" height="4" rx="1" fill="#0f766e" opacity="0.2" stroke="#0f766e" strokeWidth="1"/>
        <rect x="21" y="23" width="6" height="4" rx="1" fill="#0f766e" opacity="0.2" stroke="#0f766e" strokeWidth="1"/>
        <rect x="31" y="23" width="6" height="4" rx="1" fill="#0f766e" opacity="0.2" stroke="#0f766e" strokeWidth="1"/>
        <rect x="11" y="31" width="6" height="4" rx="1" fill="#0f766e" opacity="0.2" stroke="#0f766e" strokeWidth="1"/>
        <rect x="21" y="31" width="6" height="4" rx="1" fill="#0f766e" opacity="0.2" stroke="#0f766e" strokeWidth="1"/>
        <rect x="31" y="31" width="6" height="4" rx="1" fill="#d1fae5" stroke="#0f766e" strokeWidth="1"/>
        <text x="32.5" y="34.5" fontSize="4.5" fill="#0f766e" fontWeight="bold">=</text>
        <text x="10" y="15" fontSize="5" fill="#0f766e" fontWeight="500" style={{fontFamily: "sans-serif"}}>123</text>
      </svg>
    ),
    title: "Simula tu inversión",
    description: "Usa la calculadora para simular créditos hipotecarios, remodelación y gastos operacionales. Ve cómo se mueve tu inversión en el tiempo.",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="18" fill="#f0fdfa" stroke="#0f766e" strokeWidth="2.5"/>
        <polyline points="14,24 21,31 34,17" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "¡Listo para invertir!",
    description: "Ya estás listo para comprar y rentabilizar tu patrimonio. Encuentra tu próxima propiedad de inversión con toda la información que necesitas.",
  },
];

export function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seenAt: Date.now() }));
  } catch {}
}

export function shouldShowTour(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const { seenAt } = JSON.parse(raw);
    return Date.now() - seenAt > EXPIRY_MS;
  } catch {
    return true;
  }
}

export default function HowItWorksModal() {
  const { open, setOpen } = useHowItWorks();
  const [step, setStep] = useState(0);

  // Reset to first step each time modal opens
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  function close() {
    markTourSeen();
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span
            className="text-xs text-gray-400 tracking-widest uppercase"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            ¿Cómo funciona?
          </span>
          <button
            onClick={close}
            className="text-xs text-gray-400 hover:text-teal-700 transition-colors"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Saltar intro
          </button>
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center px-8 py-6 gap-4">
          <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-teal-50">
            {current.icon}
          </div>
          <h2
            className="text-2xl font-semibold text-gray-900 leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {current.title}
          </h2>
          <p
            className="text-sm text-gray-500 leading-relaxed max-w-xs"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            {current.description}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? "w-6 bg-teal-700" : "w-1.5 bg-gray-200 hover:bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            ← Anterior
          </button>
          <span
            className="text-xs text-gray-300"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            {step + 1} / {STEPS.length}
          </span>
          {isLast ? (
            <button
              onClick={close}
              className="text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors px-4 py-1.5 rounded-full"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              Comenzar →
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold transition-colors"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
