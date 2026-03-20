# Deal Real Estate — Dev Guidelines

## Verificación post-cambio (obligatorio)

Después de cualquier cambio al backend, ANTES de declarar el fix listo:

1. Hacer curl al endpoint afectado y verificar que la respuesta refleja el cambio.
   Ejemplo: `curl http://localhost:800X/api/v1/properties/{id}/comps | python -c "import sys,json; print(json.load(sys.stdin)[0])"`
2. Si el comportamiento no cambia, verificar procesos: `netstat -ano | grep :800X`
   y confirmar que el servidor activo tiene el código nuevo.
3. Nunca asumir que `--reload` funcionó — verificar siempre con la respuesta real de la API.
4. Cuando un fix no tiene efecto visible, el primer sospechoso es un servidor stale, no la DB ni el código.

## Scrapes y limpieza de datos (obligatorio)

- **Nunca llamar `mark_stale_inactive` en medio de un workflow de scraping.** Solo llamarla al final, después de que TODOS los scrapers del workflow hayan terminado, y solo con `hours >= 72`.
- Antes de correr BTL matching, verificar que `rental_comps` tiene filas `is_active=TRUE`:
  `SELECT is_active, COUNT(*) FROM rental_comps GROUP BY is_active;`
- Si BTL matching devuelve `updated_with_yield: 0` con miles de propiedades, el primer sospechoso es que los rental comps estén todos inactivos — no el código de matching.
- Al verificar resultados de un scrape, confirmar siempre el total de filas activas en DB, no solo el conteo del script.

## Servidores locales

- Backend: puerto activo definido en `frontend/.env.local` (`NEXT_PUBLIC_API_URL`)
- Cambios a `.env.local` requieren reiniciar Next.js para tener efecto
- En Windows con Git Bash, `taskkill /PID` puede fallar — usar `powershell -Command "Stop-Process -Id X -Force"`
- Si no se puede matar el proceso viejo, iniciar el nuevo en el siguiente puerto disponible y actualizar `.env.local`
