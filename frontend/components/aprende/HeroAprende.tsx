export default function HeroAprende() {
  return (
    <section className="bg-white border-b border-gray-100 py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-teal-600 mb-4"
          style={{ fontFamily: "var(--font-josefin)" }}>
          Educación Inmobiliaria
        </span>
        <h1
          className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Aprende a invertir en{" "}
          <span className="text-teal-600">bienes raíces</span>
        </h1>
        <p
          className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed"
          style={{ fontFamily: "var(--font-josefin)" }}
        >
          Todo lo que necesitas saber para evaluar una inversión inmobiliaria:
          desde los conceptos básicos hasta los indicadores que usan los
          inversores profesionales.
        </p>

        {/* Quick-jump nav */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {[
            { label: "Conceptos básicos", href: "#basics" },
            { label: "Glosario", href: "#glosario" },
            { label: "Cap Rate", href: "#benchmark" },
            { label: "Crédito hipotecario", href: "#credito" },
            { label: "Riesgo vs retorno", href: "#riesgo" },
            { label: "¿Cuándo invertir?", href: "#decision" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors"
              style={{ fontFamily: "var(--font-josefin)" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
