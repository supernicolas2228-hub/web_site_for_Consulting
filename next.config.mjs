/** @type {import("next").NextConfig} */
const isBegetStatic = process.env.BEGET_STATIC === "1";
/** Shared-хостинг (Beget Node): один воркер «Collecting page data», без отдельного webpack worker. */
const restrictWorkers =
  process.env.NEXT_RESTRICT_WORKERS === "1" || process.env.BEGET_SHARED_NODE === "1";

function canonicalHostFromEnv() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://sanchaevkirill.ru";
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.hostname;
  } catch {
    return "sanchaevkirill.ru";
  }
}

function wwwRedirectScheme(host) {
  return host.endsWith(".beget.tech") ? "http" : "https";
}

const nextConfig = isBegetStatic
  ? {
      output: "export",
      /**
       * В клиентский бандл — надёжнее, чем только process.env в скрипте сборки:
       * иначе .env / порядок загрузки могут не дать NEXT_PUBLIC_STATIC_EXPORT=1,
       * и track() снова шлёт POST /api/track → 404 на статическом Beget.
       */
      env: {
        NEXT_PUBLIC_STATIC_EXPORT: "1",
      },
      images: { unoptimized: true },
      /** На слабых ПК `tsc` в процессе build жрёт память; для статики Beget достаточно локальной проверки. */
      typescript: { ignoreBuildErrors: true },
      eslint: { ignoreDuringBuilds: true },
      productionBrowserSourceMaps: false,
      /* webpackBuildWorker: отдельные процессы OOM на слабой машине/мало RAM — один процесс. */
      experimental: {
        cpus: 1,
        webpackBuildWorker: false,
      },
    }
  : {
      output: "standalone",
      ...(restrictWorkers
        ? {
            experimental: {
              cpus: 1,
              webpackBuildWorker: false,
            },
          }
        : {}),
      async redirects() {
        const host = canonicalHostFromEnv();
        const scheme = wwwRedirectScheme(host);
        return [
          {
            source: "/:path*",
            has: [{ type: "host", value: `www.${host}` }],
            destination: `${scheme}://${host}/:path*`,
            permanent: true,
          },
        ];
      },
      async headers() {
        return [
          {
            source:
              "/((?!_next/static|_next/image|_next/data|images/|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)",
            headers: [
              { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
              { key: "Content-Language", value: "ru-RU" },
            ],
          },
        ];
      },
    };

export default nextConfig;
