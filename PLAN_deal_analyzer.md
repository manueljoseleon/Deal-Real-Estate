# Deal Analyzer — Implementation Plan

**Overall Progress:** `100%`

## TLDR
Build a full investment model page at `/properties/[id]/analyze` that pre-populates from existing property data, projects amortizing cash flows for up to 20 years, computes IRR/MOIC/cap rates, renders 4 Recharts charts, and exports to Excel. All financial computation runs on the frontend (no new backend service).

## Critical Decisions

- **Amortizing mortgage**: Standard annuity formula `P * r / (1 - (1+r)^-n)`. Each year tracks: cuota, interest paid, principal paid, outstanding balance. This replaces the interest-only model in the reference file.
- **Frontend-only model**: All computation in a `useMemo` hook (same pattern as `propiq_modelo_uf_1.jsx`). No backend service needed.
- **Dynamic UF**: Add `GET /api/v1/analysis/uf` endpoint → fetches from `mindicador.cl` (same logic as `BaseScraper.get_uf_value`). Frontend calls it once at page load.
- **Pre-population**: `price_uf` → `valorUF`, `btl.estimated_monthly_rent_clp` → `rentaClp`, `contributions_clp_annual / price_uf * 100` → `contribPct` default.
- **New route**: `/properties/[id]/analyze` — server component fetches property + UF value, passes to `DealAnalyzerClient` (client component with all interactivity).
- **Excel export**: `exceljs` in the browser — no backend endpoint needed.
- **Entry point**: Add "Analizar deal" button to `frontend/app/properties/[id]/page.tsx`.

---

## Tasks

- [x] 🟩 **Step 1: Expose UF value from backend**
  - [x] 🟩 Add `GET /api/v1/analysis/uf` to `backend/app/api/analysis.py` — fetch from `mindicador.cl`, same logic as `BaseScraper.get_uf_value`, return `{ uf_clp: float, date: str }`
  - [x] 🟩 Add `api.analysis.ufValue()` to `frontend/lib/api.ts`

- [x] 🟩 **Step 2: Types**
  - [x] 🟩 Add `DealAnalyzerInputs` and `DealAnalyzerResult` interfaces to `frontend/types/index.ts`

- [x] 🟩 **Step 3: Core model logic**
  - [x] 🟩 Create `frontend/lib/dealModel.ts` with:
    - Amortizing mortgage: monthly payment, per-year interest/principal/balance
    - Annual cash flow: renta bruta → vacancia → renta efectiva → opex → NOI → deuda → flujo equity
    - Entry costs waterfall (UF): equity pie + notaría + timbres + tasación + abogados + corredor + CAPEX inicial
    - Exit waterfall per year: valor venta → cancelación deuda residual → corredor venta → neto equity
    - IRR solver (Newton-Raphson, port from reference file)
    - KPIs: cap rate bruto, cap rate neto, cash-on-cash, IRR, MOIC

- [x] 🟩 **Step 4: UI components**
  - [x] 🟩 `frontend/components/analysis/DealAnalyzerInputs.tsx` — 4 slider sections (activo+financiamiento, opex anual, costos entrada, costos salida). Port `SliderInput` from reference.
  - [x] 🟩 `frontend/components/analysis/DealAnalyzerMetrics.tsx` — 4 KPI cards (cap rate bruto, neto, CoC, IRR). Port `MetricCard`.
  - [x] 🟩 `frontend/components/analysis/DealAnalyzerTables.tsx` — 3 tables: P&L operacional, inversión de entrada, waterfall de salida. Port `TableSection`.
  - [x] 🟩 `frontend/components/analysis/DealAnalyzerCharts.tsx` — 4 Recharts bar charts: flujo equity, NOI vs deuda, plusvalía acumulada, retorno total acumulado.
  - [x] 🟩 `frontend/components/analysis/DealAnalyzerAnnualTable.tsx` — year-by-year table: año, renta bruta, opex, NOI, cuota, interés, amort., saldo deuda, flujo equity, valor activo.

- [x] 🟩 **Step 5: Analyzer page + wiring**
  - [x] 🟩 Create `frontend/app/properties/[id]/analyze/page.tsx` — server component: fetch property + UF value in parallel, pass as props to `DealAnalyzerClient`
  - [x] 🟩 Create `frontend/components/analysis/DealAnalyzerClient.tsx` — top-level client component: holds all slider state, runs `dealModel`, renders sub-components
  - [x] 🟩 Add "Analizar deal →" link/button to `frontend/app/properties/[id]/page.tsx` pointing to `/properties/[id]/analyze`

- [x] 🟩 **Step 6: Excel export**
  - [x] 🟩 Install `exceljs` in `frontend/`
  - [x] 🟩 Add `exportDealToExcel(inputs, result)` to `frontend/lib/dealModel.ts` — one sheet with annual table + summary KPIs, triggered by a button in `DealAnalyzerClient`
