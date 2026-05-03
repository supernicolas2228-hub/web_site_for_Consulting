"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

const DEPTHS = [25, 50, 75, 100] as const;

export function TrackingProvider() {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    void track("page_view");

    /** Возврат по «Назад» из bfcache — React не перемонтируется, без этого второй заход не уходит на /api/track */
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void track("page_view", { resume: "bfcache" });
    };
    window.addEventListener("pageshow", onPageShow);

    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const pct = (window.scrollY / total) * 100;
      for (const d of DEPTHS) {
        if (pct >= d && !fired.current.has(d)) {
          fired.current.add(d);
          void track("scroll_depth", { depth: d });
        }
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
