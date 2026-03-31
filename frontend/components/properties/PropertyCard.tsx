"use client";

import React from "react";
import Link from "next/link";
import type { PropertyListItem } from "@/types";
import YieldBadge from "./YieldBadge";
import { formatStandardTitle, formatUF, formatCLP, formatArea } from "@/lib/formatters";

interface Props {
  property: PropertyListItem;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function PropertyCard({ property, isHovered, onMouseEnter, onMouseLeave }: Props) {
  const band = property.btl?.yield_band ?? null;
  const img = property.images?.[0] ?? null;
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
