import type {
  PropertyListResponse,
  PropertyDetail,
  MapPinItem,
  RentalCompItem,
  CommuneSummary,
  ScrapeRun,
  MarketStatsResponse,
  TimeOnMarketResponse,
  YieldMatrixResponse,
  StockConcentrationResponse,
  CommunesResponse,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function buildUrl(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): string {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function get<T>(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params), { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function getCached<T>(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, params), { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export interface ListPropertiesParams {
  commune?: string[];
  property_type?: string;
  min_yield?: number;
  max_yield?: number;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  portal?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}

// Subset of filters relevant to the map (no sort/page)
export interface MapPinsParams {
  commune?: string[];
  property_type?: string;
  min_yield?: number;
  max_yield?: number;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  portal?: string;
}

export const api = {
  properties: {
    list: (params: ListPropertiesParams) =>
      get<PropertyListResponse>("/properties", params as Record<string, string | string[] | number | boolean | undefined>),

    get: (id: string) =>
      get<PropertyDetail>(`/properties/${id}`),

    comps: (id: string) =>
      get<RentalCompItem[]>(`/properties/${id}/comps`),

    mapPins: (params: MapPinsParams) =>
      get<MapPinItem[]>("/properties/map-pins", params as Record<string, string | string[] | number | boolean | undefined>),

    pendingReview: (page = 1, page_size = 50) =>
      get<PropertyListResponse>("/properties/pending-review", { page, page_size }),

    patch: (id: string, body: { useful_area_m2?: number | null; total_area_m2?: number | null; lat?: number | null; lng?: number | null }) =>
      fetch(`${BASE}/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }).then(async (r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json() as Promise<import("@/types").PropertyDetail>;
      }),
  },

  analysis: {
    summary: () =>
      get<CommuneSummary[]>("/analysis/summary"),

    ufValue: () =>
      get<{ uf_clp: number; date: string }>("/analysis/uf"),

    recalculate: () =>
      post<{ message: string }>("/analysis/recalculate", {}),
  },

  mercado: {
    stats: (params?: {
      commune?: string[];
      property_type?: string;
      bedrooms?: string | number;
      min_price?: number;
      max_price?: number;
    }) =>
      getCached<MarketStatsResponse>("/mercado/stats", params as Record<string, string | string[] | number | boolean | undefined>),

    timeOnMarket: (params?: {
      commune?: string[];
      property_type?: string;
      bedrooms?: string | number;
    }) =>
      getCached<TimeOnMarketResponse>("/mercado/time-on-market", params as Record<string, string | string[] | number | boolean | undefined>),

    yieldMatrix: (params?: {
      commune?: string[];
      property_type?: string;
    }) =>
      getCached<YieldMatrixResponse>("/mercado/yield-matrix", params as Record<string, string | string[] | number | boolean | undefined>),

    stockConcentration: (params?: {
      commune?: string[];
      property_type?: string;
    }) =>
      getCached<StockConcentrationResponse>("/mercado/stock-concentration", params as Record<string, string | string[] | number | boolean | undefined>),

    communes: () =>
      getCached<CommunesResponse>("/mercado/communes"),
  },

  scraper: {
    trigger: (portals: string[], communes: string[], listing_types: string[]) =>
      post<{ run_ids: string[] }>("/scraper/trigger", { portals, communes, listing_types }),

    runs: (limit = 20) =>
      get<ScrapeRun[]>("/scraper/runs", { limit }),

    run: (id: string) =>
      get<ScrapeRun>(`/scraper/runs/${id}`),
  },
};
