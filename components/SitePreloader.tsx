"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { hero } from "@/config/content";
import { shouldSkipHeavyPreloader } from "@/lib/preloader-skip";

const SESSION_KEY = "ks_preloader_done_v9";

/** Слова + «купюры» — только desktop (sm+), на телефоне DOM не рендерим → нет лагов. */
type FxBurstItem =
  | { kind: "word"; text: string; emphasize?: boolean }
  | { kind: "money"; text: string };

const FX_BURST: readonly FxBurstItem[] = [
  { kind: "word", text: "УСПЕХ", emphasize: true },
  { kind: "money", text: "💵" },
  { kind: "word", text: "ДЕНЬГИ", emphasize: true },
  { kind: "money", text: "💶" },
  { kind: "word", text: "ДОХОД" },
  { kind: "money", text: "💰" },
  { kind: "word", text: "УСПЕХ", emphasize: true },
  { kind: "money", text: "$" },
  { kind: "word", text: "РЕЗУЛЬТАТ" },
  { kind: "money", text: "€" },
  { kind: "word", text: "РОСТ" },
  { kind: "money", text: "💸" },
  { kind: "word", text: "ПОБЕДА" },
  { kind: "money", text: "💵" },
  { kind: "word", text: "ДЕНЬГИ", emphasize: true },
  { kind: "money", text: "💶" },
] as const;

const MAX_MS = 3200;
const MOBILE_MAX_MS = 1600;

/** Показать сцену снова: открой главную с `?replayLoader`. */
function wantsReplayLoader(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("replayLoader");
  } catch {
    return false;
  }
}

function getSkipSession(): boolean {
  if (typeof window === "undefined") return false;
  if (wantsReplayLoader()) return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function whenDomReady(fn: () => void) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }
}

function whenLayoutStable(run: () => void) {
  const exec = () => requestAnimationFrame(() => requestAnimationFrame(run));
  if (typeof document !== "undefined" && document.fonts?.ready) {
    void document.fonts.ready.then(exec);
  } else {
    exec();
  }
}

/**
 * Имя по центру → на desktop из центра разлетаются слова/символы (GSAP).
 * На телефонах — только короткое появление имени и fade-out (без частиц, без лагов).
 */
export function SitePreloader() {
  const [active, setActive] = useState(true);
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const safetyRef = useRef(0);
  const killedRef = useRef(false);
  const gsapTargetsRef = useRef<Element[]>([]);

  const displayName = hero.portraitAlt.trim() || "Кирилл Санчаев";

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && shouldSkipHeavyPreloader()) {
      setActive(false);
      return;
    }
    if (getSkipSession()) {
      setActive(false);
      return;
    }
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("site-preloader-active");
    setMountTarget(document.body);
  }, []);

  useLayoutEffect(() => {
    if (!active) {
      document.documentElement.classList.remove("site-preloader-active");
    }
    return () => {
      document.documentElement.classList.remove("site-preloader-active");
    };
  }, [active]);

  useLayoutEffect(() => {
    if (!active || !mountTarget) return;

    killedRef.current = false;
    const elHtml = document.documentElement;
    const elBody = document.body;
    const prevBodyOverflow = elBody.style.overflow;
    const prevHtmlOverflow = elHtml.style.overflow;
    const unlock = () => {
      elBody.style.overflow = prevBodyOverflow;
      elHtml.style.overflow = prevHtmlOverflow;
    };

    const endAndHide = (clearT = true) => {
      if (clearT) window.clearTimeout(safetyRef.current);
      markDone();
      unlock();
      if (!killedRef.current) setActive(false);
    };

    /** Телефоны: без частиц, 3 цели GSAP, короткий таймлайн. */
    const runMobileLight = () => {
      if (killedRef.current) return;
      try {
        const root = rootRef.current;
        const box = boxRef.current;
        const nameEl = nameRef.current;
        if (!root || !box || !nameEl) {
          endAndHide();
          return;
        }

        const lock = () => {
          elBody.style.overflow = "hidden";
          elHtml.style.overflow = "hidden";
        };
        lock();

        safetyRef.current = window.setTimeout(() => {
          try {
            gsap.killTweensOf(gsapTargetsRef.current);
          } catch {
            /* ignore */
          }
          gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
          endAndHide();
        }, MOBILE_MAX_MS);

        if (prefersReduced()) {
          gsap
            .timeline()
            .to(root, { autoAlpha: 0, duration: 0.4, ease: "power2.inOut" })
            .add(() => endAndHide());
          return;
        }

        gsapTargetsRef.current = [root, box, nameEl];
        gsap.set(nameEl, { opacity: 0, y: 18, scale: 0.97, transformOrigin: "50% 50%" });
        gsap.set(root, { autoAlpha: 1 });

        const tl = gsap.timeline();
        tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: "power2.out" })
          .to(
            nameEl,
            { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power2.out" },
            "-=0.1",
          )
          .to({}, { duration: 0.14 })
          .to(root, {
            autoAlpha: 0,
            duration: 0.36,
            ease: "power2.inOut",
            onComplete: () => {
              window.clearTimeout(safetyRef.current);
              markDone();
              unlock();
              if (!killedRef.current) setActive(false);
            },
          });
      } catch {
        endAndHide();
      }
    };

    /** Desktop: полный вылет частиц. */
    const runDesktopBurst = () => {
      if (killedRef.current) return;
      try {
        const root = rootRef.current;
        const box = boxRef.current;
        const nameEl = nameRef.current;
        const fx = fxRef.current;
        if (!root || !box || !nameEl || !fx) {
          endAndHide();
          return;
        }

        const lock = () => {
          elBody.style.overflow = "hidden";
          elHtml.style.overflow = "hidden";
        };
        lock();

        safetyRef.current = window.setTimeout(() => {
          try {
            gsap.killTweensOf(gsapTargetsRef.current);
          } catch {
            /* ignore */
          }
          gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
          endAndHide();
        }, MAX_MS);

        if (prefersReduced()) {
          gsap
            .timeline()
            .to(root, { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" })
            .add(() => endAndHide());
          return;
        }

        const nameRect = nameEl.getBoundingClientRect();
        const fxRect = fx.getBoundingClientRect();
        const left = nameRect.left - fxRect.left;
        const right = nameRect.right - fxRect.left;
        const top = nameRect.top - fxRect.top;
        const bottom = nameRect.bottom - fxRect.top;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;

        const vfxEls = fx.querySelectorAll<HTMLElement>(".pre-fx");
        if (vfxEls.length === 0) {
          endAndHide();
          return;
        }

        const vfxArr = Array.from(vfxEls);
        gsapTargetsRef.current = [root, box, nameEl, ...vfxArr];

        const sideFlight = () => {
          const sidePick = Math.floor(Math.random() * 4);
          const edgeJitter = 16;
          let sx = cx;
          let sy = cy;
          if (sidePick === 0) {
            sx = left - Math.random() * edgeJitter;
            sy = top + Math.random() * Math.max(8, bottom - top);
          } else if (sidePick === 1) {
            sx = right + Math.random() * edgeJitter;
            sy = top + Math.random() * Math.max(8, bottom - top);
          } else if (sidePick === 2) {
            sx = left + Math.random() * Math.max(8, right - left);
            sy = top - Math.random() * edgeJitter;
          } else {
            sx = left + Math.random() * Math.max(8, right - left);
            sy = bottom + Math.random() * edgeJitter;
          }

          const vx = sx - cx;
          const vy = sy - cy;
          const len = Math.hypot(vx, vy) || 1;
          const nx = vx / len;
          const ny = vy / len;
          const dist = 270 + Math.random() * 220;
          const flyXAbs = sx + nx * dist + (Math.random() - 0.5) * 60;
          const flyYAbs = sy + ny * dist + (Math.random() - 0.5) * 60;
          return {
            spawnX: sx - fxRect.width / 2,
            spawnY: sy - fxRect.height / 2,
            flyX: flyXAbs - fxRect.width / 2,
            flyY: flyYAbs - fxRect.height / 2,
            rot: (Math.random() - 0.5) * 180,
            sc: 0.45 + Math.random() * 0.55,
          };
        };

        gsap.set(vfxArr, {
          x: 0,
          y: 0,
          scale: 0.55,
          opacity: 0,
          rotation: 0,
          transformOrigin: "50% 50%",
        });
        gsap.set(nameEl, { opacity: 0, y: 36, scale: 0.94, transformOrigin: "50% 50%" });
        gsap.set(root, { autoAlpha: 1 });

        const tl = gsap.timeline();

        tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power2.out" })
          .to(
            nameEl,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.82,
              ease: "power3.out",
            },
            "-=0.22",
          )
          .addLabel("burst", "-=0.28");

        vfxArr.forEach((el, i) => {
          const b = sideFlight();
          gsap.set(el, {
            x: b.spawnX,
            y: b.spawnY,
            rotation: b.rot * 0.18,
            scale: 0.58,
          });
          tl.to(
            el,
            {
              opacity: 1,
              scale: 0.88 + (i % 3) * 0.05,
              duration: 0.12,
              ease: "power2.out",
            },
            `burst+=${i * 0.008}`,
          ).to(
            el,
            {
              x: b.flyX,
              y: b.flyY,
              rotation: b.rot,
              scale: b.sc,
              opacity: 0,
              duration: 0.72 + Math.random() * 0.12,
              ease: "power3.out",
            },
            `burst+=${0.02 + i * 0.012}`,
          );
        });

        tl.to(
          nameEl,
          {
            opacity: 0.55,
            scale: 0.985,
            duration: 0.35,
            ease: "power2.inOut",
          },
          "burst+=0.08",
        ).to(nameEl, { opacity: 1, scale: 1, duration: 0.55, ease: "power2.out" }, "burst+=0.38");

        tl.to({}, { duration: 0.35 }).to(root, {
          autoAlpha: 0,
          duration: 0.55,
          ease: "power2.inOut",
          onComplete: () => {
            window.clearTimeout(safetyRef.current);
            markDone();
            unlock();
            if (!killedRef.current) setActive(false);
          },
        });
      } catch {
        endAndHide();
      }
    };

    const run = () => {
      if (killedRef.current) return;
      const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
      if (isNarrow) {
        requestAnimationFrame(() => requestAnimationFrame(runMobileLight));
      } else {
        whenLayoutStable(runDesktopBurst);
      }
    };

    whenDomReady(run);

    return () => {
      killedRef.current = true;
      window.clearTimeout(safetyRef.current);
      try {
        if (gsapTargetsRef.current.length) gsap.killTweensOf(gsapTargetsRef.current);
      } catch {
        /* ignore */
      }
      gsapTargetsRef.current = [];
      elBody.style.overflow = prevBodyOverflow;
      elHtml.style.overflow = prevHtmlOverflow;
    };
  }, [active, mountTarget]);

  if (!active) return null;
  if (typeof document === "undefined" || !mountTarget) return null;

  const overlay = (
    <div
      ref={rootRef}
      data-site-preloader="true"
      className="site-preloader pointer-events-auto fixed inset-0 isolate z-[2147483000] flex min-h-0 min-w-0 max-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-hidden bg-black pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] [contain:layout_style_paint] will-change-[opacity] transform-gpu before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_38%,rgba(16,185,129,0.12),transparent_55%)] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_115%,rgba(0,0,0,0.55),transparent_42%)]"
      style={{ zIndex: 2147483000, isolation: "isolate" as const }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Загрузка"
    >
      <div
        ref={boxRef}
        className="relative flex min-h-[min(40dvh,360px)] w-full max-w-[min(92vw,560px)] flex-col items-center justify-center px-5 sm:min-h-[min(52vh,440px)]"
        suppressHydrationWarning
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_50%,rgba(24,24,27,0.35),transparent_70%)]"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-[18ch]">
          <p
            ref={nameRef}
            className="relative z-[40] m-0 text-center font-display text-[clamp(1.65rem,7vw,3.35rem)] font-bold leading-[1.05] tracking-[0.03em] text-white [text-shadow:0_2px_48px_rgba(0,0,0,0.65),0_0_80px_rgba(16,185,129,0.15)] [isolation:isolate]"
          >
            {displayName}
          </p>

          <div
            ref={fxRef}
            className="pointer-events-none absolute left-1/2 top-1/2 z-[5] hidden h-[min(78vmin,560px)] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 sm:block"
            aria-hidden
          >
            {FX_BURST.map((item, i) => {
              if (item.kind === "money") {
                const isGlyph = item.text === "$" || item.text === "€";
                return (
                  <span
                    key={`${item.text}-${i}`}
                    className={`pre-fx absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none select-none ${
                      isGlyph
                        ? "font-display text-[clamp(17px,4.8vmin,30px)] font-black text-amber-200 [text-shadow:0_0_22px_rgb(251_191_36/0.55),0_0_40px_rgb(234_179_8/0.25)]"
                        : "text-[clamp(19px,5.2vmin,36px)] [filter:drop-shadow(0_0_14px_rgb(251_191_36/0.45))]"
                    }`}
                  >
                    {item.text}
                  </span>
                );
              }
              const emphasize = Boolean(item.emphasize);
              return (
                <span
                  key={`${item.text}-${i}`}
                  className={`pre-fx font-display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-extrabold uppercase leading-none tracking-[0.18em] ${
                    emphasize
                      ? "text-[clamp(13px,3.6vmin,22px)] text-emerald-300 [text-shadow:0_0_24px_rgb(52_211_153/0.55)]"
                      : "text-[clamp(11px,3vmin,17px)] text-zinc-400/95 [text-shadow:0_0_16px_rgba(255,255,255,0.12)]"
                  }`}
                >
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, mountTarget);
}
