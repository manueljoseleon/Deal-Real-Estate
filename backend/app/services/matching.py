"""
Tiered BTL matching service.

Pairs each sale property with comparable rental listings using a 6-tier
strategy: tight geo → broad geo → commune fallback. Requires PostGIS.
"""
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.property import Property
from backend.app.services.btl_calculator import calculate_btl_summary


# SQL template for PostGIS radius search
_GEO_QUERY = """
    SELECT rent_clp FROM rental_comps
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
    SELECT rent_clp FROM rental_comps
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

# Matching tiers: (radius_m, bedrooms_mode, relax_area, use_commune_fallback)
# bedrooms_mode: "exact" = same bedrooms only | "pm1" = ±1 | "any" = no filter
_TIERS = [
    # (radius_m, bedrooms_mode, relax_area, use_commune_fallback)
    (1500, "exact", False, False),  # Tier 1: 1.5km, exact bedrooms, tight area
    (1500, "exact", True,  False),  # Tier 2: 1.5km, exact bedrooms, relax area
    (3000, "exact", False, False),  # Tier 3: 3km, exact bedrooms, tight area
    (3000, "exact", True,  False),  # Tier 4: 3km, exact bedrooms, relax area
    (None, "exact", False, True),   # Tier 5: commune, exact bedrooms
    (None, "pm1",   True,  True),   # Tier 6: commune, bedrooms ±1
    (None, "any",   True,  True),   # Tier 7: commune, relax all
]


def _build_geo_query(radius_m: float, bedrooms_mode: str, relax_area: bool) -> str:
    if bedrooms_mode == "exact":
        bedrooms_filter = "AND bedrooms = :bedrooms"
    elif bedrooms_mode == "pm1":
        bedrooms_filter = "AND (bedrooms BETWEEN :bedrooms_min AND :bedrooms_max)"
    else:
        bedrooms_filter = ""
    area_filter = "" if relax_area else (
        "AND (useful_area_m2 BETWEEN :area_min AND :area_max)"
    )
    return _GEO_QUERY.format(bedrooms_filter=bedrooms_filter, area_filter=area_filter)


def _build_commune_query(bedrooms_mode: str) -> str:
    if bedrooms_mode == "exact":
        bedrooms_filter = "AND bedrooms = :bedrooms"
    elif bedrooms_mode == "pm1":
        bedrooms_filter = "AND (bedrooms BETWEEN :bedrooms_min AND :bedrooms_max)"
    else:
        bedrooms_filter = ""
    return _COMMUNE_QUERY.format(bedrooms_filter=bedrooms_filter)


def find_rental_comps(db: Session, prop: Property) -> tuple[list[int], int]:
    """
    Find rental comps for a sale property using tiered matching.
    Returns (list_of_rent_values, matching_tier).
    """
    has_location = prop.lat is not None and prop.lng is not None and prop.location is not None
    bedrooms = prop.bedrooms or 0
    area = float(prop.useful_area_m2 or 0)

    params: dict = {
        "property_type": prop.property_type,
        "commune": prop.commune,
        "lat": prop.lat,
        "lng": prop.lng,
        "bedrooms": bedrooms,
        "bedrooms_min": max(0, bedrooms - 1),
        "bedrooms_max": bedrooms + 1,
        "area_min": area * 0.7 if area else 0,
        "area_max": area * 1.3 if area else 9999,
    }

    for tier_idx, (radius_m, bedrooms_mode, relax_area, use_commune) in enumerate(_TIERS, start=1):
        # Skip geo tiers if no coordinates
        if not has_location and not use_commune:
            continue
        # Skip commune tiers if we have coordinates (only use as last resort)
        if has_location and use_commune and tier_idx < 5:
            continue

        if use_commune:
            sql = _build_commune_query(bedrooms_mode)
        else:
            params["radius_m"] = radius_m
            sql = _build_geo_query(radius_m, bedrooms_mode, relax_area)

        rows = db.execute(text(sql), params).fetchall()
        rents = [row[0] for row in rows if row[0] is not None]

        if len(rents) >= settings.matching_min_comps:
            return rents, tier_idx

    return [], 6  # No comps found at all


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

    for prop in properties:
        if not prop.price_clp:
            continue

        rents, tier = find_rental_comps(db, prop)

        summary = calculate_btl_summary(
            price_clp=prop.price_clp,
            price_uf=float(prop.price_uf) if prop.price_uf else None,
            useful_area_m2=float(prop.useful_area_m2) if prop.useful_area_m2 else None,
            rent_values=rents,
        )

        prop.gross_yield_pct = summary["gross_yield_pct"]
        prop.estimated_monthly_rent_clp = summary["estimated_monthly_rent_clp"]
        prop.comparable_rent_count = summary["comparable_rent_count"]
        prop.price_per_m2_clp = summary["price_per_m2_clp"]
        prop.matching_tier = tier

        if rents:
            updated += 1
        else:
            no_comps += 1

    db.commit()

    return {
        "total_processed": len(properties),
        "updated_with_yield": updated,
        "no_comps_found": no_comps,
        "ran_at": datetime.utcnow().isoformat(),
    }
