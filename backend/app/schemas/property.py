from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator


class BTLAnalysis(BaseModel):
    gross_yield_pct: Optional[float]
    estimated_monthly_rent_clp: Optional[int]
    comparable_rent_count: Optional[int]
    matching_tier: Optional[int]
    yield_band: Optional[str]    # excellent | good | moderate | weak | unknown
    rent_min_clp: Optional[int] = None
    rent_max_clp: Optional[int] = None

    @field_validator("yield_band", mode="before")
    @classmethod
    def compute_yield_band(cls, v, info):
        # Allow override, but compute from yield if not set
        if v:
            return v
        yield_pct = info.data.get("gross_yield_pct")
        if yield_pct is None:
            return "unknown"
        if yield_pct >= 6.0:
            return "excellent"
        if yield_pct >= 5.0:
            return "good"
        if yield_pct >= 4.0:
            return "moderate"
        return "weak"


class PropertyListItem(BaseModel):
    id: UUID
    external_id: str
    portal: str
    url: str
    title: Optional[str]
    property_type: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    useful_area_m2: Optional[float]
    price_clp: Optional[int]
    price_uf: Optional[float]
    price_per_m2_clp: Optional[int]
    commune: Optional[str]
    neighborhood: Optional[str]
    hoa_fee_clp: Optional[int]
    images: Optional[list[str]]
    btl: Optional[BTLAnalysis]
    is_active: bool
    last_seen_at: datetime

    model_config = {"from_attributes": True}


class PropertyDetail(PropertyListItem):
    description: Optional[str]
    total_area_m2: Optional[float]
    floor: Optional[int]
    parking: Optional[bool]
    storage: Optional[bool]
    lat: Optional[float]
    lng: Optional[float]
    region: Optional[str]
    contributions_clp_annual: Optional[int]
    first_seen_at: datetime
    created_at: datetime


class PropertyListResponse(BaseModel):
    items: list[PropertyListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class RentalCompItem(BaseModel):
    id: UUID
    portal: str
    url: str
    commune: Optional[str]
    neighborhood: Optional[str]
    property_type: Optional[str]
    bedrooms: Optional[int]
    useful_area_m2: Optional[float]
    rent_clp: Optional[int]
    rent_uf: Optional[float]
    price_per_m2_clp: Optional[int]
    lat: Optional[float]
    lng: Optional[float]
    distance_m: Optional[int] = None   # metres from the sale property (None = commune fallback)

    model_config = {"from_attributes": True}
