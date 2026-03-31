# Feature Implementation Plan — Deal Review Panel

**Overall Progress:** `100%`

## TLDR
Convertir la página `/properties/[id]/review` en un panel slide-in que se superpone sobre la página de detalle de propiedad. El panel entra desde la derecha, cubre el 50% del ancho (full-screen en mobile), con overlay oscuro a la izquierda. La página `/review` standalone no se toca.

## Critical Decisions

- **Client-side panel, no intercepting routes** — más simple, sin reestructurar rutas. El panel vive como componente dentro de la página de detalle.
- **Datos pasados como props, no re-fetchados** — `property` ya existe en el detail page. Solo se agrega `ufClp` al `Promise.all` existente y se pasa al panel. `computeDealModel()` corre client-side (función pura).
- **`/review` standalone sin cambios** — sigue funcionando como fallback independiente (opción B).
- **Trigger dentro del opportunity banner** — el panel solo es accesible cuando `showOpportunityBanner` es true (cap rate > 5%). El link existente se convierte en botón.

---

## Tasks

- [x] 🟩 **Step 1: Crear `ReviewPanel` client component**
  - [x] 🟩 Crear `frontend/components/analysis/ReviewPanel.tsx` con `"use client"`
  - [x] 🟩 Props: `property: PropertyDetail`, `ufClp: number`, `propertyId: string`
  - [x] 🟩 Estado interno: `isOpen: boolean`
  - [x] 🟩 Scroll lock: `useEffect` que aplica/restaura `document.body.style.overflow`
  - [x] 🟩 Overlay: `fixed inset-0 bg-black/50 z-40`, click cierra el panel
  - [x] 🟩 Panel: `fixed top-0 right-0 h-full z-50 bg-white shadow-xl overflow-y-auto w-full sm:w-1/2`
  - [x] 🟩 Animación: `transition-transform duration-300 ease-in-out`, `translate-x-full` → `translate-x-0`
  - [x] 🟩 Header del panel: botón X (arriba izquierda), título propiedad (centro), link "Calculadora completa →" (arriba derecha)
  - [x] 🟩 Computar `unlevered` y `levered` con `computeDealModel` + `defaultInputs` (mismos supuestos fijos que `review/page.tsx`)
  - [x] 🟩 Guard: si no hay renta estimada, mostrar aviso amber con link a `/analyze`
  - [x] 🟩 Section 1: Propiedad y costos (precio, vs zona, renta, cap rate, costos cierre, opex, NOI)
  - [x] 🟩 Section 2: Tabla retornos 4×2 (ROI, TIR, Dividendo, Equity — columnas con/sin deuda)
  - [x] 🟩 Section 3: Supuestos utilizados
  - [x] 🟩 CTA final: "Ir a la calculadora →" link a `/properties/{id}/analyze`
  - [x] 🟩 Exponer botón trigger público (`<ReviewPanel.Trigger>` o prop `renderTrigger`) para usar desde el banner

- [x] 🟩 **Step 2: Modificar `properties/[id]/page.tsx`**
  - [x] 🟩 Agregar `api.analysis.ufValue()` al `Promise.all` existente (con fallback 40000 si falla)
  - [x] 🟩 Importar `ReviewPanel`
  - [x] 🟩 En el opportunity banner, reemplazar `<Link href={.../review}>` por el trigger de `ReviewPanel`
  - [x] 🟩 Renderizar `<ReviewPanel property={property} ufClp={ufClp} propertyId={id} />` en el árbol (fuera del banner, cerca del final del JSX)
