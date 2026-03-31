/**
 * Deal Analyzer — financial model.
 *
 * All monetary values in UF unless noted. CLP inputs are converted at runtime
 * using the live UF rate passed in.
 *
 * Key difference from propiq_modelo_uf_1.jsx: uses a real amortizing mortgage
 * (standard annuity formula) instead of interest-only.
 */

import type { DealAnalyzerInputs, DealAnalyzerResult, DealAnnualRow } from "@/types";

// ---------------------------------------------------------------------------
// IRR solver — Newton-Raphson (ported from reference model)
// ---------------------------------------------------------------------------
function irr(flows: number[], guess = 0.08): number {
  let r = guess;
  for (let i = 0; i < 300; i++) {
    let npv = 0;
    let d = 0;
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

// ---------------------------------------------------------------------------
// Amortizing mortgage helpers
// ---------------------------------------------------------------------------

/** Monthly payment for a standard annuity (principal P, monthly rate rm, n months). */
function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const rm = annualRatePct / 100 / 12;
  if (rm === 0) return principal / (termYears * 12);
  const n = termYears * 12;
  return principal * rm / (1 - Math.pow(1 + rm, -n));
}

interface YearDebtRow {
  cuota: number;     // total annual payment
  interes: number;   // interest paid in the year
  amort: number;     // principal repaid
  saldo: number;     // outstanding balance at year-end
}

/**
 * Build full amortization schedule.
 * Returns one row per year of the investment horizon.
 */
function buildAmortizationSchedule(
  principal: number,
  annualRatePct: number,
  termYears: number,
  horizYears: number,
): YearDebtRow[] {
  const rm = annualRatePct / 100 / 12;
  const cuotaMes = monthlyPayment(principal, annualRatePct, termYears);
  const rows: YearDebtRow[] = [];
  let balance = principal;

  for (let y = 1; y <= horizYears; y++) {
    // If the loan has been fully paid, no more debt service
    if (balance <= 0) {
      rows.push({ cuota: 0, interes: 0, amort: 0, saldo: 0 });
      continue;
    }
    let yearInterest = 0;
    let yearAmort = 0;
    for (let m = 0; m < 12; m++) {
      const interestM = balance * rm;
      const amortM = Math.min(cuotaMes - interestM, balance);
      yearInterest += interestM;
      yearAmort += amortM;
      balance = Math.max(balance - amortM, 0);
    }
    rows.push({
      cuota: yearInterest + yearAmort,
      interes: yearInterest,
      amort: yearAmort,
      saldo: balance,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Main model
// ---------------------------------------------------------------------------
export function computeDealModel(
  inputs: DealAnalyzerInputs,
  ufClp: number,
): DealAnalyzerResult {
  const {
    valorUF, rentaClp, ltv, tasaDeuda, plazoAnios, apreciacion, horiz,
    vacancia, admPct, contribPct, mantUF, segUF, capexPct,
    notClp, timPct, tasClp, ddClp, corPct, repClp,
    cvPct,
  } = inputs;

  // --- Rent ---
  const rentaUFmes = rentaClp / ufClp;
  const rentaUFanual = rentaUFmes * 12;

  // --- Debt & equity ---
  const debtUF = valorUF * (ltv / 100);
  const equity0UF = valorUF * (1 - ltv / 100);

  // --- Annual opex (UF) ---
  const vacLoss = rentaUFanual * (vacancia / 100);
  const rentaEfec = rentaUFanual - vacLoss;
  const admUF = rentaEfec * (admPct / 100);
  const contUF = valorUF * (contribPct / 100);
  const capexUF = valorUF * (capexPct / 100);
  const totalOpex = admUF + contUF + mantUF + segUF + capexUF;
  const noi = rentaEfec - totalOpex;

  // --- Entry costs (UF) ---
  const notUF = notClp / ufClp;
  const timUF = (debtUF * ufClp * (timPct / 100)) / ufClp; // timbres on loan amount
  const tasUF = tasClp / ufClp;
  const ddUF = ddClp / ufClp;
  const corUF = valorUF * (corPct / 100);
  const repUF = repClp / ufClp;
  const totalEntradaUF = notUF + timUF + tasUF + ddUF + corUF + repUF;
  const equityTotalUF = equity0UF + totalEntradaUF;

  // --- Amortization schedule ---
  const amortSchedule = buildAmortizationSchedule(debtUF, tasaDeuda, plazoAnios, horiz);

  // --- Annual projection ---
  const annual: DealAnnualRow[] = [];
  for (let t = 1; t <= horiz; t++) {
    const debt = amortSchedule[t - 1];
    const cashflow = noi - debt.cuota;
    const saleValT = valorUF * Math.pow(1 + apreciacion / 100, t);
    const corrVentaT = saleValT * (cvPct / 100);
    // Remaining debt at end of year t
    const netSaleT = saleValT - debt.saldo - corrVentaT;
    annual.push({
      year: t,
      rentaBruta: rentaUFanual,
      vacanciaLoss: -vacLoss,
      rentaEfec,
      totalOpex,
      noi,
      cuota: debt.cuota,
      interes: debt.interes,
      amort: debt.amort,
      saldoDeuda: debt.saldo,
      cashflow,
      saleVal: saleValT,
      corrVenta: corrVentaT,
      netSale: netSaleT,
    });
  }

  // --- Summary at horizon ---
  const lastYear = annual[horiz - 1];
  const saleVal = lastYear.saleVal;
  const corrVenta = lastYear.corrVenta;
  const netSale = lastYear.netSale;
  const flujoAcum = annual.reduce((s, a) => s + a.cashflow, 0);
  const ganTotal = flujoAcum + netSale - equityTotalUF;
  const moic = equityTotalUF > 0 ? (flujoAcum + netSale) / equityTotalUF : 0;

  // IRR: initial outflow then annual cash flows, final year adds net sale proceeds
  const flows = [-equityTotalUF, ...annual.map((a, i) =>
    i === horiz - 1 ? a.cashflow + netSale : a.cashflow
  )];
  const irrVal = equityTotalUF > 0 ? irr(flows) * 100 : 0;

  // KPIs
  const capBruto = (rentaUFanual / valorUF) * 100;
  const capNeto = (noi / valorUF) * 100;
  const coc = equity0UF > 0 ? (annual[0].cashflow / equity0UF) * 100 : 0;

  // Year-1 debt figures for display
  const cuotaAnual = amortSchedule[0].cuota;
  const interesY1 = amortSchedule[0].interes;
  const amortY1 = amortSchedule[0].amort;

  return {
    rentaUFmes, rentaUFanual, debtUF, equity0UF,
    vacLoss, rentaEfec, admUF, contUF, capexUF, totalOpex, noi,
    cuotaAnual, interesY1, amortY1,
    notUF, timUF, tasUF, ddUF, corUF, repUF, totalEntradaUF, equityTotalUF,
    saleVal, corrVenta, netSale, flujoAcum, ganTotal, moic, irrVal,
    capBruto, capNeto, coc,
    annual,
  };
}

// ---------------------------------------------------------------------------
// DSCR helper — find the max LTV that yields DSCR ≥ targetDscr
// Returns the LTV (0–85) as an integer, or null if even LTV=0 fails.
// ---------------------------------------------------------------------------
export function findLtvForDscr(
  noi: number,
  valorUF: number,
  tasaDeuda: number,
  plazoAnios: number,
  targetDscr = 1.2,
): number | null {
  // Binary search on LTV in [0, 85]
  let lo = 0;
  let hi = 85;
  let best: number | null = null;
  for (let iter = 0; iter < 50; iter++) {
    const mid = Math.round((lo + hi) / 2);
    const debt = valorUF * (mid / 100);
    const cuota = monthlyPayment(debt, tasaDeuda, plazoAnios) * 12;
    const dscr = cuota > 0 ? noi / cuota : Infinity;
    if (dscr >= targetDscr) {
      best = mid;
      lo = mid + 1; // can we do more?
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Default inputs factory — pre-populated from property data
// ---------------------------------------------------------------------------
export function defaultInputs(opts: {
  priceUF: number;
  rentClp: number;
  contribClpAnnual: number | null;
  ufClp: number;
}): DealAnalyzerInputs {
  const { priceUF, rentClp, contribClpAnnual, ufClp } = opts;
  // contributions as % of UF value, default 1% if unknown
  const contribPct = contribClpAnnual && priceUF > 0
    ? parseFloat(((contribClpAnnual / ufClp / priceUF) * 100).toFixed(2))
    : 1.0;

  return {
    valorUF: Math.round(priceUF),
    rentaClp: rentClp,
    ltv: 70,
    tasaDeuda: 4.5,
    plazoAnios: 20,
    apreciacion: 2,
    horiz: 10,
    vacancia: 7,
    admPct: 8,
    contribPct,
    mantUF: 5,
    segUF: 3,
    capexPct: 0.5,
    notClp: 300_000,
    timPct: 0.8,
    tasClp: 500_000,
    ddClp: 800_000,
    corPct: 2.0,
    repClp: 2_000_000,
    cvPct: 2.0,
  };
}

// ---------------------------------------------------------------------------
// Excel export
// ---------------------------------------------------------------------------
export async function exportDealToExcel(
  inputs: DealAnalyzerInputs,
  result: DealAnalyzerResult,
  ufClp: number,
  propertyTitle: string,
): Promise<void> {
  // Dynamic import — keeps exceljs out of the initial bundle
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Deal Real Estate";

  // --- Sheet 1: Annual projection ---
  const ws = wb.addWorksheet("Proyección anual");

  ws.columns = [
    { header: "Año", key: "year", width: 6 },
    { header: "Renta bruta (UF)", key: "rentaBruta", width: 18 },
    { header: "Vacancia (UF)", key: "vacanciaLoss", width: 15 },
    { header: "Renta efectiva (UF)", key: "rentaEfec", width: 20 },
    { header: "Opex total (UF)", key: "totalOpex", width: 16 },
    { header: "NOI (UF)", key: "noi", width: 12 },
    { header: "Dividendo del crédito (UF)", key: "cuota", width: 24 },
    { header: "Interés (UF)", key: "interes", width: 13 },
    { header: "Amortización (UF)", key: "amort", width: 18 },
    { header: "Saldo deuda (UF)", key: "saldoDeuda", width: 18 },
    { header: "Flujo equity (UF)", key: "cashflow", width: 18 },
    { header: "Valor activo (UF)", key: "saleVal", width: 18 },
    { header: "Neto venta (UF)", key: "netSale", width: 16 },
  ];

  // Style header row
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8A96A" } };

  result.annual.forEach((row) => {
    ws.addRow({
      year: row.year,
      rentaBruta: +row.rentaBruta.toFixed(2),
      vacanciaLoss: +row.vacanciaLoss.toFixed(2),
      rentaEfec: +row.rentaEfec.toFixed(2),
      totalOpex: +(-row.totalOpex).toFixed(2),
      noi: +row.noi.toFixed(2),
      cuota: +(-row.cuota).toFixed(2),
      interes: +(-row.interes).toFixed(2),
      amort: +(-row.amort).toFixed(2),
      saldoDeuda: +row.saldoDeuda.toFixed(2),
      cashflow: +row.cashflow.toFixed(2),
      saleVal: +row.saleVal.toFixed(2),
      netSale: +row.netSale.toFixed(2),
    });
  });

  // --- Sheet 2: Summary ---
  const ws2 = wb.addWorksheet("Resumen");
  const addKv = (label: string, value: string | number) => {
    const r = ws2.addRow([label, value]);
    r.getCell(1).font = { bold: false, color: { argb: "FF6A6A5A" } };
    r.getCell(2).font = { bold: true };
  };

  ws2.getColumn(1).width = 32;
  ws2.getColumn(2).width = 20;
  ws2.addRow([propertyTitle]).font = { bold: true, size: 13 };
  ws2.addRow([]);
  ws2.addRow(["INPUTS"]).font = { bold: true };
  addKv("Valor activo", `${inputs.valorUF} UF`);
  addKv("UF/CLP utilizado", ufClp);
  addKv("Renta mensual", `$${inputs.rentaClp.toLocaleString("es-CL")} CLP`);
  addKv("LTV", `${inputs.ltv}%`);
  addKv("Tasa crédito", `UF + ${inputs.tasaDeuda}%`);
  addKv("Plazo crédito", `${inputs.plazoAnios} años`);
  addKv("Horizonte inversión", `${inputs.horiz} años`);
  addKv("Apreciación real anual", `${inputs.apreciacion}%`);
  ws2.addRow([]);
  ws2.addRow(["KPIs"]).font = { bold: true };
  addKv("Cap rate bruto", `${result.capBruto.toFixed(2)}%`);
  addKv("Cap rate neto (NOI)", `${result.capNeto.toFixed(2)}%`);
  addKv("Cash-on-cash (año 1)", `${result.coc.toFixed(2)}%`);
  addKv(`IRR real (${inputs.horiz}a)`, `UF + ${result.irrVal.toFixed(1)}%`);
  addKv("MOIC", `${result.moic.toFixed(2)}x`);
  addKv("Ganancia neta (UF)", result.ganTotal.toFixed(1));
  addKv("Equity total desembolsado (UF)", result.equityTotalUF.toFixed(1));

  // Trigger download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deal-analyzer-${propertyTitle.replace(/\s+/g, "-").toLowerCase()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
