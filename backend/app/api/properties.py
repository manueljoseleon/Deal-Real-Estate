"""
GET /api/v1/properties          — filterable, paginated sale listings with BTL analysis
GET /api/v1/properties/{id}     — single property detail
GET /api/v1/properties/{id}/comps — rental comps used for this property's yield
"""
import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.property import Property
from backend.app.models.rental_comp import RentalComp
from backend.app.schemas.property import (
    PropertyDetail,
    PropertyListItem,
    PropertyListResponse,
    BTLAnalysis,
    RentalCompItem,
)
from backend.app.services.btl_calculator import _classify_yield

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


@router.get("/properties/{property_id}", response_model=PropertyDetail)
def get_property(property_id: UUID, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

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


@router.get("/properties/{property_id}/comps", response_model=list[RentalCompItem])
def get_property_comps(property_id: UUID, db: Session = Depends(get_db)):
    """Return the rental comps that were used to calculate this property's yield."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    bedrooms = prop.bedrooms or 0

    if not prop.lat or not prop.lng or not prop.matching_tier:
        # Commune-level fallback — exact bedrooms, no distance available
        orm_comps = (
            db.query(RentalComp)
            .filter(
                RentalComp.commune == prop.commune,
                RentalComp.property_type == prop.property_type,
                RentalComp.is_canonical == True,
                RentalComp.is_active == True,
                RentalComp.rent_clp >= 50000,
                (RentalComp.useful_area_m2 == None) | (RentalComp.useful_area_m2 >= 15),
                RentalComp.bedrooms == bedrooms,
            )
            .order_by(RentalComp.rent_clp)
            .limit(20)
            .all()
        )
        return [
            RentalCompItem(
                id=c.id, portal=c.portal, url=c.url, commune=c.commune,
                neighborhood=c.neighborhood, property_type=c.property_type,
                bedrooms=c.bedrooms,
                useful_area_m2=float(c.useful_area_m2) if c.useful_area_m2 else None,
                rent_clp=c.rent_clp,
                rent_uf=float(c.rent_uf) if c.rent_uf else None,
                price_per_m2_clp=c.price_per_m2_clp,
                lat=c.lat, lng=c.lng, distance_m=None,
            )
            for c in orm_comps
        ]

    # Geo-based: exact bedrooms, include distance, order by distance
    tier_radii = {1: 1500, 2: 1500, 3: 3000, 4: 3000, 5: 3000, 6: 5000, 7: 5000}
    radius = tier_radii.get(prop.matching_tier, 3000)
    rows = db.execute(
        text("""
            SELECT
                rc.id,
                ROUND(ST_Distance(
                    rc.location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ))::int AS distance_m
            FROM rental_comps rc
            WHERE rc.is_canonical = TRUE AND rc.is_active = TRUE
              AND rc.property_type = :property_type
              AND rc.rent_clp >= 50000
              AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 >= 15)
              AND rc.bedrooms = :bedrooms
              AND ST_DWithin(
                  rc.location,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  :radius_m
              )
            ORDER BY distance_m
            LIMIT 20
        """),
        {"property_type": prop.property_type, "lat": prop.lat, "lng": prop.lng,
         "radius_m": radius, "bedrooms": bedrooms},
    ).fetchall()

    id_to_distance = {r[0]: r[1] for r in rows}
    comps = db.query(RentalComp).filter(RentalComp.id.in_(id_to_distance.keys())).all()

    return [
        RentalCompItem(
            id=c.id, portal=c.portal, url=c.url, commune=c.commune,
            neighborhood=c.neighborhood, property_type=c.property_type,
            bedrooms=c.bedrooms,
            useful_area_m2=float(c.useful_area_m2) if c.useful_area_m2 else None,
            rent_clp=c.rent_clp,
            rent_uf=float(c.rent_uf) if c.rent_uf else None,
            price_per_m2_clp=c.price_per_m2_clp,
            lat=c.lat, lng=c.lng,
            distance_m=id_to_distance.get(c.id),
        )
        for c in sorted(comps, key=lambda c: id_to_distance.get(c.id, 0))
    ]
