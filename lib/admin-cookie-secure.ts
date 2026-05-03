/**
 * Флаг Secure для куки админки: за reverse-proxy (Beget, nginx) внутренний URL часто http,
 * а браузер ходит по https://sanchaevkirill.ru — ищем признаки TLS в заголовках и в публичном URL.
 */
function headerFirst(name: string, req: Request): string | undefined {
  return req.headers.get(name)?.split(",")[0]?.trim();
}

function forwardedProtoHttps(req: Request): boolean | null {
  const proto = headerFirst("x-forwarded-proto", req)?.toLowerCase();
  if (proto === "https") return true;
  if (proto === "http") return false;

  const ssl = req.headers.get("x-forwarded-ssl")?.trim().toLowerCase();
  if (ssl === "on") return true;

  const fe = req.headers.get("front-end-https")?.trim().toLowerCase();
  if (fe === "on") return true;

  const cfVisitor = req.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const j = JSON.parse(cfVisitor) as { scheme?: string };
      if (j.scheme?.toLowerCase() === "https") return true;
    } catch {
      /* ignore */
    }
  }

  const forwarded = req.headers.get("forwarded");
  if (forwarded) {
    for (const segment of forwarded.split(",")) {
      const m = /(?:^|;)\s*proto=https\s*(?:;|$)/i.exec(segment);
      if (m) return true;
      const q = /proto="?https"?/i.exec(segment);
      if (q) return true;
    }
  }

  return null;
}

export function adminSessionCookieSecure(req: Request): boolean {
  const fromProxy = forwardedProtoHttps(req);
  if (fromProxy === true) return true;
  if (fromProxy === false) return false;

  try {
    if (new URL(req.url).protocol === "https:") return true;
  } catch {
    /* ignore */
  }

  const force = process.env.ADMIN_SESSION_FORCE_SECURE?.trim().toLowerCase();
  if (force === "1" || force === "true") return true;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().toLowerCase() ?? "";
  if (process.env.NODE_ENV === "production" && site.startsWith("https://")) {
    return true;
  }

  return false;
}

export function adminSessionCookieBase(req: Request) {
  return {
    httpOnly: true as const,
    secure: adminSessionCookieSecure(req),
    sameSite: "lax" as const,
    path: "/",
  };
}
