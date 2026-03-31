import { activeMarket } from "@/lib/markets";

const rows = [
  {
    capRate: "> 6%",
    roi: "> 12% anual",
    verdict: "No Brainer",
    verdictStyle: "bg-emerald-100 text-emerald-700 border-emerald-300",
    rowStyle: "bg-emerald-50/40",
    icon: "🟢",
    action: "Avanza rápido. Propiedad con flujo positivo fuerte, margen de seguridad amplio y retorno por sobre el costo de capital.",
    tips: [
      "Verifica que el arriendo esté en línea con comparables de mercado",
      "Confirma que no hay pasivos ocultos (deudas de gastos comunes, litigios)",
      "Cierra antes de que la encuentre otro inversionista",
    ],
  },
  {
    capRate: "5% – 6%",
    roi: "8–12% anual",
    verdict: "Bueno",
    verdictStyle: "bg-teal-100 text-teal-700 border-teal-300",
    rowStyle: "",
    icon: "🟩",
    action: "Inversión sólida si el financiamiento es bueno. El DSCR debe superar 1.2x. Evalúa si hay margen para mejorar el arriendo.",
    tips: [
      "Simula el DSCR con la tasa real que te ofrece el banco",
      "Revisa si hay mejoras de bajo costo que suban el arriendo",
      "Es el rango donde opera la mayoría de inversores profesionales en Chile",
    ],
  },
  {
    capRate: "3.5% – 5%",
    roi: "4–8% anual",
    verdict: "Zona Gris",
    verdictStyle: "bg-amber-100 text-amber-700 border-amber-300",
    rowStyle: "bg-amber-50/20",
    icon: "🟡",
    action: "Solo justificable con tesis de apreciación fuerte, negociación agresiva de precio o plan de mejoras con retorno claro.",
    tips: [
      "No avances sin un plan concreto de cómo mejorar el Cap Rate",
      "Exige mayor descuento en el precio de compra",
      "Zonas en desarrollo con catalizadores urbanos pueden justificar este rango",
    ],
  },
  {
    capRate: "< 3.5%",
    roi: "< 4% anual",
    verdict: "No Go",
    verdictStyle: "bg-red-100 text-red-700 border-red-300",
    rowStyle: "bg-red-50/20",
    icon: "🔴",
    action: "Flujo de caja negativo garantizado con hipoteca típica. Solo tiene sentido si el uso personal del inmueble justifica la diferencia.",
    tips: [
      "Comprar a este Cap Rate para arrendar es destruir valor",
      "La apreciación tendría que ser excepcional para compensar",
      "Si el vendedor no acepta un descuento, descarta la propiedad",
    ],
  },
];

export default function DecisionTable() {
  const { noBrainerThreshold, noGoThreshold } = activeMarket;

  return (
    <section id="decision" className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Marco de decisión
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ¿Cuándo avanzar y cuándo descartarla?
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Un marco simple para tomar decisiones rápidas.{" "}
            <span className="font-semibold text-gray-700">
              "No brainer" ≥ {noBrainerThreshold}% · "No go" &lt; {noGoThreshold}%
            </span>
          </p>
        </div>

        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.verdict}
              className={`rounded-2xl border border-gray-100 overflow-hidden ${row.rowStyle}`}
            >
              {/* Header row */}
              <div className="px-6 py-4 flex flex-wrap items-center gap-4 border-b border-gray-100">
                <span className="text-xl">{row.icon}</span>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-lg border ${row.verdictStyle}`}
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  {row.verdict}
                </span>
                <div className="flex flex-wrap gap-6" style={{ fontFamily: "var(--font-josefin)" }}>
                  <span className="text-sm">
                    <span className="text-gray-400 font-medium">Cap Rate </span>
                    <span className="font-bold text-gray-900">{row.capRate}</span>
                  </span>
                  <span className="text-sm">
                    <span className="text-gray-400 font-medium">ROI estimado </span>
                    <span className="font-bold text-gray-900">{row.roi}</span>
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed"
                    style={{ fontFamily: "var(--font-josefin)" }}>
                    {row.action}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {row.tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-gray-500"
                      style={{ fontFamily: "var(--font-josefin)" }}>
                      <span className="mt-0.5 text-teal-500 shrink-0">→</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer callout */}
        <div className="mt-10 bg-teal-50 border border-teal-100 rounded-2xl px-8 py-6 text-center">
          <p className="text-sm text-teal-800 leading-relaxed"
            style={{ fontFamily: "var(--font-josefin)" }}>
            <strong>Recuerda:</strong> estos rangos son umbrales orientativos para Chile. El contexto importa — una propiedad al 4.5% en una zona con metro nuevo puede ser mejor negocio que una al 5.5% en zona de demanda decreciente.{" "}
            <a href="/" className="font-semibold underline underline-offset-2 hover:text-teal-600 transition-colors">
              Analiza propiedades reales en Deal Inmobiliario →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
