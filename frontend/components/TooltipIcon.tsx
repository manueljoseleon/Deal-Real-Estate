"use client";

import { useState } from "react";

export default function TooltipIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center hover:bg-gray-300 transition-colors leading-none ml-1"
        aria-label="Más información"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-60 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
          {text}
        </div>
      )}
    </span>
  );
}
