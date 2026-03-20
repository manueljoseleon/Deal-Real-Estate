import uuid
from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Float,
    Numeric, SmallInteger, String, Text, ARRAY, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from backend.app.database import Base


class RentalComp(Base):
    """Rental listing used as a comparable for BTL yield calculation."""
    __tablename__ = "rental_comps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(200), nullable=False)
    portal = Column(String(50), nullable=False)
    url = Column(Text, nullable=False)
    market = Column(String(20), nullable=False, default="chile")

    # Listing details
    property_type = Column(String(20))   # apartment | house | studio
    bedrooms = Column(SmallInteger)
    bathrooms = Column(SmallInteger)
    useful_area_m2 = Column(Numeric(8, 2))

    # Pricing
    rent_clp = Column(BigInteger)        # Monthly rent
    rent_uf = Column(Numeric(8, 2))
    price_per_m2_clp = Column(BigInteger)  # rent_clp / useful_area_m2

    # Location
    commune = Column(String(100))
    region = Column(String(100))
    neighborhood = Column(String(100))
    lat = Column(Float)
    lng = Column(Float)
    location = Column(Geography(geometry_type="POINT", srid=4326))

    # Media (for deduplication)
    images = Column(ARRAY(Text))

    # Deduplication
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("property_clusters.id"), nullable=True)
    is_canonical = Column(Boolean, nullable=False, default=True)
    dedup_status = Column(String(30), default="pending")

    # Lifecycle
    is_active = Column(Boolean, nullable=False, default=True)
    first_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<RentalComp {self.portal}:{self.external_id} {self.commune} ${self.rent_clp}/mo>"
