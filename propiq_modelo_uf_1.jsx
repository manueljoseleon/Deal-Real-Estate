import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const UF_CLP = 38000;

function fmt(v, d = 2) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1000000) return s + (abs / 1000000).toFixed(d) + "M UF";
  if (abs >= 1000) return s + (abs / 1000).toFixed(d) + "k UF";
  return s + abs.toFixed(d) + " UF";
}
function fmtClp(v) {
  if (!v) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1e6) return s + "$" + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return s + "$" + Math.round(abs / 1e3) + "k";
  return s + "$" + Math.round(abs);
}
function pct(v, d = 2) {
  if (isNaN(v) || !isFinite(v)) return "—";
  return (v >= 0 ? "" : "") + v.toFixed(d) + "%";
}

function irr(flows, guess = 0.08) {
  let r = guess;
  for (let i = 0; i < 300; i++) {
    let npv = 0, d = 0;
    for (let t = 0; t < flows.length; t++) {
      const disc = Math.pow(1 + r, t);
      npv += flows[t] / disc;
      d -= (t * flows[t]) / (disc * (1 + r));
    }
    if (Math.abs(d) < 1e-12) break;
    const r2 = r - npv / d;
    if (Math.abs(r2 - r) < 1e-8) { r = r2; break; }
    r = isFinite(r2) ? r2 : r * 0.5;
  }
  return r;
}

const SliderInput = ({ label, value, min, max, step, onChange, display, sublabel }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 11, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Mono', monospace" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a12", fontFamily: "'DM Mono', monospace" }}>{display}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
      style={{ width: "100%", accentColor: "#b8a96a" }} />
    {sublabel && <span style={{ fontSize: 10, color: "#b0a880" }}>{sublabel}</span>}
  </div>
);

const MetricCard = ({ label, value, sub, color }) => (
  <div style={{
    background: "#f7f5ee", borderRadius: 8, padding: "14px 16px",
    borderLeft: `3px solid ${color || "#b8a96a"}`
  }}>
    <div style={{ fontSize: 10, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || "#1a1a12", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#8a8a7a", marginTop: 4 }}>{sub}</div>}
  </div>
);

const TableSection = ({ title, rows }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>{title}</div>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{
            background: r.bold ? "#f0ede2" : r.highlight ? "#e8f5e9" : r.red ? "#fdf2f2" : i % 2 === 0 ? "#faf9f4" : "#f4f2ea",
            borderBottom: "1px solid #e8e4d4"
          }}>
            <td style={{ padding: "6px 10px", color: r.indent ? "#6a6a5a" : "#2a2a1a", paddingLeft: r.indent ? 22 : 10, fontWeight: r.bold ? 600 : 400 }}>{r.label}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'DM Mono', monospace", fontWeight: r.bold || r.highlight ? 600 : 400, color: r.red ? "#b83232" : r.green ? "#2e7d32" : "#1a1a12" }}>{r.v1}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'DM Mono', monospace", color: "#8a8a7a", fontSize: 11 }}>{r.v2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a12", borderRadius: 6, padding: "10px 14px", border: "1px solid #3a3a2a" }}>
      <div style={{ fontSize: 11, color: "#b8a96a", marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Año {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontFamily: "'DM Mono', monospace" }}>
          {p.name}: {p.value >= 0 ? "" : ""}{Math.abs(p.value).toFixed(2)} UF
        </div>
      ))}
    </div>
  );
};

export default function PropModel() {
  // Asset inputs (UF)
  const [valorUF, setValorUF] = useState(3000);
  const [rentaClp, setRentaClp] = useState(600000);
  const [ltv, setLtv] = useState(70);
  const [tasaDeuda, setTasaDeuda] = useState(4.5);
  const [apreciacion, setApreciacion] = useState(2);
  const [horiz, setHoriz] = useState(10);
  // Opex
  const [vacancia, setVacancia] = useState(7);
  const [admPct, setAdmPct] = useState(8);
  const [contribPct, setContribPct] = useState(1.0);
  const [mantUF, setMantUF] = useState(5);
  const [segUF, setSegUF] = useState(3);
  const [capexPct, setCapexPct] = useState(0.5);
  // Entrada (CLP)
  const [notClp, setNotClp] = useState(300000);
  const [timPct, setTimPct] = useState(0.8);
  const [tasClp, setTasClp] = useState(500000);
  const [ddClp, setDdClp] = useState(800000);
  const [corPct, setCorPct] = useState(2.0);
  const [repClp, setRepClp] = useState(2000000);
  // Salida
  const [cvPct, setCvPct] = useState(2.0);

  const model = useMemo(() => {
    const rentaUFmes = rentaClp / UF_CLP;
    const rentaUFanual = rentaUFmes * 12;
    const debtUF = valorUF * (ltv / 100);
    const equity0UF = valorUF * (1 - ltv / 100);
    const tasaD = tasaDeuda / 100;
    const intUF = debtUF * tasaD;

    // Opex anual (UF)
    const vacLoss = rentaUFanual * (vacancia / 100);
    const rentaEfec = rentaUFanual * (1 - vacancia / 100);
    const admUF = rentaEfec * (admPct / 100);
    const contUF = valorUF * (contribPct / 100);
    const capexUF = valorUF * (capexPct / 100);
    const totalOpex = admUF + contUF + mantUF + segUF + capexUF;
    const noi = rentaEfec - totalOpex;
    const cashflow = noi - intUF;

    // Costos entrada en UF (CLP → UF al momento 0)
    const notUF = notClp / UF_CLP;
    const timUF = (debtUF * valorUF * (timPct / 100)) / valorUF; // timbre sobre deuda CLP
    const timUF2 = (debtUF * UF_CLP * (timPct / 100)) / UF_CLP; // correcto: timbre = pct del crédito en CLP → UF
    const tasUF = tasClp / UF_CLP;
    const ddUF = ddClp / UF_CLP;
    const corUF = valorUF * (corPct / 100);
    const repUF = repClp / UF_CLP;
    const totalEntradaUF = notUF + timUF2 + tasUF + ddUF + corUF + repUF;
    const equityTotalUF = equity0UF + totalEntradaUF;

    // Flujos anuales
    const annual = [];
    for (let t = 1; t <= horiz; t++) {
      const saleValT = valorUF * Math.pow(1 + apreciacion / 100, t);
      const corrVentaT = saleValT * (cvPct / 100);
      const netSaleT = saleValT - debtUF - corrVentaT;
      annual.push({
        year: t,
        rentaBruta: rentaUFanual,
        vacanciaLoss: -vacLoss,
        rentaEfec,
        admCosto: -admUF,
        contrib: -contUF,
        mant: -mantUF,
        seg: -segUF,
        capex: -capexUF,
        noi,
        interes: -intUF,
        cashflow,
        saleVal: saleValT,
        corrVenta: corrVentaT,
        netSale: netSaleT,
        totalEquity: cashflow + (t === horiz ? netSaleT : 0),
      });
    }

    const saleVal = valorUF * Math.pow(1 + apreciacion / 100, horiz);
    const corrVenta = saleVal * (cvPct / 100);
    const netSale = saleVal - debtUF - corrVenta;
    const flujoAcum = cashflow * horiz;
    const ganTotal = flujoAcum + netSale - equityTotalUF;
    const moic = equityTotalUF > 0 ? (flujoAcum + netSale) / equityTotalUF : 0;

    const flows = [-equityTotalUF];
    for (let t = 1; t < horiz; t++) flows.push(cashflow);
    flows.push(cashflow + netSale);
    const irrVal = equityTotalUF > 0 ? irr(flows) * 100 : 0;

    const capBruto = (rentaUFanual / valorUF) * 100;
    const capNeto = (noi / valorUF) * 100;
    const coc = equity0UF > 0 ? (cashflow / equity0UF) * 100 : 0;

    return {
      rentaUFmes, rentaUFanual, debtUF, equity0UF, intUF,
      vacLoss, rentaEfec, admUF, contUF, capexUF, totalOpex, noi, cashflow,
      notUF, timUF: timUF2, tasUF, ddUF, corUF, repUF, totalEntradaUF, equityTotalUF,
      saleVal, corrVenta, netSale, flujoAcum, ganTotal, moic, irrVal,
      capBruto, capNeto, coc, annual,
    };
  }, [valorUF, rentaClp, ltv, tasaDeuda, apreciacion, horiz, vacancia, admPct, contribPct, mantUF, segUF, capexPct, notClp, timPct, tasClp, ddClp, corPct, repClp, cvPct]);

  const { annual } = model;

  const chartDataFlujo = annual.map(a => ({
    year: a.year,
    "Flujo operacional": +a.cashflow.toFixed(2),
    "Plusvalía acumulada": +(a.saleVal - valorUF).toFixed(2),
  }));

  const chartDataWaterfall = annual.map(a => ({
    year: a.year,
    "NOI": +a.noi.toFixed(2),
    "Interés deuda": +(-a.interes < 0 ? a.interes : -a.interes).toFixed(2) * -1,
    "Flujo neto equity": +a.cashflow.toFixed(2),
  }));

  const irrColor = model.irrVal >= 8 ? "#2e7d32" : model.irrVal >= 5 ? "#b8a96a" : "#b83232";

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f4f2ea", minHeight: "100vh", color: "#1a1a12" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#1a1a12", padding: "20px 32px", borderBottom: "3px solid #b8a96a" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#b8a96a", letterSpacing: "0.15em", textTransform: "uppercase" }}>PropIQ Chile</span>
          <span style={{ color: "#3a3a2a", fontSize: 14 }}>|</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600, color: "#f4f2ea" }}>Modelo de Inversión Inmobiliaria</span>
        </div>
        <div style={{ fontSize: 11, color: "#6a6a5a", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
          Valores en UF · Retorno real · cap rate en % · IRR en UF + x% · Antes de impuestos · Modelo interest-only
        </div>
      </div>

      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>

        {/* LEFT — Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          <div style={{ background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid #e4e0d0" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid #e4e0d0", paddingBottom: 8 }}>Activo y financiamiento</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SliderInput label="Valor activo" value={valorUF} min={500} max={20000} step={100} onChange={setValorUF}
                display={`${valorUF.toLocaleString("es-CL")} UF`} sublabel={`≈ ${fmtClp(valorUF * UF_CLP)} CLP`} />
              <SliderInput label="Renta mensual" value={rentaClp} min={100000} max={3000000} step={50000} onChange={setRentaClp}
                display={fmtClp(rentaClp)} sublabel={`≈ ${model.rentaUFmes.toFixed(1)} UF/mes · yield bruto ${model.capBruto.toFixed(1)}%`} />
              <SliderInput label="LTV (deuda / activo)" value={ltv} min={0} max={85} step={5} onChange={setLtv}
                display={`${ltv}%`} sublabel={`Deuda: ${model.debtUF.toLocaleString("es-CL", { maximumFractionDigits: 0 })} UF`} />
              <SliderInput label="Tasa crédito (UF + %)" value={tasaDeuda} min={1} max={8} step={0.25} onChange={setTasaDeuda}
                display={`UF + ${tasaDeuda}%`} sublabel={`Interés anual: ${model.intUF.toFixed(1)} UF`} />
              <SliderInput label="Apreciación real anual" value={apreciacion} min={0} max={6} step={0.5} onChange={setApreciacion}
                display={`UF + ${apreciacion}%`} sublabel="Sobre precio en UF (real)" />
              <SliderInput label="Horizonte inversión" value={horiz} min={1} max={20} step={1} onChange={setHoriz}
                display={`${horiz} años`} />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid #e4e0d0" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid #e4e0d0", paddingBottom: 8 }}>Costos operacionales anuales (UF)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SliderInput label="Vacancia efectiva" value={vacancia} min={0} max={20} step={1} onChange={setVacancia} display={`${vacancia}%`} />
              <SliderInput label="Administración (% renta efec.)" value={admPct} min={0} max={15} step={1} onChange={setAdmPct} display={`${admPct}%`} />
              <SliderInput label="Contribuciones (% valor UF)" value={contribPct} min={0} max={2} step={0.1} onChange={setContribPct} display={`${contribPct.toFixed(1)}%`} />
              <SliderInput label="Mantención anual" value={mantUF} min={0} max={50} step={1} onChange={setMantUF} display={`${mantUF} UF`} />
              <SliderInput label="Seguros anuales" value={segUF} min={0} max={30} step={1} onChange={setSegUF} display={`${segUF} UF`} />
              <SliderInput label="CAPEX reserva (% valor UF)" value={capexPct} min={0} max={2} step={0.1} onChange={setCapexPct} display={`${capexPct.toFixed(1)}%`} />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid #e4e0d0" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid #e4e0d0", paddingBottom: 8 }}>Costos de entrada (CLP → UF)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SliderInput label="Notaría / escritura" value={notClp} min={100000} max={2000000} step={50000} onChange={setNotClp}
                display={fmtClp(notClp)} sublabel={`${model.notUF.toFixed(1)} UF`} />
              <SliderInput label="Timbres y estampillas (% crédito)" value={timPct} min={0} max={1.2} step={0.1} onChange={setTimPct}
                display={`${timPct.toFixed(1)}%`} sublabel={`${model.timUF.toFixed(1)} UF`} />
              <SliderInput label="Tasación + originación banco" value={tasClp} min={100000} max={2000000} step={100000} onChange={setTasClp}
                display={fmtClp(tasClp)} sublabel={`${model.tasUF.toFixed(1)} UF`} />
              <SliderInput label="Abogados / due diligence" value={ddClp} min={0} max={5000000} step={200000} onChange={setDdClp}
                display={fmtClp(ddClp)} sublabel={`${model.ddUF.toFixed(1)} UF`} />
              <SliderInput label="Corredor compra (% valor)" value={corPct} min={0} max={4} step={0.5} onChange={setCorPct}
                display={`${corPct.toFixed(1)}%`} sublabel={`${model.corUF.toFixed(1)} UF`} />
              <SliderInput label="CAPEX / reparación inicial" value={repClp} min={0} max={20000000} step={500000} onChange={setRepClp}
                display={fmtClp(repClp)} sublabel={`${model.repUF.toFixed(1)} UF`} />
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e4e0d0" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontFamily: "'DM Mono', monospace", borderBottom: "1px solid #e4e0d0", paddingBottom: 8 }}>Costos de salida</div>
            <SliderInput label="Corredor venta (% valor)" value={cvPct} min={0} max={4} step={0.5} onChange={setCvPct} display={`${cvPct.toFixed(1)}%`} />
          </div>
        </div>

        {/* RIGHT — Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <MetricCard label="Cap rate bruto" value={`${model.capBruto.toFixed(2)}%`} sub="Renta / precio activo" />
            <MetricCard label="Cap rate neto (NOI)" value={`${model.capNeto.toFixed(2)}%`} sub="Después de opex" color={model.capNeto < 2 ? "#b83232" : model.capNeto < 3.5 ? "#b8a96a" : "#2e7d32"} />
            <MetricCard label="Cash-on-cash" value={`${model.coc.toFixed(2)}%`} sub="Flujo anual / equity" color={model.coc < 0 ? "#b83232" : model.coc < 3 ? "#b8a96a" : "#2e7d32"} />
            <MetricCard label={`IRR real (${horiz}a)`} value={`UF + ${model.irrVal.toFixed(1)}%`} sub="Flujo + plusvalía" color={irrColor} />
          </div>

          {/* Tables in 3 columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e4e0d0" }}>
              <TableSection title="P&L operacional anual (UF)" rows={[
                { label: "Renta bruta", v1: fmt(model.rentaUFanual), v2: "100%", bold: false },
                { label: "Vacancia", v1: fmt(-model.vacLoss), v2: `-${vacancia}%`, indent: true, red: true },
                { label: "Renta efectiva", v1: fmt(model.rentaEfec), v2: pct((model.rentaEfec / model.rentaUFanual) * 100, 0), indent: true },
                { label: "Gastos operac.", v1: fmt(-model.totalOpex), v2: `-${((model.totalOpex / model.rentaUFanual) * 100).toFixed(0)}%`, bold: false },
                { label: "Administración", v1: fmt(-model.admUF), v2: "", indent: true, red: true },
                { label: "Contribuciones", v1: fmt(-model.contUF), v2: "", indent: true, red: true },
                { label: "Mantención", v1: fmt(-mantUF), v2: "", indent: true, red: true },
                { label: "Seguros", v1: fmt(-segUF), v2: "", indent: true, red: true },
                { label: "CAPEX reserva", v1: fmt(-model.capexUF), v2: "", indent: true, red: true },
                { label: "NOI", v1: fmt(model.noi), v2: pct((model.noi / model.rentaUFanual) * 100, 0), bold: true },
                { label: "Interés deuda", v1: fmt(-model.intUF), v2: "", indent: true, red: true },
                { label: "Flujo al equity", v1: fmt(model.cashflow), v2: pct((model.cashflow / model.rentaUFanual) * 100, 0), bold: true, highlight: model.cashflow >= 0, red: model.cashflow < 0 },
              ]} />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e4e0d0" }}>
              <TableSection title="Inversión de entrada (UF)" rows={[
                { label: "Equity base (pie)", v1: fmt(model.equity0UF), v2: `${(100 - ltv).toFixed(0)}%`, bold: true },
                { label: "Notaría / escritura", v1: fmt(model.notUF), v2: "", indent: true, red: true },
                { label: "Timbres y estampillas", v1: fmt(model.timUF), v2: "", indent: true, red: true },
                { label: "Tasación + originación", v1: fmt(model.tasUF), v2: "", indent: true, red: true },
                { label: "Abogados / DD", v1: fmt(model.ddUF), v2: "", indent: true, red: true },
                { label: "Corredor compra", v1: fmt(model.corUF), v2: "", indent: true, red: true },
                { label: "CAPEX inicial", v1: fmt(model.repUF), v2: "", indent: true, red: true },
                { label: "Equity total desemb.", v1: fmt(model.equityTotalUF), v2: pct((model.equityTotalUF / valorUF) * 100, 1), bold: true },
              ]} />
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e4e0d0" }}>
              <TableSection title={`Waterfall de salida — año ${horiz}`} rows={[
                { label: "Precio de venta", v1: fmt(model.saleVal), v2: "100%", bold: true },
                { label: "Cancelación deuda", v1: fmt(-model.debtUF), v2: `-${((model.debtUF / model.saleVal) * 100).toFixed(1)}%`, indent: true, red: true },
                { label: "Corredor de venta", v1: fmt(-model.corrVenta), v2: `-${cvPct.toFixed(1)}%`, indent: true, red: true },
                { label: "Neto al equity (venta)", v1: fmt(model.netSale), v2: pct((model.netSale / model.saleVal) * 100, 1), bold: true, highlight: true },
                { label: "Flujos acum. operac.", v1: fmt(model.flujoAcum), v2: `${horiz}a`, bold: false },
                { label: "Total retorno bruto", v1: fmt(model.flujoAcum + model.netSale), v2: "", bold: true },
                { label: "Equity invertido", v1: fmt(-model.equityTotalUF), v2: "", red: true },
                { label: "Ganancia neta (UF)", v1: fmt(model.ganTotal), v2: pct((model.ganTotal / model.equityTotalUF) * 100, 0), bold: true, highlight: model.ganTotal >= 0, red: model.ganTotal < 0 },
                { label: "MOIC", v1: `${model.moic.toFixed(2)}x`, v2: "", bold: true, highlight: model.moic >= 1.5 },
              ]} />
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e4e0d0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>Flujo anual al equity (UF)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} label={{ value: "Año", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#8a8a7a" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#6a6a5a" strokeWidth={1} />
                  <Bar dataKey="cashflow" name="Flujo equity" radius={[3, 3, 0, 0]}>
                    {annual.map((a, i) => (
                      <Cell key={i} fill={a.cashflow >= 0 ? "#b8a96a" : "#b83232"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e4e0d0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>NOI vs interés deuda (UF/año)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#6a6a5a" strokeWidth={1} />
                  <Bar dataKey="noi" name="NOI" fill="#2e7d32" radius={[3, 3, 0, 0]} opacity={0.85} />
                  <Bar dataKey="interes" name="Interés deuda" fill="#b83232" radius={[3, 3, 0, 0]} opacity={0.8} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 10, fontFamily: "DM Mono" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e4e0d0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>Plusvalía acumulada del activo (UF)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annual} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey={d => +(d.saleVal - valorUF).toFixed(2)} name="Plusvalía acum." fill="#4a7fa5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: "1px solid #e4e0d0" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>Retorno total acumulado si se vende en año X (UF)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annual.map(a => ({
                  year: a.year,
                  "Flujos acum.": +(a.cashflow * a.year).toFixed(2),
                  "Neto venta": +a.netSale.toFixed(2),
                }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "DM Mono", fill: "#8a8a7a" }} tickFormatter={v => v.toFixed(0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Flujos acum." fill="#b8a96a" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Neto venta" fill="#4a7fa5" stackId="a" radius={[3, 3, 0, 0]} />
                  <ReferenceLine y={model.equityTotalUF} stroke="#b83232" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "Equity inv.", position: "right", fontSize: 9, fill: "#b83232" }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 10, fontFamily: "DM Mono" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ background: "#1a1a12", borderRadius: 8, padding: "12px 16px", fontSize: 11, color: "#6a6a5a", fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
            <span style={{ color: "#b8a96a" }}>Metodología: </span>
            Cap rate y cash-on-cash: % puro (razón UF/UF = retorno real). IRR expresado como UF + x% (tasa real anualizada sobre flujos en UF).
            Renta mensual ingresada en CLP y convertida a UF al tipo de cambio UF={UF_CLP.toLocaleString("es-CL")} CLP.
            Crédito modelado como interest-only (sin amortización de capital).
            Ejercicio antes de impuestos a la renta y ganancia de capital.
            IRR calculado sobre equity total desembolsado incluyendo costos de entrada.
          </div>
        </div>
      </div>
    </div>
  );
}
