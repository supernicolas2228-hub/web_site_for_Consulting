/**
 * Статический экспорт для Beget: убирает app/api и app/admin, BEGET_STATIC=1, next build, возвращает папки.
 * Перед сборкой удаляет out/ и .next/ — иначе на хост копируется старая вёрстка.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
process.chdir(root);

const api = path.join(root, "app", "api");
const admin = path.join(root, "app", "admin");
const apiStash = path.join(root, "app", "_api_stash");
const adminStash = path.join(root, "app", "_admin_stash");

function stashDir(src, stash) {
  if (!fs.existsSync(src)) return false;
  if (fs.existsSync(stash)) fs.rmSync(stash, { recursive: true, force: true });
  fs.renameSync(src, stash);
  return true;
}

function restoreDir(dest, stash, didStash) {
  if (!didStash || !fs.existsSync(stash)) return;
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(stash, dest);
}

const hadApi = stashDir(api, apiStash);
const hadAdmin = stashDir(admin, adminStash);

const nextDir = path.join(root, ".next");
const outDir = path.join(root, "out");

function rmQuiet(p) {
  if (!fs.existsSync(p)) return true;
  const base = { recursive: true, force: true };
  try {
    fs.rmSync(p, { ...base, maxRetries: 4, retryDelay: 200 });
    return true;
  } catch {
    try {
      fs.rmSync(p, base);
      return true;
    } catch {
      return false;
    }
  }
}
if (rmQuiet(outDir)) {
  console.log("[build-beget-static] Удалена папка out/");
} else {
  console.warn(
    "[build-beget-static] Не удалось удалить out/ (файл занят — OneDrive/IDE). Next перезапишет при сборке."
  );
}
if (rmQuiet(nextDir)) {
  console.log("[build-beget-static] Очищен кэш .next/");
} else {
  console.warn("[build-beget-static] Не удалось удалить .next/ — если сборка странная, закройте IDE и повторите.");
}

process.env.BEGET_STATIC = "1";
/* В клиентском бундле: не дергать /api/track (на Beget API нет). */
if (process.env.NEXT_PUBLIC_STATIC_EXPORT == null || process.env.NEXT_PUBLIC_STATIC_EXPORT === "") {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = "1";
}
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = "https://sanchaevkirill.ru";
}
if (!process.env.NEXT_PUBLIC_DEPLOY_REF) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  process.env.NEXT_PUBLIC_DEPLOY_REF = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const heapMb =
  Number(process.env.BEGET_NODE_HEAP_MB) > 0 ? Number(process.env.BEGET_NODE_HEAP_MB) : 8192;
const nodeOptsHeap = `--max-old-space-size=${heapMb}`;
process.env.NODE_OPTIONS = nodeOptsHeap;

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
let exitCode = 0;
try {
  /* NODE_OPTIONS последним — иначе .env может задать крошечный heap и Next падает по OOM. */
  const r = spawnSync(npmCmd, ["run", "build"], {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "0", NODE_OPTIONS: nodeOptsHeap },
    shell: process.platform === "win32",
  });
  if (r.error) {
    console.error("[build-beget-static]", r.error);
  }
  const code = r.status ?? 1;
  if (code !== 0) {
    console.error(`[build-beget-static] npm run build завершился с кодом ${code}.`);
    exitCode = code;
  } else if (!fs.existsSync(path.join(root, "out"))) {
    console.error("[build-beget-static] Нет папки out/ после сборки.");
    exitCode = 1;
  } else {
    console.log("[build-beget-static] OK: папка out/ с актуальным фронтом готова к выкладке.");
  }
} finally {
  restoreDir(api, apiStash, hadApi);
  restoreDir(admin, adminStash, hadAdmin);
}
process.exit(exitCode);
