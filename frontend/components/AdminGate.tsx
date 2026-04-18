"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "admin_api_key";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    setAuthed(!!stored);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem(STORAGE_KEY, input.trim());
    setAuthed(true);
  }

  // Pre-hydration: render nothing to avoid flash of lock screen for authed sessions
  if (authed === null) return null;

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm space-y-5">
          <div className="text-center space-y-1">
            <p className="text-2xl">🔒</p>
            <h1 className="text-lg font-semibold text-gray-900">Área de administración</h1>
            <p className="text-sm text-gray-500">Ingresa el API key de administrador</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Admin API key"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {error && (
              <p className="text-xs text-red-500">Key incorrecta — verificá el valor en Railway.</p>
            )}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
