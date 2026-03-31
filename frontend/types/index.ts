export type YieldBand = "excellent" | "good" | "moderate" | "weak" | null;

export interface BTLAnalysis {
  gross_yield_pct: number | null;
  estimated_monthly_rent_clp: number | null;
  comparable_rent_count: number | null;
  matching_tier: number | null;
  yield_band: YieldBand;
  rent_min_clp?: number | null;
  rent_max_clp?: number | null;
}

export interface PropertyListItem {
  id: string;
  external_id: string;
  portal: string;
  url: string;
  title: string | null;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  useful_area_m2: number | null;
  price_clp: number | null;
  price_uf: number | null;
  price_per_m2_clp: number | null;
  price_uf_per_m2: number | null;
  zone_avg_price_uf_per_m2: number | null;
  zone_avg_price_uf_per_m2_same_type: number | null;
  zone_avg_sample_count: number | null;
  lat: number | null;
  lng: number | null;
  commune: string;
  neighborhood: string | null;
  hoa_fee_clp: number | null;
  images: string[];
  btl: BTLAnalysis | null;
  is_active: boolean;
  last_seen_at: string;
}

export interface PropertyDetail extends PropertyListItem {
  description: string | null;
  total_area_m2: number | null;
  floor: number | null;
  parking: boolean | null;
  storage: boolean | null;
  region: string | null;
  contributions_clp_annual: number | null;
  first_seen_at: string;
  created_at: string;
}

export interface MapPinItem {
  id: string;
  lat: number;
  lng: number;
  yield_band: YieldBand;
  price_uf: number | null;
  commune: string | null;
  bedrooms: number | null;
  gross_yield_pct: number | null;
  area_m2: number | null;
}

export interface PropertyListResponse {
  items: PropertyListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RentalCompItem {
  id: string;
  portal: string;
  url: string;
  commune: string;
  neighborhood: string | null;
  property_type: string;
  bedrooms: number | null;
  useful_area_m2: number | null;
  rent_clp: number | null;
  rent_uf: number | null;
  price_per_m2_clp: number | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  normalized_rent_clp: number | null;  // rent scaled to sale property size via $/m2
  rent_per_m2_clp: number | null;      // raw rent / m2 in CLP
  rent_per_m2_uf: number | null;       // raw rent / m2 in UF
}

export interface CommuneSummary {
  commune: string;
  avg_yield_pct: number | null;
  median_price_uf: number | null;
  listing_count: number;
}

export interface ScrapeRun {
  id: string;
  portal: string;
  listing_type: string;
  communes: string[];
  status: string;
  started_at: string;
  finished_at: string | null;
  listings_found: number | null;
  listings_new: number | null;
  listings_updated: number | null;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Deal Analyzer
// ---------------------------------------------------------------------------

export interface DealAnalyzerInputs {
  // Asset & financing
  valorUF: number;        // purchase price in UF
  rentaClp: number;       // monthly rent in CLP
  ltv: number;            // loan-to-value %
  tasaDeuda: number;      // mortgage rate (UF + %) per year
  plazoAnios: number;     // mortgage term in years
  apreciacion: number;    // annual real appreciation % (in UF)
  horiz: number;          // investment horizon in years
  // Annual opex
  vacancia: number;       // vacancy %
  admPct: number;         // property management fee % of effective rent
  contribPct: number;     // contributions (contribuciones) % of asset value
  mantUF: number;         // maintenance UF/year
  segUF: number;          // insurance UF/year
  capexPct: number;       // capex reserve % of asset value
  // Entry costs (CLP)
  notClp: number;         // notary/escritura
  timPct: number;         // timbres y estampillas % of loan
  tasClp: number;         // tasación + bank origination
  ddClp: number;          // legal / due diligence
  corPct: number;         // buyer broker % of asset value
  repClp: number;         // initial capex / renovation
  // Exit costs
  cvPct: number;          // seller broker % of sale value
}

export interface DealAnnualRow {
  year: number;
  rentaBruta: number;
  vacanciaLoss: number;
  rentaEfec: number;
  totalOpex: number;
  noi: number;
  cuota: number;          // total annual mortgage payment
  interes: number;        // interest portion
  amort: number;          // principal repaid
  saldoDeuda: number;     // outstanding balance at year-end
  cashflow: number;       // net equity cash flow (NOI - cuota)
  saleVal: number;        // property value if sold this year
  corrVenta: number;      // sale broker cost
  netSale: number;        // net proceeds to equity after debt + broker
}

export interface DealAnalyzerResult {
  // Opex breakdown (annual, UF)
  rentaUFmes: number;
  rentaUFanual: number;
  debtUF: number;
  equity0UF: number;
  vacLoss: number;
  rentaEfec: number;
  admUF: number;
  contUF: number;
  capexUF: number;
  totalOpex: number;
  noi: number;
  // Mortgage (year 1 values for display)
  cuotaAnual: number;
  interesY1: number;
  amortY1: number;
  // Entry costs (UF)
  notUF: number;
  timUF: number;
  tasUF: number;
  ddUF: number;
  corUF: number;
  repUF: number;
  totalEntradaUF: number;
  equityTotalUF: number;
  // Exit (at horizon)
  saleVal: number;
  corrVenta: number;
  netSale: number;
  flujoAcum: number;
  ganTotal: number;
  moic: number;
  irrVal: number;         // IRR as annual % (real, in UF terms)
  // KPIs
  capBruto: number;
  capNeto: number;
  coc: number;            // cash-on-cash (year 1)
  // Projection
  annual: DealAnnualRow[];
}

// ---------------------------------------------------------------------------
// Mercado — Análisis de Mercado charts
// ---------------------------------------------------------------------------

export interface CapRateBucket {
  bucket: string;
  count: number;
}

export interface ScatterPoint {
  id: string;
  title: string | null;
  commune: string;
  gross_yield_pct: number;
  price_per_m2_uf: number;
  zone_avg_price_uf_per_m2: number;
  price_uf: number | null;
}

export interface MarketStatsResponse {
  histogram: CapRateBucket[];
  scatter: ScatterPoint[];
  total_properties: number;
}

// Sprint 1: Time on Market
export interface TOMBucket {
  bucket: string;
  count: number;
  pct: number;
}

export interface TOMByCommune {
  commune: string;
  median_days: number;
  count: number;
}

export interface TimeOnMarketResponse {
  total: number;
  median_days: number | null;
  histogram: TOMBucket[];
  by_commune: TOMByCommune[];
}

// Sprint 1: Yield Matrix
export interface YieldMatrixRow {
  property_type: string;
  bedrooms: number;
  avg_yield: number;
  median_yield: number;
  count: number;
}

export interface YieldMatrixResponse {
  matrix: YieldMatrixRow[];
}

// Sprint 1: Stock Concentration
export interface StockConcentrationCommune {
  commune: string;
  total_count: number;
  high_yield_count: number;
  opportunity_pct: number;
  median_price_uf: number | null;
}

export interface StockConcentrationResponse {
  communes: StockConcentrationCommune[];
}

export interface PropertyFilters {
  commune: string[];
  property_type: string;
  bedrooms: string;
  min_yield: string;
  max_yield: string;
  min_price: string;
  max_price: string;
  sort_by: string;
  page: string;
}
