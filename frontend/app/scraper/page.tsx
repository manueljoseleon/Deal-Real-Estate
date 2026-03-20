"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { ScrapeRun } from "@/types";
import Link from "next/link";

const COMMUNES = ["Providencia", "Las Condes", "Ñuñoa", "Santiago", "Vitacura", "San Miguel"];
const PORTALS = ["portal_inmobiliario", "toctoc"];
const TYPES = ["rental", "sale"];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running:   "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed:    "bg-red-100 text-red-700",
    pending:   "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "en curso…";
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

export default function ScraperPage() {
  const [runs, setRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedCommunes, setSelectedCommunes] = useState<string[]>(["Providencia", "Las Condes"]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["rental", "sale"]);

  const fetchRuns = useCallback(async () => {
    try {
      const data = await api.scraper.runs(30);
      setRuns(data);
    } catch {
      // backend may be down — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 5s when any run is active
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(() => {
      fetchRuns();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  async function triggerScrape() {
    if (!selectedCommunes.length || !selectedTypes.length) return;
    setTriggering(true);
    try {
      await api.scraper.trigger(PORTALS, selectedCommunes, selectedTypes);
      await fetchRuns();
    } catch (e) {
      alert(`Error al iniciar scraper: ${e}`);
    } finally {
      setTriggering(false);
    }
  }

  const hasRunning = runs.some((r) => r.status === "running");

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Scraper</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lanza y monitorea las corridas de scraping</p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-3 py-1.5 bg-white">
          ← Dashboard
        </Link>
      </div>

      {/* Trigger panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Nueva corrida</h2>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Comunas</p>
          <div className="flex flex-wrap gap-2">
            {COMMUNES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCommunes((prev) =>
                  prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                )}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedCommunes.includes(c)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo</p>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTypes((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                )}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedTypes.includes(t)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={triggerScrape}
          disabled={triggering || hasRunning || !selectedCommunes.length}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {triggering ? "Iniciando…" : hasRunning ? "Scraper en curso…" : "Iniciar scraper"}
        </button>
        {hasRunning && (
          <p className="text-xs text-blue-600 animate-pulse">
            Corrida activa — actualizando estado cada 5 segundos
          </p>
        )}
      </div>

      {/* Runs history */}
      <div className="space-y-2">
        <h2 className="font-semibold text-gray-800">Historial de corridas</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : runs.length === 0 ? (
          <p className="text-sm text-gray-400">Sin corridas anteriores.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Portal</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Comunas</th>
                  <th className="px-4 py-2 text-right">Encontradas</th>
                  <th className="px-4 py-2 text-right">Nuevas</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                  <th className="px-4 py-2 text-right">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{r.portal}</td>
                    <td className="px-4 py-2 text-gray-500">{r.listing_type}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {(r.communes ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {r.listings_found ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                      {r.listings_new ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {formatDuration(r.started_at, r.finished_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
