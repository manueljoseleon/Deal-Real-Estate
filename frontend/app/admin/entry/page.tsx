"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PropertyListItem } from "@/types";
import { formatUF, formatCLP, formatArea, formatPortal } from "@/lib/formatters";
import AdminGate from "@/components/AdminGate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  useful_area_m2: string;
  total_area_m2: string;
  lat: string;
  lng: string;
}

const EMPTY_FORM: FormState = { useful_area_m2: "", total_area_m2: "", lat: "", lng: "" };

function parseOptionalFloat(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MissingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
      ⚠ {label}
    </span>
  );
}

function FieldInput({
  label,
  id,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  id: keyof FormState;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EntryPage() {
  const [items, setItems] = useState<PropertyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(0);       // index within loaded batch
  const [page, setPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // Load a batch of pending properties
  const loadPage = useCallback(async (p: number) => {
    setLoadingPage(true);
    setError(null);
    try {
      const res = await api.properties.pendingReview(p, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
      setCursor(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => { loadPage(page); }, [page, loadPage]);

  // Pre-fill form with existing (non-null) values when switching properties
  useEffect(() => {
    const prop = items[cursor];
    if (!prop) return;
    setForm({
      useful_area_m2: prop.useful_area_m2 != null ? String(prop.useful_area_m2) : "",
      total_area_m2: "",   // always blank (not in list response)
      lat: "",
      lng: "",
    });
    setSavedId(null);
    setError(null);
  }, [cursor, items]);

  const prop = items[cursor];
  // Global index across all pages (for display only)
  const globalIndex = (page - 1) * PAGE_SIZE + cursor + 1;

  function setField(id: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [id]: v }));
  }

  function advance() {
    if (cursor + 1 < items.length) {
      setCursor((c) => c + 1);
    } else if (page * PAGE_SIZE < total) {
      setPage((p) => p + 1); // triggers loadPage
    }
  }

  async function handleSave() {
    if (!prop) return;
    setSaving(true);
    setError(null);
    try {
      const body: Parameters<typeof api.properties.patch>[1] = {};
      const area = parseOptionalFloat(form.useful_area_m2);
      const totalArea = parseOptionalFloat(form.total_area_m2);
      const lat = parseOptionalFloat(form.lat);
      const lng = parseOptionalFloat(form.lng);

      if (area != null) body.useful_area_m2 = area;
      if (totalArea != null) body.total_area_m2 = totalArea;
      if (lat != null && lng != null) { body.lat = lat; body.lng = lng; }

      if (Object.keys(body).length === 0) {
        setError("Ingresa al menos un valor para guardar.");
        return;
      }

      await api.properties.patch(prop.id, body);
      setSavedId(prop.id);
      // Remove from local list so count decreases immediately
      setItems((prev) => prev.filter((_, i) => i !== cursor));
      setTotal((t) => t - 1);
      // Advance (cursor stays at same index; next item slides up)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    advance();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <AdminGate>
        <main className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-400 text-sm">
          Cargando propiedades…
        </main>
      </AdminGate>
    );
  }

  if (error && items.length === 0) {
    return (
      <AdminGate>
        <main className="max-w-3xl mx-auto px-4 py-10 text-center text-red-500 text-sm">
          {error}
        </main>
      </AdminGate>
    );
  }

  if (items.length === 0 || !prop) {
    return (
      <AdminGate>
        <main className="max-w-3xl mx-auto px-4 py-10 text-center space-y-4">
          <p className="text-2xl">✅</p>
          <p className="text-gray-600 font-medium">No hay propiedades pendientes de revisión.</p>
          <Link href="/oportunidades" className="text-sm text-blue-600 hover:underline">← Volver al listado</Link>
        </main>
      </AdminGate>
    );
  }

  const missingArea = prop.useful_area_m2 == null;
  const missingCoords = prop.lat == null;

  return (
    <AdminGate>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/oportunidades" className="text-sm text-gray-500 hover:text-gray-800">← Listado</Link>
            <h1 className="text-lg font-bold text-gray-900 mt-1">Manual Entry</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reglas"
              className="text-xs text-gray-400 hover:text-teal-600 border border-gray-200 rounded px-2.5 py-1 bg-white hover:border-teal-300 transition-colors"
            >
              Reglas →
            </Link>
            <span className="text-sm text-gray-400 tabular-nums">
              {globalIndex} / {total.toLocaleString("es-CL")}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-amber-400 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.max(1, (globalIndex / total) * 100)}%` }}
          />
        </div>

        {/* Property card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">

          {/* Title + badges */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {missingArea && <MissingBadge label="sin área" />}
              {missingCoords && <MissingBadge label="sin coordenadas" />}
            </div>
            <h2 className="font-semibold text-gray-900 leading-snug">
              {prop.title ?? prop.external_id}
            </h2>
            <p className="text-sm text-gray-500">
              {prop.commune}{prop.neighborhood ? ` · ${prop.neighborhood}` : ""}
            </p>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Fact label="Precio" value={formatUF(prop.price_uf)} />
            <Fact label="CLP" value={formatCLP(prop.price_clp)} />
            <Fact label="Área actual" value={formatArea(prop.useful_area_m2)} />
            <Fact label="Dormitorios" value={prop.bedrooms != null ? String(prop.bedrooms) : "—"} />
            <Fact label="Baños" value={prop.bathrooms != null ? String(prop.bathrooms) : "—"} />
            <Fact label="Tipo" value={prop.property_type ?? "—"} />
          </div>

          {/* Portal link */}
          <a
            href={prop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Ver en {formatPortal(prop.portal)} ↗
          </a>
        </div>

        {/* Input form */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Ingresar datos faltantes</h3>

          <div className="grid grid-cols-2 gap-4">
            {missingArea && (
              <FieldInput
                label="Superficie útil (m²)"
                id="useful_area_m2"
                value={form.useful_area_m2}
                onChange={(v) => setField("useful_area_m2", v)}
                placeholder="ej. 65"
                hint="Solo números. Revisa en el portal."
              />
            )}
            <FieldInput
              label="Superficie terreno (m²)"
              id="total_area_m2"
              value={form.total_area_m2}
              onChange={(v) => setField("total_area_m2", v)}
              placeholder="ej. 120"
              hint="Opcional — solo casas."
            />
            {missingCoords && (
              <>
                <FieldInput
                  label="Latitud"
                  id="lat"
                  value={form.lat}
                  onChange={(v) => setField("lat", v)}
                  placeholder="ej. -33.4280"
                  hint="Desde Google Maps: clic derecho → copiar."
                />
                <FieldInput
                  label="Longitud"
                  id="lng"
                  value={form.lng}
                  onChange={(v) => setField("lng", v)}
                  placeholder="ej. -70.6091"
                />
              </>
            )}
          </div>

          {/* Coord helper — opens Google Maps for the commune */}
          {missingCoords && (
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(prop.commune ?? "Santiago")},+Chile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
            >
              Abrir Google Maps para {prop.commune ?? "la comuna"} →
            </a>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {savedId === prop.id && (
            <p className="text-sm text-green-600 font-medium">✓ Guardado. Pasando a la siguiente…</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded px-4 py-2 transition-colors"
            >
              {saving ? "Guardando…" : "Guardar y siguiente"}
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
            >
              Omitir
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {prop.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {prop.images.slice(0, 5).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-20 w-28 rounded object-cover flex-shrink-0 bg-gray-100"
              />
            ))}
          </div>
        )}

      </main>
    </AdminGate>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800 text-sm">{value}</p>
    </div>
  );
}
