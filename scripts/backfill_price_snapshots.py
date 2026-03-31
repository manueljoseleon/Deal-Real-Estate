"""
Backfill price snapshots for all existing properties that don't have one yet.

Inserts (property_id, price_uf, price_clp, recorded_at=first_seen_at) for every
active canonical property with a price but no existing snapshot.

Run once after deploying the price snapshot feature:
    python -m scripts.backfill_price_snapshots
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.app.database import SessionLocal, init_db


def backfill(dry_run: bool = False) -> None:
    init_db()  # ensures property_price_snapshots table exists
    db = SessionLocal()
    try:
        # Count properties without any snapshot
        missing = db.execute(text("""
            SELECT COUNT(*)
            FROM properties p
            WHERE p.is_canonical = TRUE
              AND p.price_uf IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM property_price_snapshots s
                  WHERE s.property_id = p.id
              )
        """)).scalar()

        print(f"Properties without a price snapshot: {missing}")

        if missing == 0:
            print("Nothing to backfill.")
            return

        if dry_run:
            print("[DRY RUN] Would insert", missing, "snapshots. Re-run without --dry-run to apply.")
            return

        result = db.execute(text("""
            INSERT INTO property_price_snapshots (id, property_id, price_uf, price_clp, recorded_at)
            SELECT
                gen_random_uuid(),
                p.id,
                p.price_uf,
                p.price_clp,
                p.first_seen_at   -- use original first-seen date as the baseline timestamp
            FROM properties p
            WHERE p.is_canonical = TRUE
              AND p.price_uf IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM property_price_snapshots s
                  WHERE s.property_id = p.id
              )
        """))
        db.commit()
        print(f"Inserted {result.rowcount} baseline price snapshots.")
    finally:
        db.close()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    backfill(dry_run=dry_run)
