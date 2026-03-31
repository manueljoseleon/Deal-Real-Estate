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
import asyncio
import json
import logging
import random
import re
from typing import Optional
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

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

    async def scrape_sales(self, communes: list[str], enrich: bool = True) -> list[dict]:
        return await self._scrape(communes, listing_type="sale", enrich=enrich)

    async def scrape_rentals(self, communes: list[str], enrich: bool = True) -> list[dict]:
        return await self._scrape(communes, listing_type="rental", enrich=enrich)

    async def _scrape(self, communes: list[str], listing_type: str, enrich: bool = True) -> list[dict]:
        uf_rate = await self.get_uf_value()
        results: list[dict] = []

        async with async_playwright() as pw:
            context = await self._make_browser_context(pw)
            page = await context.new_page()

            if HAS_STEALTH:
                await stealth_async(page)

            for i, commune in enumerate(communes):
                slug = COMMUNE_SLUGS.get(commune)
                if not slug:
                    logger.warning("No slug for commune '%s' — skipping", commune)
                    continue

                if i > 0:
                    await self.jitter()  # pause between communes to avoid rate-limiting

                listings = await self._scrape_commune(page, slug, commune, listing_type, uf_rate, enrich=enrich)
                results.extend(listings)
                logger.info("[%s] %s %s: %d listings", self.portal_name, listing_type, commune, len(listings))

            await context.close()

        return results

    async def _scrape_commune(
        self,
        page,
        slug: str,
        commune: str,
        listing_type: str,
        uf_rate: float,
        enrich: bool = True,
    ) -> list[dict]:
        action = "arriendo" if listing_type == "rental" else "venta"
        search_url = f"{BASE_URL}/{action}/departamento/metropolitana/{slug}?page=1"

        # Load page 1 and capture the API URL + response body using expect_response
        # (browser navigation avoids the 403 that programmatic fetch() triggers)
        page1_data: dict | None = None
        filtros_raw: str | None = None

        try:
            async with page.expect_response(
                lambda r: API_PATH in r.url,
                timeout=30000,
            ) as response_info:
                await page.goto(search_url, wait_until="domcontentloaded", timeout=45000)

            captured_resp = await response_info.value
            captured_url = captured_resp.url
            parsed = urlparse(captured_url)
            qs = parse_qs(parsed.query)
            filtros_raw = qs.get("filtros", [None])[0]
            if captured_resp.ok:
                try:
                    page1_data = await captured_resp.json()
                except Exception:
                    pass
        except Exception as e:
            logger.warning("No API call captured for %s %s: %s", commune, listing_type, e)
            return []

        if not filtros_raw:
            logger.warning("Could not extract filtros for %s %s", commune, listing_type)
            return []

        listings: list[dict] = []

        # Page 1: use the already-captured response body (avoids programmatic fetch 403)
        # Pages 2+: use browser fetch() with credentials
        for page_num in range(1, MAX_PAGES + 1):
            if page_num == 1 and page1_data:
                response_data = page1_data
            else:
                api_url = f"{BASE_URL}{API_PATH}?filtros={filtros_raw}&page={page_num}"
                try:
                    response_data = await page.evaluate(f"""
                        async () => {{
                            const res = await fetch({json.dumps(api_url)}, {{
                                credentials: 'include',
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
                    logger.error("API fetch page %d: %s", page_num, e)
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

        if not enrich:
            return listings

        # Enrich listings with coordinates + area from detail pages.
        # Use browser-based fetch() (no page navigation) to avoid rate-limiting.
        logger.info("[%s] enriching %d listings…", self.portal_name, len(listings))
        coords_found = 0
        area_found = 0
        images_enriched = 0
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
            # Replace single thumbnail with full gallery if detail page has more images
            if extras.get("images") and len(extras["images"]) > len(listing.get("images") or []):
                listing["images"] = extras["images"]
                images_enriched += 1
            # Longer jitter on detail fetches to avoid progressive rate-limiting
            await asyncio.sleep(random.uniform(1.5, 3.0))

        logger.info(
            "[%s] coords: %d/%d  area filled: %d  images enriched: %d",
            self.portal_name, coords_found, len(listings), area_found, images_enriched,
        )
        return listings

    async def _fetch_detail_data(self, page, url: str) -> dict:
        """
        Fetch a listing detail page and extract coords, area, and gallery images.

        Strategy:
          1. browser fetch() — reuses session cookies, no navigation overhead.
          2. page.goto() fallback — used when fetch() returns no coords OR no images
             (e.g. bot-check page, short HTML, or gallery not in server-rendered HTML).
        """
        result: dict = {}
        html = ""

        # --- Primary: browser fetch() — uses session cookies, no navigation overhead ---
        try:
            html = await page.evaluate(f"""
                async () => {{
                    const res = await fetch({json.dumps(url)}, {{
                        credentials: 'include',
                        headers: {{'Accept': 'text/html'}}
                    }});
                    return res.ok ? await res.text() : '';
                }}
            """) or ""
        except Exception:
            pass

        # --- Extract gallery images from fetch() HTML ---
        images = self._extract_images_from_html(html)

        # --- Coordinates from server-rendered HTML ---
        m = re.search(r'"coordenadas"\s*:\s*\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]', html)
        if not m:
            m = re.search(r'(?:maps\.google\.com/\?q=|google\.com/maps\?q=)(-?\d+\.\d+),(-?\d+\.\d+)', html)

        # --- Fallback: full page navigation when fetch() gave no coords OR no images ---
        # This handles bot-check pages, short/blocked responses, and JS-only galleries.
        if not m or not images:
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                nav_html = await page.content()

                # Re-extract images from the fully rendered page if still missing
                if not images:
                    images = self._extract_images_from_html(nav_html)

                if not m:
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

                # Page is now rendered — try DOM queries for area (spec tables are client-side)
                try:
                    area_from_specs = await page.evaluate(r"""
                        () => {
                            for (const h4 of document.querySelectorAll('.f-programa-text h4, [class*="ficha"] h4')) {
                                const text = h4.textContent.toLowerCase();
                                if (text.includes('construida') || text.includes('útil') || text.includes('util')) {
                                    const next = h4.nextElementSibling;
                                    if (next) return next.textContent.trim();
                                }
                            }
                            return null;
                        }
                    """)
                    if area_from_specs:
                        val = self.parse_float(re.sub(r'[^\d.,]', '', area_from_specs).replace(',', '.'))
                        if val and val > 0:
                            result["useful_area_m2"] = val
                except Exception:
                    pass

                html = nav_html  # use rendered HTML for regex area extraction below
            except Exception:
                pass

        if m:
            lat, lng = float(m.group(1)), float(m.group(2))
            if -34.2 <= lat <= -33.0 and -71.5 <= lng <= -70.0:
                result["lat"] = lat
                result["lng"] = lng

        if images:
            result["images"] = images

        # --- Area from raw HTML (two strategies, in priority order) ---
        if html and "useful_area_m2" not in result:
            # 1. JSON blob embedded in server-rendered HTML
            #    e.g. "superficieConstruida":56  /  "superficieTerreno":56
            m_json_const = re.search(r'"superficieConstruida"\s*:\s*(\d+(?:\.\d+)?)', html)
            # 2. Label+value in rendered DOM
            #    e.g. <h4>Superficie construida:</h4><strong>56<!-- --> m²</strong>
            m_label = re.search(
                r'Superficie\s+(?:útil|util|construida)\s*:\s*</h4>\s*<strong>\s*([\d,.]+)',
                html, re.IGNORECASE
            )
            if m_label:
                val = self.parse_float(m_label.group(1).replace(",", "."))
                if val and val > 0:
                    result["useful_area_m2"] = val
            elif m_json_const:
                val = self.parse_float(m_json_const.group(1))
                if val and val > 0:
                    result["useful_area_m2"] = val

        # Terreno → total_area_m2 (B6: fallback for casas with no "Superficie Útil")
        if html and "total_area_m2" not in result:
            m_label_terr = re.search(
                r'Superficie\s+terreno\s*:\s*</h4>\s*<strong>\s*([\d,.]+)',
                html, re.IGNORECASE
            )
            m_json_terr = re.search(r'"superficieTerreno"\s*:\s*(\d+(?:\.\d+)?)', html)
            if m_label_terr:
                val = self.parse_float(m_label_terr.group(1).replace(",", "."))
                if val and val > 0:
                    result["total_area_m2"] = val
            elif m_json_terr:
                val = self.parse_float(m_json_terr.group(1))
                if val and val > 0:
                    result["total_area_m2"] = val

        # --- Description ---
        if html:
            # 1. JSON blob: "descripcion":"texto..."
            m_desc = re.search(r'"descripcion"\s*:\s*"((?:[^"\\]|\\.)*)"', html)
            if m_desc:
                desc = m_desc.group(1).replace('\\n', '\n').replace('\\"', '"').replace('\\/', '/').strip()
                if desc:
                    result["description"] = desc
            # 2. Fallback: rendered HTML — look for the description section
            if "description" not in result:
                m_desc_html = re.search(
                    r'class="[^"]*(?:descripcion|description|ficha-desc)[^"]*"[^>]*>\s*([\s\S]{20,2000?}?)\s*</',
                    html, re.IGNORECASE
                )
                if m_desc_html:
                    import html as html_lib
                    raw = re.sub(r'<[^>]+>', ' ', m_desc_html.group(1))
                    desc = html_lib.unescape(raw).strip()
                    if len(desc) > 20:
                        result["description"] = desc

        return result

    def _toctoc_img_url(self, url: str) -> str:
        """
        Apply two transformations required by TocToc's CDN:
          1. Add "n_wm_" prefix to the image filename (CDN returns 4xx without it).
          2. For images on the /new/ path structure, change extension .jpg → .webp
             (the CDN only stores the WebP variant for this newer storage layout).
        Both transforms are idempotent.
        """
        if not url:
            return url
        # Only transform /toctoc/fotos/ paths — leave logos, banners etc. alone
        if "/toctoc/fotos/" not in url:
            return url

        # Step 1: add n_wm_ prefix if missing
        if "n_wm_" not in url:
            slash_idx = url.rfind("/")
            if slash_idx != -1:
                url = url[: slash_idx + 1] + "n_wm_" + url[slash_idx + 1 :]

        # Step 2: /new/ path format stores WebP only — swap .jpg → .webp
        if "/toctoc/fotos/new/" in url and url.lower().endswith(".jpg"):
            url = url[:-4] + ".webp"

        return url

    def _extract_images_from_html(self, html: str) -> list[str]:
        """
        Extract gallery image URLs from TocToc HTML using two strategies:
          1. "fotos" JSON array (embedded in server-rendered HTML) — uses bracket
             counting to correctly handle nested arrays inside photo objects.
          2. CloudFront URL regex — catches all /toctoc/fotos/ URLs directly.
        All extracted URLs are run through _toctoc_img_url to add the n_wm_ prefix
        that TocToc's CDN requires (raw hash URLs return 404).
        Returns up to 8 deduplicated image URLs.
        """
        if not html:
            return []

        images: list[str] = []

        # Strategy 1: "fotos":[{src:...},...]  JSON array with proper bracket counting.
        # Simple .*? regex fails when photo objects contain nested arrays (e.g. tags:[]).
        m_start = re.search(r'"fotos"\s*:\s*\[', html)
        if m_start:
            arr_json = self._extract_balanced_array(html, m_start.end() - 1)
            if arr_json is not None:
                try:
                    for foto in arr_json:
                        if not isinstance(foto, dict):
                            continue
                        src = foto.get("src") or foto.get("url") or foto.get("imagen")
                        if src and isinstance(src, str) and src.startswith("http"):
                            images.append(self._toctoc_img_url(src))
                except Exception:
                    pass

        # Strategy 2: scan for CloudFront /toctoc/fotos/ URLs anywhere in the HTML.
        # Handles the common case where images appear as src/href attributes rather
        # than inside a JSON blob.
        if not images:
            cf_urls = re.findall(
                r'https://d1cfu8v5n1wsm\.cloudfront\.net/toctoc/fotos/[^\s"\'<>]+',
                html,
            )
            seen: set[str] = set()
            for u in cf_urls:
                u = u.split("?")[0]          # strip query strings
                u = self._toctoc_img_url(u)  # add n_wm_ prefix
                if u not in seen:
                    seen.add(u)
                    images.append(u)

        return images[:8]

    def _extract_balanced_array(self, html: str, start: int):
        """
        Parse a JSON array from `html` starting at `start` (the index of '['),
        using bracket counting to correctly handle nested arrays and objects.
        Returns the parsed list, or None on failure.
        """
        depth = 0
        in_string = False
        escape_next = False
        for i, c in enumerate(html[start:]):
            if escape_next:
                escape_next = False
                continue
            if c == "\\" and in_string:
                escape_next = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(html[start : start + i + 1])
                    except Exception:
                        return None
        return None

    async def _jitter_short(self):
        """Shorter jitter for coordinate-only page visits."""
        await asyncio.sleep(random.uniform(0.4, 0.9))

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

        # Images — API returns raw hash URL; TocToc CDN requires n_wm_ prefix to serve it
        images: list[str] = []
        main_img = (item.get("imagenPrincipal") or {}).get("src")
        if main_img:
            images = [self._toctoc_img_url(main_img)]

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
