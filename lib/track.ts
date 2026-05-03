import { fetchWithTimeout } from "@/lib/fetch-robust";
import { isStaticExportSite } from "@/lib/static-site";

export type TrackPayload = {
  event: string;
  data?: Record<string, unknown>;
  timestamp?: number;
};

function getUtmFromUrl(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function getTrafficSourcePayload(): Record<string, unknown> {
  const utm = getUtmFromUrl();
  return {
    utm,
    path: typeof window !== "undefined" ? window.location.pathname : "/",
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
  };
}

export async function track(event: string, data?: Record<string, unknown>): Promise<void> {
  /* На статическом Beget /api/track нет — иначе 404 и шум в консоли и Network. На Node сборке флаг не задан — трекинг идёт. */
  if (isStaticExportSite()) return;

  try {
    await fetchWithTimeout(
      "/api/track",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          data: { ...getTrafficSourcePayload(), ...data },
          timestamp: Date.now(),
        }),
        credentials: "same-origin",
        cache: "no-store",
      },
      12_000,
    );
  } catch {
    /* non-blocking: офлайн, прокси, таймаут — сайт работает дальше */
  }
}
