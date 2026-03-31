import { activeMarket } from "@/lib/markets";

const colorMap = {
  green: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-400",
    row: "border-l-emerald-400",
    dot: "bg-emerald-400",
  },
  yellow: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    bar: "bg-amber-400",
    row: "border-l-amber-400",
    dot: "bg-amber-400",
  },
  red: {
    badge: "bg-red-100 text-red-700 border-red-200",
    bar: "bg-red-400",
    row: "border-l-red-400",
    dot: "bg-red-400",
  },
};

function rangeLabel(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) return `${min}% – ${max}%`;
  if (min !== undefined) return `> ${min}%`;
  if (max !== undefined) return `< ${max}%`;
  return "";
}

// Bar width as % of a 0–8% scale for visual proportionality
function barWidth(min?: number, max?: number): number {
  const scale = 8;
  const lo = min ?? 0;
  const hi = max ?? scale;
  return Math.round(((hi - lo) / scale) * 100);
}

function barOffset(min?: number): number {
  const scale = 8;
  const lo = min ?? 0;
  return Math.round((lo / scale) * 100);
}

const improvements = [
  {
    icon: (
      <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "Negociar el precio hacia abajo",
    description:
      "El Cap Rate sube si el denominador (precio) baja. Una negociación del 5–8% sobre el precio de lista puede transformar una propiedad de zona gris en una inversión buena. Usa los comparables de mercado y el análisis de rentabilidad como argumento de negociación.",
    example: "UF 3.000 → UF 2.800 con NOI fijo de UF 150: Cap Rate pasa de 5.0% a 5.4%",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "Invertir en remodelaciones estratégicas",
    description:
      "Mejorar la cocina, baños o terminaciones permite cobrar un arriendo mayor. Si la inversión en remodelación genera un aumento de arriendo cuyo Cap Rate sobre la inversión incremental es alto, el Cap Rate total de la propiedad mejora.",
    example: "UF 120 de remodelación → sube arriendo de UF 12 a UF 14/mes: retorno incremental de 20% anual sobre la mejora",
  },
];

export default function BenchmarkCapRateSection() {
  const { capRateTiers } = activeMarket;

  return (
    <section id="benchmark" className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Benchmarks · Mercado {activeMarket.name}
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ¿Qué Cap Rate es bueno?
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Los rangos usan el <strong className="text-gray-700">Cap Rate Bruto</strong> — útil para comparaciones rápidas.
            El Cap Rate Neto (después de Opex) será típicamente 0,5–1 punto porcentual menor.
            Benchmarks calibrados al mercado chileno.
          </p>
        </div>

        {/* Visual range bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
          <div className="relative h-6 bg-gray-100 rounded-full mb-3 overflow-hidden">
            {capRateTiers.map((tier) => {
              const colors = colorMap[tier.color];
              return (
                <div
                  key={tier.label}
                  className={`absolute top-0 h-full ${colors.bar} opacity-80`}
                  style={{
                    left: `${barOffset(tier.min)}%`,
                    width: `${barWidth(tier.min, tier.max)}%`,
                  }}
                />
              );
            })}
          </div>
          {/* Scale labels */}
          <div className="flex justify-between text-xs text-gray-400 mb-6 px-0.5"
            style={{ fontFamily: "var(--font-josefin)" }}>
            <span>0%</span>
            <span>2%</span>
            <span>4%</span>
            <span>6%</span>
            <span>8%+</span>
          </div>

          {/* Tier rows */}
          <div className="space-y-4">
            {capRateTiers.map((tier) => {
              const colors = colorMap[tier.color];
              return (
                <div
                  key={tier.label}
                  className={`flex gap-4 items-start border-l-4 pl-4 ${colors.row}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${colors.badge}`}
                        style={{ fontFamily: "var(--font-josefin)" }}
                      >
                        {tier.label}
                      </span>
                      <span
                        className="text-sm font-semibold text-gray-700"
                        style={{ fontFamily: "var(--font-josefin)" }}
                      >
                        {rangeLabel(tier.min, tier.max)}
                      </span>
                    </div>
                    <p
                      className="text-sm text-gray-500 leading-relaxed"
                      style={{ fontFamily: "var(--font-josefin)" }}
                    >
                      {tier.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How to improve */}
        <h3
          className="text-2xl font-bold text-gray-900 mb-6"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          ¿Cómo mejorar la rentabilidad de una propiedad?
        </h3>
        <div className="grid md:grid-cols-2 gap-5">
          {improvements.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-teal-200 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                {item.icon}
                <h4
                  className="text-base font-bold text-gray-900"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {item.title}
                </h4>
              </div>
              <p
                className="text-sm text-gray-500 leading-relaxed mb-4"
                style={{ fontFamily: "var(--font-josefin)" }}
              >
                {item.description}
              </p>
              <div
                className="text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2 font-medium"
                style={{ fontFamily: "var(--font-josefin)" }}
              >
                📊 {item.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
