"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

type Tipo = "Pregunta" | "Comentario" | "Idea" | "Error";

const TIPOS: Tipo[] = ["Pregunta", "Comentario", "Idea", "Error"];

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("Pregunta");
  const [mensaje, setMensaje] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Hide on landing page
  if (pathname === "/" || pathname === "/landing") return null;

  function reset() {
    setMensaje("");
    setEmail("");
    setTipo("Pregunta");
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mensaje.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, mensaje, email }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        title="Sugerencias y feedback"
        className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800 transition-colors flex items-center justify-center text-lg"
        aria-label="Abrir buzón de sugerencias"
      >
        💬
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Modal */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>

            {status === "sent" ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">✓</div>
                <p className="text-gray-900 font-medium mb-1">¡Gracias por tu feedback!</p>
                <p className="text-gray-500 text-sm">Lo revisaremos pronto.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 text-sm text-teal-700 hover:text-teal-900 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3
                  className="text-base font-semibold text-gray-900 mb-4"
                  style={{ fontFamily: "var(--font-josefin)" }}
                >
                  Buzón de sugerencias
                </h3>

                {/* Tipo selector */}
                <div className="flex gap-2 mb-4">
                  {TIPOS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        tipo === t
                          ? "bg-teal-700 border-teal-700 text-white"
                          : "border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Mensaje */}
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Si tienes una pregunta o comentario, descubriste un error o tienes una buena idea para Deal Inmobiliario, cuéntanos por acá. Esto se irá directo a las prioridades y optimización del sitio."
                  required
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-300"
                />

                {/* Email */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email (para que te respondamos)"
                  className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-300"
                />

                {status === "error" && (
                  <p className="mt-2 text-xs text-red-500">
                    Error al enviar. Intenta de nuevo.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending" || !mensaje.trim()}
                  className="mt-4 w-full bg-teal-700 text-white text-sm py-2.5 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "Enviando..." : "Enviar"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
