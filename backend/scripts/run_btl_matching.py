"""
Standalone BTL matching runner with reconnect-per-batch, retry, and checkpoint.

Saves progress to CHECKPOINT_FILE after each batch. If interrupted, re-running
the script automatically resumes from the last saved position.

Usage:
    cd <project_root>
    .venv/Scripts/python backend/scripts/run_btl_matching.py

To restart from scratch:
    delete /tmp/btl_matching_checkpoint.json and re-run
"""
import sys
import os
import json
import logging
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from backend.app.database import SessionLocal
from backend.app.models.property import Property
from backend.app.services.matching import find_rental_comps, compute_zone_avg
from backend.app.services.btl_calculator import calculate_btl_summary

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

PAGE_SIZE = 25
MAX_RETRIES = 5
RETRY_DELAY = 10
CHECKPOINT_FILE = os.path.join(os.environ.get("TEMP", "/tmp"), "btl_matching_checkpoint.json")


def save_checkpoint(start_index: int, total_updated: int, total_no_comps: int):
    with open(CHECKPOINT_FILE, "w") as f:
        json.dump({
            "start_index": start_index,
            "total_updated": total_updated,
            "total_no_comps": total_no_comps,
            "saved_at": datetime.utcnow().isoformat(),
        }, f)


def load_checkpoint() -> dict | None:
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE) as f:
            return json.load(f)
    return None


def get_all_ids() -> list[str]:
    db = SessionLocal()
    try:
        rows = (
            db.query(Property.id)
            .filter(
                Property.is_canonical == True,
                Property.is_active == True,
                Property.price_clp.isnot(None),
            )
            .order_by(Property.id)
            .all()
        )
        return [str(r.id) for r in rows]
    finally:
        db.close()


def process_batch(ids: list[str]) -> tuple[int, int]:
    db = SessionLocal()
    updated = 0
    no_comps = 0
    try:
        props = db.query(Property).filter(Property.id.in_(ids)).all()
        for prop in props:
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
            compute_zone_avg(db, prop)
            if rents:
                updated += 1
            else:
                no_comps += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return updated, no_comps


def process_batch_with_retry(ids: list[str], batch_num: int, total: int) -> tuple[int, int]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = process_batch(ids)
            logger.info("[%d/%d] committed batch", min(batch_num * PAGE_SIZE, total), total)
            return result
        except Exception as e:
            if attempt < MAX_RETRIES:
                logger.warning("Batch %d attempt %d failed (%s) — retrying in %ds...",
                               batch_num, attempt, type(e).__name__, RETRY_DELAY)
                time.sleep(RETRY_DELAY)
            else:
                logger.error("Batch %d failed after %d attempts: %s", batch_num, MAX_RETRIES, e)
                raise


def main():
    checkpoint = load_checkpoint()
    if checkpoint:
        resume_from = checkpoint["start_index"]
        total_updated = checkpoint["total_updated"]
        total_no_comps = checkpoint["total_no_comps"]
        logger.info("Resuming from checkpoint: index %d (saved at %s)", resume_from, checkpoint["saved_at"])
    else:
        resume_from = 0
        total_updated = 0
        total_no_comps = 0

    logger.info("Fetching eligible property IDs...")
    all_ids = get_all_ids()
    total = len(all_ids)
    logger.info("Total properties to process: %d (starting from index %d)", total, resume_from)

    for batch_num, start in enumerate(range(resume_from, total, PAGE_SIZE), start=resume_from // PAGE_SIZE + 1):
        batch_ids = all_ids[start: start + PAGE_SIZE]
        updated, no_comps = process_batch_with_retry(batch_ids, batch_num, total)
        total_updated += updated
        total_no_comps += no_comps
        save_checkpoint(start + PAGE_SIZE, total_updated, total_no_comps)

    # Done — remove checkpoint
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)

    result = {
        "total_processed": total - resume_from,
        "updated_with_yield": total_updated,
        "no_comps_found": total_no_comps,
        "ran_at": datetime.utcnow().isoformat(),
    }
    logger.info("DONE: %s", result)
    return result


if __name__ == "__main__":
    main()
