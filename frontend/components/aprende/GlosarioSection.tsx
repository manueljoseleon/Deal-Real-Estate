const terms = [
  {
    term: "Cap Rate Bruto",
    aka: "Rentabilidad Bruta / Gross Cap Rate",
    formula: "Arriendo bruto anual ÷ Precio de compra",
    example: "UF 14/mes × 12 = UF 168 ÷ UF 3.000 = 5,6% bruto",
    description:
      "La forma más rápida de evaluar una propiedad en el primer vistazo. Divide el arriendo anual sin descontar ningún gasto por el precio de compra. No es el número definitivo — pero es el filtro inicial: si el Cap Rate Bruto no es atractivo, el neto será peor. En Deal Inmobiliario usamos el bruto para el ranking rápido de propiedades.",
  },
  {
    term: "Cap Rate Neto",
    aka: "Tasa de Capitalización / Net Cap Rate",
    formula: "NOI anual ÷ Precio de compra",
    example: "UF 168 arriendo − UF 18 gastos = UF 150 NOI ÷ UF 3.000 = 5,0% neto",
    description:
      "El Cap Rate real de la inversión: descuenta del arriendo todos los gastos operativos (Opex) antes de dividir por el precio. Típicamente el Cap Rate Neto es 0,5–1 punto porcentual menor que el bruto. Es el número que debes usar para comparar propiedades en profundidad y calcular el DSCR.",
  },
  {
    term: "NOI",
    aka: "Net Operating Income / Ingreso Operacional Neto",
    formula: "Arriendo bruto − Opex (sin deuda)",
    example: "UF 14/mes × 12 − UF 18 gastos = UF 150/año",
    description:
      "El ingreso que genera la propiedad antes de pagar el crédito hipotecario, pero después de todos los gastos operativos (gastos comunes, contribuciones, seguros, vacancia, mantención). Es la 'utilidad operacional' del inmueble.",
  },
  {
    term: "ROI",
    aka: "Return on Investment",
    formula: "(Ganancia total ÷ Capital propio invertido) × 100",
    example: "UF 400 ganancia ÷ UF 800 capital propio = 50%",
    description:
      "Mide el retorno total sobre el capital que pusiste de tu bolsillo, incluyendo flujo de caja acumulado y apreciación al vender. A diferencia del Cap Rate, SÍ considera el apalancamiento: con un crédito al 80%, tu ROI puede ser mucho mayor que el Cap Rate.",
  },
  {
    term: "TIR",
    aka: "Tasa Interna de Retorno",
    formula: "Tasa que hace VPN = 0",
    example: "Si pones UF 800 hoy y recibes flujos + venta, ¿qué % anual te da?",
    description:
      "La rentabilidad anualizada de toda la inversión a lo largo del tiempo, considerando el momento exacto en que recibes cada flujo de caja y el precio de venta final. Es la métrica más precisa para comparar inversiones de distinta duración.",
  },
  {
    term: "MOIC",
    aka: "Multiple on Invested Capital",
    formula: "Valor final ÷ Capital propio invertido",
    example: "UF 1.600 recibido ÷ UF 800 invertido = 2.0x",
    description:
      "Cuántas veces recuperaste tu capital inicial, sin importar el tiempo. Un MOIC de 2x significa que duplicaste tu inversión. Es útil para comunicar retornos de forma simple, pero no captura el tiempo — 2x en 5 años es muy distinto a 2x en 15 años.",
  },
  {
    term: "Opex",
    aka: "Gastos Operativos",
    formula: "Gastos comunes + Contribuciones + Seguros + Vacancia + Mantención",
    example: "≈ 25–35% del arriendo bruto anual",
    description:
      "Todos los gastos recurrentes para mantener la propiedad funcionando y rentada, excluyendo el servicio de deuda. Una regla práctica es estimar el Opex entre 25% y 35% del arriendo bruto anual.",
  },
  {
    term: "Vacancia",
    aka: "Vacancy Rate",
    formula: "Meses sin arrendar ÷ 12 meses",
    example: "0.6 meses vacíos ÷ 12 = 5% vacancia",
    description:
      "El porcentaje del tiempo en que la propiedad está desocupada y no genera arriendo. En mercados urbanos líquidos de Chile, una vacancia del 5% (≈ 3 semanas al año) es un supuesto conservador razonable.",
  },
  {
    term: "Contribuciones",
    aka: "Impuesto Territorial",
    formula: "Avalúo fiscal × tasa DFL-2 o no DFL-2",
    example: "Propiedad DFL-2 ≤ 140 m²: exenta o tasa reducida",
    description:
      "Impuesto anual que cobra el SII sobre el avalúo fiscal del inmueble. Las propiedades DFL-2 (≤ 140 m² de construcción) gozan de beneficios tributarios importantes. Es un gasto fijo a incluir siempre en el Opex.",
  },
  {
    term: "Gastos de Entrada",
    aka: "Costos de Adquisición",
    formula: "Notaría + Estudio de títulos + Tasación + Gestoría + Impuesto",
    example: "≈ 2–4% del valor de compra",
    description:
      "Todos los costos asociados a cerrar la compra: honorarios del notario, CBR (Conservador de Bienes Raíces), tasación del banco, gestoría del crédito e impuesto al mutuo. Reducen tu ROI efectivo — siempre incluirlos en el modelo.",
  },
  {
    term: "Gastos de Salida",
    aka: "Costos de Venta",
    formula: "Comisión corredora + Impuesto a la ganancia de capital",
    example: "Comisión ≈ 2–3% + impuesto si corresponde",
    description:
      "Costos al vender: comisión de la corredora (típicamente 2–3% + IVA) e impuesto a la ganancia de capital si no aplica la exención de habitualidad. Si la propiedad se vende antes de 1 año desde la compra, puede haber tributación adicional.",
  },
  {
    term: "Apreciación",
    aka: "Plusvalía",
    formula: "(Precio venta − Precio compra) ÷ Precio compra",
    example: "UF 3.800 venta − UF 3.000 compra = +26.7%",
    description:
      "El aumento de valor del inmueble. Depende de la ubicación, desarrollo del entorno, obras de infraestructura y condiciones del mercado. En Chile, zonas con nueva infraestructura de metro o rezonificaciones han mostrado apreciaciones superiores al promedio.",
  },
  {
    term: "LTV",
    aka: "Loan to Value",
    formula: "Monto del crédito ÷ Valor de tasación",
    example: "UF 2.400 crédito ÷ UF 3.000 tasación = 80%",
    description:
      "Cuánto del valor de la propiedad financia el banco. En Chile, los bancos típicamente prestan hasta el 80% del valor de tasación para inversión, requiriendo un pie mínimo del 20%. Un LTV menor implica más capital propio pero menor costo financiero.",
  },
  {
    term: "DSCR",
    aka: "Debt Service Coverage Ratio",
    formula: "NOI anual ÷ Servicio de deuda anual",
    example: "UF 150 NOI ÷ UF 110 cuotas = 1.36x ✓",
    description:
      "Mide si el NOI de la propiedad es suficiente para cubrir las cuotas del crédito hipotecario. Un DSCR ≥ 1.20x significa que el inmueble genera al menos 20% más de lo que debes pagar al banco — margen mínimo recomendado.",
  },
];

export default function GlosarioSection() {
  return (
    <section id="glosario" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Glosario
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Términos clave de inversión inmobiliaria
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Entiende el lenguaje que usan los inversores y analistas para
            evaluar propiedades.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {terms.map((t) => (
            <div
              key={t.term}
              className="bg-gray-50 rounded-2xl border border-gray-100 p-6 hover:border-teal-200 hover:bg-white transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span
                    className="text-lg font-bold text-gray-900"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {t.term}
                  </span>
                  <span
                    className="ml-2 text-xs text-gray-400"
                    style={{ fontFamily: "var(--font-josefin)" }}
                  >
                    {t.aka}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p
                className="text-sm text-gray-600 leading-relaxed mb-4"
                style={{ fontFamily: "var(--font-josefin)" }}
              >
                {t.description}
              </p>

              {/* Formula + Example */}
              <div className="space-y-1.5 border-t border-gray-100 pt-3">
                <div className="flex gap-2 text-xs" style={{ fontFamily: "var(--font-josefin)" }}>
                  <span className="font-semibold text-gray-400 w-16 shrink-0">Fórmula</span>
                  <span className="text-teal-700 font-medium font-mono">{t.formula}</span>
                </div>
                <div className="flex gap-2 text-xs" style={{ fontFamily: "var(--font-josefin)" }}>
                  <span className="font-semibold text-gray-400 w-16 shrink-0">Ejemplo</span>
                  <span className="text-gray-500">{t.example}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
