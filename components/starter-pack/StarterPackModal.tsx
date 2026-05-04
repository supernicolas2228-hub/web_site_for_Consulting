"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getStarterPackModalCopy } from "@/config/starter-pack-modal";
import { STARTER_PACK_SUBMIT_URL } from "@/config/starter-pack";
import { fetchWithTimeout } from "@/lib/fetch-robust";
import { isStaticExportSite } from "@/lib/static-site";
import { Button } from "@/components/ui/Button";
import { getTrafficSourcePayload } from "@/lib/track";
import { spring } from "@/lib/motion";

export type StarterPackFormPayload = {
  projectStage: string;
  formatInterest: string;
  businessModel: string;
  mainTask: string;
  timeline: string;
  telegram: string;
  consent: boolean;
};

const initialForm: StarterPackFormPayload = {
  projectStage: "",
  formatInterest: "",
  businessModel: "",
  mainTask: "",
  timeline: "",
  telegram: "",
  consent: false,
};

const LS_KEY = "sil_starter_pack_last_submit";

type Props = {
  open: boolean;
  onClose: () => void;
  source?: string;
};

export function StarterPackModal({ open, onClose, source = "unknown" }: Props) {
  const reduceMotion = useReducedMotion();
  const copy = useMemo(() => getStarterPackModalCopy(source), [source]);
  const [form, setForm] = useState<StarterPackFormPayload>(initialForm);
  const [step, setStep] = useState<"form" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setForm(initialForm);
    setBusy(false);
    setSubmitErr("");
  }, [open, source]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus());
    return () => cancelAnimationFrame(t);
  }, [open, step, copy.title]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const set = useCallback(<K extends keyof StarterPackFormPayload>(key: K, v: StarterPackFormPayload[K]) => {
    setForm((f) => ({ ...f, [key]: v }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSubmitErr("");
    const telegramNormalized = form.telegram.trim().replace(/^@+/, "");
    if (!telegramNormalized) {
      setSubmitErr("Укажите Telegram (username или ссылку).");
      setBusy(false);
      return;
    }
    if (typeof console !== "undefined" && console.info) {
      console.info("[sanchaev] анкета: отправка запущена → POST /api/starter-pack");
    }
    const payload = {
      ...form,
      telegram: telegramNormalized,
      submittedAt: new Date().toISOString(),
      source,
      planId: copy.planId ?? "",
      planLabel: copy.planLabel,
    };

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
      }
    } catch {
      /* ignore */
    }

    if (isStaticExportSite()) {
      if (STARTER_PACK_SUBMIT_URL) {
        try {
          await fetchWithTimeout(
            STARTER_PACK_SUBMIT_URL,
            {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify(payload),
              mode: "cors",
              credentials: "omit",
              cache: "no-store",
            },
            18_000,
          );
        } catch {
          /* внешний вебхук может быть временно недоступен — UX не блокируем */
        }
        setStep("done");
        setBusy(false);
        return;
      }
      setSubmitErr(
        "Автоотправка с этой версии сайта недоступна. Напишите в Telegram — ссылку смотрите внизу страницы.",
      );
      setBusy(false);
      return;
    }

    let savedOnServer = false;
    try {
      const saveRes = await fetchWithTimeout(
        "/api/starter-pack",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin",
          cache: "no-store",
          keepalive: true,
        },
        35_000,
      );
      const saveJson = (await saveRes.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      /** Строго: иначе HTML/пустое тело со статусом 200 могло дать «галочку» без записи на диск */
      savedOnServer = saveRes.ok && saveJson.ok === true;
      if (typeof console !== "undefined" && console.info) {
        console.info("[sanchaev] анкета: ответ сервера", {
          http: saveRes.status,
          ok: saveJson.ok === true,
          error: saveJson.error,
        });
      }
      if (!savedOnServer) {
        const msg =
          saveJson?.error === "telegram_required"
            ? "Укажите Telegram."
            : "Не удалось сохранить заявку. Проверьте интернет и попробуйте ещё раз.";
        setSubmitErr(msg);
        setBusy(false);
        return;
      }
    } catch (err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[sanchaev] анкета: ошибка сети или таймаут на /api/starter-pack, пробую /api/track", err);
      }
    }

    if (!savedOnServer) {
      try {
        const body = JSON.stringify({
          event: "starter_pack_survey_submit",
          data: {
            ...getTrafficSourcePayload(),
            ...payload,
          },
          timestamp: Date.now(),
        });
        const tr = await fetchWithTimeout(
          "/api/track",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            credentials: "same-origin",
            cache: "no-store",
            keepalive: true,
          },
          35_000,
        );
        const trJson = (await tr.json().catch(() => ({}))) as { ok?: boolean; skipped?: boolean };
        if (!tr.ok || trJson.skipped || trJson.ok !== true) {
          setSubmitErr("Сервер не принял заявку. Попробуйте через минуту или напишите в Telegram с сайта.");
          setBusy(false);
          return;
        }
      } catch {
        try {
          if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            const blob = new Blob(
              [
                JSON.stringify({
                  event: "starter_pack_survey_submit",
                  data: {
                    ...getTrafficSourcePayload(),
                    ...payload,
                  },
                  timestamp: Date.now(),
                }),
              ],
              { type: "application/json" },
            );
            navigator.sendBeacon("/api/track", blob);
          }
        } catch {
          /* ignore */
        }
        setSubmitErr("Слабая сеть: заявка могла не дойти. Повторите отправку.");
        setBusy(false);
        return;
      }
    }

    if (typeof console !== "undefined" && console.info) {
      console.info("[sanchaev] анкета: успешно сохранена на сервере");
    }

    if (STARTER_PACK_SUBMIT_URL) {
      try {
        await fetchWithTimeout(
          STARTER_PACK_SUBMIT_URL,
          {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
          },
          18_000,
        );
      } catch {
        /* не блокируем UX, если внешний сервис временно недоступен */
      }
    }

    setStep("done");
    setBusy(false);
  };

  const field =
    "mt-1 w-full rounded-2xl border border-stroke/25 bg-white/90 px-4 py-3 text-[15px] text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-2 focus:ring-accent/25 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:[color-scheme:dark]";
  const textAreaField = `${field} min-h-[104px] resize-y`;

  const label = "block text-sm font-semibold text-zinc-800 dark:text-zinc-100";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={`starter-pack-${source}`}
          className="fixed inset-0 z-[200]"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.14 }}
        >
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="fixed inset-0 z-[1] cursor-default border-0 bg-black/50 p-0"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <div className="starter-pack-scroll-layer fixed inset-0 z-[2] overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <div className="mx-auto flex min-h-[min(100dvh,100vh)] w-full justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16 md:items-center md:py-12">
              <div className="flex w-full max-w-lg flex-col items-stretch justify-center pointer-events-none md:min-h-0">
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${idPrefix}-title`}
                  className="pointer-events-auto relative z-10 my-6 w-full rounded-[2rem] border border-stroke/20 bg-page/95 shadow-[var(--shadow-lift),var(--shadow-plate)] dark:border-white/10 dark:bg-zinc-950/95 md:my-0"
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  transition={reduceMotion ? { duration: 0.01 } : spring.modal}
                >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stroke/15 bg-page/90 px-5 py-4 dark:border-white/10 dark:bg-zinc-950/90 sm:px-6">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-accent">{copy.eyebrow}</p>
                <h2
                  id={`${idPrefix}-title`}
                  className="mt-1 font-display text-xl uppercase leading-tight text-zinc-900 dark:text-zinc-100"
                >
                  {copy.title}
                </h2>
                <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">{copy.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-stroke/20 px-2.5 py-1 text-lg leading-none text-zinc-800 transition hover:border-accent/40 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-100 dark:hover:text-white"
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {step === "form" ? (
              <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-6 sm:py-7">
                <div>
                  <label className={label} htmlFor={`${idPrefix}-stage`}>
                    На каком этапе вы сейчас? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id={`${idPrefix}-stage`}
                    required
                    className={textAreaField}
                    placeholder="Напишите, на каком этапе вы сейчас"
                    value={form.projectStage}
                    onChange={(e) => set("projectStage", e.target.value)}
                  />
                </div>

                <div>
                  <label className={label} htmlFor={`${idPrefix}-format`}>
                    Что ближе: разовый разбор или сопровождение? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id={`${idPrefix}-format`}
                    required
                    className={textAreaField}
                    placeholder="Опишите, какой формат вам ближе"
                    value={form.formatInterest}
                    onChange={(e) => set("formatInterest", e.target.value)}
                  />
                </div>

                <div>
                  <label className={label} htmlFor={`${idPrefix}-model`}>
                    Что вы продаёте или хотите продавать? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id={`${idPrefix}-model`}
                    required
                    className={textAreaField}
                    placeholder="Напишите, что вы продаёте или хотите продавать"
                    value={form.businessModel}
                    onChange={(e) => set("businessModel", e.target.value)}
                  />
                </div>

                <div>
                  <label className={label} htmlFor={`${idPrefix}-task`}>
                    Какая задача сейчас главная? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id={`${idPrefix}-task`}
                    required
                    className={textAreaField}
                    placeholder="Опишите вашу главную задачу сейчас"
                    value={form.mainTask}
                    onChange={(e) => set("mainTask", e.target.value)}
                  />
                </div>

                <div>
                  <label className={label} htmlFor={`${idPrefix}-timeline`}>
                    Когда хотите стартовать? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id={`${idPrefix}-timeline`}
                    required
                    className={textAreaField}
                    placeholder="Когда хотите стартовать?"
                    value={form.timeline}
                    onChange={(e) => set("timeline", e.target.value)}
                  />
                </div>

                <div>
                  <label className={label} htmlFor={`${idPrefix}-tg`}>
                    Telegram <span className="text-accent">*</span>
                  </label>
                  <input
                    id={`${idPrefix}-tg`}
                    type="text"
                    required
                    className={field}
                    placeholder="@username или ссылка"
                    autoComplete="off"
                    value={form.telegram}
                    onChange={(e) => set("telegram", e.target.value)}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stroke/20 bg-accent/10 p-3 text-sm dark:border-white/10 dark:bg-accent/10">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 accent-accent"
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                  />
                  <span className="text-zinc-700 dark:text-[#ddd1ba]">
                    Согласен на первичный контакт по заявке.
                  </span>
                </label>

                {submitErr ? (
                  <p className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-accent dark:text-accent" role="alert">
                    {submitErr}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                  <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
                    Отмена
                  </Button>
                  <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={busy}>
                    {busy ? "Отправка…" : "Отправить"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="px-5 py-10 text-center sm:px-8">
                <p className="font-display text-4xl text-accent" aria-hidden>
                  ✓
                </p>
                <p className="mt-4 font-display text-lg uppercase text-zinc-900 dark:text-zinc-100">{copy.doneTitle}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">{copy.doneBody}</p>
                <Button type="button" variant="primary" className="mt-8 w-full sm:w-auto" onClick={onClose}>
                  Закрыть
                </Button>
              </div>
            )}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
