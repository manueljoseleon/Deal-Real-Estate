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
  lat: number | null;
  lng: number | null;
  region: string | null;
  contributions_clp_annual: number | null;
  first_seen_at: string;
  created_at: string;
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
