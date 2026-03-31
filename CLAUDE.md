# Deal Real Estate — Dev Guidelines

## Verificación post-cambio (obligatorio)

Después de cualquier cambio al backend, ANTES de declarar el fix listo:

1. Hacer curl al endpoint afectado y verificar que la respuesta refleja el cambio.
   Ejemplo: `curl http://localhost:800X/api/v1/properties/{id}/comps | python -c "import sys,json; print(json.load(sys.stdin)[0])"`
2. Si el comportamiento no cambia, verificar procesos: `netstat -ano | grep :800X`
   y confirmar que el servidor activo tiene el código nuevo.
3. Nunca asumir que `--reload` funcionó — verificar siempre con la respuesta real de la API.
4. Cuando un fix no tiene efecto visible, el primer sospechoso es un servidor stale, no la DB ni el código.

## Operaciones masivas en DB (CRÍTICO — leer antes de cualquier UPDATE/DELETE)

**Nunca ejecutar un UPDATE o DELETE masivo sin antes:**

1. **Hacer backup de los datos afectados:**
   ```sql
   CREATE TABLE properties_images_backup_YYYYMMDD AS
   SELECT id, portal, external_id, images FROM properties WHERE images IS NOT NULL;
   ```
   O usar `backup_images(db)` de `backend/app/services/db_guard.py`.

2. **Probar en 1 fila primero y verificar el resultado:**
   ```sql
   -- Primero probar:
   SELECT regexp_replace(images[1], 'patron', 'reemplazo') FROM properties LIMIT 1;
   -- Verificar que el resultado es correcto ANTES de correr en toda la tabla.
   ```

3. **Nunca usar `'\1'` en Python para backreferences de regex en SQL.**
   - `'\1'` en Python = `chr(1)` (caracter de control SOH) — NO es un backreference
   - Correcto: raw string `r'\1'` o dollar-quoting de PostgreSQL `$$\1$$`
   - Este bug causó la corrupción de 2010 URLs de imágenes en marzo 2026

**Regla de oro:** Cuando datos en DB parecen incorrectos (URLs rotas, formato malo), el fix correcto es **corregir el scraper y re-scrapeár** — nunca parchear datos existentes con regex masivos. Re-scrapeár es más lento pero reversible; un UPDATE masivo mal hecho puede ser irrecuperable.

## Scrapes y limpieza de datos (obligatorio)

- **Nunca llamar `mark_stale_inactive` en medio de un workflow de scraping.** Solo llamarla al final, después de que TODOS los scrapers del workflow hayan terminado, y solo con `hours >= 72`.
- Antes de correr BTL matching, verificar que `rental_comps` tiene filas `is_active=TRUE`:
  `SELECT is_active, COUNT(*) FROM rental_comps GROUP BY is_active;`
- Si BTL matching devuelve `updated_with_yield: 0` con miles de propiedades, el primer sospechoso es que los rental comps estén todos inactivos — no el código de matching.
- Al verificar resultados de un scrape, confirmar siempre el total de filas activas en DB, no solo el conteo del script.

## zone_avg_price_uf_per_m2 — cuándo se computa y qué hacer si falta

Este campo alimenta el heatmap "Estimación de precio de zona" en el detalle de propiedad. Si es `null`, el componente `PriceHeatBar` no renderiza nada (sin error visible).

**Dónde se computa:**
- `backend/app/services/matching.py` → `compute_zone_avg(db, prop)` — función reutilizable
- Se llama en `run_btl_matching()` (scrape completo) y directamente en los endpoints de detalle y PATCH

**Invariante a mantener:** `zone_avg_price_uf_per_m2` NUNCA debe ser `null` si la propiedad tiene `lat`, `lng`, `price_uf`, y `useful_area_m2`.

**Por qué puede quedar null:**
1. Propiedad insertada via script externo (no pasa por el scraper API)
2. Coordenadas corregidas manualmente antes de que existiera el auto-recálculo en PATCH
3. Race condition: dos scrapers paralelos, uno termina matching antes de que el otro inserte sus propiedades

**Cómo detectar propiedades afectadas:**
```sql
SELECT COUNT(*) FROM properties
WHERE is_canonical=TRUE AND is_active=TRUE
  AND lat IS NOT NULL AND price_uf IS NOT NULL AND useful_area_m2 IS NOT NULL
  AND zone_avg_price_uf_per_m2 IS NULL;
```

**Cómo reparar (sin correr BTL completo):**
```bash
curl -X POST http://localhost:800X/api/v1/analysis/repair-zone-avg
# Devuelve: {"candidates": N, "repaired": N, "still_missing": 0}
```

**Comportamiento actual del código (mecanismos automáticos):**
- `GET /properties/{id}` → lazy computation: si `zone_avg` es null y hay coordenadas, lo calcula y persiste al vuelo
- `PATCH /properties/{id}` → si se actualizan lat/lng o área, recalcula `zone_avg` inmediatamente
- `run_btl_matching()` → recalcula `zone_avg` para todas las propiedades del batch

## Servidores locales

- Backend: puerto activo definido en `frontend/.env.local` (`NEXT_PUBLIC_API_URL`)
- Cambios a `.env.local` requieren reiniciar Next.js para tener efecto
- En Windows con Git Bash, `taskkill /PID` puede fallar — usar `powershell -Command "Stop-Process -Id X -Force"`
- Si no se puede matar el proceso viejo, iniciar el nuevo en el siguiente puerto disponible y actualizar `.env.local`
