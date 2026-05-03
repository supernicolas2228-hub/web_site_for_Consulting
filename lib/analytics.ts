import type { StoredEventRecord } from "@/lib/site-event-store";

export type RangeMetrics = {
  visits: number;
  /** Клики по кнопке «Запрос» (открытие модалки). */
  starterClicks: number;
  /** Отправленная анкета стартового набора (`starter_pack_survey_submit`). */
  starterSubmits: number;
  productClicks: number;
  pricingClicks: number;
  conversionPct: number;
};

export type AdminAnalytics = {
  today: RangeMetrics;
  week: RangeMetrics;
  month: RangeMetrics;
  visitsByDay: { date: string; views: number }[];
  clicksByLabel: { name: string; key: string; count: number }[];
  utmSources: { source: string; count: number }[];
  topDays: { date: string; views: number }[];
  recentLeads: { at: string; raw: string | null }[];
};

/** Границы «сегодня / 7 дней / 30 дней» — по календарю Москвы, чтобы совпадало с ожиданием в РФ. */
const REPORT_TZ = "Europe/Moscow";

function calendarDayKeyInTz(moment: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(moment);
}

function moscowStartOfCalendarDayUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`);
}

function addCalendarDaysFromKey(ymd: string, deltaDays: number): string {
  const base = moscowStartOfCalendarDayUtc(ymd).getTime() + deltaDays * 86_400_000;
  return calendarDayKeyInTz(new Date(base), REPORT_TZ);
}

function parseData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toDateSafe(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      const dFromNum = new Date(n);
      if (!Number.isNaN(dFromNum.getTime())) return dFromNum;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

type EventWithDate = StoredEventRecord & { createdAtDate: Date };

function normalizeEvents(all: StoredEventRecord[]): EventWithDate[] {
  const out: EventWithDate[] = [];
  for (const e of all) {
    let createdAtDate = toDateSafe((e as unknown as { createdAt?: unknown }).createdAt);
    if (!createdAtDate) {
      const d = parseData(e.data);
      createdAtDate =
        toDateSafe(d.timestamp) ||
        toDateSafe(d.ts) ||
        toDateSafe(d.submittedAt) ||
        new Date();
    }
    out.push({ ...e, createdAtDate });
  }
  return out;
}

function countInRange(events: EventWithDate[], start: Date, end: Date) {
  const inR = events.filter((e) => e.createdAtDate >= start && e.createdAtDate < end);
  const visits = inR.filter((e) => e.event === "page_view").length;
  const starterClicks = inR.filter((e) => e.event === "click_starter_pack").length;
  const starterSubmits = inR.filter((e) => e.event === "starter_pack_survey_submit").length;
  const productClicks = inR.filter((e) => e.event === "click_product").length;
  const pricingClicks = inR.filter((e) => e.event === "click_pricing").length;
  const allClicks = starterClicks + starterSubmits + productClicks + pricingClicks;
  const conversionPct = visits > 0 ? Math.round((allClicks / visits) * 1000) / 10 : 0;
  return {
    visits,
    starterClicks,
    starterSubmits,
    productClicks,
    pricingClicks,
    conversionPct,
  };
}

/** Подпись строки для визитов без `?utm_source=` — чтобы блок не был пустым */
export const ANALYTICS_UTM_NONE_LABEL = "Без UTM-метки" as const;

function aggregateUtm(events: EventWithDate[]): { source: string; count: number }[] {
  const map = new Map<string, number>();
  let withoutUtm = 0;
  for (const e of events) {
    if (e.event !== "page_view") continue;
    const d = parseData(e.data);
    const utm = d.utm as Record<string, string> | undefined;
    const src = utm?.utm_source?.trim();
    if (src) map.set(src, (map.get(src) ?? 0) + 1);
    else withoutUtm += 1;
  }
  const rows = Array.from(map.entries()).map(([source, count]) => ({ source, count }));
  if (withoutUtm > 0) {
    rows.push({ source: ANALYTICS_UTM_NONE_LABEL, count: withoutUtm });
  }
  rows.sort((a, b) => b.count - a.count);
  return rows.slice(0, 15);
}

function visitsByDayRange(events: EventWithDate[], days: number): { date: string; views: number }[] {
  const todayKey = calendarDayKeyInTz(new Date(), REPORT_TZ);
  const out: { date: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayKey = addCalendarDaysFromKey(todayKey, -i);
    const dayStart = moscowStartOfCalendarDayUtc(dayKey);
    const dayEnd = moscowStartOfCalendarDayUtc(addCalendarDaysFromKey(dayKey, 1));
    const views = events.filter(
      (e) => e.event === "page_view" && e.createdAtDate >= dayStart && e.createdAtDate < dayEnd,
    ).length;
    out.push({ date: dayKey, views });
  }
  return out;
}

export function buildAnalytics(all: StoredEventRecord[]): AdminAnalytics {
  const safeEvents = normalizeEvents(all);
  const now = new Date();
  const todayKey = calendarDayKeyInTz(now, REPORT_TZ);
  const todayStart = moscowStartOfCalendarDayUtc(todayKey);
  const tomorrow = moscowStartOfCalendarDayUtc(addCalendarDaysFromKey(todayKey, 1));

  const weekStart = moscowStartOfCalendarDayUtc(addCalendarDaysFromKey(todayKey, -6));
  const monthStart = moscowStartOfCalendarDayUtc(addCalendarDaysFromKey(todayKey, -29));

  const today = countInRange(safeEvents, todayStart, tomorrow);
  const week = countInRange(safeEvents, weekStart, tomorrow);
  const month = countInRange(safeEvents, monthStart, tomorrow);

  const monthEvents = safeEvents.filter((e) => e.createdAtDate >= monthStart && e.createdAtDate < tomorrow);
  const visitsByDay = visitsByDayRange(safeEvents, 30);

  const clicksByLabel = [
    {
      name: "Запрос (клик)",
      key: "click_starter_pack",
      count: monthEvents.filter((e) => e.event === "click_starter_pack").length,
    },
    {
      name: "Запрос (форма)",
      key: "starter_pack_survey_submit",
      count: monthEvents.filter((e) => e.event === "starter_pack_survey_submit").length,
    },
    {
      name: "Клики к тарифам",
      key: "click_product",
      count: monthEvents.filter((e) => e.event === "click_product").length,
    },
    {
      name: "CTA сотрудничества",
      key: "click_pricing",
      count: monthEvents.filter((e) => e.event === "click_pricing").length,
    },
  ];

  const utmSources = aggregateUtm(monthEvents);

  const byDayMap = new Map<string, number>();
  for (const row of visitsByDay) {
    byDayMap.set(row.date, row.views);
  }
  const topDays = Array.from(byDayMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 7);

  const leads = safeEvents
    .filter((e) => e.event === "starter_pack_survey_submit")
    .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime())
    .slice(0, 100)
    .map((e) => ({ at: e.createdAtDate.toISOString(), raw: e.data }));

  return {
    today,
    week,
    month,
    visitsByDay,
    clicksByLabel,
    utmSources,
    topDays,
    recentLeads: leads,
  };
}
