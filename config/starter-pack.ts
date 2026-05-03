/**
 * Опционально: URL вебхука (Google Apps Script «развернуть как веб-приложение», Make, n8n…).
 * Клиент шлёт туда же JSON, что сохраняется в анкеты — нужен HTTPS и CORS, разрешающий ваш домен.
 * Задаётся при сборке: NEXT_PUBLIC_STARTER_PACK_SUBMIT_URL в .env
 */
function trimUrl(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

export const STARTER_PACK_SUBMIT_URL: string | null = trimUrl(
  process.env.NEXT_PUBLIC_STARTER_PACK_SUBMIT_URL,
);
