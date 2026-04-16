"""
Tiered BTL matching service.

Pairs each sale property with comparable rental listings using a 6-tier
strategy: tight geo → broad geo → commune fallback. Requires PostGIS.
"""
import logging
import statistics
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import settings

logger = logging.getLogger(__name__)
from backend.app.models.property import Property
from backend.app.services.btl_calculator import calculate_btl_summary


def _iqr_filter(values: list[int]) -> list[int]:
    """
    Iterative IQR outlier removal (up to 3 rounds).
    Guards: needs ≥ 4 values to compute quartiles; never drops below 3.
    Mirrors the frontend filterOutlierComps logic in frontend/lib/btl.ts.
    """
    current = list(values)
    for _ in range(3):
        if len(current) < 4:
            break
        qs = statistics.quantiles(current, n=4)  # [Q1, median, Q3]
        q1, q3 = qs[0], qs[2]
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        filtered = [v for v in current if lo <= v <= hi]
        if len(filtered) == len(current) or len(filtered) < 3:
            break
        current = filtered
    return current


# SQL template for PostGIS radius search
_GEO_QUERY = """
    SELECT rent_clp, useful_area_m2, bedrooms FROM rental_comps
    WHERE is_canonical = TRUE
      AND is_active = TRUE
      AND property_type = :property_type
      AND rent_clp >= 50000
      AND (useful_area_m2 IS NULL OR useful_area_m2 >= 15)
      {bedrooms_filter}
      {area_filter}
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)
    ORDER BY rent_clp
    LIMIT 50
"""

# SQL template for commune fallback (no coordinates)
_COMMUNE_QUERY = """
    SELECT rent_clp, useful_area_m2, bedrooms FROM rental_comps
    WHERE is_canonical = TRUE
      AND is_active = TRUE
      AND property_type = :property_type
      AND commune = :commune
      AND rent_clp >= 50000
      AND (useful_area_m2 IS NULL OR useful_area_m2 >= 15)
      {bedrooms_filter}
    ORDER BY rent_clp
    LIMIT 50
"""

# Matching tiers: (radius_m, bedrooms_mode, area_tol, use_commune_fallback)
# bedrooms_mode: "exact" = same bedrooms only | "pm1" = ±1 | "any" = no filter
# area_tol: fractional tolerance for useful_area_m2 filter (e.g. 0.30 = ±30%).
#           None means no area filter. Tiers 6 and 7 removed — they produced
#           too many inflated cap rates and only covered 2.4% of properties.
_TIERS = [
    # (radius_m, bedrooms_mode, area_tol, use_commune_fallback)
    (1500, "exact", 0.30, False),  # Tier 1: 1.5km, exact bedrooms, ±30% area
    (1500, "exact", 0.60, False),  # Tier 2: 1.5km, exact bedrooms, ±60% area
    (3000, "exact", 0.20, False),  # Tier 3: 3km,   exact bedrooms, ±20% area
    (3000, "exact", 0.60, False),  # Tier 4: 3km,   exact bedrooms, ±60% area
    (None, "exact", 0.20, True),   # Tier 5: commune, exact bedrooms, ±20% area
]


def _build_geo_query(radius_m: float, bedrooms_mode: str, area_tol: float | None) -> str:
    if bedrooms_mode == "exact":
        bedrooms_filter = "AND bedrooms = :bedrooms"
    elif bedrooms_mode == "pm1":
        bedrooms_filter = "AND (bedrooms BETWEEN :bedrooms_min AND :bedrooms_max)"
    else:
        bedrooms_filter = ""
    area_filter = "" if area_tol is None else (
        "AND (useful_area_m2 IS NULL OR useful_area_m2 BETWEEN :area_min AND :area_max)"
    )
    return _GEO_QUERY.format(bedrooms_filter=bedrooms_filter, area_filter=area_filter)


def _build_commune_query(bedrooms_mode: str, area_tol: float | None) -> str:
    if bedrooms_mode == "exact":
        bedrooms_filter = "AND bedrooms = :bedrooms"
    elif bedrooms_mode == "pm1":
        bedrooms_filter = "AND (bedrooms BETWEEN :bedrooms_min AND :bedrooms_max)"
    else:
        bedrooms_filter = ""
    area_filter = "" if area_tol is None else (
        "AND (useful_area_m2 IS NULL OR useful_area_m2 BETWEEN :area_min AND :area_max)"
    )
    return _COMMUNE_QUERY.format(bedrooms_filter=bedrooms_filter, area_filter=area_filter)


def find_rental_comps(db: Session, prop: Property) -> tuple[list[int], list[int], int]:
    """
    Find rental comps for a sale property using tiered matching.
    Returns (normalized_rents, raw_rents, matching_tier).

    normalized_rents: rent values scaled to the sale property's area ($/m² × area).
    raw_rents: the actual rent_clp values from the comp listings (unscaled).
    Both lists are parallel — same comps, same order.
    raw_rents is used for the btl_anomalous check: if the area-normalized estimate
    exceeds the highest raw comp rent the estimate is likely inflated.
    """
    has_location = prop.lat is not None and prop.lng is not None and prop.location is not None
    bedrooms = prop.bedrooms or 0
    area = float(prop.useful_area_m2 or 0)

    # Properties with >5 bedrooms are large/atypical — bedroom count is no longer a
    # useful discriminator. Match by size (m2) and distance only.
    force_any_bedrooms = bedrooms > 5

    params: dict = {
        "property_type": prop.property_type,
        "commune": prop.commune,
        "lat": prop.lat,
        "lng": prop.lng,
        "bedrooms": bedrooms,
        "bedrooms_min": max(0, bedrooms - 1),
        "bedrooms_max": bedrooms + 1,
        # area_min/area_max are overridden per-tier based on area_tol
        "area_min": 0,
        "area_max": 9999,
    }

    for tier_idx, (radius_m, bedrooms_mode, area_tol, use_commune) in enumerate(_TIERS, start=1):
        if force_any_bedrooms:
            bedrooms_mode = "any"
        # Skip geo tiers if no coordinates
        if not has_location and not use_commune:
            continue

        # Update area bounds for this tier's tolerance
        if area_tol is not None and area:
            params["area_min"] = area * (1 - area_tol)
            params["area_max"] = area * (1 + area_tol)

        if use_commune:
            sql = _build_commune_query(bedrooms_mode, area_tol)
        else:
            params["radius_m"] = radius_m
            sql = _build_geo_query(radius_m, bedrooms_mode, area_tol)

        rows = db.execute(text(sql), params).fetchall()

        # Dedup cross-portal duplicates: same bedrooms + same area (1m2 bucket).
        # Keep the lowest-rent comp per (bedrooms, area) group.
        # Distance is not available here; the display endpoint re-deduplicates
        # using the full (bedrooms + area ±2m2 + distance ±20m) criteria.
        deduped: dict[tuple, tuple[int, float | None]] = {}  # (beds, area_bucket) → (min_rent, area)
        null_area_rows: list[tuple] = []
        for row in rows:
            rent, comp_area, comp_beds = row[0], row[1], row[2]
            if rent is None:
                continue
            if comp_area is not None:
                bucket = (comp_beds, round(float(comp_area)))
                existing = deduped.get(bucket)
                if existing is None or rent < existing[0]:
                    deduped[bucket] = (rent, float(comp_area))
            else:
                null_area_rows.append(row)

        # Reconstruct deduplicated row list
        deduped_rows = [(r, a) for r, a in deduped.values()] + [(row[0], None) for row in null_area_rows]

        # Normalize rents by $/m2 when both property and comp have area.
        # This ensures a 50m2 comp is not directly compared to a 150m2 property.
        # If either side is missing area, fall back to raw rent.
        rents: list[int] = []
        raw_rents: list[int] = []
        for rent, comp_area in deduped_rows:
            if area and comp_area:
                # Both property and comp have area: normalize to property size
                rents.append(int((rent / float(comp_area)) * area))
                raw_rents.append(rent)
            elif not area:
                # Property has no area: can't normalize, use raw rent
                rents.append(rent)
                raw_rents.append(rent)
            # else: property has area but comp doesn't → skip
            # (can't normalize meaningfully; NULL-area comps are likely different sizes)

        if len(rents) >= settings.matching_min_comps:
            return rents, raw_rents, tier_idx

    return [], [], len(_TIERS)  # No comps found at all tiers


def compute_zone_avg(db: Session, prop: "Property") -> bool:
    """
    Compute and persist zone_avg_price_uf_per_m2 for a single property.
    Returns True if a value was computed and saved, False if skipped (missing data).

    Call this whenever a property's lat/lng or useful_area_m2 changes, or lazily
    when serving the property detail page and the field is null.
    """
    if prop.lat is None or prop.lng is None or not prop.price_uf or not prop.useful_area_m2:
        return False

    area = float(prop.useful_area_m2)
    zone_rows = db.execute(text("""
        SELECT AVG(price_uf / useful_area_m2) AS avg_all,
               AVG(CASE WHEN bedrooms = :bedrooms
                         AND useful_area_m2 BETWEEN :area_min AND :area_max
                        THEN price_uf / useful_area_m2 END) AS avg_same,
               COUNT(*) AS sample_count
        FROM properties
        WHERE is_canonical = TRUE AND is_active = TRUE
          AND price_uf IS NOT NULL AND useful_area_m2 IS NOT NULL AND useful_area_m2 > 0
          AND location IS NOT NULL
          AND ST_DWithin(
              location,
              ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
              1500
          )
    """), {
        "lat": prop.lat, "lng": prop.lng,
        "bedrooms": prop.bedrooms or 0,
        "area_min": area * 0.7,
        "area_max": area * 1.3,
    }).fetchone()

    if not zone_rows:
        return False

    prop.zone_avg_price_uf_per_m2 = round(float(zone_rows[0]), 2) if zone_rows[0] else None
    prop.zone_avg_price_uf_per_m2_same_type = round(float(zone_rows[1]), 2) if zone_rows[1] else None
    prop.zone_avg_sample_count = int(zone_rows[2]) if zone_rows[2] else None
    return prop.zone_avg_price_uf_per_m2 is not None


def run_btl_matching(db: Session, property_ids: list | None = None) -> dict:
    """
    Run BTL matching for all active canonical sale properties (or a subset).
    Updates gross_yield_pct, estimated_monthly_rent_clp, matching_tier, etc.
    Returns a summary dict with counts.
    """
    query = db.query(Property).filter(
        Property.is_canonical == True,
        Property.is_active == True,
    )
    if property_ids:
        query = query.filter(Property.id.in_(property_ids))

    properties = query.all()
    updated = 0
    no_comps = 0
    BATCH_SIZE = 200

    for i, prop in enumerate(properties):
        if not prop.price_clp:
            continue

        rents, raw_rents, tier = find_rental_comps(db, prop)

        # Apply IQR outlier removal before computing the summary — mirrors the
        # frontend filterOutlierComps logic so dashboard and detail page yield match.
        filtered_rents = _iqr_filter(rents)

        summary = calculate_btl_summary(
            price_clp=prop.price_clp,
            price_uf=float(prop.price_uf) if prop.price_uf else None,
            useful_area_m2=float(prop.useful_area_m2) if prop.useful_area_m2 else None,
            rent_values=filtered_rents,
        )

        prop.gross_yield_pct = summary["gross_yield_pct"]
        prop.estimated_monthly_rent_clp = summary["estimated_monthly_rent_clp"]
        prop.comparable_rent_count = summary["comparable_rent_count"]
        prop.price_per_m2_clp = summary["price_per_m2_clp"]
        prop.matching_tier = tier

        # btl_anomalous: estimated rent (area-normalised) exceeds the highest
        # raw comp rent → the normalisation is inflating an unrealistic estimate.
        estimated = summary["estimated_monthly_rent_clp"]
        prop.btl_anomalous = bool(
            estimated and raw_rents and estimated > max(raw_rents)
        )

        # Zone avg UF/m2: avg price per m2 of nearby sale properties (1.5km radius)
        compute_zone_avg(db, prop)

        if filtered_rents:
            updated += 1
        else:
            no_comps += 1

        if (i + 1) % BATCH_SIZE == 0:
            db.commit()
            logger.info("[%d/%d] committed batch", i + 1, len(properties))

    db.commit()

    return {
        "total_processed": len(properties),
        "updated_with_yield": updated,
        "no_comps_found": no_comps,
        "ran_at": datetime.utcnow().isoformat(),
    }
