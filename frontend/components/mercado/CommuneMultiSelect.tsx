"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

export default function CommuneMultiSelect({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(commune: string) {
    onChange(
      value.includes(commune)
        ? value.filter((c) => c !== commune)
        : [...value, commune]
    );
  }

  function removeTag(commune: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((c) => c !== commune));
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — shows selected tags or placeholder */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={`min-h-[34px] flex flex-wrap gap-1 items-center px-2 py-1 border rounded cursor-pointer bg-white transition-colors ${
          open ? "border-teal-500 ring-1 ring-teal-500" : "border-gray-300 hover:border-teal-400"
        }`}
      >
        {value.length === 0 ? (
          <span className="text-sm text-gray-400">Todas las comunas</span>
        ) : (
          value.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1 bg-teal-700 text-white text-xs px-2 py-0.5 rounded-full"
            >
              {c}
              <button
                onClick={(e) => removeTag(c, e)}
                className="hover:text-teal-200 leading-none cursor-pointer"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comuna…"
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
            ) : (
              filtered.map((c) => (
                <li
                  key={c}
                  onClick={() => toggle(c)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-teal-50 hover:text-teal-800"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={value.includes(c)}
                    className="accent-teal-700 pointer-events-none"
                  />
                  {c}
                </li>
              ))
            )}
          </ul>

          {/* Clear all */}
          {value.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button
                onClick={() => { onChange([]); setOpen(false); setSearch(""); }}
                className="text-xs text-teal-700 hover:text-teal-900 cursor-pointer underline"
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
