"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { pricing } from "@/config/content";
import { links, isPlaceholderLink } from "@/config/links";
import { useStarterPack } from "@/components/starter-pack/StarterPackProvider";
import { AnchorButton, Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/SectionHeading";
import {
  fadeUp,
  growFromLeft,
  growFromRight,
  sectionEnter,
  spring,
  springHoverStrong,
  staggerContainer,
} from "@/lib/motion";
import { chainOnClick, outboundAnchorProps } from "@/lib/outbound-link";
import { track } from "@/lib/track";

const TONES = [
  {
    corner: "from-emerald-500/30 via-emerald-400/10 to-transparent dark:from-emerald-400/22",
    badge: "bg-emerald-800 text-white shadow-md shadow-emerald-900/25 dark:bg-emerald-600",
    ring: "ring-emerald-700/15 dark:ring-emerald-400/20",
    cardBg: "bg-white/48 backdrop-blur-xl dark:bg-white/[0.09]",
  },
  {
    corner: "from-teal-500/28 via-cyan-500/8 to-transparent dark:from-teal-400/20",
    badge: "bg-teal-800 text-white shadow-md shadow-teal-900/20 dark:bg-teal-600",
    ring: "ring-teal-700/15 dark:ring-teal-400/18",
    cardBg: "bg-white/44 backdrop-blur-xl dark:bg-white/[0.085]",
  },
  {
    corner: "from-green-500/26 via-lime-500/8 to-transparent dark:from-green-400/18",
    badge: "bg-green-800 text-white shadow-md shadow-green-900/22 dark:bg-green-600",
    ring: "ring-green-700/14 dark:ring-green-400/18",
    cardBg: "bg-white/46 backdrop-blur-xl dark:bg-white/[0.09]",
  },
] as const;

function PlanCard({
  tone,
  popular,
  children,
}: {
  tone: 0 | 1 | 2;
  popular?: boolean;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -10, scale: 1.015, transition: springHoverStrong }}
      className={`group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border p-6 shadow-plate ring-1 transition-shadow duration-300 sm:min-h-[300px] sm:p-7 ${
        popular
          ? "border-emerald-600/60 ring-2 ring-emerald-500/40 hover:shadow-lift dark:border-emerald-400/50 dark:ring-emerald-400/30"
          : "border-stroke/18 hover:border-emerald-800/30 hover:shadow-lift dark:hover:border-emerald-400/30"
      } ${t.cardBg} ${t.ring} dark:border-white/10`}
    >
      {popular ? (
        <div className="absolute right-3 top-3 z-10">
          <span className="inline-flex rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white shadow-md dark:from-emerald-500 dark:to-emerald-400">
            Популярно
          </span>
        </div>
      ) : null}
      <div
        className={`pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-80 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${t.corner}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -bottom-12 -right-8 h-28 w-28 rounded-full bg-gradient-to-tl opacity-50 blur-2xl ${t.corner}`}
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </motion.article>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const [headDone, setHeadDone] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const starterPack = useStarterPack();
  const joinHref = links.joinSellIsLife;
  const joinCta = outboundAnchorProps(joinHref);
  const payLinkReady = !isPlaceholderLink(joinHref);
  const planDetails: Record<string, string> = {
    session:
      "СТРАТЕГИЧЕСКАЯ СЕССИЯ\n" +
      "• 0 ₽\n" +
      "• 45-60 минут\n" +
      "• Телеграм / Телемост\n\n" +
      "Что это:\n" +
      "• Спокойный стартовый звонок, чтобы познакомиться и понять, подходим ли друг другу.\n" +
      "• Фиксируем текущую точку А: где вы сейчас по доходу, клиентам и системе.\n" +
      "• Определяем ближайший шаг и что даст самый быстрый результат.\n" +
      "• Без давления и обязательств: после звонка сами решаете, идти ли дальше.",
    consult:
      "КОНСУЛЬТАЦИЯ\n" +
      "• 5 500 ₽\n" +
      "• 2-3 часа\n" +
      "• Телеграм, Телемост\n\n" +
      "Что внутри:\n" +
      "1) Разбор (30-40 минут)\n" +
      "• Ответы на вопросы\n" +
      "• Определение точки А (доход и так далее)\n" +
      "• Определение точки Б\n" +
      "• Какие ошибки (почему нет денег/клиентов)\n\n" +
      "2) Стратегия / план действий (40-50 минут)\n" +
      "• Пишем стратегию на конкретный срок\n\n" +
      "3) Информация (30-40 минут)\n" +
      "• Продажи в звонке\n" +
      "• Оффер\n" +
      "• Поиск клиентов",
    personal:
      "ЛИЧНАЯ РАБОТА\n" +
      "• 70 000 ₽\n" +
      "• 90 дней\n" +
      "• 60-90 минут созвон\n" +
      "• 12 звонков (1 раз в неделю)\n" +
      "• Телеграм, Телемост\n\n" +
      "Что внутри:\n" +
      "• Корректировка/написание стратегии\n" +
      "• Помощь с клиентами (как правильно продавать)\n" +
      "• Ответы на вопросы\n\n" +
      "• Чат в Телеграме\n" +
      "• Отвечаю в течение дня (вопросы, помощь)\n\n" +
      "• Даю знания\n" +
      "• Проверяю выполнение\n" +
      "• Говорю, что исправить\n\n" +
      "• Созвон по офферу\n" +
      "• Как писать лидам/клиентам\n" +
      "• Как закрывать сделки\n" +
      "• Разбор переписок/звонков",
  };

  return (
    <motion.section
      id="pricing"
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={sectionEnter}
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-stroke/15 py-14 sm:py-16 lg:py-20 dark:border-white/10"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass-panel mx-auto flex max-w-4xl flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
          {pricing.eyebrow.trim() ? (
            <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-accent sm:text-xs">
              {pricing.eyebrow}
            </p>
          ) : null}
          <div className="flex w-full max-w-2xl items-center gap-4">
            <motion.span
              className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-600/55 to-emerald-700/90 dark:via-emerald-400/45"
              style={{ transformOrigin: "0% 50%" }}
              variants={growFromLeft}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
            />
            <motion.p
              className="shrink-0 font-display text-[10px] font-bold uppercase tracking-[0.42em] text-emerald-800 dark:text-emerald-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={spring.sectionPunch}
            >
              {pricing.ribbonLabel}
            </motion.p>
            <motion.span
              className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-600/55 to-emerald-700/90 dark:via-emerald-400/45"
              style={{ transformOrigin: "100% 50%" }}
              variants={growFromRight}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
            />
          </div>

          <SectionHeading
            inView={inView}
            className="mt-5 max-w-4xl font-display text-[clamp(1.65rem,4vw,3rem)] uppercase leading-[1.06] tracking-tight text-zinc-900 dark:text-zinc-100"
            onAnimationComplete={() => setHeadDone(true)}
          >
            {pricing.title}
          </SectionHeading>

          {pricing.intro.trim() ? (
            <motion.p
              className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-emerald-950 dark:text-emerald-50"
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.06, ...sectionEnter }}
            >
              {pricing.intro}
            </motion.p>
          ) : null}

          {pricing.contactRibbon.trim() ? (
            <motion.div
              className="mt-8 w-full max-w-xl rounded-2xl border border-emerald-800/15 bg-gradient-to-br from-emerald-50/95 via-white/90 to-teal-50/80 px-5 py-4 text-center shadow-plate dark:border-emerald-400/20 dark:from-emerald-950/45 dark:via-[rgb(var(--surface-rgb)/0.9)] dark:to-zinc-950/85"
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ ...spring.sectionMicro, delay: 0.12 }}
            >
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-900 dark:text-emerald-200">
                {pricing.contactRibbon}
              </p>
              {pricing.contactHint.trim() ? (
                <p className="mt-2 text-[13px] font-semibold leading-relaxed text-emerald-950 dark:text-emerald-50">
                  {pricing.contactHint}
                </p>
              ) : null}
            </motion.div>
          ) : null}

          <motion.p
            className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-zinc-900 sm:text-base dark:text-zinc-100"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...spring.sectionMicro, delay: 0.2 }}
          >
            {pricing.lead}
          </motion.p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={inView && headDone ? "show" : "hidden"}
          className="relative mt-10 grid gap-8 md:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6"
        >
          {pricing.plans.map((plan, i) => {
            const tone = i as 0 | 1 | 2;
            const t = TONES[tone];
            return (
              <PlanCard key={plan.id} tone={tone} popular={plan.id === "consult"}>
                <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.22em] ${t.badge}`}
                  >
                    {plan.lane}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg uppercase leading-snug tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-100">
                  {plan.period}
                </h3>
                <p className="mt-4 font-display text-[clamp(1.85rem,4.2vw,2.35rem)] font-bold tabular-nums leading-none tracking-[-0.04em] text-emerald-900 antialiased dark:text-emerald-300">
                  {plan.price}
                </p>
                <p className="mt-4 flex-1 text-sm font-medium leading-relaxed text-zinc-900 sm:text-[15px] dark:text-zinc-100">
                  {plan.description}
                </p>
                {payLinkReady ? (
                  <AnchorButton
                    {...joinCta}
                    variant="primary"
                    className="mt-8 w-full !justify-center"
                    onClick={chainOnClick(joinCta.onClick, () =>
                      void track("click_pricing", { plan: plan.id, period: plan.period })
                    )}
                  >
                    {plan.cta}
                  </AnchorButton>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    className="mt-8 w-full !justify-center"
                    onClick={() => {
                      void track("click_pricing", { plan: plan.id, period: plan.period, via: "starter_pack" });
                      starterPack.open(`pricing_plan_${plan.id}`);
                    }}
                  >
                    {plan.cta}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3 w-full !justify-center"
                  onClick={() =>
                    setExpandedPlanId((prev) => (prev === plan.id ? null : plan.id))
                  }
                >
                  {expandedPlanId === plan.id ? "Скрыть подробности" : "Узнать больше"}
                </Button>
                {expandedPlanId === plan.id ? (
                  <div className="mt-4 rounded-xl border border-stroke/20 bg-white/70 p-4 dark:border-white/10 dark:bg-black/35">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-800 dark:text-zinc-100">
                      {planDetails[plan.id]}
                    </p>
                  </div>
                ) : null}
              </PlanCard>
            );
          })}
        </motion.div>

        <motion.button
          type="button"
          variants={fadeUp}
          initial="hidden"
          animate={inView && headDone ? "show" : "hidden"}
          onClick={() => {
            starterPack.open("pricing_footer_note");
          }}
          className="glass-panel mx-auto mt-10 block max-w-lg px-5 py-4 text-center text-xs font-medium leading-relaxed text-zinc-900 transition hover:border-accent/35 hover:text-zinc-950 dark:text-zinc-100 dark:hover:text-white"
        >
          {pricing.footerNote}
        </motion.button>
      </div>
    </motion.section>
  );
}
