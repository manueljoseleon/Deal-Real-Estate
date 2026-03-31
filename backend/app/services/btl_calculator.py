"""
BTL (Buy-to-Let) yield calculator.

Pure functions — no DB access. Takes property data + comparable rents,
returns analysis results. Designed to be reusable across strategies.
"""
from statistics import median
from typing import Optional


def calculate_gross_yield(
    price_clp: int,
    monthly_rent_clp: int,
) -> float:
    """Gross yield = (annual rent / purchase price) * 100."""
    if not price_clp or price_clp <= 0:
        return 0.0
    return round((monthly_rent_clp * 12 / price_clp) * 100, 2)


def estimate_rent_from_comps(rent_values: list[int]) -> dict:
    """
    Given a list of monthly rents from comparable listings,
    return estimated rent and statistical context.
    """
    if not rent_values:
        return {
            "estimated_monthly_rent_clp": None,
            "rent_median_clp": None,
            "rent_min_clp": None,
            "rent_max_clp": None,
            "comp_count": 0,
        }

    sorted_rents = sorted(rent_values)
    # statistics.median returns the average of the two middle values for even-length lists,
    # so the 2-comp case is handled correctly without special-casing.
    return {
        "estimated_monthly_rent_clp": int(median(sorted_rents)),
        "rent_median_clp": int(median(sorted_rents)),
        "rent_min_clp": sorted_rents[0],
        "rent_max_clp": sorted_rents[-1],
        "comp_count": len(sorted_rents),
    }


def calculate_btl_summary(
    price_clp: int,
    price_uf: Optional[float],
    useful_area_m2: Optional[float],
    rent_values: list[int],
) -> dict:
    """
    Full BTL summary for a sale property given a list of comparable rents.
    Returns all fields needed to update the properties table.
    """
    rent_stats = estimate_rent_from_comps(rent_values)
    estimated_rent = rent_stats["estimated_monthly_rent_clp"]

    gross_yield = (
        calculate_gross_yield(price_clp, estimated_rent)
        if estimated_rent
        else None
    )
    # Sanity cap: yields above 50% are almost certainly bad data
    # (e.g. a bodega/parking misclassified as apartment, or absurd price)
    if gross_yield is not None and gross_yield > 50:
        gross_yield = None
        estimated_rent = None

    price_per_m2 = (
        int(price_clp / useful_area_m2)
        if useful_area_m2 and useful_area_m2 > 0
        else None
    )

    yield_band = _classify_yield(gross_yield)

    return {
        "gross_yield_pct": gross_yield,
        "estimated_monthly_rent_clp": estimated_rent,
        "comparable_rent_count": rent_stats["comp_count"],
        "price_per_m2_clp": price_per_m2,
        "rent_min_clp": rent_stats["rent_min_clp"],
        "rent_max_clp": rent_stats["rent_max_clp"],
        "yield_band": yield_band,
    }


def _classify_yield(gross_yield: Optional[float]) -> str:
    """Color band for UI display."""
    if gross_yield is None:
        return "unknown"
    if gross_yield >= 6.0:
        return "excellent"   # dark green
    if gross_yield >= 5.0:
        return "good"        # green
    if gross_yield >= 4.0:
        return "moderate"    # yellow
    return "weak"            # red
