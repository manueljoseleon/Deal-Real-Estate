"""
Marks properties as btl_anomalous=TRUE when their estimated rent (IQR-filtered
median, scaled to property size) exceeds the highest actual rent among their comps.

This indicates the property is too large relative to its comp pool — the scaled
rent estimate is an artifact that no actual comparable supports.

Steps:
  1. Adds btl_anomalous column to DB if it doesn't exist yet.
  2. For every active canonical property with a matching_tier, fetches its comps,
     applies iterative IQR outlier removal on $/m², computes estimated rent, and
     checks if it exceeds max(comp.rent_clp).
  3. Updates btl_anomalous on each property and commits in batches.

Usage:
    cd <project_root>
    .venv/Scripts/python backend/scripts/mark_btl_anomalous.py
"""
import sys
import os
import logging
import statistics

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from sqlalchemy import text
from backend.app.database import SessionLocal
from backend.app.models.property import Property
from backend.app.services.matching import _TIERS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

PAGE_SIZE = 100
COMP_COLS = """
    rc.id, rc.useful_area_m2, rc.rent_clp
"""


# ---------------------------------------------------------------------------
# IQR outlier filter (mirrors frontend/lib/btl.ts filterOutlierComps)
# ---------------------------------------------------------------------------

def _percentile(sorted_vals: list[float], p: float) -> float:
    idx = p * (len(sorted_vals) - 1)
    lo, hi = int(idx), min(int(idx) + 1, len(sorted_vals) - 1)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] * (hi - idx) + sorted_vals[hi] * (idx - lo)


def filter_outlier_comps(comps: list[dict]) -> list[dict]:
    """Iterative IQR on rent_per_m2_clp, up to 3 rounds, guard ≥3 comps."""
    current = comps
    for _ in range(3):
        with_m2 = [c for c in current if c["rent_per_m2_clp"] is not None]
        if len(with_m2) < 4:
            break
        vals = sorted(c["rent_per_m2_clp"] for c in with_m2)
        q1 = _percentile(vals, 0.25)
        q3 = _percentile(vals, 0.75)
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outlier_ids = {
            c["id"] for c in with_m2
            if c["rent_per_m2_clp"] < lo or c["rent_per_m2_clp"] > hi
        }
        if not outlier_ids:
            break
        next_comps = [c for c in current if c["id"] not in outlier_ids]
        if len(next_comps) < 3:
            break
        current = next_comps
    return current


def compute_median(values: list[float]) -> float | None:
    if not values:
        return None
    return statistics.median(values)


# ---------------------------------------------------------------------------
# Fetch comps for a single property (mirrors /comps endpoint logic)
# ---------------------------------------------------------------------------

def fetch_comps(db, prop: Property) -> list[dict]:
    if not prop.matching_tier:
        return []

    tier_idx = prop.matching_tier
    radius_m, bedrooms_mode, area_tol, use_commune = _TIERS[tier_idx - 1]

    bedrooms = prop.bedrooms or 0
    prop_area = float(prop.useful_area_m2) if prop.useful_area_m2 else None
    has_location = prop.lat is not None and prop.lng is not None

    if bedrooms > 5:
        bedrooms_mode = "any"

    # Bedrooms clause
    if bedrooms_mode == "exact":
        bedrooms_clause = "AND rc.bedrooms = :bedrooms"
        bparams: dict = {"bedrooms": bedrooms}
    elif bedrooms_mode == "pm1":
        bedrooms_clause = "AND rc.bedrooms BETWEEN :bedrooms_min AND :bedrooms_max"
        bparams = {"bedrooms_min": max(0, bedrooms - 1), "bedrooms_max": bedrooms + 1}
    else:
        bedrooms_clause = ""
        bparams = {}

    # Area clause
    area_clause = ""
    aparams: dict = {}
    if prop_area and area_tol is not None:
        area_clause = "AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 BETWEEN :area_min AND :area_max)"
        aparams = {"area_min": prop_area * (1 - area_tol), "area_max": prop_area * (1 + area_tol)}

    if use_commune or not has_location:
        sql = f"""
            SELECT rc.id::text, rc.useful_area_m2, rc.rent_clp
            FROM rental_comps rc
            WHERE rc.is_canonical = TRUE AND rc.is_active = TRUE
              AND rc.property_type = :property_type
              AND rc.commune = :commune
              AND rc.rent_clp >= 50000
              AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 >= 15)
              {bedrooms_clause} {area_clause}
            ORDER BY rc.rent_clp LIMIT 50
        """
        params = {"property_type": prop.property_type, "commune": prop.commune, **bparams, **aparams}
    else:
        geo_area_clause = ""
        gparams: dict = {}
        if prop_area and area_tol is not None:
            geo_area_clause = "AND rc.useful_area_m2 BETWEEN :area_min AND :area_max"
            gparams = {"area_min": prop_area * (1 - area_tol), "area_max": prop_area * (1 + area_tol)}
        sql = f"""
            SELECT rc.id::text, rc.useful_area_m2, rc.rent_clp
            FROM rental_comps rc
            WHERE rc.is_canonical = TRUE AND rc.is_active = TRUE
              AND rc.property_type = :property_type
              AND rc.rent_clp >= 50000
              AND (rc.useful_area_m2 IS NULL OR rc.useful_area_m2 >= 15)
              {bedrooms_clause} {geo_area_clause}
              AND ST_DWithin(
                  rc.location,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  :radius_m
              )
            ORDER BY rc.rent_clp LIMIT 50
        """
        params = {
            "property_type": prop.property_type, "lat": prop.lat, "lng": prop.lng,
            "radius_m": radius_m, **bparams, **gparams,
        }

    rows = db.execute(text(sql), params).fetchall()

    # Dedup (same key as matching.py)
    dedup: dict[tuple, dict] = {}
    for r in rows:
        area = float(r.useful_area_m2) if r.useful_area_m2 else None
        key = (None, round(area) if area else None)  # bedrooms not in COMP_COLS, dedup by area
        rent_per_m2 = int(r.rent_clp / area) if (r.rent_clp and area) else None
        comp = {"id": r.id, "rent_clp": r.rent_clp, "useful_area_m2": area, "rent_per_m2_clp": rent_per_m2}
        existing = dedup.get(key)
        if existing is None or (r.rent_clp or 0) < (existing["rent_clp"] or 0):
            dedup[key] = comp

    return list(dedup.values())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def make_session():
    db = SessionLocal()
    db.execute(text("SET statement_timeout = '120s'"))
    return db


def main():
    db = make_session()

    # 1. Ensure column exists (needs long timeout for DDL on large table)
    db.execute(text("SET statement_timeout = '0'"))
    db.execute(text("""
        ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS btl_anomalous BOOLEAN DEFAULT FALSE
    """))
    db.commit()
    logger.info("btl_anomalous column ensured.")

    # 2. Fetch all candidate IDs (lightweight — avoids loading 17k objects at once)
    rows = db.execute(text("""
        SELECT id FROM properties
        WHERE is_active = TRUE AND is_canonical = TRUE
          AND matching_tier IS NOT NULL AND price_clp IS NOT NULL
        ORDER BY id
    """)).fetchall()
    db.close()

    prop_ids = [str(r.id) for r in rows]
    logger.info(f"Candidates: {len(prop_ids)}")

    marked_anomalous = 0
    marked_ok = 0

    for batch_start in range(0, len(prop_ids), PAGE_SIZE):
        batch_ids = prop_ids[batch_start: batch_start + PAGE_SIZE]
        db = make_session()
        try:
            props = db.query(Property).filter(Property.id.in_(batch_ids)).all()

            for prop in props:
                comps = fetch_comps(db, prop)
                if not comps:
                    prop.btl_anomalous = False
                    continue

                filtered = filter_outlier_comps(comps)
                if not filtered:
                    prop.btl_anomalous = False
                    continue

                prop_area = float(prop.useful_area_m2) if prop.useful_area_m2 else None

                normalized = []
                for c in filtered:
                    if prop_area and c["useful_area_m2"] and c["rent_clp"]:
                        normalized.append(int((c["rent_clp"] / c["useful_area_m2"]) * prop_area))

                estimated_rent = compute_median(normalized)
                if estimated_rent is None:
                    prop.btl_anomalous = False
                    continue

                max_comp_rent = max((c["rent_clp"] for c in filtered if c["rent_clp"]), default=0)
                is_anomalous = estimated_rent > max_comp_rent

                prop.btl_anomalous = is_anomalous
                if is_anomalous:
                    marked_anomalous += 1
                else:
                    marked_ok += 1

            db.commit()
            done = batch_start + len(props)
            logger.info(f"  {done}/{len(prop_ids)} — anomalous so far: {marked_anomalous}")
        except Exception as e:
            logger.error(f"Batch {batch_start} failed: {e}")
            db.rollback()
        finally:
            db.close()

    logger.info(
        f"Done. Anomalous: {marked_anomalous} | OK: {marked_ok} | "
        f"Total processed: {marked_anomalous + marked_ok}"
    )


if __name__ == "__main__":
    main()
