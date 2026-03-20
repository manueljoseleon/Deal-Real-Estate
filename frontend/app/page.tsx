import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function HomePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Real Estate</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Oportunidades BTL en Chile — ordenadas por yield bruto
          </p>
        </div>
        <a
          href="/scraper"
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-3 py-1.5 bg-white"
        >
          Scraper →
        </a>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>}>
        <DashboardClient />
      </Suspense>
    </main>
  );
}
