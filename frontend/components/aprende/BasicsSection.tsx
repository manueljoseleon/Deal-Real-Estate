const pillars = [
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "Flujo de Caja",
    description:
      "El ingreso neto mensual que genera la propiedad después de pagar todos los gastos: arriendo cobrado menos crédito hipotecario, gastos comunes, contribuciones, seguros y vacancia estimada. Un flujo positivo significa que la propiedad 'se paga sola'.",
    highlight: "¿La propiedad genera ingresos desde el día 1?",
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    title: "Apreciación",
    description:
      "El aumento del valor del inmueble en el tiempo. En Chile, propiedades bien ubicadas han apreciado históricamente 2–4% real anual. La apreciación acumula patrimonio aunque no se reciba en efectivo mensualmente — se realiza al vender.",
    highlight: "¿El activo vale más con el tiempo?",
  },
  {
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "Apalancamiento",
    description:
      "Usar deuda (crédito hipotecario) para comprar un activo de mayor valor con menos capital propio. Si financias el 80% con el banco y la propiedad sube un 5%, tu retorno sobre el capital invertido es mucho mayor que ese 5%. El apalancamiento amplifica tanto las ganancias como las pérdidas.",
    highlight: "¿Estoy usando bien el capital del banco?",
  },
];

export default function BasicsSection() {
  return (
    <section id="basics" className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest uppercase text-teal-600"
            style={{ fontFamily: "var(--font-josefin)" }}>
            Fundamentos
          </span>
          <h2
            className="mt-3 text-4xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Los 3 pilares de una inversión inmobiliaria
          </h2>
          <p
            className="mt-4 text-gray-500 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-josefin)" }}
          >
            Una buena inversión en bienes raíces debe crear valor en al menos uno
            de estos frentes. Las mejores operaciones combinan los tres.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="bg-white rounded-2xl border border-gray-100 p-7 flex flex-col gap-4 hover:border-teal-200 hover:shadow-sm transition-all"
            >
              <div className="text-teal-600">{p.icon}</div>
              <h3
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {p.title}
              </h3>
              <p
                className="text-sm text-gray-500 leading-relaxed flex-1"
                style={{ fontFamily: "var(--font-josefin)" }}
              >
                {p.description}
              </p>
              <div className="mt-auto pt-4 border-t border-gray-50 text-xs font-semibold text-teal-600"
                style={{ fontFamily: "var(--font-josefin)" }}>
                {p.highlight}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
