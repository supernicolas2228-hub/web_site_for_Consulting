"use strict";

/**
 * Сборка Next на shared-хостинге (Beget Node).
 * См. patch-next-worker-swcpreload.cjs — Next перезаписывает NODE_OPTIONS у child worker’ов.
 */
require("./patch-next-worker-swcpreload.cjs");

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const preload = path.resolve(__dirname, "swc-force-wasm-preload.cjs");

process.env.BEGET_SHARED_NODE = "1";
process.env.NEXT_RESTRICT_WORKERS = "1";
if (!process.env.TOKIO_WORKER_THREADS) process.env.TOKIO_WORKER_THREADS = "1";
if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = "1";

const prevOpts = process.env.NODE_OPTIONS ?? "";
process.env.NODE_OPTIONS = `-r ${JSON.stringify(preload)}${prevOpts.trim() ? ` ${prevOpts.trim()}` : ""}`;

function run(exe, args) {
  const r = spawnSync(exe, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (r.error) throw r.error;
  return r.status ?? 1;
}

const s1 = run(process.execPath, [path.join(__dirname, "ensure-env.cjs")]);
if (s1 !== 0) process.exit(s1);

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const s2 = run(process.execPath, [nextBin, "build"]);
process.exit(s2);
