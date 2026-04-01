# Track B — Scrape Masivo: Comunas RM completas

**Overall Progress:** `57%`

## TLDR
Preparar y ejecutar el scrape masivo de toda la RM. Incluye fix de cookies TocToc (galerías), agregar 10 comunas nuevas a ambos scrapers, y correr ventas + arriendos por batches nocturnos para no ser bloqueados.

## Critical Decisions
- **Fix cookies antes del enrich** — navegar a `https://www.toctoc.com` antes del loop de enrich en `_scrape_commune()` para establecer sesión. Sin esto ~71% de propiedades quedan con ≤1 imagen.
- **Descripciones ya implementadas** — el fix de TocToc y Portal Inmobiliario ya está en el código desde sesión anterior. No requiere cambios.
- **Batches por comuna** — scrapear de a 2-3 comunas por noche para minimizar riesgo de bloqueo IP. Usar el endpoint existente `/api/v1/scraper`.
- **Slugs a verificar** — confirmar que los slugs nuevos existen en TocToc antes de correr el scrape masivo.

## Comunas objetivo (16 total)

| Grupo | Comunas | Estado |
|---|---|---|
| Ya en código, nunca scrapeadas | Ñuñoa, Santiago, Vitacura, San Miguel, Maipú | Solo agregar a scrape |
| Nuevas a agregar | La Reina, Peñalolén, Macul | Agregar a `COMMUNE_SLUGS` |
| Nuevas a agregar | Independencia, Recoleta, Huechuraba, Lo Barnechea | Agregar a `COMMUNE_SLUGS` |
| Nuevas a agregar | La Florida, Puente Alto | Agregar a `COMMUNE_SLUGS` |
| Nuevas a agregar | Estación Central | Agregar a `COMMUNE_SLUGS` |

---

## Tasks

- [x] 🟩 **Step 1: Fix cookies sesión TocToc**
  - [x] 🟩 En `backend/app/scrapers/toctoc.py`, agregar `await page.goto("https://www.toctoc.com")` + espera breve justo antes del loop de enrich
  - [ ] 🟥 Verificar en una corrida de prueba (1 comuna) que las propiedades quedan con galería completa

- [x] 🟩 **Step 2: Agregar comunas nuevas a TocToc**
  - [ ] 🟥 Verificar slugs en toctoc.com para cada comuna nueva (abrir `/venta/departamento/metropolitana/{slug}` y confirmar que carga resultados)
  - [x] 🟩 Agregar a `COMMUNE_SLUGS` en `toctoc.py`: La Reina (`la-reina`), Peñalolén (`penalolen`), Macul (`macul`), Independencia (`independencia`), Recoleta (`recoleta`), Huechuraba (`huechuraba`), Lo Barnechea (`lo-barnechea`), La Florida (`la-florida`), Puente Alto (`puente-alto`), Estación Central (`estacion-central`)

- [x] 🟩 **Step 3: Agregar comunas nuevas a Portal Inmobiliario**
  - [x] 🟩 Verificar cómo `portal_inmobiliario.py` maneja comunas (slugs propios, mismo patrón `{slug}-metropolitana/`)
  - [x] 🟩 Agregar las mismas 10 comunas al scraper de Portal Inmobiliario

- [x] 🟩 **Step 4: Actualizar `config.py`**
  - [x] 🟩 Agregar las 10 comunas nuevas + Maipú a `default_communes` en `Settings`

- [ ] 🟥 **Step 5: Scrape masivo por batches (ejecutar de noche)**

  Orden sugerido — una sesión por noche:

  | Noche | Comunas | Notas |
  |---|---|---|
  | 1 | Ñuñoa, Vitacura, Santiago | Comunas de alta demanda |
  | 2 | San Miguel, Maipú, Estación Central | Zona sur/poniente |
  | 3 | La Florida, Puente Alto, Macul | Zona sur |
  | 4 | La Reina, Peñalolén, Independencia | Zona oriente/norte |
  | 5 | Recoleta, Huechuraba, Lo Barnechea | Zona norte/oriente alto |

  Por cada batch:
  - [ ] 🟥 Correr ventas: `POST /api/v1/scraper/run` con comunas del batch
  - [ ] 🟥 Correr arriendos: ídem
  - [ ] 🟥 Verificar en DB: `SELECT commune, COUNT(*) FROM properties WHERE is_active=TRUE GROUP BY commune ORDER BY commune`

- [ ] 🟥 **Step 6: BTL Matching completo post-scrape**
  - [ ] 🟥 Correr `run_btl_matching()` después del último batch
  - [ ] 🟥 Verificar: `SELECT yield_band, COUNT(*) FROM properties WHERE is_active=TRUE GROUP BY yield_band`
  - [ ] 🟥 Verificar cobertura de imágenes: `SELECT COUNT(*) FROM properties WHERE array_length(images,1) <= 1 AND is_active=TRUE`
  - [ ] 🟥 Verificar descripciones: `SELECT COUNT(*) FROM properties WHERE description IS NOT NULL AND is_active=TRUE`

- [ ] 🟥 **Step 7: ZoneCard para comunas nuevas**
  - [ ] 🟥 Actualizar `frontend/lib/zones.ts` con datos de las comunas recién scrapeadas (seguridad, transporte, áreas verdes, salud, densidad, plusvalía)
  - [ ] 🟥 Priorizar las de mayor volumen de propiedades scrapeadas
