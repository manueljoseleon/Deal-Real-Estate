"""
Abstract base scraper. All portal scrapers inherit from this class.
Defines the contract: scrape_sales() and scrape_rentals() must be implemented.
"""
import asyncio
import random
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

import httpx
from playwright.async_api import async_playwright, Page, BrowserContext


class BaseScraper(ABC):
    """
    Base class for all portal scrapers.
    Provides shared Playwright browser management and UF rate fetching.
    """

    portal_name: str = "base"

    def __init__(self, delay_min: float = 1.0, delay_max: float = 3.0):
        self.delay_min = delay_min
        self.delay_max = delay_max
        self._uf_value: Optional[float] = None

    # -------------------------------------------------------------------------
    # Interface to implement in subclasses
    # -------------------------------------------------------------------------

    @abstractmethod
    async def scrape_sales(self, communes: list[str]) -> list[dict]:
        """Scrape sale listings for the given communes. Returns list of raw dicts."""
        ...

    @abstractmethod
    async def scrape_rentals(self, communes: list[str]) -> list[dict]:
        """Scrape rental listings for the given communes. Returns list of raw dicts."""
        ...

    # -------------------------------------------------------------------------
    # Shared helpers
    # -------------------------------------------------------------------------

    async def get_uf_value(self) -> float:
        """Fetch today's UF value from mindicador.cl (cached per scraper instance)."""
        if self._uf_value:
            return self._uf_value
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get("https://mindicador.cl/api/uf")
                resp.raise_for_status()
                data = resp.json()
                self._uf_value = float(data["serie"][0]["valor"])
                return self._uf_value
        except Exception:
            # Fallback to approximate value if API is down — log but don't crash
            print("[WARNING] Could not fetch UF from mindicador.cl — using fallback 40000")
            self._uf_value = 40000.0
            return self._uf_value

    async def jitter(self) -> None:
        """Random delay to avoid triggering anti-scraping measures."""
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))

    async def _make_browser_context(self, playwright) -> BrowserContext:
        """Creates a Playwright browser context with a realistic user-agent."""
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
            locale="es-CL",
        )
        return context

    @staticmethod
    def clp_to_uf(clp: Optional[int], uf_rate: float) -> Optional[float]:
        if clp is None or uf_rate <= 0:
            return None
        return round(clp / uf_rate, 2)

    @staticmethod
    def uf_to_clp(uf: Optional[float], uf_rate: float) -> Optional[int]:
        if uf is None or uf_rate <= 0:
            return None
        return int(uf * uf_rate)

    @staticmethod
    def normalize_property_type(raw: Optional[str]) -> Optional[str]:
        """Map Spanish portal labels to internal enum values."""
        if not raw:
            return None
        raw_lower = raw.lower().strip()
        if "departamento" in raw_lower or "depto" in raw_lower or "apartment" in raw_lower:
            return "apartment"
        if "casa" in raw_lower or "house" in raw_lower:
            return "house"
        if "estudio" in raw_lower or "studio" in raw_lower:
            return "studio"
        return "apartment"  # default for Chilean market

    @staticmethod
    def parse_int(value) -> Optional[int]:
        """Safe int conversion, returns None on failure."""
        try:
            return int(str(value).replace(".", "").replace(",", "").strip())
        except (ValueError, TypeError, AttributeError):
            return None

    @staticmethod
    def parse_float(value) -> Optional[float]:
        """Safe float conversion, returns None on failure."""
        try:
            return float(str(value).replace(",", ".").strip())
        except (ValueError, TypeError, AttributeError):
            return None
