import { getZoneData, LEVEL_COLORS, PLUSVALIA_COLORS, type ZoneLevel } from "@/lib/zones";
import type { ReactNode } from "react";

interface Props {
  commune: string | null | undefined;
  neighborhood: string | null | undefined;
  mode?: "full" | "indicators" | "plusvalia";
}

function IndicatorRow({
  icon,
  label,
  level,
  text,
}: {
  icon: ReactNode;
  label: string;
  level: ZoneLevel;
  text: string;
}) {
  const colors = LEVEL_COLORS[level];
  const levelLabels: Record<ZoneLevel, string> = {
    excelente:   "Excelente",
    "muy buena": "Muy buena",
    buena:       "Buena",
    media:       "Media",
    variable:    "Variable",
  };

  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {levelLabels[level]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function ZoneCard({ commune, neighborhood, mode = "full" }: Props) {
  const zone = getZoneData(commune);

  if (!zone) {
    // plusvalia mode: no data, don't render anything
    if (mode === "plusvalia") return null;
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            Información del sector
          </p>
          <p className="text-base font-semibold text-gray-900" style={{ fontFamily: "var(--font-josefin)" }}>
            {[neighborhood, commune].filter(Boolean).join(", ") || commune}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-400">
            Aún no tenemos información detallada del sector para{" "}
            <span className="font-medium text-gray-600">{commune ?? "esta comuna"}</span>.
          </p>
        </div>
      </div>
    );
  }

  const locationLabel = [neighborhood, commune].filter(Boolean).join(", ");
  const pvColors = PLUSVALIA_COLORS[zone.plusvalia.perspectiva];

  const perspLabels: Record<string, string> = {
    "alta":                 "Alta perspectiva",
    "media-alta":           "Perspectiva media-alta",
    "media":                "Perspectiva media",
    "orientada al retorno": "Orientada al retorno",
  };

  const indicators = (
    <div className="px-5 py-4 space-y-4">
      <IndicatorRow
        icon={<ShieldIcon />}
        label="Seguridad"
        level={zone.seguridad.level}
        text={zone.seguridad.text}
      />
      <IndicatorRow
        icon={<TrainIcon />}
        label="Transporte"
        level={zone.transporte.level}
        text={zone.transporte.text}
      />
      <IndicatorRow
        icon={<TreeIcon />}
        label="Áreas verdes"
        level={zone.areas_verdes.level}
        text={zone.areas_verdes.text}
      />
      <IndicatorRow
        icon={<HeartIcon />}
        label="Salud"
        level={zone.salud.level}
        text={zone.salud.text}
      />
      <IndicatorRow
        icon={<PeopleIcon />}
        label="Dinámica del barrio"
        level={zone.densidad.level}
        text={zone.densidad.text}
      />
    </div>
  );

  const plusvalia = (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUpIcon className={pvColors.text} />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Potencial de plusvalía
        </span>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${pvColors.bg} ${pvColors.text}`}>
          {perspLabels[zone.plusvalia.perspectiva] ?? zone.plusvalia.perspectiva}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-gray-600">
        {zone.plusvalia.text}
      </p>
    </div>
  );

  if (mode === "plusvalia") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {plusvalia}
      </div>
    );
  }

  if (mode === "indicators") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
            Información del sector
          </p>
          <p className="text-base font-semibold text-gray-900" style={{ fontFamily: "var(--font-josefin)" }}>
            {locationLabel || commune}
          </p>
        </div>
        {indicators}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
          Información del sector
        </p>
        <p className="text-base font-semibold text-gray-900" style={{ fontFamily: "var(--font-josefin)" }}>
          {locationLabel || commune}
        </p>
      </div>
      {indicators}
      {plusvalia}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function TrainIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l3 3 3-3M5 9h14M5 15h14M7 3h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22v-7M5 10l7-7 7 7H5zM8 14l4-4 4 4H8z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.634-2.075M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.231-1.48.634-2.075m0 0a5.002 5.002 0 019.732 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
