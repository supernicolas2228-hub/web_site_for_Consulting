import { pricing } from "@/config/content";

export type StarterPackPlanId = "session" | "consult" | "personal";

export type StarterPackModalCopy = {
  /** Мелкая строка над заголовком */
  eyebrow: string;
  title: string;
  subtitle: string;
  doneTitle: string;
  doneBody: string;
  /** Для админки и логов */
  planId: StarterPackPlanId | null;
  planLabel: string;
};

const DEFAULT_COPY: StarterPackModalCopy = {
  eyebrow: "Подарок",
  title: "Получите подарок: бесплатная сессия",
  subtitle:
    "Заполните короткую анкету, чтобы получить подарок и записаться на бесплатную стратегическую сессию.",
  doneTitle: "Подарок зафиксирован!",
  doneBody: "Анкета отправлена. Спасибо! Мы получили заявку и скоро свяжемся с вами.",
  planId: null,
  planLabel: "Первый контакт / подарок (сайт)",
};

const FOOTER_NOTE_COPY: StarterPackModalCopy = {
  eyebrow: "Запись",
  title: "Запись: с чего начать",
  subtitle:
    "Если не уверены в формате — опишите ситуацию. Подскажем, логичнее ли стартовать со стратегической сессии или сразу с консультации.",
  doneTitle: "Заявка отправлена",
  doneBody: "Мы получили анкету и свяжемся с вами, чтобы подобрать формат.",
  planId: null,
  planLabel: "Блок тарифов — «не знаю, что выбрать»",
};

function planCopy(id: StarterPackPlanId): StarterPackModalCopy {
  const plan = pricing.plans.find((p) => p.id === id);
  const label = plan ? `${plan.period} · ${plan.price}` : id;
  if (id === "session") {
    return {
      eyebrow: "Старт",
      title: "Заявка: стратегическая сессия (0 ₽)",
      subtitle:
        "Короткая анкета — чтобы к сессии подойти подготовленными: контекст, запрос и удобный способ связи.",
      doneTitle: "Вы в списке на сессию",
      doneBody: "Заявка сохранена. Свяжемся в Telegram и договоримся о времени бесплатной стратегической сессии.",
      planId: "session",
      planLabel: label,
    };
  }
  if (id === "consult") {
    return {
      eyebrow: "Разбор",
      title: "Заявка: консультация (5 500 ₽)",
      subtitle:
        "Опишите запрос и контекст — на консультации разберём вопросы плотно и по шагам. Укажите Telegram для связи.",
      doneTitle: "Заявка на консультацию принята",
      doneBody: "Мы получили анкету и напишем в Telegram: согласуем оплату и время созвона.",
      planId: "consult",
      planLabel: label,
    };
  }
  return {
    eyebrow: "Максимум",
    title: "Заявка: личная работа (70 000 ₽)",
    subtitle:
      "Три месяца сопроводительного формата — опишите задачу, нишу и что хотите получить к концу работы. Это не бесплатная сессия: дальше обсудим старт и условия.",
    doneTitle: "Заявка на личную работу принята",
    doneBody: "Мы получили анкету и свяжемся в Telegram, чтобы уточнить детали и следующий шаг.",
    planId: "personal",
    planLabel: label,
  };
}

/** Тексты модалки и подпись тарифа для админки по `source` из StarterPackProvider. */
export function getStarterPackModalCopy(source: string): StarterPackModalCopy {
  if (source.startsWith("pricing_plan_")) {
    const raw = source.slice("pricing_plan_".length) as StarterPackPlanId;
    if (raw === "session" || raw === "consult" || raw === "personal") {
      return planCopy(raw);
    }
  }
  if (source === "pricing_footer_note") {
    return FOOTER_NOTE_COPY;
  }
  return DEFAULT_COPY;
}
