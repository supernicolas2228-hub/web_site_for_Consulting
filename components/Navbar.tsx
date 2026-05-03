"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { nav, site } from "@/config/content";
import { links, isPlaceholderLink } from "@/config/links";
import { Button } from "@/components/ui/Button";
import { useStarterPack } from "@/components/starter-pack/StarterPackProvider";
import { NavbarBrand } from "@/components/NavbarBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { track } from "@/lib/track";
import { fadeUp, spring, staggerSnappy } from "@/lib/motion";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const starterPack = useStarterPack();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const linkClass =
    "text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-900 transition hover:text-zinc-950 dark:text-zinc-100 dark:hover:text-white sm:text-xs";

  const barBg = scrolled
    ? "border-b border-stroke/20 bg-[var(--nav-bg-scrolled)] shadow-[var(--nav-shadow)] backdrop-blur-[20px] backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--nav-bg-scrolled)]/90"
    : "border-b border-transparent bg-[var(--nav-bg-top)]/85 backdrop-blur-[18px] backdrop-saturate-150 supports-[backdrop-filter]:bg-[var(--nav-bg-top)]/75";

  const hasProductLink = !isPlaceholderLink(links.product) && nav.productLabel.trim().length > 0;

  return (
    <>
      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[90] min-h-dvh w-full cursor-default bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
    <header
      className={`site-header notranslate fixed inset-x-0 top-0 z-[100] w-full max-w-none transition-colors ${barBg}`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {site.topRibbon.trim() ? (
        <p className="border-b border-stroke/10 bg-band/45 px-4 py-2 text-center text-[10px] font-semibold leading-snug tracking-[0.06em] text-zinc-900 dark:border-white/8 dark:bg-black/22 dark:text-zinc-100 sm:text-[11px] sm:tracking-[0.08em]">
          {site.topRibbon}
        </p>
      ) : null}
      <motion.div
        className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8"
        initial={reduceMotion ? false : { opacity: 0, y: -14 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={spring.nav}
      >
        <NavbarBrand mounted={mounted} />
        <motion.nav
          className="hidden min-w-0 flex-1 justify-center gap-6 lg:flex xl:gap-8"
          variants={staggerSnappy}
          initial="hidden"
          animate={mounted ? "show" : "hidden"}
        >
          {nav.anchors.map((a) => (
            <motion.a
              key={a.href}
              href={a.href}
              className={linkClass}
              variants={fadeUp}
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.97 }}
            >
              {a.label}
            </motion.a>
          ))}
        </motion.nav>

        <motion.div
          className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          animate={mounted ? { opacity: 1, x: 0 } : {}}
          transition={spring.navDrawer}
        >
          <ThemeToggle />
          {hasProductLink ? (
            <motion.a
              href={links.product}
              target="_blank"
              rel="noreferrer"
              className={`${linkClass} hidden lg:inline-flex`}
              initial={reduceMotion ? false : { opacity: 0, x: 6 }}
              animate={mounted ? { opacity: 1, x: 0 } : {}}
              transition={spring.navDrawer}
              onClick={() => void track("click_product", { from: "navbar_product" })}
            >
              {nav.productLabel}
            </motion.a>
          ) : null}
          <motion.div
            className="relative"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={
              mounted
                ? reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: [1, 0.82, 1],
                      scale: [1, 1.06, 1],
                    }
                : {}
            }
            transition={reduceMotion ? spring.navDrawer : { duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button
              type="button"
              onClick={() => {
                starterPack.open("navbar");
              }}
              className="!min-h-[44px] !px-3 !py-2 !text-[11px] !tracking-[0.08em] sm:!px-5 sm:!text-xs !bg-gradient-to-r !from-emerald-600 !via-accent !to-emerald-500 !text-white !border-0 !shadow-lg !shadow-accent/40"
            >
              <span className="sm:hidden">Подарок</span>
              <span className="hidden sm:inline">{nav.cta}</span>
            </Button>
          </motion.div>
          <button
            type="button"
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-stroke/20 bg-white/55 text-zinc-900 shadow-plate backdrop-blur-xl lg:hidden dark:border-white/12 dark:bg-white/5 dark:text-white"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Меню</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2.25" />
              ) : (
                <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2.25" />
              )}
            </svg>
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-stroke/15 bg-gradient-to-b from-[var(--nav-bg-scrolled)]/95 to-zinc-950/12 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.35)] backdrop-blur-2xl dark:from-zinc-950/88 dark:to-black/40 dark:shadow-[0_20px_50px_-18px_rgb(0_0_0/0.65)] lg:hidden"
          >
            <motion.div
              className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4"
              variants={staggerSnappy}
              initial="hidden"
              animate="show"
            >
              {nav.anchors.map((a) => (
                <motion.a
                  key={a.href}
                  href={a.href}
                  variants={fadeUp}
                  className="min-h-[48px] rounded-2xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-900 transition hover:bg-accent/10 dark:text-zinc-100 dark:hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {a.label}
                </motion.a>
              ))}
              {hasProductLink ? (
                <motion.a
                  href={links.product}
                  target="_blank"
                  rel="noreferrer"
                  variants={fadeUp}
                  className="min-h-[48px] rounded-2xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-900 transition hover:bg-accent/10 dark:text-zinc-100 dark:hover:bg-white/5"
                  onClick={() => {
                    setOpen(false);
                    void track("click_product", { from: "navbar_product_mobile" });
                  }}
                >
                  {nav.productLabel}
                </motion.a>
              ) : null}
              <motion.div variants={fadeUp}>
              <Button
                type="button"
                className="mt-2 w-full !justify-center"
                onClick={() => {
                  setOpen(false);
                  starterPack.open("navbar_mobile");
                }}
              >
                {nav.cta}
              </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </>
  );
}
