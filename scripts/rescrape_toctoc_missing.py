"""
Re-scrape TocToc listings that are missing useful_area_m2, lat/lng, or gallery images.

Queries the DB for canonical, active TocToc properties with missing data,
then fetches each detail page using the same _fetch_detail_data() logic
as the main scraper, and upserts the extracted values back into the DB.

Usage:
    python -m scripts.rescrape_toctoc_missing [--limit N] [--ids id1,id2,...] [--images-only]

Flags:
    --limit N         Process at most N properties
    --ids id1,id2,... Process specific property UUIDs only
    --images-only     Only process properties that have <=1 image (skip coord/area checks)
"""
import asyncio
import argparse
import random
import sys
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text, func, or_
from backend.app.database import SessionLocal
from backend.app.models.property import Property
from backend.app.scrapers.toctoc import TocTocScraper
from backend.app.services.db_guard import backup_images
from backend.app.services.matching import compute_zone_avg
from playwright.async_api import async_playwright

try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False


async def rescrape(
    limit: int | None = None,
    ids: list[str] | None = None,
    images_only: bool = False,
):
    db = SessionLocal()
    try:
        # ── Safety guard: snapshot current images before any writes ──────────
        backup_images(db, label="before_rescrape")
        # ─────────────────────────────────────────────────────────────────────

        query = db.query(Property).filter(
            Property.portal == "toctoc",
            Property.is_canonical == True,
            Property.is_active == True,
        )

        if ids:
            query = query.filter(Property.id.in_(ids))
        elif images_only:
            # Target properties that have only the single API thumbnail (<=1 image)
            query = query.filter(
                or_(
                    Property.images.is_(None),
                    func.array_length(Property.images, 1) <= 1,
                )
            )
        else:
            # Default: any property missing area, coords, or full image gallery
            query = query.filter(
                or_(
                    Property.useful_area_m2.is_(None),
                    Property.lat.is_(None),
                    func.array_length(Property.images, 1) <= 1,
                )
            )

        props = query.order_by(Property.last_seen_at.desc()).limit(limit).all() if limit else query.all()
        print(f"Found {len(props)} TocToc properties to re-scrape")

        scraper = TocTocScraper()

        async with async_playwright() as pw:
            context = await scraper._make_browser_context(pw)
            page = await context.new_page()
            if HAS_STEALTH:
                await stealth_async(page)

            # Navigate to TocToc home to establish session cookies
            await page.goto("https://www.toctoc.com", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            updated = 0
            for i, prop in enumerate(props):
                print(f"  [{i+1}/{len(props)}] {prop.id} | {prop.url[:70]}")
                try:
                    extras = await scraper._fetch_detail_data(page, prop.url)
                except Exception as e:
                    print(f"    ERROR: {e}")
                    continue

                changed = False

                if prop.useful_area_m2 is None and extras.get("useful_area_m2"):
                    prop.useful_area_m2 = extras["useful_area_m2"]
                    print(f"    area: {extras['useful_area_m2']} m²")
                    changed = True

                if prop.total_area_m2 is None and extras.get("total_area_m2"):
                    prop.total_area_m2 = extras["total_area_m2"]
                    print(f"    total_area: {extras['total_area_m2']} m²")
                    changed = True

                if prop.lat is None and extras.get("lat"):
                    prop.lat = extras["lat"]
                    prop.lng = extras["lng"]
                    # Also update the PostGIS location column — matching.py uses it for geo-tier BTL matching
                    db.execute(text("""
                        UPDATE properties
                        SET location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                        WHERE id = :id
                    """), {"lng": extras["lng"], "lat": extras["lat"], "id": str(prop.id)})
                    print(f"    coords: {extras['lat']}, {extras['lng']}")
                    changed = True

                # Update images if detail page returned more than what's stored
                extras_images = extras.get("images") or []
                prop_images = prop.images or []
                if extras_images and len(extras_images) > len(prop_images):
                    prop.images = extras_images
                    print(f"    images: {len(prop_images)} -> {len(extras_images)}")
                    changed = True

                if changed:
                    db.commit()
                    # If coords or area were updated, compute zone_avg immediately
                    # so the price heatbar doesn't show blank on the detail page.
                    if extras.get("lat") or extras.get("useful_area_m2"):
                        if compute_zone_avg(db, prop):
                            db.commit()
                            print(f"    zone_avg: {prop.zone_avg_price_uf_per_m2} UF/m²")
                    updated += 1
                else:
                    print(f"    no new data found")

                await asyncio.sleep(random.uniform(1.5, 3.0))

            await context.close()

        print(f"\nDone. Updated {updated}/{len(props)} properties.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Max properties to process")
    parser.add_argument("--ids", type=str, default=None, help="Comma-separated property UUIDs")
    parser.add_argument("--images-only", action="store_true", help="Only target properties with <=1 image")
    args = parser.parse_args()

    ids = [x.strip() for x in args.ids.split(",")] if args.ids else None
    asyncio.run(rescrape(limit=args.limit, ids=ids, images_only=args.images_only))
