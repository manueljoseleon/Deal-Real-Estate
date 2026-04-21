import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Metodología",
  description:
    "Cómo Deal Inmobiliario calcula el cap rate, yield bruto y comparables de arriendo. Fuentes de datos, criterios de selección y limitaciones del modelo.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Formula({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="my-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
      <code className="text-sm font-mono text-gray-900">{formula}</code>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-100 last:border-0">
      <div className="w-48 text-xs text-gray-500 shrink-0 pt-0.5">{label}</div>
      <div className="text-sm text-gray-800">{value}</div>
    </div>
  );
}

export default function MetodologiaPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1
          className="text-3xl font-bold text-gray-900 mb-3"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Metodología
        </h1>
        <p className="text-gray-500 text-sm">
          Aquí te enterarás de cómo calculamos los indicadores que ves en la plataforma, de dónde vienen los datos y cuáles son sus limitaciones.
        </p>
      </div>

      {/* Fuentes de datos */}
      <Section title="Fuentes de datos">
        <p>
          En Deal Inmobiliario, analizamos las propiedades del mercado de venta y de arriendo para obtener la información de inversión. Los datos se actualizan periódicamente.
        </p>
        <div className="mt-4 space-y-1">
          <InfoRow label="Fuente de información" value="Analizamos la información de propiedades de los principales sitios de publicaciones del país" />
          <InfoRow label="Frecuencia de actualización" value="Varias veces por semana por comuna" />
          <InfoRow label="Cobertura geográfica" value="Por el momento tenemos solamente Santiago, Región Metropolitana" />
          <InfoRow label="Tipos de propiedad" value="Departamentos, casas y estudios" />
          <InfoRow label="Mercados" value="Venta (para calcular precio de compra) y arriendo (para estimar renta)" />
        </div>
        <p className="mt-3 text-gray-500">
          Solo se incluyen en los resultados las propiedades que tienen precio, superficie y coordenadas geográficas completas. Las propiedades sin esta información se marcan como inactivas.
        </p>
      </Section>

      {/* Cap Rate */}
      <Section title="Cap Rate">
        <p>
          El <strong>cap rate</strong> es el indicador principal de rentabilidad para inversión en arriendo. Mide el ingreso anual de arriendo como porcentaje del precio de compra, sin considerar financiamiento.
        </p>
        <Formula
          label="Fórmula"
          formula="Cap Rate = (Renta mensual estimada × 12) / Precio de compra × 100"
        />
        <p>
          El cap rate que mostramos es <strong>bruto</strong>: no descuenta contribuciones, mantenimiento, ni períodos de vacancia. Es un indicador comparativo para filtrar oportunidades, no un retorno neto garantizado.
        </p>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>Importante:</strong> Para evaluar la rentabilidad real de una inversión, debes restar los gastos operacionales (contribuciones, administración, vacancia estimada). Un cap rate bruto del 6% puede equivaler a un retorno neto del 4–5%.
        </div>
      </Section>

      {/* Renta estimada */}
      <Section title="Renta mensual estimada">
        <p>
          La renta estimada se calcula usando <strong>comparables de arriendo</strong> — propiedades similares actualmente en arriendo en la misma zona geográfica.
        </p>
        <div className="mt-2 space-y-1">
          <InfoRow label="Radio de búsqueda" value="1.5 km desde la propiedad (ajustable según densidad de datos)" />
          <InfoRow label="Filtros de comparables" value="Mismo tipo de propiedad (depto/casa/estudio) y rango de dormitorios similar" />
          <InfoRow label="Filtro de outliers" value="Se aplica filtrado IQR (rango intercuartílico) para excluir precios anómalos" />
          <InfoRow label="Estadístico usado" value="Mediana de los comparables filtrados" />
          <InfoRow label="Mínimo de comparables" value="Se requiere al menos 1 comparable. Con menos de 3 se indica baja confianza." />
        </div>
        <p className="mt-3 text-gray-500">
          El nivel de confianza que aparece en las tarjetas refleja la cantidad y cercanía de los comparables: <em>Alta confianza</em> (3+ comparables cercanos), <em>Zona media</em> (radio ampliado), <em>Zona amplia</em> (menos comparables disponibles).
        </p>
      </Section>

      {/* Precio de zona */}
      <Section title="Precio de zona ($/m²)">
        <p>
          El indicador <strong>"precio de zona"</strong> que aparece en el detalle de propiedad representa el precio promedio por m² de propiedades similares en un radio de 2 km.
        </p>
        <Formula
          label="Fórmula"
          formula="Precio zona = Promedio(precio_uf / m²) de propiedades vecinas activas en venta"
        />
        <p>
          Se usa para comparar si la propiedad está por encima o por debajo del precio de mercado de su zona. Una propiedad al <strong>–10% del precio de zona</strong> puede representar una oportunidad de entrada por debajo del mercado.
        </p>
      </Section>

      {/* Limitaciones */}
      <Section title="Limitaciones del modelo">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Precios de publicación, no de cierre.</strong> Los precios son los que aparecen en los portales. El precio de cierre real puede diferir (especialmente en ventas, donde existe negociación).
          </li>
          <li>
            <strong>La renta estimada es una referencia, no una garantía.</strong> El mercado de arriendo varía por piso, vista, estado del inmueble y negociación directa con el arrendatario.
          </li>
          <li>
            <strong>Posibles errores de publicación.</strong> Las propiedades en los diferentes sitios de publicación pueden venir con errores: confundir área total con área útil, ubicación imprecisa, precios o dormitorios incorrectos, etc. En Deal Inmobiliario hacemos una revisión profunda de cada propiedad, pero a veces estos errores pueden ser difíciles de identificar generando indicadores de inversión erróneos.
          </li>
          <li>
            <strong>Gastos no considerados en cap rate bruto.</strong> Contribuciones, seguro, mantenimiento y vacancia reducen el retorno real. En el modelo de Calculadora Financiera ya se calcula el Cap Rate Neto donde sí se toman en consideración todos los gastos operacionales.
          </li>
          <li>
            <strong>Datos históricos limitados.</strong> La plataforma se basa en propiedades activas actuales. No mostramos series históricas de precios.
          </li>
          <li>
            <strong>Cobertura geográfica.</strong> Actualmente solo cubrimos comunas de la Región Metropolitana.
          </li>
        </ul>
      </Section>

      {/* CTA */}
      <div className="mt-8 p-6 bg-teal-50 border border-teal-200 rounded-xl text-center">
        <p className="text-sm text-teal-800 mb-4">
          ¿Tienes dudas sobre cómo interpretamos los datos o encontraste un error?
        </p>
        <Link
          href="/oportunidades"
          className="inline-block bg-teal-700 text-white text-sm px-6 py-2 rounded-lg hover:bg-teal-800 transition-colors"
        >
          Ver oportunidades
        </Link>
      </div>
    </main>
  );
}
