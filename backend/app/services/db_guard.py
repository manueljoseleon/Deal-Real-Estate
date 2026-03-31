"""
db_guard.py — Safety guard for mass DB operations that modify images or other critical columns.

Usage (before any mass UPDATE on images):

    from backend.app.services.db_guard import backup_images

    backup_name = backup_images(db)          # creates images_backup_YYYYMMDD_HHMMSS
    # ... your mass update ...
    # If something goes wrong, restore with:
    #   SELECT id, images FROM <backup_name> WHERE images IS NOT NULL;

Restore example (SQL, run in Supabase SQL editor):
    UPDATE properties p
    SET images = b.images
    FROM images_backup_20240327_143000 b
    WHERE p.id = b.id AND b.images IS NOT NULL;
"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


def backup_images(db: Session, label: str = "") -> str:
    """
    Snapshot the current images array for all properties into a backup table.

    Returns the backup table name so the caller can log it / use it to restore.
    The backup table is permanent (not temporary) so it survives session restarts.

    Args:
        db:    SQLAlchemy session
        label: Optional short label appended to the table name for clarity
                (e.g. "before_url_fix"). Max 20 chars, alphanumeric + underscore.

    Returns:
        backup_table_name (str)
    """
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    suffix = f"_{label}" if label else ""
    table_name = f"images_backup_{ts}{suffix}"

    db.execute(text(f"""
        CREATE TABLE {table_name} AS
        SELECT id, portal, external_id, images, last_seen_at
        FROM properties
        WHERE images IS NOT NULL
          AND array_length(images, 1) > 0
    """))
    db.commit()

    count = db.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
    logger.info("[db_guard] Backup created: %s (%d rows with images)", table_name, count)
    logger.info(
        "[db_guard] To restore: UPDATE properties p SET images = b.images FROM %s b "
        "WHERE p.id = b.id AND b.images IS NOT NULL;",
        table_name,
    )
    return table_name


def list_backups(db: Session) -> list[str]:
    """Return all image backup table names, newest first."""
    rows = db.execute(text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'images_backup_%'
        ORDER BY table_name DESC
    """)).fetchall()
    return [r[0] for r in rows]


def restore_from_backup(db: Session, backup_table: str, dry_run: bool = True) -> int:
    """
    Restore images from a backup table into properties.

    Only overwrites rows where:
      - the backup has non-null images
      - the current property has NULL or empty images  (safe: never clobbers good data)

    Args:
        db:           SQLAlchemy session
        backup_table: Table name returned by backup_images()
        dry_run:      If True (default), only counts affected rows — does NOT write.

    Returns:
        Number of rows that would be (or were) updated.
    """
    count_sql = text(f"""
        SELECT COUNT(*)
        FROM properties p
        JOIN {backup_table} b ON b.id = p.id
        WHERE b.images IS NOT NULL
          AND array_length(b.images, 1) > 0
          AND (p.images IS NULL OR array_length(p.images, 1) = 0)
    """)
    count = db.execute(count_sql).scalar()

    if dry_run:
        logger.info("[db_guard] DRY RUN — would restore images for %d properties from %s", count, backup_table)
        return count

    db.execute(text(f"""
        UPDATE properties p
        SET images = b.images
        FROM {backup_table} b
        WHERE b.id = p.id
          AND b.images IS NOT NULL
          AND array_length(b.images, 1) > 0
          AND (p.images IS NULL OR array_length(p.images, 1) = 0)
    """))
    db.commit()
    logger.info("[db_guard] Restored images for %d properties from %s", count, backup_table)
    return count
