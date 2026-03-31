"""
GET  /api/v1/analysis/summary      — market-level stats by commune
GET  /api/v1/analysis/uf           — current UF value in CLP from mindicador.cl
POST /api/v1/analysis/recalculate  — re-run BTL matching for all properties
"""
from datetime import date

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.property import Property
from backend.app.services.matching import run_btl_matching, compute_zone_avg

router = APIRouter(tags=["analysis"])


@router.get("/analysis/uf")
async def get_uf_value():
    """Return today's UF value in CLP from mindicador.cl. Falls back to 40000 if unavailable."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://mindicador.cl/api/uf")
            resp.raise_for_status()
            data = resp.json()
            uf_clp = float(data["serie"][0]["valor"])
            uf_date = data["serie"][0]["fecha"][:10]
    except Exception:
        uf_clp = 40000.0
        uf_date = date.today().isoformat()
    return {"uf_clp": uf_clp, "date": uf_date}


@router.get("/analysis/summary")
def analysis_summary(db: Session = Depends(get_db)):
    """Average yield, median price, and listing count grouped by commune."""
    rows = (
        db.query(
            Property.commune,
            func.avg(Property.gross_yield_pct).label("avg_yield"),
            func.percentile_cont(0.5).within_group(Property.price_uf).label("median_price_uf"),
            func.count(Property.id).label("listing_count"),
        )
        .filter(Property.is_canonical == True, Property.is_active == True)
        .group_by(Property.commune)
        .order_by(func.avg(Property.gross_yield_pct).desc().nullslast())
        .all()
    )

    return [
        {
            "commune": row.commune,
            "avg_yield_pct": round(float(row.avg_yield), 2) if row.avg_yield else None,
            "median_price_uf": round(float(row.median_price_uf), 0) if row.median_price_uf else None,
            "listing_count": row.listing_count,
        }
        for row in rows
    ]


@router.post("/analysis/repair-zone-avg")
def repair_zone_avg(db: Session = Depends(get_db)):
    """
    Fill in zone_avg_price_uf_per_m2 for all active canonical properties that are
    missing it but have the necessary data (lat, lng, price_uf, useful_area_m2).

    Much faster than a full BTL recalculate — only runs the zone query, skips
    the rental-comp matching. Safe to call at any time.
    """
    from backend.app.models.property import Property

    candidates = (
        db.query(Property)
        .filter(
            Property.is_canonical == True,
            Property.is_active == True,
            Property.zone_avg_price_uf_per_m2.is_(None),
            Property.lat.isnot(None),
            Property.price_uf.isnot(None),
            Property.useful_area_m2.isnot(None),
        )
        .all()
    )

    repaired = 0
    BATCH = 200
    for i, prop in enumerate(candidates):
        if compute_zone_avg(db, prop):
            repaired += 1
        if (i + 1) % BATCH == 0:
            db.commit()
    db.commit()

    return {
        "candidates": len(candidates),
        "repaired": repaired,
        "still_missing": len(candidates) - repaired,
    }


@router.post("/analysis/recalculate")
def recalculate(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    property_ids: list[str] | None = None,
):
    """Trigger BTL matching re-run in the background. Optionally restrict to specific property IDs."""
    background_tasks.add_task(run_btl_matching, db, property_ids or None)
    scope = f"{len(property_ids)} properties" if property_ids else "all properties"
    return {"status": "started", "message": f"BTL matching recalculation queued for {scope}"}
