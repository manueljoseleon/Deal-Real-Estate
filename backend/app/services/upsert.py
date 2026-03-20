"""
Upsert scraped listings into the database.
Uses PostgreSQL ON CONFLICT (external_id, portal) DO UPDATE.
"""
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session


def upsert_listings(db: Session, listings: list[dict], listing_type: str) -> dict:
    """
    Upsert a list of scraped listing dicts into properties or rental_comps.
    Returns stats: {new, updated}.
    """
    if not listings:
        return {"new": 0, "updated": 0}

    table = "properties" if listing_type == "sale" else "rental_comps"
    new_count = 0
    updated_count = 0

    for item in listings:
        if not item or not item.get("external_id") or not item.get("portal"):
            continue

        # Build location geography from lat/lng if available
        lat = item.get("lat")
        lng = item.get("lng")
        location_expr = (
            f"ST_SetSRID(ST_MakePoint({lng}, {lat}), 4326)::geography"
            if lat and lng
            else "NULL"
        )

        if listing_type == "sale":
            sql = text(f"""
                INSERT INTO properties (
                    id, external_id, portal, url, market,
                    title, description, property_type,
                    bedrooms, bathrooms, useful_area_m2, total_area_m2,
                    floor, parking, storage,
                    price_clp, price_uf, price_per_m2_uf, hoa_fee_clp,
                    commune, region, neighborhood,
                    lat, lng, location,
                    images, is_active, is_canonical, dedup_status,
                    first_seen_at, last_seen_at, created_at
                ) VALUES (
                    gen_random_uuid(), :external_id, :portal, :url, :market,
                    :title, :description, :property_type,
                    :bedrooms, :bathrooms, :useful_area_m2, :total_area_m2,
                    :floor, :parking, :storage,
                    :price_clp, :price_uf, :price_per_m2_uf, :hoa_fee_clp,
                    :commune, :region, :neighborhood,
                    :lat, :lng, {location_expr},
                    :images, TRUE, TRUE, 'pending',
                    NOW(), NOW(), NOW()
                )
                ON CONFLICT (external_id, portal) DO UPDATE SET
                    price_clp       = EXCLUDED.price_clp,
                    price_uf        = EXCLUDED.price_uf,
                    price_per_m2_uf = COALESCE(EXCLUDED.price_per_m2_uf, properties.price_per_m2_uf),
                    hoa_fee_clp     = COALESCE(EXCLUDED.hoa_fee_clp, properties.hoa_fee_clp),
                    useful_area_m2  = COALESCE(EXCLUDED.useful_area_m2, properties.useful_area_m2),
                    bedrooms        = COALESCE(EXCLUDED.bedrooms, properties.bedrooms),
                    bathrooms       = COALESCE(EXCLUDED.bathrooms, properties.bathrooms),
                    lat             = COALESCE(EXCLUDED.lat, properties.lat),
                    lng             = COALESCE(EXCLUDED.lng, properties.lng),
                    location        = COALESCE(EXCLUDED.location, properties.location),
                    neighborhood    = COALESCE(EXCLUDED.neighborhood, properties.neighborhood),
                    images          = CASE
                                        WHEN array_length(EXCLUDED.images, 1) > array_length(properties.images, 1)
                                        THEN EXCLUDED.images
                                        ELSE properties.images
                                      END,
                    is_active       = TRUE,
                    last_seen_at    = NOW()
                RETURNING (xmax = 0) AS is_insert
            """)
        else:
            sql = text(f"""
                INSERT INTO rental_comps (
                    id, external_id, portal, url, market,
                    property_type, bedrooms, bathrooms, useful_area_m2,
                    rent_clp, rent_uf,
                    commune, region, neighborhood,
                    lat, lng, location,
                    images, is_active, is_canonical, dedup_status,
                    first_seen_at, last_seen_at, created_at
                ) VALUES (
                    gen_random_uuid(), :external_id, :portal, :url, :market,
                    :property_type, :bedrooms, :bathrooms, :useful_area_m2,
                    :price_clp, :price_uf,
                    :commune, :region, :neighborhood,
                    :lat, :lng, {location_expr},
                    :images, TRUE, TRUE, 'pending',
                    NOW(), NOW(), NOW()
                )
                ON CONFLICT (external_id, portal) DO UPDATE SET
                    rent_clp      = EXCLUDED.rent_clp,
                    rent_uf       = EXCLUDED.rent_uf,
                    useful_area_m2 = COALESCE(EXCLUDED.useful_area_m2, rental_comps.useful_area_m2),
                    bedrooms      = COALESCE(EXCLUDED.bedrooms, rental_comps.bedrooms),
                    lat           = COALESCE(EXCLUDED.lat, rental_comps.lat),
                    lng           = COALESCE(EXCLUDED.lng, rental_comps.lng),
                    location      = COALESCE(EXCLUDED.location, rental_comps.location),
                    neighborhood  = COALESCE(EXCLUDED.neighborhood, rental_comps.neighborhood),
                    is_active     = TRUE,
                    last_seen_at  = NOW()
                RETURNING (xmax = 0) AS is_insert
            """)

        params = {
            "external_id": item.get("external_id"),
            "portal": item.get("portal"),
            "url": item.get("url", ""),
            "market": item.get("market", "chile"),
            "title": item.get("title"),
            "description": item.get("description"),
            "property_type": item.get("property_type"),
            "bedrooms": item.get("bedrooms"),
            "bathrooms": item.get("bathrooms"),
            "useful_area_m2": item.get("useful_area_m2"),
            "total_area_m2": item.get("total_area_m2"),
            "floor": item.get("floor"),
            "parking": item.get("parking"),
            "storage": item.get("storage"),
            "price_clp": item.get("price_clp") or item.get("rent_clp"),
            "price_uf": item.get("price_uf") or item.get("rent_uf"),
            "price_per_m2_uf": item.get("price_per_m2_uf"),
            "hoa_fee_clp": item.get("hoa_fee_clp"),
            "commune": item.get("commune"),
            "region": item.get("region"),
            "neighborhood": (item.get("neighborhood") or "")[:100] or None,
            "lat": lat,
            "lng": lng,
            "images": item.get("images") or [],
        }

        try:
            result = db.execute(sql, params).fetchone()
            if result and result[0]:
                new_count += 1
            else:
                updated_count += 1
        except Exception as e:
            db.rollback()
            print(f"[WARN] Skipping {item.get('external_id')} — DB error: {e.__class__.__name__}: {str(e)[:120]}")
            continue

    db.commit()
    return {"new": new_count, "updated": updated_count}


def mark_stale_inactive(db: Session, hours: int = 48) -> int:
    """Mark listings not seen in the last N hours as inactive."""
    result = db.execute(
        text("""
            UPDATE properties SET is_active = FALSE
            WHERE is_active = TRUE
              AND last_seen_at < NOW() - INTERVAL ':hours hours'
        """),
        {"hours": hours},
    )
    db.execute(
        text("""
            UPDATE rental_comps SET is_active = FALSE
            WHERE is_active = TRUE
              AND last_seen_at < NOW() - INTERVAL ':hours hours'
        """),
        {"hours": hours},
    )
    db.commit()
    return result.rowcount
