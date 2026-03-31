"""
pHash-based deduplication service.

Pipeline:
  1. Download first image of each listing and compute pHash (stored in image_hashes)
  2. Find candidate pairs via SQL spatial join (ST_DWithin 150m) or commune fallback
  3. Compare pHashes — Hamming distance ≤ threshold → confirmed duplicate
  4. Group duplicates into clusters, elect canonical per cluster
  5. Mark non-canonicals with is_canonical=FALSE, dedup_status='confirmed'

Canonical election priority: most images > has coords > has area > lowest price > oldest
"""
import io
import logging
import uuid
from collections import defaultdict
from typing import Optional

logger = logging.getLogger(__name__)

import httpx
import imagehash
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.scrape_run import PropertyCluster


_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}
_IMAGE_TIMEOUT = 10  # seconds per image


def _fetch_phash(url: str) -> Optional[str]:
    """Download an image URL and return its 64-bit pHash as 16-char hex, or None."""
    try:
        with httpx.Client(timeout=_IMAGE_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(url, headers=_HEADERS)
            if resp.status_code != 200:
                return None
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            return str(imagehash.phash(img))
    except Exception:
        return None


def _hamming(h1: str, h2: str) -> int:
    """Hamming distance between two 16-char hex pHash strings (0-64)."""
    try:
        return bin(int(h1, 16) ^ int(h2, 16)).count("1")
    except (ValueError, TypeError):
        return 64


def _hash_images_batch(db: Session, listing_type: str, table: str) -> int:
    """
    For all active canonical listings without any hash yet,
    download their first image and store the pHash.
    Returns total hashes stored.
    """
    rows = db.execute(
        text(f"""
            SELECT p.id, p.images[1] AS first_image
            FROM {table} p
            WHERE p.is_active = TRUE
              AND p.is_canonical = TRUE
              AND p.images IS NOT NULL
              AND array_length(p.images, 1) > 0
              AND p.id NOT IN (
                  SELECT DISTINCT listing_id
                  FROM image_hashes
                  WHERE listing_type = :lt
              )
        """),
        {"lt": listing_type},
    ).fetchall()

    stored = 0
    total = len(rows)
    logger.info("[dedup] Hashing %d %s listings (first image each)...", total, listing_type)

    for i, row in enumerate(rows, 1):
        lid, url = row[0], row[1]
        if not url:
            continue
        phash = _fetch_phash(url)
        if phash is None:
            continue
        db.execute(
            text("""
                INSERT INTO image_hashes
                    (id, listing_id, listing_type, image_url, phash, created_at)
                VALUES
                    (gen_random_uuid(), :lid, :lt, :url, :phash, NOW())
                ON CONFLICT DO NOTHING
            """),
            {"lid": lid, "lt": listing_type, "url": url, "phash": phash},
        )
        stored += 1
        if stored % 50 == 0:
            db.commit()
            logger.info("  %d/%d checked, %d hashes stored", i, total, stored)

    db.commit()
    logger.info("[dedup] Hashing done: %d hashes stored", stored)
    return stored


def _find_candidate_pairs(db: Session, listing_type: str, table: str) -> list[tuple]:
    """
    Return all (id_a, id_b) pairs that are:
    - Within geo_dedup_radius_m of each other (if both have coords)
    - OR same commune+bedrooms+property_type (fallback for listings without coords)

    Only pairs where both have a stored pHash are returned.
    """
    radius = settings.geo_dedup_radius_m

    # Geo-based pairs (both have location)
    geo_pairs = db.execute(
        text(f"""
            SELECT a.id, b.id
            FROM {table} a
            JOIN {table} b ON (
                a.id < b.id
                AND a.property_type = b.property_type
                AND COALESCE(a.bedrooms, -1) = COALESCE(b.bedrooms, -1)
                AND a.is_active = TRUE AND b.is_active = TRUE
                AND a.is_canonical = TRUE AND b.is_canonical = TRUE
                AND ST_DWithin(a.location, b.location, :radius)
            )
            WHERE a.location IS NOT NULL AND b.location IS NOT NULL
              AND a.id IN (SELECT DISTINCT listing_id FROM image_hashes WHERE listing_type = :lt)
              AND b.id IN (SELECT DISTINCT listing_id FROM image_hashes WHERE listing_type = :lt)
        """),
        {"radius": radius, "lt": listing_type},
    ).fetchall()

    # Commune fallback pairs (either lacks coords) — only cross-portal to avoid false positives
    commune_pairs = db.execute(
        text(f"""
            SELECT a.id, b.id
            FROM {table} a
            JOIN {table} b ON (
                a.id < b.id
                AND a.commune = b.commune
                AND a.property_type = b.property_type
                AND COALESCE(a.bedrooms, -1) = COALESCE(b.bedrooms, -1)
                AND a.portal != b.portal
                AND a.is_active = TRUE AND b.is_active = TRUE
                AND a.is_canonical = TRUE AND b.is_canonical = TRUE
                AND (a.location IS NULL OR b.location IS NULL)
            )
            WHERE a.id IN (SELECT DISTINCT listing_id FROM image_hashes WHERE listing_type = :lt)
              AND b.id IN (SELECT DISTINCT listing_id FROM image_hashes WHERE listing_type = :lt)
        """),
        {"lt": listing_type},
    ).fetchall()

    all_pairs = list({(min(a, b), max(a, b)) for a, b in geo_pairs + commune_pairs})
    logger.info("[dedup] Candidate pairs: %d geo + %d commune = %d unique", len(geo_pairs), len(commune_pairs), len(all_pairs))
    return all_pairs


def _load_hashes(db: Session, listing_type: str) -> dict[uuid.UUID, list[str]]:
    """Load all stored pHashes grouped by listing_id."""
    rows = db.execute(
        text("SELECT listing_id, phash FROM image_hashes WHERE listing_type = :lt"),
        {"lt": listing_type},
    ).fetchall()
    result: dict[uuid.UUID, list[str]] = defaultdict(list)
    for lid, ph in rows:
        result[lid].append(ph)
    return result


def _elect_canonical(member_rows: list) -> uuid.UUID:
    """
    Choose the canonical listing from a cluster.
    Priority: most images > has coords > has area > lowest price > oldest.
    member_rows: list of (id, price, area, lat, img_count, first_seen_at)
    """
    def score(r):
        imgs = r[4] or 0
        has_lat = 1 if r[3] else 0
        has_area = 1 if r[2] else 0
        price = -(r[1] or 999_999_999_999)  # lower price preferred
        return (imgs, has_lat, has_area, price)

    return max(member_rows, key=score)[0]


def run_deduplication(db: Session, listing_type: str = "rental") -> dict:
    """
    Run full pHash deduplication for 'sale' or 'rental' listings.
    Returns a summary dict with counts.
    """
    table = "properties" if listing_type == "sale" else "rental_comps"
    price_col = "price_clp" if listing_type == "sale" else "rent_clp"

    # Step 1: Hash images
    hashes_stored = _hash_images_batch(db, listing_type, table)

    # Step 2: Find candidate pairs
    pairs = _find_candidate_pairs(db, listing_type, table)
    if not pairs:
        logger.info("[dedup] No candidate pairs found — nothing to deduplicate")
        return {
            "listing_type": listing_type,
            "hashes_stored": hashes_stored,
            "duplicate_groups": 0,
            "marked_non_canonical": 0,
        }

    # Step 3: Load all hashes and compare pairs
    hash_map = _load_hashes(db, listing_type)
    threshold = settings.phash_hamming_threshold

    # Union-Find
    parent: dict[uuid.UUID, uuid.UUID] = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        parent[find(x)] = find(y)

    confirmed_pairs = 0
    for id_a, id_b in pairs:
        hashes_a = hash_map.get(id_a, [])
        hashes_b = hash_map.get(id_b, [])
        matched = any(
            _hamming(h1, h2) <= threshold
            for h1 in hashes_a
            for h2 in hashes_b
        )
        if matched:
            union(id_a, id_b)
            confirmed_pairs += 1

    # Step 4: Group by cluster root
    all_ids = set()
    for a, b in pairs:
        all_ids.add(a)
        all_ids.add(b)
    for lid in all_ids:
        find(lid)  # ensure all have an entry

    clusters: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for lid in all_ids:
        clusters[find(lid)].append(lid)

    multi_clusters = {root: members for root, members in clusters.items() if len(members) > 1}
    logger.info("[dedup] %d confirmed duplicate pairs → %d clusters", confirmed_pairs, len(multi_clusters))

    # Step 5: Elect canonicals and update DB
    marked_non_canonical = 0
    for root, members in multi_clusters.items():
        # Create cluster record
        cluster = PropertyCluster(listing_type=listing_type)
        db.add(cluster)
        db.flush()

        # Load member details for canonical election
        member_rows = db.execute(
            text(f"""
                SELECT id, {price_col}, useful_area_m2, lat,
                       array_length(images, 1) as img_count,
                       first_seen_at
                FROM {table}
                WHERE id = ANY(:ids)
            """),
            {"ids": list(members)},
        ).fetchall()

        canonical_id = _elect_canonical(member_rows)

        for r in member_rows:
            mid = r[0]
            is_can = (mid == canonical_id)
            db.execute(
                text(f"""
                    UPDATE {table}
                    SET cluster_id   = :cid,
                        is_canonical = :is_can,
                        dedup_status = 'confirmed'
                    WHERE id = :id
                """),
                {"cid": cluster.id, "is_can": is_can, "id": mid},
            )
            if not is_can:
                marked_non_canonical += 1

    db.commit()
    logger.info("[dedup] Done: %d non-canonical listings marked", marked_non_canonical)

    return {
        "listing_type": listing_type,
        "hashes_stored": hashes_stored,
        "duplicate_groups": len(multi_clusters),
        "marked_non_canonical": marked_non_canonical,
    }
