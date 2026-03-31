import AdminGate from "@/components/AdminGate";
import Link from "next/link";

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-700 mb-2">{children}</h3>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-500 mt-2 leading-relaxed">{children}</p>
  );
}

// ─── Color dot legend ─────────────────────────────────────────────────────────

const DOT: Record<"excellent" | "good" | "moderate" | "low", string> = {
  excellent: "bg-green-700",
  good:      "bg-green-500",
  moderate:  "bg-amber-400",
  low:       "bg-red-500",
};

const LABEL: Record<"excellent" | "good" | "moderate" | "low", string> = {
  excellent: "Excelente",
  good:      "Bueno",
  moderate:  "Moderado",
  low:       "Bajo",
};

function Dot({ level }: { level: keyof typeof DOT }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${DOT[level]}`} />
      <span className="text-xs font-medium text-gray-700">{LABEL[level]}</span>
    </span>
  );
}

// ─── Metric row ───────────────────────────────────────────────────────────────

interface ThresholdRow {
  label: string;
  excellent: string;
  good: string;
  moderate: string;
  low: string;
  note?: string;
}

function ThresholdTable({ rows }: { rows: ThresholdRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200 w-36">Indicador</th>
            <th className="text-center font-semibold px-3 py-2 border border-gray-200">
              <Dot level="excellent" />
            </th>
            <th className="text-center font-semibold px-3 py-2 border border-gray-200">
              <Dot level="good" />
            </th>
            <th className="text-center font-semibold px-3 py-2 border border-gray-200">
              <Dot level="moderate" />
            </th>
            <th className="text-center font-semibold px-3 py-2 border border-gray-200">
              <Dot level="low" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="even:bg-gray-50 hover:bg-blue-50/40 transition-colors">
              <td className="px-3 py-2 border border-gray-200 font-medium text-gray-800">{r.label}</td>
              <td className="px-3 py-2 border border-gray-200 text-center font-mono text-green-800">{r.excellent}</td>
              <td className="px-3 py-2 border border-gray-200 text-center font-mono text-green-700">{r.good}</td>
              <td className="px-3 py-2 border border-gray-200 text-center font-mono text-amber-700">{r.moderate}</td>
              <td className="px-3 py-2 border border-gray-200 text-center font-mono text-red-600">{r.low}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tier table ───────────────────────────────────────────────────────────────

interface TierRow {
  tier: number;
  radio: string;
  dormitorios: string;
  area: string;
  fuente: string;
  nota?: string;
}

function TierTable({ rows }: { rows: TierRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-center font-semibold text-gray-500 px-3 py-2 border border-gray-200">Tier</th>
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Radio</th>
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Dormitorios</th>
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Superficie</th>
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Fuente</th>
            <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Nota</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.tier} className="even:bg-gray-50">
              <td className="px-3 py-2 border border-gray-200 text-center font-bold text-gray-700">{r.tier}</td>
              <td className="px-3 py-2 border border-gray-200 font-mono text-gray-800">{r.radio}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-700">{r.dormitorios}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-700">{r.area}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-700">{r.fuente}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-500 italic">{r.nota ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const METRIC_ROWS: ThresholdRow[] = [
  {
    label: "IRR real",
    excellent: "> 8%",
    good:      "≥ 5%",
    moderate:  "≥ 3%",
    low:       "< 3%",
    note: "Expresado como UF + X%. Incluye flujos operacionales + plusvalía en el horizonte seleccionado.",
  },
  {
    label: "Cap Rate Bruto",
    excellent: "≥ 6%",
    good:      "≥ 5%",
    moderate:  "≥ 4%",
    low:       "< 4%",
    note: "Renta anual estimada / precio de compra. Sin descontar gastos operacionales ni vacancia.",
  },
  {
    label: "Cap Rate Neto",
    excellent: "≥ 4%",
    good:      "≥ 3%",
    moderate:  "≥ 2%",
    low:       "< 2%",
    note: "Renta anual neta (tras opex) / precio de compra.",
  },
  {
    label: "Cash-on-Cash",
    excellent: "≥ 4%",
    good:      "≥ 2%",
    moderate:  "≥ 0%",
    low:       "< 0%",
    note: "Flujo de caja operacional año 1 (tras dividendo) / equity desembolsado total.",
  },
  {
    label: "ROI total",
    excellent: "≥ 80%",
    good:      "≥ 50%",
    moderate:  "≥ 20%",
    low:       "< 20%",
    note: "Ganancia neta acumulada (flujos + venta − equity) / equity desembolsado. Depende del horizonte seleccionado.",
  },
  {
    label: "MOIC",
    excellent: "≥ 2×",
    good:      "≥ 1.5×",
    moderate:  "≥ 1.1×",
    low:       "< 1.1×",
    note: "(Flujos + venta) / equity total desembolsado. MOIC de 1.0× = recuperas exactamente lo invertido.",
  },
];

const RECOMMENDATION_ROWS: ThresholdRow[] = [
  {
    label: "Gran oportunidad",
    excellent: "> 8%",
    good:      "",
    moderate:  "",
    low:       "",
  },
  {
    label: "Buena oportunidad",
    excellent: "",
    good:      "≥ 5%",
    moderate:  "",
    low:       "",
  },
  {
    label: "Condicional",
    excellent: "",
    good:      "",
    moderate:  "≥ 3%",
    low:       "",
  },
  {
    label: "No conviene",
    excellent: "",
    good:      "",
    moderate:  "",
    low:       "< 3%",
  },
];

const TIER_ROWS: TierRow[] = [
  { tier: 1, radio: "1.5 km",  dormitorios: "Exacto",     area: "±30%",  fuente: "Geo (PostGIS)", nota: "Filtro más estricto" },
  { tier: 2, radio: "1.5 km",  dormitorios: "Exacto",     area: "Libre", fuente: "Geo (PostGIS)", nota: "Relaja superficie" },
  { tier: 3, radio: "3 km",    dormitorios: "Exacto",     area: "±30%",  fuente: "Geo (PostGIS)", nota: "Amplía radio" },
  { tier: 4, radio: "3 km",    dormitorios: "Exacto",     area: "Libre", fuente: "Geo (PostGIS)", nota: "Amplía radio + relaja área" },
  { tier: 5, radio: "—",       dormitorios: "Exacto",     area: "±30%",  fuente: "Comuna",        nota: "Fallback sin coordenadas" },
  { tier: 6, radio: "—",       dormitorios: "±1 dormit.", area: "Libre", fuente: "Comuna",        nota: "Relaja dormitorios" },
  { tier: 7, radio: "—",       dormitorios: "Sin filtro", area: "Libre", fuente: "Comuna",        nota: "Máxima relajación" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReglasPage() {
  return (
    <AdminGate>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/admin/entry" className="text-sm text-gray-400 hover:text-gray-700">← Admin</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Reglas y metodología</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Referencia de umbrales de calidad de inversión y lógica de cálculo del sistema.
            </p>
          </div>
          <span className="text-[10px] font-mono text-gray-300 mt-1 whitespace-nowrap">v2026-03</span>
        </div>

        {/* ── 1. Escalas de calidad ──────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <SectionTitle>1. Escalas de calidad de inversión</SectionTitle>

          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-1">
            <Dot level="excellent" />
            <Dot level="good" />
            <Dot level="moderate" />
            <Dot level="low" />
          </div>

          <ThresholdTable rows={METRIC_ROWS} />

          <Note>
            Todos los indicadores usan la misma paleta de 4 niveles. El IRR real (UF+X%) es el KPI maestro —
            los demás indicadores están calibrados para ser coherentes con él.
            El IRR asume inflación en UF, por lo que un retorno de 3% real equivale aproximadamente
            a un depósito a plazo o renta fija con menor riesgo de liquidez.
          </Note>
        </section>

        {/* ── 2. Recomendación global ────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <SectionTitle>2. Recomendación global del deal (basada en IRR)</SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-700" />
                <span className="text-xs font-bold text-green-900 uppercase tracking-wide">Gran oportunidad</span>
              </div>
              <p className="text-xs text-green-800">IRR real <strong>&gt; 8%</strong></p>
              <p className="text-xs text-green-700 mt-1">
                Supera ampliamente el costo de oportunidad del capital. No dejes pasar esta propiedad.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">Buena oportunidad</span>
              </div>
              <p className="text-xs text-teal-800">IRR real <strong>≥ 5%</strong></p>
              <p className="text-xs text-teal-700 mt-1">
                Retorno atractivo para el perfil de riesgo. Vale la pena continuar el proceso.
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Condicional</span>
              </div>
              <p className="text-xs text-amber-800">IRR real <strong>≥ 3%</strong></p>
              <p className="text-xs text-amber-700 mt-1">
                Rentabilidad en rango bajo. Intenta negociar precio, mejorar financiamiento
                o confirmar que el arriendo estimado es alcanzable.
              </p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-900 uppercase tracking-wide">No conviene</span>
              </div>
              <p className="text-xs text-red-800">IRR real <strong>&lt; 3%</strong></p>
              <p className="text-xs text-red-700 mt-1">
                Un depósito a plazo o renta fija ofrece mejor rentabilidad con menor riesgo.
                Ajusta supuestos o descarta.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. Arriendo estimado — tiers de matching ──────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <SectionTitle>3. Arriendo estimado — tiers de matching de comparables</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-1">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Mínimo de comps</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">3</p>
              <p className="text-gray-500 text-[10px] mt-0.5">para aceptar un tier</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Máx. resultados</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">50</p>
              <p className="text-gray-500 text-[10px] mt-0.5">por consulta SQL</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Estimación</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">Mediana</p>
              <p className="text-gray-500 text-[10px] mt-0.5">de rents normalizados</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Rent. mínima</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">$50.000</p>
              <p className="text-gray-500 text-[10px] mt-0.5">CLP/mes para incluir comp</p>
            </div>
          </div>

          <TierTable rows={TIER_ROWS} />

          <div className="space-y-2">
            <SubTitle>Lógica de avance entre tiers</SubTitle>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside leading-relaxed">
              <li>El sistema prueba cada tier en orden, del 1 al 7.</li>
              <li>Si el tier acumula <strong>≥ 3 comps deduplicados</strong>, acepta ese tier y no sigue avanzando.</li>
              <li>Si la propiedad no tiene coordenadas (lat/lng), los tiers 1–4 se saltan automáticamente.</li>
              <li>Si la propiedad tiene <strong>&gt; 5 dormitorios</strong>, el filtro de dormitorios se ignora en todos los tiers.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <SubTitle>Deduplicación de comps cross-portal</SubTitle>
            <p className="text-xs text-gray-600 leading-relaxed">
              Para evitar contar la misma propiedad dos veces publicada en portales distintos,
              se agrupan los comps por <code className="bg-gray-100 px-1 rounded">(dormitorios, área_m2 redondeada a 1m²)</code>.
              Dentro de cada grupo se retiene solo el comp de <strong>menor arriendo</strong> (estimación conservadora).
              En la vista de detalle se aplica una segunda deduplicación espacial: comps a ≤ 20m entre sí
              con área similar (±2m²) se consideran el mismo inmueble.
            </p>
          </div>

          <div className="space-y-2">
            <SubTitle>Normalización por superficie</SubTitle>
            <p className="text-xs text-gray-600 leading-relaxed">
              Cuando tanto la propiedad como el comp tienen área útil declarada, el arriendo del comp
              se normaliza al tamaño de la propiedad sujeto:
            </p>
            <pre className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto">
              rent_normalizado = (rent_comp / m²_comp) × m²_propiedad
            </pre>
            <p className="text-xs text-gray-500 mt-1">
              Si alguna de las dos partes no tiene área, se usa el arriendo bruto sin normalizar.
              Comps sin área cuando la propiedad sí la tiene se omiten (no se pueden normalizar).
            </p>
          </div>

          <div className="space-y-2">
            <SubTitle>Cap Bruto → Yield Band</SubTitle>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Cap Bruto</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Banda</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Color</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-green-800">≥ 6%</td>
                    <td className="px-3 py-2 border border-gray-200 font-medium text-green-800">Excelente</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-green-700 align-middle" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-green-700">≥ 5%</td>
                    <td className="px-3 py-2 border border-gray-200 font-medium text-green-700">Bueno</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-green-500 align-middle" /></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-amber-700">≥ 4%</td>
                    <td className="px-3 py-2 border border-gray-200 font-medium text-amber-700">Moderado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-yellow-400 align-middle" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-red-600">&lt; 4%</td>
                    <td className="px-3 py-2 border border-gray-200 font-medium text-red-600">Bajo</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-red-500 align-middle" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Note>
              La yield band se calcula en el backend (<code className="bg-gray-100 px-1 rounded">btl_calculator.py → _classify_yield</code>)
              durante el BTL matching y se persiste en la DB. El Deal Analyzer la recomputa en tiempo real.
            </Note>
          </div>
        </section>

        {/* ── 4. Precio vs zona ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <SectionTitle>4. Precio vs. zona — comparación de precios de venta</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-1">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Radio</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">1.5 km</p>
              <p className="text-gray-500 text-[10px] mt-0.5">desde la propiedad</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Universo</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">Activas</p>
              <p className="text-gray-500 text-[10px] mt-0.5">is_canonical + is_active</p>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <p className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Métrica</p>
              <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">AVG UF/m²</p>
              <p className="text-gray-500 text-[10px] mt-0.5">precio / superficie</p>
            </div>
          </div>

          <div className="space-y-2">
            <SubTitle>Dos promedios calculados en paralelo</SubTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Campo DB</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Descripción</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Filtros extra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-700">zone_avg_price_uf_per_m2</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-700">AVG(price_uf / m²) de <em>todas</em> las propiedades en el radio</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500">Solo con price_uf y m² no nulos</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-700">zone_avg_price_uf_per_m2_same_type</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-700">AVG(price_uf / m²) con <em>mismos dormitorios</em> y área ±30%</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500">bedrooms exacto + m² entre 70%–130%</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-700">zone_avg_sample_count</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-700">Cantidad total de propiedades usadas para el promedio general</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <SubTitle>Interpretación del % vs zona (PriceHeatBar)</SubTitle>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">% vs zona</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Interpretación</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 border border-gray-200">Color</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-green-700">≥ +15%</td>
                    <td className="px-3 py-2 border border-gray-200 text-green-700">Precio muy por debajo del mercado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-green-600 align-middle" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-green-600">+5% a +15%</td>
                    <td className="px-3 py-2 border border-gray-200 text-green-600">Ligeramente bajo el mercado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-green-400 align-middle" /></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-600">−5% a +5%</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">En línea con el mercado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-gray-400 align-middle" /></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-amber-700">−15% a −5%</td>
                    <td className="px-3 py-2 border border-gray-200 text-amber-700">Ligeramente sobre el mercado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-amber-500 align-middle" /></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-red-600">&lt; −15%</td>
                    <td className="px-3 py-2 border border-gray-200 text-red-600">Precio alto respecto al mercado</td>
                    <td className="px-3 py-2 border border-gray-200"><span className="inline-block w-4 h-4 rounded bg-red-500 align-middle" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Note>
              % vs zona = (zone_avg − precio_propiedad_uf_m2) / zone_avg × 100.
              Un % positivo significa que la propiedad está más barata que el promedio de la zona.
            </Note>
          </div>

          <div className="space-y-2">
            <SubTitle>Cómo se actualiza zone_avg</SubTitle>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside leading-relaxed">
              <li><strong>Scrape completo:</strong> <code className="bg-gray-100 px-1 rounded">run_btl_matching()</code> recalcula zone_avg para todas las propiedades del batch.</li>
              <li><strong>Lazy load:</strong> <code className="bg-gray-100 px-1 rounded">GET /properties/{"{id}"}</code> calcula y persiste al vuelo si el campo es null y hay coordenadas.</li>
              <li><strong>PATCH:</strong> si se actualizan lat/lng o superficie, se recalcula inmediatamente.</li>
              <li><strong>Reparación masiva:</strong> <code className="bg-gray-100 px-1 rounded">POST /api/v1/analysis/repair-zone-avg</code> corrige todas las propiedades con zone_avg null.</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Invariante:</strong> <code className="bg-amber-100 px-1 rounded">zone_avg_price_uf_per_m2</code> nunca debe ser null si la propiedad tiene lat, lng, price_uf y useful_area_m2.
              Si el heatmap no renderiza nada, ejecutar el endpoint de reparación.
            </p>
          </div>
        </section>

        {/* ── 5. Notas de implementación ────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <SectionTitle>5. Notas de implementación</SectionTitle>
          <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside leading-relaxed">
            <li>
              Los umbrales de calidad viven en dos lugares:{" "}
              <code className="bg-gray-100 px-1 rounded">frontend/components/analysis/DealAnalyzerMetrics.tsx</code> (statusDot / irrColor)
              y{" "}
              <code className="bg-gray-100 px-1 rounded">frontend/components/analysis/DealAnalyzerClient.tsx</code> (getRecommendation).
              Ambos deben estar sincronizados — esta página es la fuente de verdad.
            </li>
            <li>
              La yield band del buscador se calcula en{" "}
              <code className="bg-gray-100 px-1 rounded">backend/app/services/btl_calculator.py → _classify_yield</code>.
              Usa los mismos umbrales (6/5/4%) que el Deal Analyzer.
            </li>
            <li>
              Los tiers de matching se definen en{" "}
              <code className="bg-gray-100 px-1 rounded">backend/app/services/matching.py → _TIERS</code>.
              El mínimo de comps (<strong>3</strong>) está en{" "}
              <code className="bg-gray-100 px-1 rounded">backend/app/config.py → matching_min_comps</code>.
            </li>
            <li>
              La comparación de zona usa PostGIS{" "}
              <code className="bg-gray-100 px-1 rounded">ST_DWithin</code> con radio de <strong>1.500 metros</strong>.
              Requiere que la propiedad tenga una columna{" "}
              <code className="bg-gray-100 px-1 rounded">location</code> (geography) poblada.
            </li>
          </ul>
        </section>

      </main>
    </AdminGate>
  );
}
