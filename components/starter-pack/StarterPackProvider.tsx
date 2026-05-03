"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { StarterPackModal } from "@/components/starter-pack/StarterPackModal";
import { track } from "@/lib/track";

type Ctx = {
  open: (from?: string) => void;
  close: () => void;
};

const StarterPackContext = createContext<Ctx | null>(null);

export function StarterPackProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [source, setSource] = useState("unknown");

  const open = useCallback((from = "unknown") => {
    void track("click_starter_pack", { from });
    setSource(from);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <StarterPackContext.Provider value={value}>
      {children}
      <StarterPackModal open={isOpen} onClose={close} source={source} />
    </StarterPackContext.Provider>
  );
}

export function useStarterPack() {
  const ctx = useContext(StarterPackContext);
  if (!ctx) {
    throw new Error("useStarterPack должен быть внутри StarterPackProvider");
  }
  return ctx;
}
