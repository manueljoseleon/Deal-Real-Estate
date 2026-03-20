"""
TocToc scraper (toctoc.com).

Strategy:
  TocToc has an internal JSON API at /gw-lista-seo/propiedades?filtros=[...]
  that returns 20 listings/page with full data (price UF+CLP, area, bedrooms,
  bathrooms, images, URL). We load the first search page with Playwright to
  capture the filtros parameter, then call the API directly for all subsequent
  pages — no need to visit individual listing detail pages.

  API response shape:
    { total: int, page: int, results: [ {idProperty, titulo, precios, superficie,
      dormitorios, bannos, urlFicha, imagenPrincipal, comuna, region, ...} ] }

URL patterns (search pages — used only to capture the API filtros):
  Sales:   /venta/departamento/metropolitana/{commune-slug}
  Rentals: /arriendo/departamento/metropolitana/{commune-slug}
"""
import json
import re
from typing import Optional
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright

try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False

from backend.app.scrapers.base import BaseScraper


COMMUNE_SLUGS: dict[str, str] = {
    "Providencia": "providencia",
    "Las Condes":  "las-condes",
    "Ñuñoa":       "nunoa",
    "Santiago":    "santiago",
    "Vitacura":    "vitacura",
    "San Miguel":  "san-miguel",
    "Maipú":       "maipu",
}

BASE_URL    = "https://www.toctoc.com"
API_PATH    = "/gw-lista-seo/propiedades"
RESULTS_PER_PAGE = 20
MAX_PAGES   = 50   # 20 * 50 = 1000 max listings per commune/type (early-stop uses API total)


class TocTocScraper(BaseScraper):
    portal_name = "toctoc"

    async def scrape_sales(self, communes: list[str]) -> list[dict]:
        return await self._scrape(communes, listing_type="sale")

    async def scrape_rentals(self, communes: list[str]) -> list[dict]:
        return await self._scrape(communes, listing_type="rental")

    async def _scrape(self, communes: list[str], listing_type: str) -> list[dict]:
        uf_rate = await self.get_uf_value()
        results: list[dict] = []

        async with async_playwright() as pw:
            context = await self._make_browser_context(pw)
            page = await context.new_page()

            if HAS_STEALTH:
                await stealth_async(page)

            for commune in communes:
                slug = COMMUNE_SLUGS.get(commune)
                if not slug:
                    print(f"[WARN] No slug for commune '{commune}' — skipping")
                    continue

                listings = await self._scrape_commune(page, slug, commune, listing_type, uf_rate)
                results.extend(listings)
                print(f"[{self.portal_name}] {listing_type} {commune}: {len(listings)} listings")

            await context.close()

        return results

    async def _scrape_commune(
        self,
        page,
        slug: str,
        commune: str,
        listing_type: str,
        uf_rate: float,
    ) -> list[dict]:
        action = "arriendo" if listing_type == "rental" else "venta"
        search_url = f"{BASE_URL}/{action}/departamento/metropolitana/{slug}?page=1"

        # Load page 1 and capture the API URL (to extract the `filtros` parameter)
        api_url_captured: list[str] = []

        async def on_response(resp):
            if API_PATH in resp.url and not api_url_captured:
                api_url_captured.append(resp.url)

        page.on("response", on_response)
        try:
            await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(3000)
        except Exception as e:
            print(f"[ERROR] Could not load {search_url}: {e}")
            page.remove_listener("response", on_response)
            return []
        page.remove_listener("response", on_response)

        if not api_url_captured:
            print(f"[WARN] No API call captured for {commune} {listing_type}")
            return []

        # Extract `filtros` from the captured URL
        parsed = urlparse(api_url_captured[0])
        qs = parse_qs(parsed.query)
        filtros_raw = qs.get("filtros", [None])[0]
        if not filtros_raw:
            print(f"[WARN] Could not extract filtros for {commune}")
            return []

        listings: list[dict] = []

        # Fetch all pages via the API using the browser's fetch() (reuses session/cookies)
        for page_num in range(1, MAX_PAGES + 1):
            api_url = f"{BASE_URL}{API_PATH}?filtros={filtros_raw}&page={page_num}"

            try:
                response_data = await page.evaluate(f"""
                    async () => {{
                        const res = await fetch({json.dumps(api_url)}, {{
                            headers: {{
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            }}
                        }});
                        if (!res.ok) return null;
                        return await res.json();
                    }}
                """)
            except Exception as e:
                print(f"[ERROR] API fetch page {page_num}: {e}")
                break

            if not response_data or not isinstance(response_data, dict):
                break

            results_raw = response_data.get("results") or []
            if not results_raw:
                break

            for item in results_raw:
                parsed_listing = self._parse_result(item, commune, listing_type, uf_rate)
                if parsed_listing:
                    listings.append(parsed_listing)

            # Stop if we've seen all results
            total = response_data.get("total", 0)
            if page_num * RESULTS_PER_PAGE >= total:
                break

            await self.jitter()

        # Enrich listings with coordinates + area from detail pages.
        # Use browser-based fetch() (no page navigation) to avoid rate-limiting.
        print(f"  [{self.portal_name}] enriching {len(listings)} listings…")
        coords_found = 0
        area_found = 0
        for listing in listings:
            extras = await self._fetch_detail_data(page, listing["url"])
            if extras.get("lat") is not None:
                listing["lat"] = extras["lat"]
                listing["lng"] = extras["lng"]
                coords_found += 1
            if listing.get("useful_area_m2") is None and extras.get("useful_area_m2"):
                listing["useful_area_m2"] = extras["useful_area_m2"]
                area_found += 1
            if listing.get("total_area_m2") is None and extras.get("total_area_m2"):
                listing["total_area_m2"] = extras["total_area_m2"]
            if not listing.get("description") and extras.get("description"):
                listing["description"] = extras["description"]
            # Longer jitter on detail fetches to avoid progressive rate-limiting
            import random, asyncio as _asyncio
            await _asyncio.sleep(random.uniform(1.5, 3.0))

        print(f"  [{self.portal_name}] coords: {coords_found}/{len(listings)}  area filled: {area_found}")
        return listings

    async def _fetch_detail_data(self, page, url: str) -> dict:
        """
        Fetch a listing detail page and extract coords + area.

        Strategy: use browser-based fetch() (no page.goto navigation) so that
        TocToc's session/cookies are reused without triggering the bot-detection
        that kicks in after many full-page navigations.
        Falls back to page.goto() only if the fetch() returns no coords.
        """
        import json as _json

        result: dict = {}
        html = ""

        # --- Primary: browser fetch() — uses session cookies, no navigation overhead ---
        try:
            html = await page.evaluate(f"""
                async () => {{
                    const res = await fetch({_json.dumps(url)}, {{
                        credentials: 'include',
                        headers: {{'Accept': 'text/html'}}
                    }});
                    return res.ok ? await res.text() : '';
                }}
            """) or ""
        except Exception:
            pass

        # --- Coordinates from window.INITIAL_STATE (always server-rendered) ---
        m = re.search(r'"coordenadas"\s*:\s*\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]', html)
        if not m:
            m = re.search(r'(?:maps\.google\.com/\?q=|google\.com/maps\?q=)(-?\d+\.\d+),(-?\d+\.\d+)', html)

        # --- Fallback: full page navigation (only if fetch() gave no coords) ---
        if not m:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                nav_html = await page.content()
                m = re.search(r'"coordenadas"\s*:\s*\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]', nav_html)
                if not m:
                    m = re.search(r'(?:maps\.google\.com/\?q=|google\.com/maps\?q=)(-?\d+\.\d+),(-?\d+\.\d+)', nav_html)
                if not m:
                    await page.evaluate("() => document.getElementById('laUbicacion')?.scrollIntoView()")
                    await page.wait_for_timeout(1500)
                    href = await page.evaluate("""
                        () => document.querySelector(
                            '#laUbicacion a[href*="maps.google"], #laUbicacion a[href*="google.com/maps"]'
                        )?.getAttribute('href') || null
                    """)
                    if href:
                        m = re.search(r'q=(-?\d+\.\d+),(-?\d+\.\d+)', href)
                html = nav_html  # use rendered HTML for area extraction below
            except Exception:
                pass

        if m:
            lat, lng = float(m.group(1)), float(m.group(2))
            if -34.2 <= lat <= -33.0 and -71.5 <= lng <= -70.0:
                result["lat"] = lat
                result["lng"] = lng

        # --- Area + description from raw HTML (server-rendered) ---
        if html:
            m_useful = re.search(r'superficie\s+(?:útil|construida|util)\s+de\s+([\d,.]+)', html, re.IGNORECASE)
            m_total  = re.search(r'superficie\s+total\s+de\s+([\d,.]+)', html, re.IGNORECASE)
            if m_useful:
                val = self.parse_float(m_useful.group(1).replace(",", "."))
                if val and val > 0:
                    result["useful_area_m2"] = val
            if m_total:
                val = self.parse_float(m_total.group(1).replace(",", "."))
                if val and val > 0:
                    result["total_area_m2"] = val

        return result

    async def _jitter_short(self):
        """Shorter jitter for coordinate-only page visits."""
        import random
        delay = random.uniform(0.4, 0.9)
        import asyncio
        await asyncio.sleep(delay)

    def _parse_result(
        self, item: dict, commune: str, listing_type: str, uf_rate: float
    ) -> Optional[dict]:
        """Parse a single listing dict from the /gw-lista-seo/propiedades API."""
        prop_id = item.get("idProperty")
        if not prop_id:
            return None

        external_id = f"TT-{prop_id}"
        url = item.get("urlFicha") or f"{BASE_URL}/propiedades/{prop_id}"

        # Must be a detail URL — skip search/category pages
        if not re.search(r"toctoc\.com/propiedades/", url):
            return None

        # Price — precios: [{order:0, prefix:"UF", value:"35,14"}, {order:1, prefix:"$", value:"1.400.000"}]
        price_uf: Optional[float] = None
        price_clp: Optional[float] = None
        for precio in (item.get("precios") or []):
            prefix = (precio.get("prefix") or "").strip()
            raw = (precio.get("value") or "").replace(".", "").replace(",", ".")
            try:
                val = float(raw)
                if prefix == "UF":
                    price_uf = val
                elif prefix == "$":
                    price_clp = val
            except (ValueError, TypeError):
                continue

        # Cross-fill missing price
        if price_uf and not price_clp:
            price_clp = self.uf_to_clp(price_uf, uf_rate)
        elif price_clp and not price_uf:
            price_uf = round(price_clp / uf_rate, 2) if uf_rate else None

        # Sanity check: reject absurd prices
        # Rental: max 2,000 UF/month | Sale: max 150,000 UF (~$6M USD)
        if listing_type == "rental" and price_uf and price_uf > 2000:
            return None
        if listing_type == "sale" and price_uf and price_uf > 150000:
            return None

        # Area — superficie: ["130", "130"] (useful, total)
        superficie = item.get("superficie") or []
        useful_area = self.parse_float(superficie[0]) if superficie else None
        total_area  = self.parse_float(superficie[1]) if len(superficie) > 1 else None

        # Bedrooms / bathrooms — arrays: ["4", "4"]
        dormitorios = item.get("dormitorios") or []
        bannos      = item.get("bannos") or []
        bedrooms    = self.parse_int(dormitorios[0]) if dormitorios else None
        bathrooms   = self.parse_int(bannos[0]) if bannos else None

        # Studio fallback
        titulo = item.get("titulo") or ""
        if bedrooms is None and "estudio" in titulo.lower():
            bedrooms = 1

        # Images
        images: list[str] = []
        main_img = (item.get("imagenPrincipal") or {}).get("src")
        if main_img:
            images = [main_img]

        # price_per_m2_uf only for sales
        price_per_m2_uf = None
        if listing_type == "sale" and price_uf and useful_area:
            price_per_m2_uf = round(price_uf / useful_area, 4)

        return {
            "external_id": external_id,
            "portal": self.portal_name,
            "url": url,
            "listing_type": listing_type,
            "title": titulo or None,
            "description": None,
            "property_type": "apartment",
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "useful_area_m2": useful_area,
            "total_area_m2": total_area,
            "floor": None,
            "parking": None,
            "storage": None,
            "price_clp": price_clp,
            "price_uf": price_uf,
            "price_per_m2_uf": price_per_m2_uf,
            "hoa_fee_clp": None,
            "commune": commune,
            "region": "Región Metropolitana",
            "neighborhood": None,
            "lat": None,
            "lng": None,
            "images": images,
        }
