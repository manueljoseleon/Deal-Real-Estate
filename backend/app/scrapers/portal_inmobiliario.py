"""
Portal Inmobiliario scraper (portalinmobiliario.com).

Strategy:
  1. Check network requests for a search API endpoint.
  2. If not found, parse window.__INITIAL_STATE__ from the listing page JS — this
     object contains a full structured property dict with all attributes + lat/lng.
  3. Use playwright-stealth to handle Cloudflare protection.

URL patterns:
  Sales:   /venta/departamento/{commune-slug}-metropolitana/
  Rentals: /arriendo/departamento/{commune-slug}-metropolitana/

Pagination: offset via `_Desde_{N}` in the URL (48 listings/page).
"""
import json
import re
from typing import Optional
from playwright.async_api import async_playwright

try:
    from playwright_stealth import stealth_async
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False

from backend.app.scrapers.base import BaseScraper


# Map commune display names to URL slugs used by Portal Inmobiliario
COMMUNE_SLUGS: dict[str, str] = {
    "Providencia": "providencia",
    "Las Condes": "las-condes",
    "Ñuñoa": "nunoa",
    "Santiago": "santiago",
    "Vitacura": "vitacura",
    "San Miguel": "san-miguel",
    "Miraflores": "miraflores",
    "Quilicura": "quilicura",
    "Maipú": "maipu",
}

BASE_URL = "https://www.portalinmobiliario.com"
LISTINGS_PER_PAGE = 48


class PortalInmobiliarioScraper(BaseScraper):
    portal_name = "portal_inmobiliario"

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
                    print(f"[WARN] No URL slug for commune '{commune}' — skipping")
                    continue

                listings = await self._scrape_commune(
                    page, slug, commune, listing_type, uf_rate
                )
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
        listings: list[dict] = []
        offset = 1

        while True:
            url = (
                f"{BASE_URL}/{action}/departamento/{slug}-metropolitana/"
                f"_Desde_{offset}_NoIndex_True"
            )
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
                # Wait for JS to settle and any redirects to complete
                await page.wait_for_timeout(3000)
            except Exception as e:
                print(f"[ERROR] Failed to load {url}: {e}")
                break

            # Extract listing URLs — try multiple selectors robustly
            listing_urls = []
            for selector, expr in [
                ("a.poly-component__title", "els => els.map(el => el.href)"),
                ("a[href*='/MLC-']", "els => [...new Set(els.map(el => el.href))]"),
                ("a[href*='portalinmobiliario.com/MLC']", "els => [...new Set(els.map(el => el.href))]"),
            ]:
                try:
                    listing_urls = await page.eval_on_selector_all(selector, expr)
                    if listing_urls:
                        break
                except Exception:
                    continue

            # Filter to real listing detail URLs — pattern: portalinmobiliario.com/MLC-XXXXXXXX
            # Exclude tracking/ad URLs like click1.portalinmobiliario.com/brand_ads/...
            listing_urls = [
                u for u in listing_urls
                if re.search(r"portalinmobiliario\.com/MLC-\d+", u)
            ]

            if not listing_urls:
                print(f"[WARN] No listings found on {url} — possible block or end of results")
                break

            for listing_url in listing_urls:
                listing = await self._scrape_listing(page, listing_url, commune, listing_type, uf_rate)
                if listing:
                    listings.append(listing)
                await self.jitter()

            # Advance to next page — stop naturally when no listings are found (handled above)
            # Safety cap: 20 pages = 960 listings max per commune/type
            offset += LISTINGS_PER_PAGE
            if offset > LISTINGS_PER_PAGE * 20:
                break

        return listings

    async def _scrape_listing(
        self,
        page,
        url: str,
        commune: str,
        listing_type: str,
        uf_rate: float,
    ) -> Optional[dict]:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)
        except Exception as e:
            print(f"[ERROR] Could not load listing {url}: {e}")
            return None

        mlc_match = re.search(r"MLC-?(\d+)", url)
        external_id = f"MLC-{mlc_match.group(1)}" if mlc_match else url.split("/")[-1]

        # --- 1. JSON-LD: price, title, images ---
        price_clp: Optional[float] = None
        price_uf: Optional[float] = None
        title: Optional[str] = None
        description: Optional[str] = None
        images: list[str] = []

        try:
            jsonld_blocks = await page.evaluate("""
                () => Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                      .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
                      .filter(Boolean)
            """)
            for block in (jsonld_blocks or []):
                if block.get("@type") == "Product":
                    title = block.get("name")
                    if block.get("description"):
                        description = block["description"].strip() or None
                    offers = block.get("offers") or {}
                    raw_price = offers.get("price")
                    # Portal Inmobiliario uses "CLF" (ISO 4217 for UF), not "UF"
                    currency = offers.get("priceCurrency", "CLP")
                    if raw_price:
                        if currency in ("UF", "CLF"):
                            price_uf = float(raw_price)
                            price_clp = self.uf_to_clp(price_uf, uf_rate)
                        else:  # CLP, "$", or any other value → treat as pesos
                            price_clp = float(raw_price)
                            price_uf = round(price_clp / uf_rate, 2) if uf_rate else None
                    img = block.get("image")
                    if img:
                        images = [img] if isinstance(img, str) else list(img)
                    break
        except Exception:
            pass

        # --- 2. Table rows: area, bedrooms, bathrooms, floor ---
        attrs: dict[str, str] = {}
        try:
            raw_attrs = await page.evaluate("""
                () => {
                    const result = {};
                    for (const row of document.querySelectorAll('tr')) {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim().toLowerCase();
                            const val = cells[1].textContent.trim();
                            if (key) result[key] = val;
                        } else if (cells.length === 1) {
                            // Pattern: "Dormitorios3" — split on first digit sequence
                            const text = cells[0].textContent.trim();
                            const m = text.match(/^([^0-9]+?)\\s*([0-9][\\s\\S]*)$/);
                            if (m) result[m[1].trim().toLowerCase()] = m[2].trim();
                        }
                    }
                    return result;
                }
            """)
            attrs = raw_attrs or {}
        except Exception:
            pass

        # --- 3. Specs badges for bedrooms/bathrooms (backup) ---
        if "dormitorios" not in attrs or "baños" not in attrs:
            try:
                specs_text = await page.text_content("[class*=specs__item], [class*=poly-attributes]") or ""
                m_bed = re.search(r"(\d+)\s*dorm", specs_text, re.IGNORECASE)
                m_bath = re.search(r"(\d+)\s*ba[ñn]", specs_text, re.IGNORECASE)
                if m_bed and "dormitorios" not in attrs:
                    attrs["dormitorios"] = m_bed.group(1)
                if m_bath and "baños" not in attrs:
                    attrs["baños"] = m_bath.group(1)
            except Exception:
                pass

        # --- 3b. Description fallback: DOM selector ---
        if not description:
            try:
                description = await page.evaluate("""
                    () => {
                        const sel = [
                            '[class*="description"] p',
                            '[class*="descripcion"] p',
                            '[data-testid*="description"]',
                            '.ui-pdp-description__content',
                        ];
                        for (const s of sel) {
                            const el = document.querySelector(s);
                            if (el && el.textContent.trim().length > 20)
                                return el.textContent.trim();
                        }
                        return null;
                    }
                """) or None
            except Exception:
                pass

        # --- 4. Gallery images (supplement JSON-LD single image) ---
        try:
            gallery = await page.eval_on_selector_all(
                'img[src*="mlstatic.com"]',
                'els => [...new Set(els.map(el => el.src).filter(Boolean))]'
            )
            if gallery:
                images = list(dict.fromkeys(images + gallery))
        except Exception:
            pass

        # --- 5. lat/lng: static maps img, anchor href, inline scripts, map-click ---
        lat: Optional[float] = None
        lng: Optional[float] = None

        def _parse_coords(maps_url: str) -> tuple[Optional[float], Optional[float]]:
            """Extract Santiago-area lat/lng from a Google Maps URL or src string."""
            import urllib.parse
            maps_url = urllib.parse.unquote(maps_url)  # decode %2C → , etc.
            for pat in [
                r'center=(-?\d+\.\d+),(-?\d+\.\d+)',   # Static Maps API center param
                r'q=(-?\d+\.\d+),(-?\d+\.\d+)',          # ?q=lat,lng
                r'@(-?\d+\.\d+),(-?\d+\.\d+)',           # @lat,lng embed format
                r'll=(-?\d+\.\d+),(-?\d+\.\d+)',          # ll=lat,lng
            ]:
                m = re.search(pat, maps_url)
                if m:
                    try:
                        la, ln = float(m.group(1)), float(m.group(2))
                        if -34.2 <= la <= -33.0 and -71.5 <= ln <= -70.0:
                            return la, ln
                    except (ValueError, IndexError):
                        pass
            return None, None

        # Attempt 1: static maps img src or maps anchor href (no interaction needed)
        try:
            maps_url = await page.evaluate("""
                () => {
                    // Static map image — center= param has exact coords
                    for (const img of document.querySelectorAll('img[src*="maps.googleapis.com"]'))
                        return img.getAttribute('src') || img.src;
                    // Anchor linking to Google Maps
                    for (const a of document.querySelectorAll('a')) {
                        const h = a.getAttribute('href') || '';
                        if (h.includes('maps.google') || h.includes('google.com/maps'))
                            return h;
                    }
                    return null;
                }
            """)
            if maps_url:
                lat, lng = _parse_coords(maps_url)
        except Exception:
            pass

        # Attempt 2: click map element → intercept Google Maps popup URL
        if lat is None:
            try:
                for selector in [
                    'a[href*="waze.com"]',                    # Waze link also has coords
                    '[data-section-id="LOCATION"] a',
                    '.ui-pdp-media--MAP a',
                    '[class*="pdp-map"] a',
                ]:
                    el = await page.query_selector(selector)
                    if not el:
                        continue
                    try:
                        # Check if it's an anchor with a maps href (faster than clicking)
                        href = await el.get_attribute("href") or ""
                        if href and ("maps" in href or "waze" in href):
                            lat, lng = _parse_coords(href)
                            if lat is not None:
                                break
                        # Otherwise try click → popup intercept
                        async with page.context.expect_page(timeout=2500) as popup_info:
                            await el.click()
                        popup = await popup_info.value
                        await popup.wait_for_load_state("domcontentloaded", timeout=3000)
                        popup_url = popup.url
                        await popup.close()
                        lat, lng = _parse_coords(popup_url)
                        if lat is not None:
                            break
                    except Exception:
                        continue
            except Exception:
                pass

        # Attempt 3: inline scripts (JSON-LD latitude/longitude keys)
        if lat is None:
            try:
                coords = await page.evaluate(r"""
                    () => {
                        for (const s of document.querySelectorAll('script:not([src])')) {
                            const t = s.textContent;
                            const mLat = t.match(/"latitude"\s*:\s*(-?\d+\.\d+)/);
                            const mLng = t.match(/"longitude"\s*:\s*(-?\d+\.\d+)/);
                            if (mLat && mLng) return { lat: parseFloat(mLat[1]), lng: parseFloat(mLng[1]) };
                        }
                        return null;
                    }
                """)
                if coords:
                    if -34.2 <= coords["lat"] <= -33.0 and -71.5 <= coords["lng"] <= -70.0:
                        lat = coords["lat"]
                        lng = coords["lng"]
            except Exception:
                pass

        # --- 6. Neighborhood from address element ---
        neighborhood: Optional[str] = None
        try:
            addr_text = await page.text_content("[class*=location]") or ""
            # Format: "Ubicación...Calle, Número, Barrio, Comuna, Región..."
            # Take index 2 (Street=0, Number=1, Barrio=2)
            parts = [p.strip() for p in addr_text.split(",")]
            if len(parts) >= 3:
                candidate = parts[2].strip()
                # Must be non-empty, not a digit, and short (real barrio names < 60 chars)
                if candidate and not candidate.isdigit() and len(candidate) < 60:
                    neighborhood = candidate
        except Exception:
            pass

        def parse_area(val: str) -> Optional[float]:
            cleaned = re.sub(r"[^\d.,]", "", val or "").replace(",", ".")
            try:
                v = float(cleaned)
                return v if v > 0 else None
            except (ValueError, TypeError):
                return None

        def parse_clp(val: str) -> Optional[int]:
            """Parse CLP amounts like '115.000 CLP' or '$ 115.000'."""
            cleaned = re.sub(r"[^\d]", "", val or "")
            try:
                return int(cleaned) if cleaned else None
            except (ValueError, TypeError):
                return None

        bedrooms = self.parse_int(attrs.get("dormitorios"))
        useful_area = parse_area(attrs.get("superficie útil", ""))

        # Studios may not have a "dormitorios" row — default to 1
        if bedrooms is None and title and "estudio" in title.lower():
            bedrooms = 1

        # price_per_m2_uf only meaningful for sale listings
        price_per_m2_uf: Optional[float] = None
        if listing_type == "sale" and price_uf and useful_area:
            price_per_m2_uf = round(price_uf / useful_area, 4)

        return {
            "external_id": external_id,
            "portal": self.portal_name,
            "url": url,
            "listing_type": listing_type,
            "title": title,
            "description": description,
            "property_type": "apartment",
            "bedrooms": bedrooms,
            "bathrooms": self.parse_int(attrs.get("baños")),
            "useful_area_m2": useful_area,
            "total_area_m2": parse_area(attrs.get("superficie total", "")),
            "floor": self.parse_int(attrs.get("número de piso de la unidad")),
            "parking": bool(self.parse_int(attrs.get("estacionamientos", "0")) or 0),
            "storage": bool(self.parse_int(attrs.get("bodegas", "0")) or 0),
            "price_clp": price_clp,
            "price_uf": price_uf,
            "price_per_m2_uf": price_per_m2_uf,
            "hoa_fee_clp": parse_clp(attrs.get("gastos comunes", "")),
            "commune": commune,
            "region": "Región Metropolitana",
            "neighborhood": neighborhood,
            "lat": lat,
            "lng": lng,
            "images": images[:8],
        }

