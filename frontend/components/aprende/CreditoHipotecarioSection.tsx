import { activeMarket } from "@/lib/markets";

// Example mortgage scenarios to illustrate DSCR
const scenarios = [
  {
    price: 3000,
    ltv: 80,
    rate: 4.5,
    years: 25,
    noi: 150,
    label: "Caso típico",
  },
  {
    price: 3000,
    ltv: 80,
    rate: 5.5,
    years: 20,
    noi: 150,
    label: "Tasa alta / plazo corto",
  },
  {
    price: 3000,
    ltv: 60,
    rate: 4.5,
    years: 25,
    noi: 150,
    label: "Pie mayor (40%)",
  },
];

// Annuity formula: monthly payment = P × [r(1+r)^n] / [(1+r)^n - 1]
function annualDebtService(price: number, ltv: number, annualRate: number, years: number): number {
  const principal = price * (ltv / 100);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(monthly * 12 * 10) / 10;
}

function dscr(noi: number, debtService: number): number {
  return Math.round((noi / debtService) * 100) / 100;
}

export default function CreditoHipotecarioSection() {
  const { mortgageRateMin, mortgageRateMax, typicalLTV, minDSCR } = activeMarket;

  return (
    <section id="credito" className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Financiamiento
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Crédito hipotecario e inversión
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Entender el crédito no es opcional — es la palanca que define si tu inversión genera o destruye flujo de caja desde el primer mes.
          </p>
        </div>

        {/* Key concepts grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {[
            {
              label: "LTV típico",
              value: `${typicalLTV}%`,
              desc: "El banco financia hasta este % del valor tasado. Debes aportar el resto como pie.",
            },
            {
              label: "Tasa anual",
              value: `${mortgageRateMin}–${mortgageRateMax}%`,
              desc: `Rango de tasas hipotecarias actuales en Chile. La tasa varía según el banco, plazo y perfil del deudor.`,
            },
            {
              label: "Plazos típicos",
              value: "20–30 años",
              desc: "A mayor plazo, menor cuota mensual pero mayor costo total. Para inversión se recomienda 20–25 años.",
            },
            {
              label: "DSCR mínimo",
              value: `${minDSCR}x`,
              desc: "El NOI debe ser al menos 1.2x la cuota anual. Por debajo, la propiedad no se paga sola.",
            },
          ].map((item) => (
            <div key={item.label}
              className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center hover:border-teal-200 transition-all">
              <div className="text-3xl font-bold text-teal-600 mb-2"
                style={{ fontFamily: "var(--font-cormorant)" }}>
                {item.value}
              </div>
              <div className="text-xs font-semibold text-gray-700 mb-2"
                style={{ fontFamily: "var(--font-josefin)" }}>
                {item.label}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed"
                style={{ fontFamily: "var(--font-josefin)" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* DSCR table */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8">
          <h3
            className="text-xl font-bold text-gray-900 mb-2"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ¿Cuándo el NOI cubre la hipoteca?
          </h3>
          <p className="text-sm text-gray-500 mb-6"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Todos los ejemplos asumen una propiedad de UF 3.000 con NOI de UF 150/año (Cap Rate 5%). El DSCR cambia según la tasa y el plazo.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-josefin)" }}>
              <thead>
                <tr className="border-b border-gray-200">
                  {["Escenario", "Crédito", "LTV", "Tasa", "Plazo", "Cuota anual (UF)", "NOI (UF)", "DSCR", "Estado"].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const debt = annualDebtService(s.price, s.ltv, s.rate, s.years);
                  const d = dscr(s.noi, debt);
                  const ok = d >= minDSCR;
                  return (
                    <tr key={s.label} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700 whitespace-nowrap">{s.label}</td>
                      <td className="py-3 pr-4 text-gray-500">UF {Math.round(s.price * s.ltv / 100)}</td>
                      <td className="py-3 pr-4 text-gray-500">{s.ltv}%</td>
                      <td className="py-3 pr-4 text-gray-500">{s.rate}%</td>
                      <td className="py-3 pr-4 text-gray-500">{s.years} años</td>
                      <td className="py-3 pr-4 text-gray-700 font-medium">UF {debt}</td>
                      <td className="py-3 pr-4 text-gray-700">UF {s.noi}</td>
                      <td className="py-3 pr-4 font-bold" style={{ color: ok ? "#059669" : "#dc2626" }}>
                        {d}x
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          ok
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {ok ? "✓ Cubre" : "✗ No cubre"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-xs text-gray-400 leading-relaxed"
            style={{ fontFamily: "var(--font-josefin)" }}>
            <strong className="text-gray-500">Regla práctica:</strong> Antes de cerrar cualquier compra, calcula el DSCR con la tasa y plazo que te ofrece el banco. Si es &lt; {minDSCR}x, o negocias el precio o necesitas un pie mayor para reducir la cuota.
          </p>
        </div>
      </div>
    </section>
  );
}
