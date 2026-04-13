"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
// nuqs imported via useFilters from FilterBar — single source of truth for filter parsers
import Link from "next/link";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useHowItWorks } from "@/contexts/HowItWorksContext";
import { shouldShowTour } from "@/components/HowItWorksModal";
import type { PropertyListResponse, PropertyListItem, MapPinItem } from "@/types";
import FilterBar, { useFilters } from "@/components/properties/FilterBar";
import PropertyCard from "@/components/properties/PropertyCard";

const PropertiesMap = dynamic(() => import("@/components/properties/PropertiesMap"), { ssr: false });

const PAGE_SIZE = 20;


interface Props {
  /** First page of properties pre-fetched on the server — skips the initial client-side fetch. */
  initialData?: PropertyListResponse | null;
}

export default function DashboardClient({ initialData }: Props) {
  const { setOpen } = useHowItWorks();
  const [filters] = useFilters();

  // Infinite scroll state — seeded from server-prefetched data when available
  const [allProperties, setAllProperties] = useState<PropertyListItem[]>(
    initialData?.items ?? []
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(initialData?.total ?? null);
  const [hasMore, setHasMore] = useState(
    initialData ? 1 < initialData.total_pages : true
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Refs used inside observer callback to avoid stale closures
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  // Stable string signature of current filters — detects filter changes vs page increments
  const filterSig = `${filters.commune.join(",")}|${filters.property_type}|${filters.bedrooms}|${filters.min_yield}|${filters.sort_by}`;
  const prevFilterSig = useRef("");

  // Latest fetch ID — discards responses from superseded requests
  const fetchIdRef = useRef(0);

  // When initialData is provided, skip the very first fetch (data already loaded server-side).
  // Set prevFilterSig to match so the effect doesn't treat mount as a "filter change".
  const skipFirstFetch = useRef(!!initialData);

  // Auto-show tour on first visit or after 30-day expiry
  useEffect(() => {
    if (shouldShowTour()) setOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("admin_auth") === "1");
  }, []);

  useEffect(() => {
    api.properties.pendingReview().then((r) => setPendingCount(r.total)).catch(console.error);
  }, []);

  // Combined fetch effect — handles filter resets (replace array) and page increments (append)
  useEffect(() => {
    const isFilterChange = filterSig !== prevFilterSig.current;
    prevFilterSig.current = filterSig;

    // First mount with initialData: sync the filter signature and skip fetching page 1
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }

    // Filter changed but page state hasn't reset yet — reset first, fetch on next run
    if (isFilterChange && page !== 1) {
      setPage(1);
      setAllProperties([]);
      setTotal(null);
      setHasMore(true);
      return;
    }

    if (isFilterChange) {
      setAllProperties([]);
      setTotal(null);
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    api.properties
      .list({
        commune: filters.commune.length ? filters.commune : undefined,
        property_type: filters.property_type || undefined,
        bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
        min_yield: filters.min_yield || undefined,
        sort_by: filters.sort_by,
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        if (fetchId !== fetchIdRef.current) return;
        setAllProperties((prev) => {
          const combined = page === 1 ? res.items : [...prev, ...res.items];
          // Deduplicate by id — backend pagination with yield_desc sort is not stable,
          // so the same item can appear on consecutive pages when yields are tied.
          const seen = new Set<string>();
          return combined.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
        setTotal(res.total);
        setHasMore(page < res.total_pages);
      })
      .catch((e) => {
        if (fetchId !== fetchIdRef.current) return;
        setError(e.message);
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) setLoading(false);
      });
  }, [filterSig, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver as a callback ref so it attaches whenever the sentinel mounts.
  // A plain useRef+useEffect with [] fails because the sentinel only mounts after data loads.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" } // start loading 200px before sentinel reaches viewport
    );
    observerRef.current.observe(node);
  }, []); // stable — relies on refs for loading/hasMore

  // Map pins derived from the accumulated scroll array — max 500, coordinates required.
  // No extra API call; gross_yield_pct and area_m2 come from the list response already.
  const mapPins: MapPinItem[] = useMemo(
    () =>
      allProperties
        .filter((p) => p.lat != null && p.lng != null)
        .slice(0, 500)
        .map((p) => ({
          id: p.id,
          lat: p.lat!,
          lng: p.lng!,
          yield_band: p.btl?.yield_band ?? null,
          price_uf: p.price_uf,
          commune: p.commune,
          bedrooms: p.bedrooms,
          gross_yield_pct: p.btl?.gross_yield_pct ?? null,
          area_m2: p.useful_area_m2 ?? null,
        })),
    [allProperties]
  );

  const isInitialLoad = allProperties.length === 0 && loading;

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <FilterBar />

      {/* Stats bar */}
      {total != null && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-0.5">
          <span>
            <span className="font-medium text-gray-700">{total.toLocaleString("es-CL")}</span> propiedades
            {filters.commune.length > 0 && ` · ${filters.commune.join(", ")}`}
            {allProperties.length > 0 && (
              <span className="ml-1 text-gray-400">· mostrando {allProperties.length}</span>
            )}
          </span>
          {isAdmin && pendingCount != null && pendingCount > 0 && (
            <Link href="/admin/entry" className="text-amber-600 hover:text-amber-800 hover:underline">
              {pendingCount.toLocaleString("es-CL")} sin datos completos →
            </Link>
          )}
        </div>
      )}

      {/* Main content */}
      {isInitialLoad ? (
        <div className="text-center py-20 text-gray-400 text-sm">Cargando…</div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 text-sm">
          Error al cargar propiedades: {error}
          <br />
          <span className="text-gray-400">¿Está corriendo el backend?</span>
        </div>
      ) : (
        <div className="flex gap-4 min-h-0 items-start">
          {/* Card grid — infinite scroll */}
          <div className="flex-1 min-w-0">
            {allProperties.length === 0 && !loading ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                No hay propiedades con esos filtros.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {allProperties.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      isHovered={hoveredId === p.id}
                      onMouseEnter={() => setHoveredId(p.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                  ))}
                </div>

                {/* Sentinel — callback ref attaches the IntersectionObserver when this mounts */}
                <div ref={sentinelRef} className="mt-6 flex justify-center py-4">
                  {loading && page > 1 ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Cargando más propiedades…
                    </div>
                  ) : !hasMore && allProperties.length > 0 ? (
                    <p className="text-xs text-gray-400">Has visto todas las propiedades</p>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* Map — sticky, pins from scroll array (max 500) */}
          <div className="hidden lg:flex lg:flex-col w-[420px] xl:w-[500px] shrink-0 sticky top-0 h-screen">
            <PropertiesMap pins={mapPins} hoveredId={hoveredId} />
          </div>
        </div>
      )}
    </div>
  );
}
