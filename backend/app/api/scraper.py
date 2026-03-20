"""
POST /api/v1/scraper/trigger  — start a scrape run
GET  /api/v1/scraper/runs     — list recent runs
GET  /api/v1/scraper/runs/{id} — status of a specific run
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.scrape_run import ScrapeRun
from backend.app.scrapers.portal_inmobiliario import PortalInmobiliarioScraper
from backend.app.scrapers.toctoc import TocTocScraper

router = APIRouter(tags=["scraper"])


class ScrapeRequest(BaseModel):
    portals: list[str] = ["portal_inmobiliario"]
    communes: list[str] = settings.default_communes
    listing_types: list[str] = ["sale", "rental"]  # sale | rental | both


SCRAPERS = {
    "portal_inmobiliario": PortalInmobiliarioScraper,
    "toctoc": TocTocScraper,
    # "yapo": YapoScraper,  # Phase 3
}


def _run_scrape_sync(run_id: UUID, portal: str, listing_type: str, communes: list[str]):
    """Sync wrapper so BackgroundTasks can call the async scraper without nesting event loops."""
    import asyncio
    asyncio.run(_run_scrape(run_id, portal, listing_type, communes))


async def _run_scrape(run_id: UUID, portal: str, listing_type: str, communes: list[str]):
    """Background task: execute a scrape run and update the ScrapeRun record."""
    from backend.app.database import SessionLocal
    from backend.app.services.upsert import upsert_listings

    db = SessionLocal()
    try:
        run = db.query(ScrapeRun).filter(ScrapeRun.id == run_id).first()

        ScraperClass = SCRAPERS.get(portal)
        if not ScraperClass:
            run.status = "failed"
            run.error_message = f"Unknown portal: {portal}"
            run.finished_at = datetime.utcnow()
            db.commit()
            return

        scraper = ScraperClass(
            delay_min=settings.scraper_request_delay_min,
            delay_max=settings.scraper_request_delay_max,
        )

        if listing_type == "sale":
            listings = await scraper.scrape_sales(communes)
        else:
            listings = await scraper.scrape_rentals(communes)

        stats = upsert_listings(db, listings, listing_type)

        run.listings_found = len(listings)
        run.listings_new = stats["new"]
        run.listings_updated = stats["updated"]
        run.status = "completed"
        run.finished_at = datetime.utcnow()
        db.commit()

        # Recalculate BTL yields after every scrape so the dashboard stays fresh
        from backend.app.services.matching import run_btl_matching
        run_btl_matching(db)

    except Exception as e:
        run = db.query(ScrapeRun).filter(ScrapeRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.error_message = str(e)
            run.finished_at = datetime.utcnow()
            db.commit()
        raise
    finally:
        db.close()


@router.post("/scraper/trigger")
def trigger_scrape(
    request: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Start one scrape run per (portal × listing_type) combination."""
    runs_started = []

    for portal in request.portals:
        if portal not in SCRAPERS:
            raise HTTPException(status_code=400, detail=f"Unknown portal: {portal}")

        for listing_type in request.listing_types:
            run = ScrapeRun(
                portal=portal,
                listing_type=listing_type,
                communes=request.communes,
                status="running",
            )
            db.add(run)
            db.flush()  # get the ID before commit
            runs_started.append({"run_id": str(run.id), "portal": portal, "listing_type": listing_type})
            background_tasks.add_task(
                _run_scrape_sync,
                run.id, portal, listing_type, request.communes,
            )

    db.commit()
    return {"status": "started", "runs": runs_started}


@router.get("/scraper/runs")
def list_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = (
        db.query(ScrapeRun)
        .order_by(ScrapeRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "portal": r.portal,
            "listing_type": r.listing_type,
            "communes": r.communes,
            "status": r.status,
            "listings_found": r.listings_found,
            "listings_new": r.listings_new,
            "listings_updated": r.listings_updated,
            "started_at": r.started_at,
            "finished_at": r.finished_at,
            "error_message": r.error_message,
        }
        for r in runs
    ]


@router.get("/scraper/runs/{run_id}")
def get_run(run_id: UUID, db: Session = Depends(get_db)):
    run = db.query(ScrapeRun).filter(ScrapeRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": str(run.id),
        "portal": run.portal,
        "listing_type": run.listing_type,
        "communes": run.communes,
        "status": run.status,
        "listings_found": run.listings_found,
        "listings_new": run.listings_new,
        "listings_updated": run.listings_updated,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "error_message": run.error_message,
    }
