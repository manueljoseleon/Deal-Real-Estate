from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from backend.app.config import settings


engine = create_engine(
    settings.database_url.replace("postgresql://", "postgresql+psycopg://"),
    pool_pre_ping=True,     # reconnect on stale connections
    pool_size=5,
    max_overflow=10,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables and enable PostGIS + pg_trgm extensions."""
    from backend.app.models import Property, RentalComp, ScrapeRun, PropertyCluster, ImageHash, DealAnalysis  # noqa: F401

    # 1. Extensions
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        conn.commit()

    # 2. Create all tables
    Base.metadata.create_all(bind=engine)

    # 3. Add unique constraints (tables now exist)
    with engine.connect() as conn:
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_properties_external_portal'
                ) THEN
                    ALTER TABLE properties
                    ADD CONSTRAINT uq_properties_external_portal
                    UNIQUE (external_id, portal);
                END IF;
            END $$;
        """))
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_rental_comps_external_portal'
                ) THEN
                    ALTER TABLE rental_comps
                    ADD CONSTRAINT uq_rental_comps_external_portal
                    UNIQUE (external_id, portal);
                END IF;
            END $$;
        """))
        conn.commit()
