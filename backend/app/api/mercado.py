"""
GET /api/v1/mercado/stats — Aggregated market analytics for the Análisis de Mercado section.

Returns:
  - histogram: cap rate distribution bucketed for Chart 1
  - scatter: per-property points for the opportunity quadrant chart (Chart 2)
  - total_properties: total active listings matching filters
"""
from statistics import median
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.property import Property

router = APIRouter(tags=["mercado"])

# Cap rate histogram bucket definitions: (label, min_inclusive, max_exclusive)
_BUCKETS = [
    ("0–1%", 0.0,  1.0),
    ("1–2%", 1.0,  2.0),
    ("2–3%", 2.0,  3.0),
    ("3–4%", 3.0,  4.0),
    ("4–5%", 4.0,  5.0),
    ("5–6%", 5.0,  6.0),
    ("6%+",  6.0, float("inf")),
]


def _base_query(
    db: Session,
    commune: Optional[list[str]],
    property_type: Optional[str],
    bedrooms: Optional[int],
    min_price: Optional[int],
    max_price: Optional[int],
):
    """Shared filtered query for active canonical sale listings."""
    q = db.query(Property).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        Property.gross_yield_pct.isnot(None),
        Property.useful_area_m2 >= 20,   # exclude micro-properties / data errors
        Property.price_uf.isnot(None),
        Property.lat.isnot(None),
    )
    if commune:
        q = q.filter(Property.commune.in_(commune))
    if property_type:
        q = q.filter(Property.property_type == property_type)
    if bedrooms is not None:
        q = q.filter(Property.bedrooms == bedrooms)
    if min_price:
        q = q.filter(Property.price_uf >= min_price)
    if max_price:
        q = q.filter(Property.price_uf <= max_price)
    return q


@router.get("/mercado/stats")
def mercado_stats(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    bedrooms: Optional[int] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Returns market analytics data for the two Mercado charts.

    Chart 1 (histogram): cap rate distribution across all matching properties.
    Chart 2 (scatter): per-property yield vs. price-discount points, only for
    properties that have a valid zone_avg_price_uf_per_m2.
    """
    props = _base_query(db, commune, property_type, bedrooms, min_price, max_price).all()

    # --- Chart 1: Histogram ---
    bucket_counts: dict[str, int] = {label: 0 for label, _, _ in _BUCKETS}
    for p in props:
        yield_val = float(p.gross_yield_pct)
        for label, lo, hi in _BUCKETS:
            if lo <= yield_val < hi:
                bucket_counts[label] += 1
                break

    histogram = [{"bucket": label, "count": bucket_counts[label]} for label, _, _ in _BUCKETS]

    # --- Chart 2: Scatter (only properties with zone_avg available) ---
    scatter = []
    for p in props:
        if p.zone_avg_price_uf_per_m2 is None or p.price_per_m2_uf is None:
            continue
        scatter.append({
            "id": str(p.id),
            "title": p.title,
            "commune": p.commune,
            "gross_yield_pct": float(p.gross_yield_pct),
            "price_per_m2_uf": float(p.price_per_m2_uf),
            "zone_avg_price_uf_per_m2": float(p.zone_avg_price_uf_per_m2),
            "price_uf": float(p.price_uf) if p.price_uf is not None else None,
        })

    return {
        "histogram": histogram,
        "scatter": scatter,
        "total_properties": len(props),
    }


# ---------------------------------------------------------------------------
# Endpoint 1: Time on Market
# ---------------------------------------------------------------------------

_TOM_BUCKETS = [
    ("0–7 días",   lambda d: d < 7),
    ("8–30 días",  lambda d: 7 <= d < 30),
    ("31–90 días", lambda d: 30 <= d < 90),
    ("91–180 días",lambda d: 90 <= d < 180),
    ("181+ días",  lambda d: d >= 180),
]


@router.get("/mercado/time-on-market")
def mercado_time_on_market(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    bedrooms: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Returns time-on-market statistics (active AND inactive canonical listings).

    Active properties: days = NOW() - first_seen_at
    Inactive properties: days = last_seen_at - first_seen_at
    Properties with < 1 day are excluded (same-day noise).
    """
    sql = text("""
        WITH tom AS (
            SELECT
                commune,
                CASE
                    WHEN is_active THEN
                        EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 86400
                    ELSE
                        EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) / 86400
                END AS days
            FROM properties
            WHERE is_canonical = TRUE
              AND first_seen_at IS NOT NULL
              AND (:commune_filter = FALSE OR commune = ANY(:communes))
              AND (:type_filter = FALSE OR property_type = :property_type)
              AND (:bed_filter  = FALSE OR bedrooms = :bedrooms)
        )
        SELECT commune, days
        FROM tom
        WHERE days >= 1
    """)

    rows = db.execute(
        sql,
        {
            "commune_filter": commune is not None and len(commune) > 0,
            "communes": commune or [],
            "type_filter": property_type is not None,
            "property_type": property_type or "",
            "bed_filter": bedrooms is not None,
            "bedrooms": bedrooms if bedrooms is not None else 0,
        },
    ).fetchall()

    if not rows:
        return {
            "total": 0,
            "median_days": None,
            "histogram": [
                {"bucket": label, "count": 0, "pct": 0.0}
                for label, _ in _TOM_BUCKETS
            ],
            "by_commune": [],
        }

    all_days = [float(r.days) for r in rows]
    total = len(all_days)

    # Histogram
    histogram = []
    for label, pred in _TOM_BUCKETS:
        cnt = sum(1 for d in all_days if pred(d))
        histogram.append({
            "bucket": label,
            "count": cnt,
            "pct": round(cnt / total * 100, 1) if total else 0.0,
        })

    # By commune
    commune_map: dict[str, list[float]] = {}
    for r in rows:
        commune_map.setdefault(r.commune, []).append(float(r.days))

    by_commune = []
    for com, days_list in commune_map.items():
        if len(days_list) < 5:
            continue
        by_commune.append({
            "commune": com,
            "median_days": round(median(days_list)),
            "count": len(days_list),
        })
    by_commune.sort(key=lambda x: x["median_days"])

    return {
        "total": total,
        "median_days": round(median(all_days)),
        "histogram": histogram,
        "by_commune": by_commune,
    }


# ---------------------------------------------------------------------------
# Endpoint 2: Yield Matrix
# ---------------------------------------------------------------------------

@router.get("/mercado/yield-matrix")
def mercado_yield_matrix(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns average and median gross yield grouped by property_type x bedrooms.
    bedrooms bucket 5 means "5+".
    Minimum 3 properties per cell; requires yield to be present.
    """
    bedrooms_bucket = case(
        (Property.bedrooms >= 5, 5),
        else_=Property.bedrooms,
    ).label("bedrooms_bucket")

    q = db.query(
        Property.property_type,
        bedrooms_bucket,
        func.avg(Property.gross_yield_pct).label("avg_yield"),
        func.percentile_cont(0.5).within_group(Property.gross_yield_pct).label("median_yield"),
        func.count(Property.id).label("count"),
    ).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        Property.gross_yield_pct.isnot(None),
        Property.useful_area_m2 >= 20,
        Property.price_uf.isnot(None),
        Property.lat.isnot(None),
        Property.bedrooms.isnot(None),
    )

    if commune:
        q = q.filter(Property.commune.in_(commune))
    if property_type:
        q = q.filter(Property.property_type == property_type)

    rows = (
        q.group_by(Property.property_type, "bedrooms_bucket")
        .having(func.count(Property.id) >= 3)
        .order_by(Property.property_type, "bedrooms_bucket")
        .all()
    )

    matrix = [
        {
            "property_type": r.property_type,
            "bedrooms": int(r.bedrooms_bucket),
            "avg_yield": round(float(r.avg_yield), 2),
            "median_yield": round(float(r.median_yield), 2),
            "count": int(r.count),
        }
        for r in rows
    ]

    return {"matrix": matrix}


# ---------------------------------------------------------------------------
# Endpoint 3: Stock Concentration
# ---------------------------------------------------------------------------

@router.get("/mercado/stock-concentration")
def mercado_stock_concentration(
    commune: Optional[list[str]] = Query(default=None),
    property_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns stock concentration and high-yield opportunity percentage per commune.
    Broader base filter: canonical + active + area>=20 + lat + price_uf.
    No yield filter — includes all stock (with and without yield).
    """
    q = db.query(
        Property.commune,
        func.count(Property.id).label("total_count"),
        func.count(Property.id).filter(Property.gross_yield_pct >= 5).label("high_yield_count"),
        func.percentile_cont(0.5).within_group(Property.price_uf).label("median_price_uf"),
    ).filter(
        Property.is_canonical == True,
        Property.is_active == True,
        Property.useful_area_m2 >= 20,
        Property.lat.isnot(None),
        Property.price_uf.isnot(None),
    )

    if commune:
        q = q.filter(Property.commune.in_(commune))
    if property_type:
        q = q.filter(Property.property_type == property_type)

    rows = (
        q.group_by(Property.commune)
        .having(func.count(Property.id) >= 5)
        .all()
    )

    communes = []
    for r in rows:
        total = int(r.total_count)
        high = int(r.high_yield_count)
        communes.append({
            "commune": r.commune,
            "total_count": total,
            "high_yield_count": high,
            "opportunity_pct": round(high / total * 100, 1) if total else 0.0,
            "median_price_uf": round(float(r.median_price_uf)) if r.median_price_uf is not None else None,
        })

    communes.sort(key=lambda x: x["opportunity_pct"], reverse=True)

    return {"communes": communes}
