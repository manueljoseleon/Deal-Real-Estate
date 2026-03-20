"""
CLI script to trigger scraping manually or via cron.
Usage:
    python scripts/run_scrapers.py --portals portal_inmobiliario --types sale rental
    python scripts/run_scrapers.py  # uses defaults from config
"""
import argparse
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.app.config import settings
from backend.app.database import SessionLocal, init_db
from backend.app.scrapers.portal_inmobiliario import PortalInmobiliarioScraper
from backend.app.scrapers.toctoc import TocTocScraper
from backend.app.services.upsert import upsert_listings, mark_stale_inactive
from backend.app.services.matching import run_btl_matching


SCRAPERS = {
    "portal_inmobiliario": PortalInmobiliarioScraper,
    "toctoc": TocTocScraper,
}


async def run(portals: list[str], listing_types: list[str], communes: list[str]):
    db = SessionLocal()
    try:
        for portal_name in portals:
            ScraperClass = SCRAPERS.get(portal_name)
            if not ScraperClass:
                print(f"[SKIP] Unknown portal: {portal_name}")
                continue

            scraper = ScraperClass(
                delay_min=settings.scraper_request_delay_min,
                delay_max=settings.scraper_request_delay_max,
            )

            for listing_type in listing_types:
                print(f"\n[START] {portal_name} / {listing_type} — communes: {communes}")
                if listing_type == "sale":
                    listings = await scraper.scrape_sales(communes)
                else:
                    listings = await scraper.scrape_rentals(communes)

                stats = upsert_listings(db, listings, listing_type)
                print(f"[DONE]  {len(listings)} found | {stats['new']} new | {stats['updated']} updated")

        # After all scrapes, run BTL matching
        print("\n[MATCHING] Running BTL yield calculation...")
        result = run_btl_matching(db)
        print(f"[MATCHING] {result['updated_with_yield']} properties updated, {result['no_comps_found']} without comps")

        # Mark stale listings inactive
        stale = mark_stale_inactive(db, hours=48)
        print(f"[CLEANUP] Marked {stale} stale listings inactive")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deal Real Estate scraper CLI")
    parser.add_argument("--portals", nargs="+", default=["portal_inmobiliario"])
    parser.add_argument("--types", nargs="+", default=["rental", "sale"],
                        choices=["sale", "rental"])
    parser.add_argument("--communes", nargs="+", default=settings.default_communes)
    args = parser.parse_args()

    init_db()
    asyncio.run(run(args.portals, args.types, args.communes))
