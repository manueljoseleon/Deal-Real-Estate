# Feature Implementation Plan — Buscador de Oportunidades

**Overall Progress:** `100%`

## TLDR
Three UX improvements to the main property search dashboard: (1) replace the static heading with an educational Cap Rate callout linking to /aprende, (2) replace page-based pagination with infinite scroll loading batches of 20 properties, (3) sync the map to show pins only from loaded scroll results (max 500), with Cap Rate % shown in the popup and on hover.

## Critical Decisions
- **Map data source → Option A (scroll-derived):** Map pins come from the accumulated scroll array (`properties.slice(0, 500)`), not the separate `/map-pins` endpoint. This ensures filters always match between list and map. No minimum threshold — map shows whatever is loaded.
- **`page` removed from nuqs URL state:** Converted to local `useState`. Filter params (commune, bedrooms, min_yield, sort_by) stay in URL. Filter change resets local page + clears accumulated array.
- **Batch size = 20:** Multiple of 4 columns. Initial load = 20. Each IntersectionObserver trigger loads 20 more.
- **No new npm dependencies:** IntersectionObserver is native. No react-intersection-observer needed.
- **gross_yield_pct and area_m2 added to MapPinItem:** Derived from list response fields (btl.gross_yield_pct, useful_area_m2) — no backend changes needed.
- **Backend /map-pins endpoint preserved:** Not confirmed unused elsewhere; keep it, just stop calling it from DashboardClient.

## Tasks

- [x] 🟩 **Step 1: Heading — "Haz tu búsqueda por Cap Rate" + callout educativo**
  - [x] 🟩 In `frontend/app/page.tsx` line 20, replace "Chile — ordenadas por Cap Rate" with new heading: "Haz tu búsqueda por **Cap Rate**" (Cap Rate highlighted/bold + teal color)
  - [x] 🟩 Add callout line below heading: "¿No sabes qué es el Cap Rate? [Aprende aquí y mejora tu inversión →](/aprende)" styled as a subtle link/badge

- [x] 🟩 **Step 2: Extend MapPinItem type**
  - [x] 🟩 In `frontend/types/index.ts`, add `gross_yield_pct: number | null` and `area_m2: number | null` to `MapPinItem` interface

- [x] 🟩 **Step 3: Infinite scroll in DashboardClient**
  - [x] 🟩 Remove `page` from nuqs `useQueryStates` — add `const [page, setPage] = useState(1)` as local state
  - [x] 🟩 Change `page_size` from 25 to 20
  - [x] 🟩 Replace `data` state (single page response) with `allProperties` accumulated array (`PropertyListItem[]`) and `hasMore` boolean
  - [x] 🟩 On filter change (nuqs params change): reset `allProperties = []`, reset `page = 1`, fetch fresh batch
  - [x] 🟩 On page increment (scroll trigger): append new batch to `allProperties`
  - [x] 🟩 Add `sentinelRef` (useRef) + IntersectionObserver that calls `setPage(p => p + 1)` when sentinel visible and `!loading && hasMore`
  - [x] 🟩 Remove `<Pagination>` component from JSX
  - [x] 🟩 Add sentinel `<div ref={sentinelRef}>` at bottom of list with loading spinner when `loading && page > 1`
  - [x] 🟩 Add "Has visto todas las propiedades" end-of-list message when `!hasMore && allProperties.length > 0`
  - [x] 🟩 Remove the separate `mapPins` state and `/map-pins` API call entirely

- [x] 🟩 **Step 4: Derive map pins from scroll array**
  - [x] 🟩 In DashboardClient, compute `mapPins` as derived value from `allProperties.slice(0, 500)` filtered to props with lat/lng, mapped to extended `MapPinItem` shape (including `gross_yield_pct` and `area_m2`)
  - [x] 🟩 Pass derived `mapPins` to `<PropertiesMap>` (no second API call)

- [x] 🟩 **Step 5: Improve map popup and hover pin**
  - [x] 🟩 In `PropertiesMap.tsx`, update `<Popup>` to show: bedrooms·commune / price UF + "X.X% Cap Rate" / "XX m²" / "Ver propiedad →"
  - [x] 🟩 Modify `propertyIcon()` to include Cap Rate % text label inside the pin div when `isHovered === true`
  - [x] 🟩 Map footer pin count already uses `pins.length` — will be correct automatically once pins are scroll-derived

## Key Implementation Notes

- `DashboardClient.tsx:22` — `page: parseAsInteger.withDefault(1)` currently in nuqs; extract to local `useState`
- `DashboardClient.tsx:54` — `page_size: 25` → `20`
- `DashboardClient.tsx:62–71` — separate `mapPins` useEffect calling `api.properties.mapPins()` is removed entirely
- `types/index.ts:53–61` — `MapPinItem` extended; both new fields (`btl.gross_yield_pct`, `useful_area_m2`) already exist on `PropertyListItem` — no backend changes
- `page.tsx:20` — `<p>` tag with "Chile — ordenadas por Cap Rate" is the exact heading target
- `lib/api.ts` — `api.properties.mapPins()` kept in client (not deleted), just not called from DashboardClient
