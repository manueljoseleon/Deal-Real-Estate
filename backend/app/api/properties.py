"""
GET   /api/v1/properties                — filterable, paginated sale listings with BTL analysis
GET   /api/v1/properties/map-pins       — all filtered properties with coords (up to 1000), for map
GET   /api/v1/properties/pending-review — properties missing area or coords, for manual review
GET   /api/v1/properties/{id}           — single property detail
PATCH /api/v1/properties/{id}           — manual data correction (area, coords, etc.)
GET   /api/v1/properties/{id}/comps     — rental comps used for this property's yield
"""
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.property import Property
from backend.app.models.rental_comp import RentalComp
from backend.app.schemas.property import (
    PropertyDetail,
    PropertyListItem,
    PropertyListResponse,
    MapPinItem,
    BTLAnalysis,
    RentalCompItem,
)
from backend.app.services.btl_calculator import _classify_yield
from backend.app.services.matching import compute_zone_avg

router = APIRouter(tags=["properties"])


def _to_btl(prop: Property) -> Optional[BTLAnalysis]:
    if prop.gross_yield_pct is None and prop.estimated_monthly_rent_clp is None:
        return None
    return BTLAnalysis(
        gross_yield_pct=float(prop.gross_yield_pct) if prop.gross_yield_pct else None,
        estimated_monthly_rent_clp=prop.estimated_monthly_rent_clp,
        comparable_rent_count=prop.comparable_rent_count,
        matching_tier=prop.matching_tier,
        yield_band=_classify_yield(float(prop.gross_yield_pct) if prop.gross_yield_pct else None),
    )


def _to_list_item(prop: Property) -> PropertyListItem:
    return PropertyListItem(
        id=prop.id,
        external_id=prop.external_id,
        portal=prop.portal,
        url=prop.url,
        title=prop.title,
        property_type=prop.property_type,
        bedrooms=prop.bedrooms,
        bathrooms=prop.bathrooms,
        useful_area_m2=float(prop.useful_area_m2) if prop.useful_area_m2 else None,
        price_clp=prop.price_clp,
        price_uf=float(prop.price_uf) if prop.price_uf else None,
        price_per_m2_clp=prop.price_per_m2_clp,
        price_uf_per_m2=round(float(prop.price_uf) / float(prop.useful_area_m2), 2)
            if (prop.price_uf and prop.useful_area_m2) else None,
        zone_avg_price_uf_per_m2=float(prop.zone_avg_price_uf_per_m2) if prop.zone_avg_price_uf_per_m2 else None,
        zone_avg_price_uf_per_m2_same_type=float(prop.zone_avg_price_uf_per_m2_same_type) if prop.zone_avg_price_uf_per_m2_same_type else None,
        zone_avg_sample_count=prop.zone_avg_sample_count,
        lat=float(prop.lat) if prop.lat is not None else None,
        lng=float(prop.lng) if prop.lng is not None else None,
        commune=prop.commune,
        neighborhood=prop.neighborhood,
        hoa_fee_clp=prop.hoa_fee_clp,
        images=prop.images or [],
        btl=_to_btl(prop),
        is_active=prop.is_active,
        last_seen_at=prop.last_seen_at,
    )


@router.get("/properties", response_model=PropertyListResponse)
def list_properties(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    min_yield: Optional[float] = None,
    max_yield: Optional[float] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    bedrooms: Optional[int] = None,
    portal: Optional[str] = None,
    sort_by: str = Query(default="yield_desc", pattern="^(yield_desc|yield_asc|price_asc|price_desc|price_per_m2_asc|last_seen_desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Property).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        Property.useful_area_m2.isnot(None),
        Property.lat.isnot(None),
    )

    if commune:
        query = query.filter(Property.commune.in_(commune))
    if property_type:
        query = query.filter(Property.property_type == property_type)
    if min_yield is not None:
        query = query.filter(Property.gross_yield_pct >= min_yield)
    if max_yield is not None:
        query = query.filter(Property.gross_yield_pct <= max_yield)
    if min_price is not None:
        query = query.filter(Property.price_clp >= min_price)
    if max_price is not None:
        query = query.filter(Property.price_clp <= max_price)
    if bedrooms is not None:
        query = query.filter(Property.bedrooms == bedrooms)
    if portal:
        query = query.filter(Property.portal == portal)

    # Sorting
    sort_map = {
        "yield_desc": Property.gross_yield_pct.desc().nullslast(),
        "yield_asc": Property.gross_yield_pct.asc().nullsfirst(),
        "price_asc": Property.price_clp.asc().nullsfirst(),
        "price_desc": Property.price_clp.desc().nullslast(),
        "price_per_m2_asc": Property.price_per_m2_clp.asc().nullsfirst(),
        "last_seen_desc": Property.last_seen_at.desc(),
    }
    query = query.order_by(sort_map[sort_by])

    total = query.count()
    offset = (page - 1) * page_size
    properties = query.offset(offset).limit(page_size).all()

    return PropertyListResponse(
        items=[_to_list_item(p) for p in properties],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


MAP_PINS_CAP = 1000  # hard limit to keep Leaflet rendering fast


@router.get("/properties/map-pins", response_model=list[MapPinItem])
def list_map_pins(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    min_yield: Optional[float] = None,
    max_yield: Optional[float] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    bedrooms: Optional[int] = None,
    portal: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    All filtered properties that have coordinates, up to MAP_PINS_CAP.
    Used exclusively by the dashboard map — returns lightweight pin data only.
    Sorted by yield desc so the most relevant pins appear first when capped.
    """
    query = db.query(Property).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        Property.useful_area_m2.isnot(None),
        Property.lat.isnot(None),
    )

    if commune:
        query = query.filter(Property.commune.in_(commune))
    if property_type:
        query = query.filter(Property.property_type == property_type)
    if min_yield is not None:
        query = query.filter(Property.gross_yield_pct >= min_yield)
    if max_yield is not None:
        query = query.filter(Property.gross_yield_pct <= max_yield)
    if min_price is not None:
        query = query.filter(Property.price_clp >= min_price)
    if max_price is not None:
        query = query.filter(Property.price_clp <= max_price)
    if bedrooms is not None:
        query = query.filter(Property.bedrooms == bedrooms)
    if portal:
        query = query.filter(Property.portal == portal)

    query = query.order_by(Property.gross_yield_pct.desc().nullslast())
    props = query.limit(MAP_PINS_CAP).all()

    return [
        MapPinItem(
            id=p.id,
            lat=float(p.lat),
            lng=float(p.lng),
            yield_band=_classify_yield(float(p.gross_yield_pct) if p.gross_yield_pct else None),
            price_uf=float(p.price_uf) if p.price_uf else None,
            commune=p.commune,
            bedrooms=p.bedrooms,
        )
        for p in props
    ]


@router.get("/properties/pending-review", response_model=PropertyListResponse)
def list_pending_review(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Properties missing useful_area_m2 OR lat/lng — cannot be fully analyzed.
    Excluded from the main feed; shown here for manual review.
    """
    from sqlalchemy import or_
    query = db.query(Property).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        or_(Property.useful_area_m2.is_(None), Property.lat.is_(None)),
    ).order_by(Property.last_seen_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    properties = query.offset(offset).limit(page_size).all()

    return PropertyListResponse(
        items=[_to_list_item(p) for p in properties],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


class PropertyPatch(BaseModel):
    """Fields that can be manually corrected via the pending-review UI."""
    useful_area_m2: Optional[float] = None
    total_area_m2: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-56.0 <= v <= -17.0):
            raise ValueError("lat must be within Chile bounds (-56 to -17)")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-75.0 <= v <= -66.0):
            raise ValueError("lng must be within Chile bounds (-75 to -66)")
        return v


@router.patch("/properties/{property_id}", response_model=PropertyDetail)
def patch_property(property_id: UUID, body: PropertyPatch, db: Session = Depends(get_db)):
    """
    Manual data correction for a property (area, coordinates).
    When lat/lng are provided the PostGIS location column is also updated
    so that geo-tier BTL matching will work after the next recalculate run.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if body.useful_area_m2 is not None:
        prop.useful_area_m2 = body.useful_area_m2
    if body.total_area_m2 is not None:
        prop.total_area_m2 = body.total_area_m2
    coords_changed = body.lat is not None and body.lng is not None
    if coords_changed:
        prop.lat = body.lat
        prop.lng = body.lng
        db.execute(
            text("UPDATE properties SET location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography WHERE id = :id"),
            {"lng": body.lng, "lat": body.lat, "id": str(property_id)},
        )

    db.commit()
    db.refresh(prop)

    # Recompute zone_avg immediately when coordinates or area change —
    # don't wait for the next full BTL recalculation run.
    area_changed = body.useful_area_m2 is not None or body.total_area_m2 is not None
    if coords_changed or area_changed:
        if compute_zone_avg(db, prop):
            db.commit()
            db.refresh(prop)

    return PropertyDetail(
        **_to_list_item(prop).model_dump(),
        description=prop.description,
        total_area_m2=float(prop.total_area_m2) if prop.total_area_m2 else None,
        floor=prop.floor,
        parking=prop.parking,
        storage=prop.storage,
        lat=prop.lat,
        lng=prop.lng,
        region=prop.region,
        contributions_clp_annual=prop.contributions_clp_annual,
        first_seen_at=prop.first_seen_at,
        created_at=prop.created_at,
    )


@router.get("/properties/{property_id}", response_model=PropertyDetail)
def get_property(property_id: UUID, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Lazy computation: if zone_avg is missing but we have the data to compute it,
    # fill it in now and persist so the heatbar never shows blank.
    if prop.zone_avg_price_uf_per_m2 is None and prop.lat is not None:
        if compute_zone_avg(db, prop):
            db.commit()

    return PropertyDetail(
        **_to_list_item(prop).model_dump(),
        description=prop.description,
        total_area_m2=float(prop.total_area_m2) if prop.total_area_m2 else None,
        floor=prop.floor,
        parking=prop.parking,
        storage=prop.storage,
        region=prop.region,
        contributions_clp_annual=prop.contributions_clp_annual,
        first_seen_at=prop.first_seen_at,
        created_at=prop.created_at,
    )


@router.get("/properties/{property_id}/comps", response_model=list[RentalCompItem])
def get_property_comps(property_id: UUID, db: Session = Depends(get_db)):
    """
    Return the rental comps that were used to calculate this property's yield.
    Replicates the exact same query as matching.py for the stored matching_tier.
    """
    from backend.app.services.matching import _TIERS

    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if not prop.matching_tier:
        return []

    tier_idx = prop.matching_tier
    radius_m, bedrooms_mode, relax_area, use_commune = _TIERS[tier_idx - 1]

    bedrooms = prop.bedrooms or 0
    prop_area = float(prop.useful_area_m2) if prop.useful_area_m2 else None
    has_location = prop.lat is not None and prop.lng is not None

    # Mirror matching.py: properties with >5 bedrooms use "any" bedrooms mode
    if bedrooms > 5:
        bedrooms_mode = "any"

    # --- Bedrooms clause (mirrors matching.py) ---
    if bedrooms_mode == "exact":
        bedrooms_clause = "AND rc.bedrooms = :bedrooms"
        bedrooms_params: dict = {"bedrooms": bedrooms}
    elif bedrooms_mode == "pm1":
        bedrooms_clause = "AND rc.bedrooms BETWEEN :bedrooms_min AND :bedrooms_max"
        bedrooms_params = {"bedrooms_min": max(0, bedrooms - 1), "bedrooms_max": bedrooms + 1}
    else:
        bedrooms_clause = ""
        bedrooms_params = {}

    # --- Area clause (geo tiers only — mirrors matching.py _GEO_QUERY) ---
    # Commune-tier queries in matching.py have no area filter (_COMMUNE_QUERY),
    # so we only apply area_clause for the geo branch to keep display in sync.
    geo_area_params: dict = {}
    if prop_area:
        if not relax_area:
            geo_area_clause = "AND rc.useful_area_m2 BETWEEN :area_min AND :area_max"
            geo_area_params = {"area_min": prop_area * 0.7, "area_max": prop_area * 1.3}
        else:
            geo_area_clause = "AND rc.useful_area_m2 IS NOT NULL"
    else:
        geo_area_clause = ""

    # --- Execute matching query + compute distance for display ---
    # Commune queries: when property has area, exclude NULL-area comps (matching.py
    # skips them during normalization — they'd count in matching but show 0 normalized rent).
    commune_area_clause = "AND rc.useful_area_m2 IS NOT NULL" if prop_area else ""

    _comp_cols = """
                rc.id, rc.portal, rc.url, rc.commune, rc.neighborhood,
                rc.property_type, rc.bedrooms, rc.useful_area_m2,
                rc.rent_clp, rc.rent_uf, rc.price_per_m2_clp, rc.lat, rc.lng
    """

    if use_commune or not has_location:
        rows = db.execute(
            text(f"""
                SELECT {_comp_cols}, NULL::int AS distance_m
                FROM rental_comps rc
                WHERE rc.is_canonical = TRUE
                  AND rc.property_type = :property_type
                  AND rc.commune = :commune
                  AND rc.rent_clp >= 50000
                  AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 >= 15)
                  {bedrooms_clause}
                  {commune_area_clause}
                ORDER BY rc.rent_clp
                LIMIT 50
            """),
            {"property_type": prop.property_type, "commune": prop.commune,
             **bedrooms_params},
        ).fetchall()
    else:
        rows = db.execute(
            text(f"""
                SELECT {_comp_cols},
                       ROUND(ST_Distance(
                           rc.location,
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                       ))::int AS distance_m
                FROM rental_comps rc
                WHERE rc.is_canonical = TRUE
                  AND rc.property_type = :property_type
                  AND rc.rent_clp >= 50000
                  AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 >= 15)
                  {bedrooms_clause}
                  {geo_area_clause}
                  AND ST_DWithin(
                      rc.location,
                      ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                      :radius_m
                  )
                ORDER BY rc.rent_clp
                LIMIT 50
            """),
            {"property_type": prop.property_type, "lat": prop.lat, "lng": prop.lng,
             "radius_m": radius_m, **bedrooms_params, **geo_area_params},
        ).fetchall()

    id_to_distance = {r.id: r.distance_m for r in rows}
    comps = list(rows)  # rows already contain all comp columns — no second query needed

    # Dedup cross-portal duplicates using the same key as matching.py:
    #   (bedrooms, round(area)) — identical to the dedup in find_rental_comps()
    # This ensures the displayed comps are exactly the ones used to compute the median,
    # so the "← mediana" marker in the UI points to the correct comp.
    # Keep the lowest-rent comp per bucket (same as matching.py).
    dedup_seen: dict[tuple, "RentalComp"] = {}
    for c in comps:
        area = float(c.useful_area_m2) if c.useful_area_m2 is not None else None
        beds = c.bedrooms
        key = (beds, round(area) if area is not None else None)
        existing = dedup_seen.get(key)
        if existing is None or (c.rent_clp or 0) < (existing.rent_clp or 0):
            dedup_seen[key] = c

    deduped_comps = list(dedup_seen.values())

    # Display order: by distance when available, else by rent (commune tiers)
    def sort_key(c):
        d = id_to_distance.get(c.id)
        return d if d is not None else 999_999

    result = []
    for c in sorted(deduped_comps, key=sort_key):
        comp_area = float(c.useful_area_m2) if c.useful_area_m2 else None
        rent = c.rent_clp

        # Normalize rent to sale property size (same formula as matching.py)
        if prop_area and comp_area and rent:
            normalized = int((rent / comp_area) * prop_area)
        else:
            normalized = None

        # Per-m2 rent for display (F7)
        rent_per_m2_clp = int(rent / comp_area) if (rent and comp_area) else None
        rent_per_m2_uf = round(float(c.rent_uf) / comp_area, 2) if (c.rent_uf and comp_area) else None

        result.append(RentalCompItem(
            id=c.id, portal=c.portal, url=c.url, commune=c.commune,
            neighborhood=c.neighborhood, property_type=c.property_type,
            bedrooms=c.bedrooms,
            useful_area_m2=comp_area,
            rent_clp=rent,
            rent_uf=float(c.rent_uf) if c.rent_uf else None,
            price_per_m2_clp=c.price_per_m2_clp,
            lat=c.lat, lng=c.lng,
            distance_m=id_to_distance.get(c.id),
            normalized_rent_clp=normalized,
            rent_per_m2_clp=rent_per_m2_clp,
            rent_per_m2_uf=rent_per_m2_uf,
        ))
    return result
