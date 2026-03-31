# PLAN: Data & Scraping — Pendientes

## Pendientes

---

### 1. Recuperar galerías de imágenes (TocToc)

**Contexto:** El 71% del catálogo TocToc (1,431 de 2,008 propiedades activas) quedó con ≤1 imagen
tras el último scrape masivo. El enrich falló porque el scraper entra directo a fichas de detalle
sin establecer cookies de sesión primero, aumentando la probabilidad de bloqueo.

**No hacer ahora** — esperar a que se complete el re-scrape completo (ítem 2), que pasará por
`_fetch_detail_data()` para cada propiedad nueva y debería traer las galerías.

**Si tras el re-scrape siguen quedando propiedades con ≤1 imagen**, correr:
```bash
source .venv/Scripts/activate
python -m scripts.rescrape_toctoc_missing --images-only
```

**Estado actual (2026-03-30):**
- 249 propiedades sin ninguna imagen
- 1,182 con solo thumbnail
- 577 con galería completa (>1 foto)

**Fix estructural a evaluar:** En `_scrape_commune()`, antes del loop de enrich, navegar a
`https://www.toctoc.com` para establecer cookies de sesión (igual que hace
`rescrape_toctoc_missing.py`). Esto reduciría los bloqueos durante scrapes masivos.

---

### 2. Scrapear comunas pendientes de Santiago (RM)

**Contexto:** La DB **solo tiene datos de Providencia (1,965) y Las Condes (1,959)**.
El código tiene 5 comunas más definidas en `COMMUNE_SLUGS` que nunca se han scrapeado:
Ñuñoa, Santiago, Vitacura, San Miguel, Maipú.

**Paso 1 — scrapear las comunas ya definidas (sin cambios de código):**
- Ñuñoa, Santiago, Vitacura, San Miguel, Maipú

**Paso 2 — agregar más comunas de la RM:**
Agregar slugs en `COMMUNE_SLUGS` ([backend/app/scrapers/toctoc.py](backend/app/scrapers/toctoc.py)),
verificar que los slugs existen en TocToc, luego scrapeár:
- Zona oriente: La Reina, Peñalolén, Macul
- Zona norte: Independencia, Recoleta, Huechuraba
- Zona sur: La Florida, La Cisterna, Puente Alto
- Zona poniente: Pudahuel, Estación Central

**Post-scrape (ambos pasos):** correr BTL matching completo.

---

### 3. Scrapear descripciones de propiedades

**Contexto:** Las descripciones no se extraen actualmente. Los fixes ya fueron identificados
pero **aún no implementados en el código**:

| Portal | Problema | Fix pendiente |
|--------|----------|---------------|
| TocToc | `_fetch_detail_data` no extraía `"descripcion"` del JSON blob | Regex `"descripcion":"..."` + fallback selector HTML |
| Portal Inmobiliario | `_scrape_listing` navega a cada ficha pero no lee `description` del JSON-LD | Leer `block["description"]` + fallback selector DOM |

**Cuándo implementar:** antes del próximo scrape masivo (ítem 4), para que las descripciones
queden pobladas sin necesidad de un re-scrape adicional.

**Valor:** las descripciones permiten filtros por keyword, análisis de amenities, y mejorar
la ficha de detalle de cada propiedad.

---

### 4. Re-scrape completo (próxima corrida programada)

**Antes de correr:** implementar fix de descripciones (ítem 3) y fix de cookies de sesión (ítem 1).

Checklist:
1. Implementar extracción de descripciones en ambos scrapers (ítem 3)
2. Agregar navegación a home de TocToc antes del loop de enrich (ítem 1)
3. Agregar slugs de comunas nuevas (ítem 2, paso 2)
4. Scrapear ventas + arriendos de **todas** las comunas
5. Correr `run_btl_matching()` al final
6. Verificar: `SELECT COUNT(*) FROM properties WHERE images IS NULL OR array_length(images,1) <= 1`
7. Verificar: `SELECT COUNT(*) FROM properties WHERE description IS NULL AND is_active=TRUE`
