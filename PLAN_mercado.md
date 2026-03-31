# Feature Implementation Plan — Análisis de Mercado

**Overall Progress:** `55%`

## TLDR
Nueva sección `/mercado` con dos charts interactivos únicos del sitio: un histograma de distribución de cap rates y un scatter de cuadrantes de oportunidad (descuento vs. yield). Ambos alimentados por los datos reales de la plataforma y filtrables en tiempo real.

## Critical Decisions
- **Un endpoint agregado vs. raw data en frontend:** Backend devuelve datos pre-procesados (buckets calculados + array de puntos para scatter) — evita enviar miles de rows al cliente.
- **Recharts BarChart + ScatterChart:** Ya instalado (v3.8.0), misma librería que DealAnalyzerCharts — sin nuevas dependencias.
- **Nuevo router `mercado.py`:** No se extiende `analysis.py` — mantiene separación de concerns y permite que la sección crezca con más endpoints (noticias, estudios, etc.).
- **nuqs para filtros URL:** Mismo patrón que DashboardClient — filtros persistentes en URL, compartibles.
- **Scatter excluye nulls:** Propiedades sin `zone_avg_price_uf_per_m2` se excluyen silenciosamente del Chart 2; el histograma las incluye si tienen `gross_yield_pct`.

---

## Tasks

- [x] 🟩 **Step 1: Backend — Endpoint `/mercado/stats`**
  - [x] 🟩 Crear `backend/app/api/mercado.py` con router `tags=["mercado"]`
  - [x] 🟩 Query para histograma: agrupar `gross_yield_pct` en buckets [0-1, 1-2, 2-3, 3-4, 4-5, 5-6, 6+], devolver `{bucket, count}[]`
  - [x] 🟩 Query para scatter: devolver `{id, title, commune, gross_yield_pct, price_per_m2_uf, zone_avg_price_uf_per_m2, price_uf}[]` solo donde `zone_avg IS NOT NULL` y `gross_yield_pct IS NOT NULL`
  - [x] 🟩 Aplicar filtros opcionales: `commune[]`, `bedrooms`, `property_type`, `min_price`, `max_price`
  - [x] 🟩 Filtrar siempre: `is_canonical=TRUE`, `is_active=TRUE`
  - [x] 🟩 Registrar router en `backend/app/main.py`

- [x] 🟩 **Step 2: Types & API Client**
  - [x] 🟩 Agregar `MarketStatsResponse`, `CapRateBucket`, `ScatterPoint` a `frontend/types/index.ts`
  - [x] 🟩 Agregar `api.mercado.stats(filters?)` a `frontend/lib/api.ts`

- [x] 🟩 **Step 3: Chart 1 — `CapRateHistogram.tsx`**
  - [x] 🟩 Crear `frontend/components/mercado/CapRateHistogram.tsx`
  - [x] 🟩 Recharts `BarChart` con buckets en eje X, conteo en eje Y
  - [x] 🟩 Barra coloreada: gris para <5%, verde/destacada para ≥5% (demostrar la rareza)
  - [x] 🟩 Usar `ChartCard` + `ChartTooltip` del patrón existente
  - [x] 🟩 Mostrar total de propiedades en el título del card

- [x] 🟩 **Step 4: Chart 2 — `OpportunityScatter.tsx`**
  - [x] 🟩 Crear `frontend/components/mercado/OpportunityScatter.tsx`
  - [x] 🟩 Recharts `ScatterChart` — calcular `discount_pct` en frontend: `(zone_avg - price_per_m2) / zone_avg * 100`
  - [x] 🟩 `ReferenceLine x={5}` y `ReferenceLine y={0}` para los 4 cuadrantes
  - [x] 🟩 Labels de cuadrantes via Legend (4 Scatter components, uno por cuadrante)
  - [x] 🟩 Tooltip con: título, yield%, descuento%, precio UF
  - [x] 🟩 Colorear puntos por cuadrante (verde Q1, amber Q2, azul Q3, gris Q4)

- [x] 🟩 **Step 5: Page & Client Component**
  - [x] 🟩 Crear `frontend/app/mercado/MercadoClient.tsx` con `useQueryStates` para filtros
  - [x] 🟩 Filtros: commune[], bedrooms, property_type, min_price, max_price
  - [x] 🟩 Fetch a `api.mercado.stats()` reactivo a cambio de filtros
  - [x] 🟩 Layout: header descriptivo + filtros + grid con los 2 charts
  - [x] 🟩 Crear `frontend/app/mercado/page.tsx` (server component con metadata)

- [x] 🟩 **Step 6: Navegación**
  - [x] 🟩 Agregar `<Link href="/mercado">Mercado</Link>` en `frontend/components/AppHeader.tsx`

---

## Sprint 1 — Datos disponibles en DB ✅

- [x] 🟩 **1A: Tiempo en Mercado**
  - [x] 🟩 Backend: `GET /mercado/time-on-market` — buckets de días, mediana global, mediana por comuna
  - [x] 🟩 Frontend: `TimeOnMarketChart.tsx` — histograma + tabla por comunas
  - [x] 🟩 Integrado en `MercadoClient.tsx`

- [x] 🟩 **1B: Yield por Tipo y Dormitorios**
  - [x] 🟩 Backend: `GET /mercado/yield-matrix` — avg/median yield por property_type × bedrooms
  - [x] 🟩 Frontend: `YieldMatrix.tsx` — tabla de calor verde→rojo
  - [x] 🟩 Integrado en `MercadoClient.tsx`

- [x] 🟩 **1C: Concentración de Stock por Comuna**
  - [x] 🟩 Backend: `GET /mercado/stock-concentration` — total, high_yield_count, opportunity_pct por comuna
  - [x] 🟩 Frontend: `StockConcentrationChart.tsx` — barras horizontales apiladas
  - [x] 🟩 Integrado en `MercadoClient.tsx`

---

## Sprint 2 — Datos externos + vistas admin 🟥

- [ ] 🟥 **2A: Macro + Financiamiento (público)**
  - [ ] 🟥 Backend: `GET /mercado/macro` — UF histórica (mindicador.cl) + tasa hipotecaria (CMF)
  - [ ] 🟥 Frontend: `MacroChart.tsx` — líneas: UF mensual + tasa en segundo eje Y
  - [ ] 🟥 Registrar en `MercadoClient.tsx` como sección "Contexto Macro"
  - **Fuentes:** `mindicador.cl/api/uf/{YYYY}` (sin clave) · `api.cmf.cl` (requiere registro gratuito)

- [ ] 🟥 **2B: Proximidad a Infraestructura (público)**
  - [ ] 🟥 Nueva tabla `points_of_interest (id, type, name, lat, lng, commune)`
  - [ ] 🟥 Script `scripts/import_osm_pois.py` — poblar desde Overpass API (metro, colegios, parques)
  - [ ] 🟥 Campo `metro_distance_m` en `Property`
  - [ ] 🟥 Script `scripts/compute_metro_distances.py` — backfill de distancias
  - [ ] 🟥 Frontend: scatter precio vs. distancia metro en `/mercado`
  - **Fuente:** Overpass API gratuita, `datos.gob.cl` para KML oficial del Metro

- [ ] 🟥 **2C: Calidad del Yield por Matching Tier (admin)**
  - [ ] 🟥 Backend: endpoint de distribución por `matching_tier` (solo admin)
  - [ ] 🟥 Frontend: `/admin/analytics` — barra apilada de tiers + tabla avg_yield por tier
  - [ ] 🟥 Alerta si tiers 6–7 > 30% del total

- [ ] 🟥 **2D: Estacionalidad de Publicaciones (admin)**
  - [ ] 🟥 Backend: endpoint de nuevas publicaciones + precio mediano por mes (últimos 24 meses)
  - [ ] 🟥 Frontend: `/admin/analytics` — gráfico de líneas: volumen + precio mediano mensual

- [ ] 🟥 **2E: Señal de Venta Real vs. Expiración (admin)**
  - [ ] 🟥 Nuevo campo `inactive_reason` en `Property` (`sold_likely | expired_likely | unknown`)
  - [ ] 🟥 Heurística: desapareció de TODOS los portales en <60 días → `sold_likely`
  - [ ] 🟥 Frontend: `/admin/analytics` — tasa de "ventas" estimadas por mes

---

## Sprint 3 — Nueva infraestructura de datos 🟥

- [ ] 🟥 **3B: Pipeline de Proyectos Nuevos**
  - [ ] 🟥 Nueva tabla `development_pipeline (id, commune, units, type, stage, source, recorded_at)`
  - [ ] 🟥 Script `scripts/import_ine_pipeline.py` — descargar CSV trimestral INE permisos edificación
  - [ ] 🟥 Extender scraper TocToc para sección de proyectos nuevos
  - [ ] 🟥 Frontend: `PipelineChart.tsx` — barras por comuna: pipeline vs. stock actual
  - **Fuente:** `ine.cl/estadisticas/edificacion-y-urbanismo` (CSV trimestral gratuito)
  - **Nota:** Issue 3A (price snapshots) ya implementado ✅
