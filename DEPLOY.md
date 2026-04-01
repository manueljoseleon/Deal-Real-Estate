# Guía de Deployment — PropIQ

Stack: **Next.js** (Vercel) + **FastAPI** (Railway) + **PostgreSQL** (Supabase ya configurado)

---

## 1. Deploy del Backend en Railway

### 1.1 Crear cuenta y proyecto

1. Ve a [railway.app](https://railway.app) → **Start a New Project**
2. Elige **Deploy from GitHub repo** → autoriza Railway y selecciona este repositorio
3. Railway detectará el `railway.toml` automáticamente

### 1.2 Configurar variables de entorno

En Railway → tu proyecto → **Variables**, agregar:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | El valor exacto de tu `.env` local |
| `CORS_ORIGINS` | Dejar vacío por ahora (se completa después de deploy de Vercel) |
| `DEBUG` | `false` |

### 1.3 Deploy

Railway hace deploy automáticamente al guardar las variables.
Espera que el health check pase: `GET https://[tu-url].railway.app/health`

Debe responder:
```json
{"status": "ok", "version": "0.1.0"}
```

**Anota la URL de Railway** — la necesitas en el paso 2.

---

## 2. Deploy del Frontend en Vercel

### 2.1 Crear cuenta y proyecto

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el mismo repositorio de GitHub
3. Configura:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (detectado automáticamente)
   - **Output Directory:** `.next` (detectado automáticamente)

### 2.2 Configurar variables de entorno

En Vercel → tu proyecto → **Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://[tu-url].railway.app/api/v1` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Tu contraseña de admin (no `admin123`) |

### 2.3 Deploy

Click en **Deploy**. Vercel hará el build de Next.js.

**Anota la URL de Vercel** — la necesitas en el paso 3.

---

## 3. Conectar Frontend ↔ Backend (CORS)

Una vez tengas la URL de Vercel:

1. Ve a Railway → Variables
2. Actualiza `CORS_ORIGINS` con la URL de Vercel:
   ```
   https://[tu-app].vercel.app
   ```
3. Railway redespliega automáticamente

---

## 4. Verificación final

```bash
# 1. Health check del backend
curl https://[railway-url]/health
# → {"status":"ok","version":"0.1.0"}

# 2. API de propiedades
curl "https://[railway-url]/api/v1/properties?page_size=1"
# → {"items":[...],"total":...}

# 3. Frontend
# Abrir https://[vercel-url] en el browser
# → Dashboard carga propiedades
# → Abrir detalle de una propiedad → análisis BTL visible
```

---

## 5. Cambiar a dominio propio (cuando tengas uno)

1. En Vercel → **Settings → Domains** → agregar tu dominio
2. Configurar el registro DNS que Vercel indique (CNAME o A record)
3. En Railway → Variables → actualizar `CORS_ORIGINS` con el nuevo dominio
4. Listo — ~15 minutos en total

---

## Variables de entorno — resumen completo

### Railway (backend)
| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase connection string |
| `CORS_ORIGINS` | ✅ | URL del frontend en Vercel |
| `DEBUG` | — | `false` en producción |

### Vercel (frontend)
| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | URL del backend en Railway + `/api/v1` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | ✅ | Contraseña del panel admin |
