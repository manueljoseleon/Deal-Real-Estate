# Feature Implementation Plan — Sección `/aprende`

**Overall Progress:** `100%`

---

## TLDR
Crear una página educativa estática en `/aprende` que explique inversión inmobiliaria a usuarios novatos: glosario de términos, benchmarks de Cap Rate, crédito hipotecario, comparación de riesgo vs asset classes y umbrales de decisión. Tema visual light (igual que la app). Market config parametrizable internamente para soportar Chile ahora y otros países después. Recharts ya está instalado.

---

## Critical Decisions

- **Tema visual**: Light (`bg-gray-50`, white cards, teal accents) — consistente con la app, no con el landing dark
- **Ruta**: `/aprende` independiente, usa el root layout (AppHeader incluido) sin layout propio
- **Navegación (Opción A)**: Link `Aprende` en AppHeader (todas las rutas de app) + en Navbar interno del landing
- **Market config**: Interna (`frontend/lib/markets/cl.ts`) — no hay UI de selección de mercado por ahora
- **Contenido**: 100% estático/hardcodeado — MVP sin calculadoras interactivas
- **Charts**: Recharts 3.8 (ya instalado) — ScatterChart para riesgo vs retorno, visual bar para benchmarks Cap Rate
- **Componentes**: Carpeta `frontend/components/aprende/` — secciones como componentes independientes

---

## Tasks

- [x] 🟩 **Step 1: Market Config**
  - [x] 🟩 Crear `frontend/lib/markets/cl.ts` con todos los parámetros Chile: thresholds Cap Rate, tasas hipotecarias, LTV, DSCR mínimo, apreciación, asset classes para el chart
  - [x] 🟩 Crear `frontend/lib/markets/index.ts` que exporta el mercado activo (`export { clMarket as activeMarket } from './cl'`) — cambiar aquí para MX en el futuro

- [x] 🟩 **Step 2: Navegación**
  - [x] 🟩 Agregar link `Aprende` en `AppHeader.tsx` (entre `Inicio` y `Scraper`)
  - [x] 🟩 Agregar link `Aprende` en el `Navbar()` interno de `frontend/app/landing/page.tsx` (junto a `Entrar a la plataforma`)

- [x] 🟩 **Step 3: Componentes de sección**
  - [x] 🟩 `HeroAprende` — título, bajada, quick-jump nav a todas las secciones
  - [x] 🟩 `BasicsSection` — los 3 pilares: flujo de caja, apreciación, apalancamiento
  - [x] 🟩 `GlosarioSection` — grid de cards con definición de cada término: Cap Rate, NOI, ROI, TIR, MOIC, Opex, Vacancia, Contribuciones, Gastos entrada/salida, Apreciación, LTV, DSCR
  - [x] 🟩 `BenchmarkCapRateSection` — barra visual semáforo con rangos del `activeMarket`, + subsección "cómo mejorar": negociar precio y remodelación
  - [x] 🟩 `CreditoHipotecarioSection` — 4 métricas clave + tabla DSCR con 3 escenarios de financiamiento
  - [x] 🟩 `RiesgoAssetClassSection` — ScatterChart Recharts + tabla comparativa de 5 asset classes
  - [x] 🟩 `DecisionTable` — 4 filas "No Brainer / Bueno / Zona Gris / No Go" con acción y tips

- [x] 🟩 **Step 4: Página `/aprende`**
  - [x] 🟩 Crear `frontend/app/aprende/page.tsx` — Server Component que importa y compone todas las secciones en orden
  - [x] 🟩 Agregar metadata (`title`, `description`) con valores del `activeMarket`

- [x] 🟩 **Step 5: QA**
  - [x] 🟩 TypeScript check limpio (`tsc --noEmit` sin errores)
  - [x] 🟩 `"use client"` presente en `RiesgoAssetClassSection` (único componente con Recharts)
  - [x] 🟩 Link `/aprende` confirmado en AppHeader (línea 32) y Navbar del landing (línea 131)
  - [x] 🟩 Link no aparece en `/landing` — AppHeader se suprime en esa ruta por diseño existente

---

## Orden de las secciones en la página final

1. `HeroAprende`
2. `BasicsSection`
3. `GlosarioSection`
4. `BenchmarkCapRateSection` (incluye cómo mejorar)
5. `CreditoHipotecarioSection`
6. `RiesgoAssetClassSection`
7. `DecisionTable`

---

## Valores Chile — `cl.ts` (referencia)

| Parámetro | Valor |
|---|---|
| Cap Rate excelente | > 6% |
| Cap Rate bueno | 5–6% |
| Cap Rate moderado | 3.5–5% |
| Cap Rate bajo | < 3.5% |
| "No brainer" | ≥ 6% |
| "No go" | < 3.5% |
| Tasa hipotecaria típica | 4.0–5.5% anual |
| LTV típico inversión | 80% |
| DSCR mínimo recomendado | 1.20x |
| Apreciación real anual | 2–4% |
| Moneda | UF |
