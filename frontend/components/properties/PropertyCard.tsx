"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PropertyListItem } from "@/types";
import YieldBadge from "./YieldBadge";
import { formatStandardTitle, formatUF, formatCLP, formatArea } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface Props {
  property: PropertyListItem;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onAuthRequired?: () => void;
}

// Heart icon — filled or outline
function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#e11d48">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function PropertyCard({ property, isHovered, onMouseEnter, onMouseLeave, onAuthRequired }: Props) {
  const band = property.btl?.yield_band ?? null;
  const img = property.images?.[0] ?? null;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // vs zona: how much cheaper/pricier than zone avg
  let vsZona: { text: string; color: string; arrow: React.ReactNode } | null = null;
  if (property.price_uf_per_m2 != null && property.zone_avg_price_uf_per_m2 != null) {
    const diff = ((property.zone_avg_price_uf_per_m2 - property.price_uf_per_m2) / property.zone_avg_price_uf_per_m2) * 100;
    if (Math.abs(diff) >= 0.5) {
      const below = diff > 0;
      vsZona = {
        text: below
          ? `${diff.toFixed(1)}% más bajo del mercado`
          : `${Math.abs(diff).toFixed(1)}% más arriba del mercado`,
        color: below ? "text-green-700" : "text-red-600",
        arrow: below ? (
          <svg className="w-3 h-3 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        ),
      };
    }
  }

  // Load favorite state for logged-in users
  useEffect(() => {
    if (!user || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("property_id", property.id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, property.id]);

  const toggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        onAuthRequired?.();
        return;
      }

      if (favoriteLoading || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      setFavoriteLoading(true);

      const supabase = createClient();
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", property.id);
        setIsFavorite(false);
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: user.id, property_id: property.id });
        setIsFavorite(true);
      }
      setFavoriteLoading(false);
    },
    [user, isFavorite, favoriteLoading, property.id, onAuthRequired]
  );

  return (
    <Link href={`/properties/${property.id}`}>
      <div
        className={`group bg-white rounded-xl border ${
          isHovered ? "shadow-lg -translate-y-0.5 border-teal-400" : "border-gray-200 shadow-sm"
        } hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Photo — aspect-[4/3] keeps cards shorter so more fit per screen */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
              </svg>
            </div>
          )}

          {/* Favorite button — top-right corner of photo */}
          {process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <button
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isFavorite
                  ? "bg-white text-rose-500 shadow"
                  : "bg-black/30 text-white hover:bg-white hover:text-gray-500"
              } disabled:opacity-50`}
              title={isFavorite ? "Quitar de favoritos" : "Guardar propiedad"}
            >
              <HeartIcon filled={isFavorite} />
            </button>
          )}
        </div>

        {/* Body — compact padding so 2 rows fit without scrolling */}
        <div className="p-2.5 flex flex-col gap-1.5 flex-1">
          {/* Title + yield */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="font-semibold text-xs text-gray-900 leading-tight">
                {formatStandardTitle(property.property_type, property.bedrooms, property.commune)}
              </p>
              {property.neighborhood && (
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{property.neighborhood}</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <YieldBadge yield_pct={property.btl?.gross_yield_pct} band={band} size="sm" />
              <p className="text-[9px] text-gray-400 mt-0.5">Cap Rate</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {property.useful_area_m2 != null && (
              <span>{formatArea(property.useful_area_m2)}</span>
            )}
            {property.bedrooms != null && (
              <span>{property.bedrooms} dorm.</span>
            )}
            {property.bathrooms != null && (
              <span>{property.bathrooms}b</span>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Price + rent */}
          <div className="flex items-end justify-between gap-1">
            <div>
              <p className="text-sm font-bold text-gray-900 tabular-nums leading-tight">
                {formatUF(property.price_uf, 0)}
              </p>
              {property.price_uf_per_m2 != null && (
                <p className="text-[10px] text-gray-400 tabular-nums">
                  UF {property.price_uf_per_m2.toFixed(1)}/m²
                </p>
              )}
            </div>
            {property.btl?.estimated_monthly_rent_clp != null && (
              <p className="text-[10px] text-gray-500 tabular-nums text-right">
                {formatCLP(property.btl.estimated_monthly_rent_clp)}/mes
              </p>
            )}
          </div>

          {/* vs zona */}
          {vsZona && (
            <div className="flex items-center gap-1">
              {vsZona.arrow}
              <span className={`text-[10px] font-medium ${vsZona.color}`}>
                {vsZona.text}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default React.memo(PropertyCard);
