"use client";

import { createContext, useContext, useState } from "react";

interface HowItWorksContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const HowItWorksContext = createContext<HowItWorksContextValue | null>(null);

export function HowItWorksProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <HowItWorksContext.Provider value={{ open, setOpen }}>
      {children}
    </HowItWorksContext.Provider>
  );
}

export function useHowItWorks() {
  const ctx = useContext(HowItWorksContext);
  if (!ctx) throw new Error("useHowItWorks must be used within HowItWorksProvider");
  return ctx;
}
