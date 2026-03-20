import uuid
from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float,
    Integer, Numeric, SmallInteger, String, Text, ARRAY, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from backend.app.database import Base


class Property(Base):
    """Sale listing scraped from a portal."""
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(200), nullable=False)
    portal = Column(String(50), nullable=False)  # portal_inmobiliario | yapo | toctoc
    url = Column(Text, nullable=False)
    market = Column(String(20), nullable=False, default="chile")

    # Listing details
    title = Column(Text)
    description = Column(Text)
    property_type = Column(String(20))  # apartment | house | studio
    bedrooms = Column(SmallInteger)
    bathrooms = Column(SmallInteger)
    useful_area_m2 = Column(Numeric(8, 2))
    total_area_m2 = Column(Numeric(8, 2))
    floor = Column(SmallInteger)
    parking = Column(Boolean)
    storage = Column(Boolean)

    # Pricing
    price_clp = Column(BigInteger)
    price_uf = Column(Numeric(10, 2))
    hoa_fee_clp = Column(BigInteger)           # Gastos comunes / month
    contributions_clp_annual = Column(BigInteger)  # Contribuciones / year

    # Location
    commune = Column(String(100))
    region = Column(String(100))
    neighborhood = Column(String(100))         # Barrio / sector label
    lat = Column(Float)
    lng = Column(Float)
    location = Column(Geography(geometry_type="POINT", srid=4326))  # PostGIS

    # Media
    images = Column(ARRAY(Text))

    # BTL analysis results (computed by matching service)
    gross_yield_pct = Column(Numeric(5, 2))
    estimated_monthly_rent_clp = Column(BigInteger)
    comparable_rent_count = Column(SmallInteger)
    price_per_m2_clp = Column(BigInteger)
    price_per_m2_uf = Column(Numeric(10, 4))   # price_uf / useful_area_m2
    matching_tier = Column(SmallInteger)       # 1=tightest geo, 6=commune fallback

    # Deduplication
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("property_clusters.id"), nullable=True)
    is_canonical = Column(Boolean, nullable=False, default=True)
    dedup_status = Column(String(30), default="pending")  # pending | confirmed | probable_duplicate

    # Lifecycle
    is_active = Column(Boolean, nullable=False, default=True)
    first_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        # Enables upsert: ON CONFLICT (external_id, portal) DO UPDATE
        {"schema": None},
    )

    def __repr__(self) -> str:
        return f"<Property {self.portal}:{self.external_id} {self.commune} UF{self.price_uf}>"
