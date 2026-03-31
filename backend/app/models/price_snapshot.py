import uuid
from datetime import datetime
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from backend.app.database import Base


class PropertyPriceSnapshot(Base):
    """
    Immutable record of a property's price at a point in time.

    A snapshot is inserted when:
    - A property is first scraped (baseline)
    - A subsequent scrape detects a price change (price_uf differs)

    Never updated — append-only audit trail.
    """
    __tablename__ = "property_price_snapshots"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    price_uf    = Column(Numeric(10, 2))
    price_clp   = Column(BigInteger)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<PriceSnapshot {self.property_id} UF{self.price_uf} @ {self.recorded_at}>"
