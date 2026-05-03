"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { hero } from "@/config/content";
import { useStarterPack } from "@/components/starter-pack/StarterPackProvider";
import { HeroMarquee } from "@/components/HeroMarquee";
import { AnchorButton, Button } from "@/components/ui/Button";
import { easeFloat, easePremium, fadeUp, spring, staggerSnappy } from "@/lib/motion";
import { track } from "@/lib/track";

const titleCls =
  "font-display text-[clamp(1.9rem,5.8vw,4.1rem)] font-extrabold leading-[1.02] tracking-[0.01em] text-zinc-950 sm:leading-[1.01] dark:text-zinc-100";

const subtitleCls =
  "mt-3 max-w-lg text-pretty text-[13px] font-medium leading-[1.65] text-zinc-900 sm:mt-4 sm:text-[14px] dark:text-zinc-100";

const hasHeroKicker = hero.kicker.trim().length > 0;
const hasPullQuote = hero.pullQuote.trim().length > 0;

function TypewriterLine({
  text,
  enabled,
  speedMs = 22,
}: {
  text: string;
  enabled: boolean;
  speedMs?: number;
}) {
  const [typed, setTyped] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setTyped(text);
      return;
    }
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [enabled, speedMs, text]);

  return (
    <span>
      {typed}
      {enabled && typed.length < text.length ? (
        <span className="ml-0.5 inline-block h-[1em] w-[1px] animate-typewriter-caret align-[-0.12em] bg-current opacity-80" />
      ) : null}
    </span>
  );
}

function HeroPortrait({
  animateFloat,
  reduceMotion,
}: {
  animateFloat: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      className="hero-portrait-wrap relative mx-auto w-full max-w-[26rem] overflow-hidden rounded-[1.75rem] border-2 border-emerald-500/55 bg-white/30 p-1.5 shadow-[0_0_0_1px_rgb(16_185_129/0.2),0_0_48px_-8px_rgb(4_120_72/0.4),0_20px_56px_-16px_rgb(4_120_72/0.5)] ring-1 ring-emerald-400/25 backdrop-blur-md dark:border-emerald-400/50 dark:bg-white/[0.06] dark:shadow-[0_0_0_1px_rgb(52_211_153/0.2),0_0_56px_-10px_rgb(52_211_153/0.28),0_20px_64px_-18px_rgb(0_0_0/0.55)] sm:max-w-[28rem] lg:mx-0 lg:max-w-none"
      animate={
        animateFloat && !reduceMotion
          ? { y: [0, -5, 0], rotate: [0, 0.35, 0, -0.3, 0] }
          : false
      }
      transition={{ duration: 9, repeat: Infinity, ease: easeFloat }}
    >
      <motion.div
        className="relative aspect-[3/4] w-full max-h-[min(78vh,620px)] overflow-hidden rounded-[1.4rem] border border-emerald-600/30 bg-transparent dark:border-emerald-400/35 sm:max-h-[min(80vh,640px)] lg:max-h-[min(86vh,680px)]"
        animate={
          animateFloat && !reduceMotion
            ? {
                boxShadow: [
                  "0 0 0 0 rgb(var(--accent-rgb) / 0)",
                  "0 0 28px -10px rgb(var(--accent-rgb) / 0.14)",
                  "0 0 0 0 rgb(var(--accent-rgb) / 0)",
                ],
              }
            : false
        }
        transition={{ duration: 5.2, repeat: Infinity, ease: easeFloat }}
      >
        <Image
          src={hero.portraitSrc}
          alt={hero.portraitAlt}
          fill
          className={hero.portraitCoverClass}
          sizes="(max-width: 1024px) 90vw, 480px"
          priority
        />
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [heroClient, setHeroClient] = useState(false);
  const reduceMotion = useReducedMotion();
  const starterPack = useStarterPack();

  useEffect(() => {
    setHeroClient(true);
  }, []);

  const scrollToPricing = () => {
    void track("click_product", { from: "hero_secondary" });
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={ref}
      className="relative z-0 overflow-hidden border-b border-stroke/15 pt-24 pb-12 dark:border-white/10 sm:pb-14 sm:pt-28 lg:pt-32 lg:pb-24"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 motion-reduce:animate-none opacity-[0.48]"
        style={{ background: "var(--hero-gradient)" }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 z-0 animate-hero-glow motion-reduce:animate-none bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgb(var(--accent-rgb)/0.1),transparent_55%)]"
        style={{ opacity: "calc(var(--pattern-opacity) * 0.5)" }}
        aria-hidden
      />

      <div className="relative z-[2] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="glass-panel p-6 sm:p-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:p-10"
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={heroClient ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={spring.panel}
        >
          <div className="order-1 lg:order-2">
            <motion.div
              variants={staggerSnappy}
              initial="hidden"
              animate={heroClient ? "show" : "hidden"}
            >
              {hasHeroKicker ? (
                <motion.p
                  variants={fadeUp}
                  className="mb-3 inline-flex items-center gap-3 rounded-full border border-accent/25 bg-white/40 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-accent shadow-plate backdrop-blur-sm dark:bg-white/5 sm:text-[11px]"
                >
                  <motion.span
                    aria-hidden
                    className="text-accent"
                    animate={
                      heroClient && !reduceMotion ? { rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] } : {}
                    }
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      repeatDelay: 4.2,
                      ease: easeFloat,
                    }}
                  >
                    ✦
                  </motion.span>
                  {hero.kicker}
                </motion.p>
              ) : null}

              <motion.h1 variants={fadeUp} className={titleCls}>
                <TypewriterLine text={hero.title} enabled={heroClient && !reduceMotion} speedMs={28} />
              </motion.h1>

              <motion.p variants={fadeUp} className={subtitleCls}>
                {hero.subtitle}
              </motion.p>

              {hasPullQuote ? (
                <motion.p
                  variants={fadeUp}
                  className="mt-4 max-w-lg rounded-xl border border-accent/25 bg-zinc-950/[0.04] px-4 py-3 text-[13px] font-semibold leading-snug text-zinc-800 backdrop-blur-[2px] dark:border-accent/35 dark:bg-white/[0.06] dark:text-zinc-200"
                >
                  {hero.pullQuote}
                </motion.p>
              ) : null}
            </motion.div>
          </div>

          <div className="order-2 mt-8 flex justify-center lg:order-1 lg:mt-0 lg:justify-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={heroClient ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={spring.portrait}
              className="w-full max-w-[26rem] sm:max-w-[28rem] lg:max-w-none"
            >
              <HeroPortrait animateFloat={heroClient} reduceMotion={reduceMotion} />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={heroClient ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={spring.ctaRow}
          className="glass-panel mx-auto mt-8 flex w-full max-w-[44rem] flex-col items-center gap-4 px-5 py-6 sm:px-8 lg:mt-10"
        >
          <div className="flex w-full max-w-[42rem] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Button
              type="button"
              onClick={() => {
                starterPack.open("hero_primary");
              }}
              className="cta-glow w-full !min-h-[44px] !px-6 !py-2.5 !text-[11px] sm:w-auto sm:!min-h-[48px] sm:!text-xs"
            >
              {hero.ctaPrimary}
            </Button>

            <AnchorButton
              href="#pricing"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                scrollToPricing();
              }}
              className="w-full !min-h-[42px] !px-5 !py-2 !text-[11px] sm:w-auto sm:!text-xs"
            >
              {hero.ctaSecondary}
            </AnchorButton>
          </div>

          {hero.ctaHint.trim() ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={heroClient ? { opacity: 1 } : {}}
              transition={{ delay: 0.45, duration: 0.55, ease: easePremium }}
              className="max-w-[30rem] text-center text-[12px] font-medium leading-relaxed text-zinc-800 dark:text-zinc-200"
            >
              {hero.ctaHint}
            </motion.p>
          ) : null}
        </motion.div>
      </div>

      <HeroMarquee phrases={hero.marqueePhrases} />
    </section>
  );
}
