"use client";

import { useEffect, useRef, useCallback } from "react";
import { Cormorant_Garamond, Josefin_Sans } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-josefin",
});

// ─── Scroll animation hook ────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ─── Section wrapper with reveal animation ───────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-teal-400 shrink-0 mt-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7l5 5-5 5M6 12h12"
      />
    </svg>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function CTAButton({
  large = false,
  label = "Comienza a buscar ahora",
}: {
  large?: boolean;
  label?: string;
}) {
  return (
    <a
      href="/oportunidades"
      className={`group inline-flex items-center gap-2 font-semibold rounded-full bg-gradient-to-r from-teal-500 to-teal-400 text-slate-950 cursor-pointer transition-all duration-200 hover:from-teal-400 hover:to-teal-300 hover:shadow-[0_0_32px_rgba(20,184,166,0.45)] active:scale-[0.98] ${
        large ? "px-10 py-4 text-base" : "px-7 py-3 text-sm"
      }`}
    >
      {label}
      <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-1" />
    </a>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <span
        className="text-white text-xl font-semibold tracking-wide"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        <span className="font-light italic">Deal</span>{" "}
        <span className="font-bold not-italic">Inmobiliario</span>
      </span>
      <div className="flex items-center gap-3">
        <a
          href="/aprende"
          className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
          style={{ fontFamily: "var(--font-josefin)" }}
        >
          Aprende
        </a>
        <a
          href="/oportunidades"
          className="text-xs md:text-sm font-medium text-teal-400 border border-teal-500/40 rounded-full px-3 md:px-5 py-1.5 md:py-2 hover:bg-teal-500/10 transition-colors duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center"
        >
          <span className="md:hidden">Entrar</span>
          <span className="hidden md:inline">Entrar a la plataforma</span>
        </a>
      </div>
    </nav>
  );
}

// ─── YouTube looped background (s7 → s36) ────────────────────────────────────
interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        container: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: (e: YTPlayerEvent) => void };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const VIDEO_ID = "9NDGPOp1qp8";
const LOOP_START = 7;
const LOOP_END = 36;

function YoutubeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLoop = useCallback(() => {
    intervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const t = player.getCurrentTime();
        if (t >= LOOP_END) {
          player.seekTo(LOOP_START, true);
        }
      } catch {
        // player not ready yet
      }
    }, 300);
  }, []);

  useEffect(() => {
    // Load the IFrame API script once
    if (!document.getElementById("yt-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          start: LOOP_START,
        },
        events: {
          onReady: (e: YTPlayerEvent) => {
            e.target.playVideo();
            startLoop();
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startLoop]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Player container — will be replaced by the YT iframe */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100vw",
          height: "56.25vw",
          minHeight: "100vh",
          minWidth: "177.78vh",
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/70" />
      {/* Fade to next section */}
      <div
        className="absolute bottom-0 inset-x-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #020617)" }}
      />
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <YoutubeBackground />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="hidden md:inline-flex items-center gap-2 border border-teal-500/30 bg-teal-500/5 rounded-full px-4 py-1.5 text-teal-400 text-xs font-medium tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          Inteligencia Artificial para Inversión Inmobiliaria
        </div>

        <h1
          className="text-6xl md:text-8xl lg:text-[7rem] font-semibold text-white leading-[1.0] tracking-tight"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          <span className="font-light italic">Deal</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300 not-italic font-bold">
            Inmobiliario
          </span>
        </h1>

        <p
          className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: "var(--font-josefin)" }}
        >
          Encuentra tu nueva propiedad para invertir
        </p>

        <p
          className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: "var(--font-josefin)" }}
        >
          En Deal Inmobiliario buscamos las propiedades con los mejores retornos
          de inversión para ti. Si quieres invertir tu dinero en un activo real,
          te ayudamos a sacarle el mejor rendimiento.
        </p>

        <div className="pt-2">
          <CTAButton
            large
            label="Comienza a buscar y haz crecer tu patrimonio"
          />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 text-xs tracking-widest uppercase">
        <span>Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-teal-500/50 to-transparent animate-pulse" />
      </div>
    </section>
  );
}

// ─── Section: AI Value Prop ───────────────────────────────────────────────────
function ValuePropSection() {
  const bullets = [
    "Encuentra al instante las propiedades con mayor ROI",
    "Mantente un paso adelante del mercado",
    "Cubre todas las opciones: renta, reparaciones y más",
  ];

  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden border border-teal-900/40 shadow-2xl">
            <img
              src="/images/depto-inversion.webp"
              alt="Departamento de inversión inmobiliaria"
              className="w-full object-cover"
              style={{ maxHeight: "480px", filter: "brightness(0.9) saturate(0.8)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, rgba(15,118,110,0.25) 0%, rgba(2,6,23,0.15) 100%)",
                mixBlendMode: "multiply",
              }}
            />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">
            Impulsado por IA
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Descubre al instante
            <br />
            <span className="text-teal-400">las oportunidades</span>
            <br />
            más rentables
          </h2>
          <p
            className="mt-6 text-slate-400 text-lg leading-relaxed mb-8"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Deal Inmobiliario aprovecha el poder de la IA para encontrar
            las propiedades con mayor Retorno de Inversión (ROI). Deja
            de perder tiempo buscando y empieza a cerrar operaciones.
          </p>
          <ul className="space-y-4">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckIcon />
                <span
                  className="text-slate-300 text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Section: Speed ───────────────────────────────────────────────────────────
function SpeedSection() {
  return (
    <section className="py-28 px-6 bg-slate-900/40">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">
            Acelera tu búsqueda
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Convierte semanas de búsqueda
            <br />
            <span className="text-teal-400">en segundos</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              title: "Pre-análisis automático",
              desc: "Deal Inmobiliario pre-analiza cada propiedad del mercado por ti.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              ),
              title: "Flujo de caja y Cap Rate",
              desc: "Encuentra propiedades para renta, flip, alto Cap Rate y Flujo de Caja en un solo lugar.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              ),
              title: "Sin hojas de cálculo",
              desc: "Olvídate de Excel. Deal Inmobiliario hace todo el trabajo por ti automáticamente.",
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="group p-7 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-teal-500/40 hover:bg-slate-800/80 transition-all duration-300 cursor-default h-full">
                <div className="text-teal-400 mb-4">{item.icon}</div>
                <h3
                  className="text-white font-semibold mb-2 text-lg"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-slate-400 text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {item.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section: Market Analysis ─────────────────────────────────────────────────
function MarketSection() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Property image with teal filter */}
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden border border-teal-900/40 shadow-2xl">
            {/* Image with desaturate + darken */}
            <img
              src="/images/mapa-seleccion-2.webp"
              alt="Mapa de zonas de alto potencial en Santiago Centro"
              className="w-full object-cover"
              style={{
                maxHeight: "520px",
                filter: "brightness(0.95) saturate(0.75)",
              }}
            />
            {/* Teal color tint overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, rgba(15,118,110,0.25) 0%, rgba(2,6,23,0.15) 100%)",
                mixBlendMode: "multiply",
              }}
            />
            {/* Bottom label overlay */}
            <div
              className="absolute bottom-0 inset-x-0 px-6 py-5"
              style={{ background: "linear-gradient(to top, rgba(2,6,23,0.90) 55%, transparent)" }}
            >
              <div className="text-teal-400 text-xs font-semibold tracking-widest uppercase mb-1">
                Zonas de alto potencial
              </div>
              <div
                className="text-white text-xl font-bold"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Santiago Centro · Alta rentabilidad
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">
            Análisis de mercado
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Descubre zonas
            <br />
            <span className="text-teal-400">con alto potencial</span>
            <br />
            antes que el resto
          </h2>
          <p
            className="mt-6 text-slate-400 text-lg leading-relaxed"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Monitoreamos constantemente el mercado y contamos con el mejor
            análisis. Nuestras herramientas de investigación te permiten
            identificar las mejores zonas para invertir, filtrar y analizar con
            todo tipo de indicadores, adelantándote a la competencia.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Section: Tools / Calculators ────────────────────────────────────────────
function ToolsSection() {
  return (
    <section className="py-28 px-6 bg-slate-900/40">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <Reveal>
          <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">
            Herramientas de primer nivel
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Las mejores
            <br />
            <span className="text-teal-400">calculadoras</span>
            <br />
            y analisis
          </h2>
          <p
            className="mt-6 text-slate-400 text-lg leading-relaxed"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Hacemos el trabajo por ti. Solo
            busca una propiedad y nuestra plataforma se encarga del resto.
            Ajusta crédito hipotecario, reparaciones y mejoras, y ve cómo varía tu inversión en
            el largo plazo.
          </p>
        </Reveal>

        {/* Calculator preview card */}
        <Reveal delay={150}>
          <div className="rounded-3xl bg-slate-800/60 border border-slate-700/50 p-6 space-y-4">
            <div
              className="text-white font-semibold text-sm mb-4"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              Analizador de propiedad
            </div>
            {[
              { label: "Precio de compra", value: "UF 3.200", color: "text-white" },
              { label: "Renta mensual estimada", value: "UF 12,4", color: "text-teal-400" },
              { label: "Rentabilidad bruta", value: "4,65%", color: "text-teal-400" },
              { label: "Flujo de caja anual", value: "+ UF 14,8", color: "text-emerald-400" },
              { label: "ROI proyectado (10 años)", value: "127%", color: "text-amber-400" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0"
              >
                <span
                  className="text-slate-400 text-sm"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {row.label}
                </span>
                <span
                  className={`font-semibold text-sm ${row.color}`}
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Section: Comparables ─────────────────────────────────────────────────────
function ComparablesSection() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Comps table preview */}
        <Reveal className="order-2 md:order-1">
          <div className="rounded-3xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50 text-slate-400 text-xs font-medium tracking-wider uppercase flex gap-6">
              <span className="flex-1">Propiedad</span>
              <span className="w-16 text-right">m²</span>
              <span className="w-20 text-right">Arriendo</span>
              <span className="w-16 text-right">ROI</span>
            </div>
            {[
              { name: "Providencia · 2D", m2: "68", arr: "UF 14", roi: "5.1%" },
              { name: "Ñuñoa · 2D", m2: "72", arr: "UF 13", roi: "4.8%" },
              { name: "Santiago · 1D", m2: "42", arr: "UF 9", roi: "5.4%" },
              { name: "Las Condes · 3D", m2: "95", arr: "UF 22", roi: "4.3%" },
            ].map((row, i) => (
              <div
                key={i}
                className="px-5 py-3 flex gap-6 border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors cursor-default"
              >
                <span
                  className="flex-1 text-slate-300 text-sm"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {row.name}
                </span>
                <span className="w-16 text-right text-slate-400 text-sm">{row.m2}</span>
                <span className="w-20 text-right text-teal-400 text-sm font-medium">{row.arr}</span>
                <span className="w-16 text-right text-amber-400 text-sm font-semibold">{row.roi}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="order-1 md:order-2">
          <span className="text-teal-400 text-xs font-semibold tracking-widest uppercase">
            Análisis Preciso
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            "¿Cuáles son
            <br />
            <span className="text-teal-400">los comparables?"</span>
          </h2>
          <p
            className="mt-6 text-slate-400 text-lg leading-relaxed"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Todos nos hacemos esta pregunta en cada propiedad. Deal Inmobiliario
            te permite encontrar esa información rápidamente. Consulta metros
            cuadrados, precios de venta, arriendo, fotos, flujo de caja y más. 
            Olvídate de buscar precios y datos individualmente.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Section: Closing CTA ─────────────────────────────────────────────────────
function ClosingCTASection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with teal filter */}
      <div className="absolute inset-0">
        <img
          src="/images/crecimiento-patrimonio.webp"
          alt="Crecimiento de patrimonio inmobiliario"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.5) saturate(0.5)" }}
        />
        {/* Teal tint overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, rgba(15,118,110,0.55) 0%, rgba(2,6,23,0.4) 100%)",
            mixBlendMode: "multiply",
          }}
        />
        {/* Dark vignette for readability */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(2,6,23,0.7) 100%)" }}
        />
      </div>

      <div className="relative z-10 py-36 px-6 max-w-3xl mx-auto text-center space-y-8">
        <Reveal>
          <h2
            className="text-4xl md:text-6xl font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Haz crecer tu
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">
              patrimonio
            </span>
          </h2>
          <p
            className="mt-6 text-slate-300 text-lg leading-relaxed max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Miles de propiedades analizadas con IA. Los mejores retornos del
            mercado, al instante. Empieza hoy.
          </p>
          <div className="mt-10">
            <CTAButton large label="Comienza a buscar propiedades ahora" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-slate-800 text-center">
      <p
        className="text-slate-600 text-xs tracking-wider"
        style={{ fontFamily: "var(--font-josefin)" }}
      >
        © {new Date().getFullYear()} Deal Inmobiliario · Todos los derechos reservados
      </p>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div
      className={`${cormorant.variable} ${josefin.variable} bg-slate-950 text-white min-h-screen`}
    >
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-on-scroll {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <Navbar />

      <main>
        <HeroSection />
        <ValuePropSection />
        <SpeedSection />
        <MarketSection />
        <ToolsSection />
        <ComparablesSection />
        <ClosingCTASection />
      </main>

      <Footer />
    </div>
  );
}
