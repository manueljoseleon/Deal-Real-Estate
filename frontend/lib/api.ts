import type {
  PropertyListResponse,
  PropertyDetail,
  RentalCompItem,
  CommuneSummary,
  ScrapeRun,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function get<T>(path: string, params?: Record<string, string | string[] | number | boolean | undefined>): Promise<T> {
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
  const res = await fetch(url.toString(), { cache: "no-store" });
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

export const api = {
  properties: {
    list: (params: ListPropertiesParams) =>
      get<PropertyListResponse>("/properties", params as Record<string, string | string[] | number | boolean | undefined>),

    get: (id: string) =>
      get<PropertyDetail>(`/properties/${id}`),

    comps: (id: string) =>
      get<RentalCompItem[]>(`/properties/${id}/comps`),
  },

  analysis: {
    summary: () =>
      get<CommuneSummary[]>("/analysis/summary"),

    recalculate: () =>
      post<{ message: string }>("/analysis/recalculate", {}),
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
