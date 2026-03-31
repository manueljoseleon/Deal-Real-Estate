# Feature Implementation Plan: "¿Cómo funciona el sitio?" Tour

**Overall Progress:** `100%`

## TLDR
Agregar un tour onboarding de 6 pasos con modal centrado y overlay. Se muestra automáticamente en la home al primer ingreso (o tras 30 días sin verlo), y siempre es accesible desde un ícono `?` en el header global.

## Critical Decisions

- **Context para estado global:** `HowItWorksContext` con `{ open, setOpen }` — permite que `AppHeader` (cualquier página) y `DashboardClient` (auto-show) compartan el mismo estado sin prop drilling.
- **Sin dependencias externas:** Modal construido con Tailwind puro — sin shadcn, Headless UI ni librerías de modal.
- **Auto-show solo en `/`:** El check de localStorage se hace en `DashboardClient` (ya es `"use client"`), no en el Server Component `page.tsx`.
- **Expiración 30 días:** Se guarda `{ seenAt: timestamp }` en `localStorage["how_it_works_seen"]`. Al montar, se compara con `Date.now()`.
- **Iconos SVG inline:** Un SVG simple por paso, sin dependencia de icon libraries.

## Tasks

- [x] 🟩 **Step 1: Crear `HowItWorksContext`**
  - [x] 🟩 Crear `frontend/contexts/HowItWorksContext.tsx` con `{ open, setOpen }` y provider client
  - [x] 🟩 Exportar hook `useHowItWorks()`

- [x] 🟩 **Step 2: Crear `HowItWorksModal`**
  - [x] 🟩 Crear `frontend/components/HowItWorksModal.tsx`
  - [x] 🟩 Definir array de 6 pasos con título, descripción e ícono SVG inline
  - [x] 🟩 Implementar navegación Anterior / Siguiente con indicador de paso (ej: `2 / 6`)
  - [x] 🟩 Botón "Saltar intro" visible en todos los pasos
  - [x] 🟩 Botón "Comenzar" en el último paso (cierra el modal)
  - [x] 🟩 Overlay con click-outside para cerrar
  - [x] 🟩 Estilos consistentes con el design system (teal-700, cormorant/josefin fonts, grays)

- [x] 🟩 **Step 3: Integrar context en `layout.tsx`**
  - [x] 🟩 Wrappear `NuqsAdapter` + `children` con `HowItWorksProvider`
  - [x] 🟩 Montar `<HowItWorksModal />` dentro del provider (disponible en todo el sitio)

- [x] 🟩 **Step 4: Agregar ícono `?` en `AppHeader`**
  - [x] 🟩 Consumir `useHowItWorks()` en `AppHeader.tsx`
  - [x] 🟩 Agregar botón con ícono `?` al nav (mismo estilo que links existentes)

- [x] 🟩 **Step 5: Auto-show en `DashboardClient`**
  - [x] 🟩 Al montar, leer `localStorage["how_it_works_seen"]`
  - [x] 🟩 Si no existe o han pasado >30 días, llamar `setOpen(true)`
  - [x] 🟩 Al cerrar el modal (en `HowItWorksModal`), escribir `{ seenAt: Date.now() }` en localStorage
