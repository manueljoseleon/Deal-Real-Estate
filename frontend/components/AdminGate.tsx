"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "admin_auth";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  // null = still checking sessionStorage (pre-hydration — avoid lock screen flash)
  // true  = authenticated
  // false = not authenticated → show lock screen
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    setAuthed(stored === "1");
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (expected && input === expected) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
    } else {
      setError(true);
      setInput("");
    }
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
            <p className="text-sm text-gray-500">Ingresa la contraseña para continuar</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="Contraseña"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {error && (
              <p className="text-xs text-red-500">Contraseña incorrecta.</p>
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
