# Track A — Deployment: Vercel + Railway + Supabase

**Overall Progress:** `33%`

## TLDR
Preparar el proyecto para producción. La DB ya está en Supabase. Falta configurar CORS dinámico, crear el archivo de configuración de Railway, y hacer el deploy del backend (Railway) y frontend (Vercel) con sus variables de entorno correctas.

## Critical Decisions
- **CORS dinámico vía env var** — `CORS_ORIGINS` comma-separated en `.env`, fallback a localhost para desarrollo
- **Sin Dockerfile** — Railway detecta Python y usa `railway.toml` directamente, más simple
- **`next.config.ts` sin cambios** — está vacío, no hay nada que rompa en producción
- **Subdominios gratuitos de entrada** — `.vercel.app` + `.railway.app`; cambiar a dominio propio después es trivial (DNS + env var)

---

## Tasks

- [x] 🟩 **Step 1: CORS dinámico en el backend**
  - [x] 🟩 Agregar `cors_origins: list[str]` a `backend/app/config.py` con fallback `["http://localhost:3000"]`
  - [x] 🟩 Actualizar `backend/app/main.py` para leer `settings.cors_origins` en lugar del string hardcodeado

- [x] 🟩 **Step 2: Configuración de Railway**
  - [x] 🟩 Crear `railway.toml` en la raíz con start command y health check
  - [x] 🟩 Actualizar `.env.example` documentando `CORS_ORIGINS`
  - [x] 🟩 Crear `DEPLOY.md` con instrucciones completas paso a paso

- [ ] 🟥 **Step 3: Deploy backend en Railway** ← ACCIÓN MANUAL
  - [ ] 🟥 Crear cuenta en railway.app y conectar el repositorio de GitHub
  - [ ] 🟥 Configurar variables de entorno en Railway: `DATABASE_URL`, `CORS_ORIGINS` (vacío por ahora), `DEBUG=false`
  - [ ] 🟥 Hacer deploy y verificar health check: `GET https://[railway-url]/health`
  - [ ] 🟥 Anotar la URL de Railway (se necesita para el paso siguiente)

- [ ] 🟥 **Step 4: Deploy frontend en Vercel** ← ACCIÓN MANUAL
  - [ ] 🟥 Crear cuenta en vercel.com y conectar el repositorio de GitHub
  - [ ] 🟥 Configurar Root Directory: `frontend`
  - [ ] 🟥 Configurar variables de entorno: `NEXT_PUBLIC_API_URL=https://[railway-url]/api/v1`, `NEXT_PUBLIC_ADMIN_PASSWORD`
  - [ ] 🟥 Hacer deploy y anotar la URL de Vercel

- [ ] 🟥 **Step 5: Conectar frontend ↔ backend** ← ACCIÓN MANUAL
  - [ ] 🟥 Volver a Railway → actualizar `CORS_ORIGINS` con la URL real de Vercel
  - [ ] 🟥 Railway redespliega automáticamente al guardar la variable

- [ ] 🟥 **Step 6: Verificación end-to-end**
  - [ ] 🟥 `GET https://[railway-url]/health` → `{"status": "ok"}`
  - [ ] 🟥 `GET https://[railway-url]/api/v1/properties` → lista de propiedades
  - [ ] 🟥 Abrir `https://[vercel-url]` → dashboard carga propiedades
  - [ ] 🟥 Abrir detalle de una propiedad → análisis BTL visible
