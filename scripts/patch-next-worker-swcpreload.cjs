"use strict";

/**
 * Next 14.x: next/dist/lib/worker.js перезаписывает NODE_OPTIONS у дочерних процессов.
 * Без явного -r preload воркеры снова грузят нативный @next/swc → Tokio EPERM на Beget.
 * Патч идемпотентный (по маркеру в файле).
 */
const fs = require("node:fs");
const path = require("node:path");

const MARKER = "BEGET_SWC_WORKER_PRELOAD_PATCH";
const NEEDLE =
  'NODE_OPTIONS: (0, _utils.getNodeOptionsWithoutInspect)().replace(/--max-old-space-size=[\\d]{1,}/, "").trim()';

function applyPatch() {
  const root = path.join(__dirname, "..");
  const preloadAbs = path.join(root, "scripts", "swc-force-wasm-preload.cjs");
  const preloadLit = JSON.stringify(preloadAbs);
  const workerPath = path.join(root, "node_modules", "next", "dist", "lib", "worker.js");

  if (!fs.existsSync(workerPath)) {
    console.warn("[patch-next-worker-swcpreload] нет node_modules/next — пропуск.");
    return;
  }

  let txt = fs.readFileSync(workerPath, "utf8");
  if (txt.includes(MARKER)) return;

  if (!txt.includes(NEEDLE)) {
    console.error(
      "[patch-next-worker-swcpreload] не найдена ожидаемая строка в worker.js (другая версия Next.js?).",
    );
    process.exit(1);
  }

  // JSON.stringify(__pl): пути с пробелами/`для`; иначе NODE_OPTIONS режется по пробелу (preload = несуществующий модуль "C:\\...\сайт").
  const repl = `NODE_OPTIONS: (()=>{/**${MARKER}*/var _b=(0,_utils.getNodeOptionsWithoutInspect)().replace(/--max-old-space-size=[\\d]{1,}/,"").trim();var __pl=${preloadLit};if(!__pl)return _b;if(_b.indexOf(__pl)!==-1)return _b;return((_b?_b+" ":"")+"-r "+JSON.stringify(__pl)).trim()})().trim()`;

  fs.writeFileSync(workerPath, txt.replace(NEEDLE, repl), "utf8");
  console.log("[patch-next-worker-swcpreload] статические worker’ы дополнены -r swc-force-wasm-preload.cjs");
}

applyPatch();
