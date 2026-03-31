"""
Fast thumbnail recovery for TocToc properties that lost images.

Calls the TocToc listing API (via the scraper, enrich=False) to get the
thumbnail (imagenPrincipal) for every active listing and upserts it to DB.
Runs in ~5 minutes vs. hours for the detail-page backfill.

Usage:
    python -m scripts.restore_toctoc_thumbnails
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_, func
from backend.app.database import SessionLocal
from backend.app.models.property import Property
from backend.app.scrapers.toctoc import TocTocScraper, COMMUNE_SLUGS
from backend.app.services.db_guard import backup_images


async def restore():
    scraper = TocTocScraper()
    communes = list(COMMUNE_SLUGS.keys())

    print("Scraping TocToc API (thumbnails only, no detail-page enrichment)…")
    sales   = await scraper.scrape_sales(communes,   enrich=False)
    rentals = await scraper.scrape_rentals(communes, enrich=False)
    all_listings = sales + rentals

    # Build external_id -> first image (thumbnail) map
    thumb_map: dict[str, str] = {}
    for listing in all_listings:
        ext_id = listing.get("external_id")
        imgs   = listing.get("images") or []
        if ext_id and imgs:
            thumb_map[ext_id] = imgs[0]

    print(f"\nThumbnails retrieved: {len(thumb_map)}")

    if not thumb_map:
        print("Nothing to update — aborting without touching the DB.")
        return

    db = SessionLocal()
    try:
        # ── Safety guard: snapshot current images before writing anything ──────
        print("\nCreating image backup before updating…")
        backup_images(db, label="before_thumb_restore")
        # ─────────────────────────────────────────────────────────────────────

        print("Updating DB…")
        props = db.query(Property).filter(
            Property.portal == "toctoc",
            Property.is_active == True,
        ).all()

        updated = 0
        for prop in props:
            thumb = thumb_map.get(prop.external_id)
            if not thumb:
                continue

            current = prop.images or []
            # Update only if no images OR current thumbnail is wrong/missing
            if not current or current[0] != thumb:
                # Preserve any existing gallery images after the new thumbnail
                gallery = [u for u in current if u != thumb]
                prop.images = [thumb] + gallery
                updated += 1

        db.commit()
        print(f"Properties updated: {updated}")

        # Summary
        still_missing = db.query(Property).filter(
            Property.portal == "toctoc",
            Property.is_active == True,
            Property.is_canonical == True,
            or_(Property.images.is_(None), func.array_length(Property.images, 1) == 0),
        ).count()
        print(f"TocToc canonical active props still without image: {still_missing}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(restore())
