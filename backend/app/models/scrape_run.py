import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, JSON, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from backend.app.database import Base


class ScrapeRun(Base):
    """Audit log for scraper executions."""
    __tablename__ = "scrape_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portal = Column(String(50), nullable=False)
    listing_type = Column(String(10), nullable=False)  # sale | rental
    communes = Column(JSON)                            # list of communes scraped

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    listings_found = Column(Integer, default=0)
    listings_new = Column(Integer, default=0)
    listings_updated = Column(Integer, default=0)
    listings_deduped = Column(Integer, default=0)

    status = Column(String(20), nullable=False, default="running")  # running | completed | failed
    error_message = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ScrapeRun {self.portal} {self.listing_type} {self.status}>"


class PropertyCluster(Base):
    """Groups duplicate listings of the same physical property."""
    __tablename__ = "property_clusters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_type = Column(String(10), nullable=False)  # sale | rental
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ImageHash(Base):
    """Perceptual hashes of listing images for deduplication."""
    __tablename__ = "image_hashes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), nullable=False)
    listing_type = Column(String(10), nullable=False)  # sale | rental
    image_url = Column(Text, nullable=False)
    phash = Column(String(16), nullable=False)         # 64-bit hex perceptual hash
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class DealAnalysis(Base):
    """Saved Deal Analyzer scenarios for a property."""
    __tablename__ = "deal_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    name = Column(String(100), nullable=False, default="Escenario base")
    inputs_json = Column(JSON, nullable=False)   # all deal inputs
    results_json = Column(JSON, nullable=False)  # full projection output
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<DealAnalysis {self.name} property={self.property_id}>"
