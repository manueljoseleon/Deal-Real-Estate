"""
GET  /api/v1/analysis/summary      — market-level stats by commune
POST /api/v1/analysis/recalculate  — re-run BTL matching for all properties
"""
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.property import Property
from backend.app.services.matching import run_btl_matching

router = APIRouter(tags=["analysis"])


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


@router.post("/analysis/recalculate")
def recalculate(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger BTL matching re-run in the background."""
    background_tasks.add_task(run_btl_matching, db)
    return {"status": "started", "message": "BTL matching recalculation queued"}
