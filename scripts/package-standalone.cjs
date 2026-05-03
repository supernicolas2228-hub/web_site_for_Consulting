/**
 * Next.js standalone -> release/sell-is-life-standalone-<stamp>.tgz
 * Runs on Windows, Linux, macOS (no PowerShell required).
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.join(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");
const skipBuild = process.argv.includes("--skip-build");

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

const localBin = path.join(projectRoot, "node_modules", ".bin");
const sep = path.delimiter;
const env = {
  ...process.env,
  PATH: `${localBin}${sep}${process.env.PATH || ""}`,
};

if (!skipBuild) {
  console.log("npm run build...");
  const b = spawnSync("npm", ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
    env,
    shell: true,
  });
  const code = typeof b.status === "number" ? b.status : 1;
  if (code !== 0) process.exit(code);
}

const standalone = path.join(projectRoot, ".next", "standalone");
if (!fs.existsSync(standalone)) {
  console.error("Missing .next/standalone — run npm run build first.");
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });

const stampStr = stamp();
// Staging in OS temp avoids EIO / sync locks on Desktop or release/ from OneDrive on Windows.
const staging = path.join(os.tmpdir(), `sell-is-life-pack-${stampStr}`);
const outFile = path.join(releaseDir, `sell-is-life-standalone-${stampStr}.tgz`);

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

function copyRecursiveFiltered(src, dst) {
  const from = path.resolve(src);
  const to = path.resolve(dst);
  if (process.platform === "win32") {
    fs.mkdirSync(to, { recursive: true });
    const r = spawnSync(
      "robocopy",
      [from, to, "/E", "/XO", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"],
      { stdio: "inherit", shell: false },
    );
    const code = typeof r.status === "number" ? r.status : 1;
    if (code >= 8) process.exit(code);
    return;
  }
  fs.cpSync(from, to, { recursive: true });
}

console.log("Copy standalone...");
copyRecursiveFiltered(standalone, staging);

/**
 * Standalone-сборка с Windows вкладывает абсолютный путь в nextConfig/outputFileTracingRoot
 * и appDir/require manifest — на Linux это ломает Node/Next. Перед упаковкой приводим к portable.
 */
function normalizeStandaloneStagingForUnix(stagingAbs, windowsProjectRootAbs) {
  const serverJsPath = path.join(stagingAbs, "server.js");
  if (!fs.existsSync(serverJsPath)) return;
  let sj = fs.readFileSync(serverJsPath, "utf8");
  const serverJsOriginal = sj;
  sj = sj.replace(/"outputFileTracingRoot":"(?:[^"\\]|\\.)*"/, '"outputFileTracingRoot":"."');
  const removed = sj.split(windowsProjectRootAbs).join(".");
  if (removed !== sj) sj = removed;
  /* До require('next') .env ещё не подхвачен — подгружаем .env сразу после chdir, иначе LISTEN_HOST из файла игнорируется под Passenger. */
  const envLoader =
    "try{const _fs=require('fs'),_p=require('path');const _e=_p.join(__dirname,'.env');if(_fs.existsSync(_e)){for(const _l of _fs.readFileSync(_e,'utf8').split(/\\r?\\n/)){const _t=_l.trim();if(!_t||_t.startsWith('#'))continue;const _i=_t.indexOf('=');if(_i===-1)continue;const _k=_t.slice(0,_i).trim();let _v=_t.slice(_i+1).trim();if(_v.startsWith('\"')&&_v.endsWith('\"'))_v=_v.slice(1,-1);if(_v.startsWith(\"'\")&&_v.endsWith(\"'\"))_v=_v.slice(1,-1);if(process.env[_k]===undefined)process.env[_k]=_v;}}}catch(_){}\n\n";
  sj = sj.replace(
    /(process\.chdir\(__dirname\))\r?\n\r?\n(const currentPort)/,
    `$1\n\n${envLoader}$2`,
  );
  /* Linux: HOSTNAME=prime ломает bind; под Passenger без SetEnv безопаснее слушать 127.0.0.1 */
  sj = sj.replace(
    /const hostname = process\.env\.HOSTNAME \|\| '0\.0\.0\.0'/,
    "const hostname = process.env.LISTEN_HOST || process.env.HOST || '127.0.0.1'",
  );
  sj = sj.replace(
    /const hostname = process\.env\.LISTEN_HOST \|\| process\.env\.HOST \|\| '0\.0\.0\.0'/,
    "const hostname = process.env.LISTEN_HOST || process.env.HOST || '127.0.0.1'",
  );
  if (sj !== serverJsOriginal) {
    fs.writeFileSync(serverJsPath, sj, "utf8");
    console.log("Patched staging server.js (.env preload + LISTEN_HOST + 127.0.0.1 fallback)");
  }

  const rsfPath = path.join(stagingAbs, ".next", "required-server-files.json");
  if (!fs.existsSync(rsfPath)) return;
  try {
    const rsfRaw = fs.readFileSync(rsfPath, "utf8");
    const rsf = JSON.parse(rsfRaw);
    /* В билде попадает абсолютный путь dev-машины; на сервере корень приложения = cwd после chdir(__dirname). */
    rsf.appDir = ".";
    if (
      rsf.config &&
      rsf.config.experimental &&
      rsf.config.experimental.outputFileTracingRoot &&
      typeof rsf.config.experimental.outputFileTracingRoot === "string" &&
      (rsf.config.experimental.outputFileTracingRoot.includes("\\") ||
        /^[a-z]:/i.test(rsf.config.experimental.outputFileTracingRoot))
    ) {
      rsf.config.experimental.outputFileTracingRoot = ".";
    }
    if (Array.isArray(rsf.files)) {
      rsf.files = rsf.files.map((p) =>
        typeof p === "string" ? p.replace(/\\/g, "/") : p,
      );
    }
    fs.writeFileSync(rsfPath, JSON.stringify(rsf), "utf8");
    console.log("Patched staging .next/required-server-files.json (appDir/paths)");
  } catch (e) {
    console.warn("Could not normalize required-server-files.json:", e.message);
  }
}

normalizeStandaloneStagingForUnix(staging, path.resolve(projectRoot));

/** Рутовые манифесты из полного `.next` — иногда не попадают в ZIP с Windows; без них Next падает (ENOENT prerender-manifest). */
function syncRootNextArtifacts(stagingAbs, projectRootAbs) {
  const names = ["BUILD_ID", "prerender-manifest.json", "routes-manifest.json"];
  const srcNext = path.join(projectRootAbs, ".next");
  const dstNext = path.join(stagingAbs, ".next");
  for (const name of names) {
    const src = path.join(srcNext, name);
    const dst = path.join(dstNext, name);
    if (!fs.existsSync(src)) {
      console.error(`Missing ${src} — run npm run build first.`);
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  console.log("Synced BUILD_ID + prerender-manifest + routes-manifest from .next into staging.");
}

syncRootNextArtifacts(staging, projectRoot);

const nextDir = path.join(staging, ".next");
fs.mkdirSync(nextDir, { recursive: true });
const staticSrc = path.join(projectRoot, ".next", "static");
if (fs.existsSync(staticSrc)) {
  copyRecursiveFiltered(staticSrc, path.join(nextDir, "static"));
}

const publicSrc = path.join(projectRoot, "public");
if (fs.existsSync(publicSrc)) {
  copyRecursiveFiltered(publicSrc, path.join(staging, "public"));
}

fs.mkdirSync(path.join(staging, "data"), { recursive: true });

const stagingEnv = path.join(staging, ".env");
if (fs.existsSync(stagingEnv)) fs.unlinkSync(stagingEnv);

const hintWindows =
  process.platform === "win32"
    ? "Артефакт с этого ПК: .zip (распаковать в panel Beget или: unzip ... в SSH).\n\n"
    : "";
const hint =
  [
    hintWindows + "Extract over your app directory on Linux (keep server .env):",
    "  mkdir -p /path/to/app ; cd /path/to/app",
    "  tar -xzf sell-is-life-standalone-*.tgz   или   unzip sell-is-life-standalone-*.zip",
    "",
    "Run (PM2 / Beget: cwd = this folder, script = server.js, env NODE_ENV=production):",
    "  export NODE_ENV=production",
    "  export PORT=3030",
    "  node server.js",
    "",
  ].join("\n");
fs.writeFileSync(path.join(staging, "server-hint.txt"), hint, "utf8");

let outAbs = path.resolve(outFile);
/** tar даёт пути с / для Linux; Compress-Archive на Windows — обратные слэши, Beget unzip ломается. */
const t = spawnSync("tar", ["-czf", outAbs, "."], {
  cwd: staging,
  stdio: "inherit",
  shell: false,
});
const tCode = typeof t.status === "number" ? t.status : 1;
if (tCode !== 0) {
  if (process.platform === "win32") {
    const outZip = outAbs.replace(/\.tgz$/i, ".zip");
    console.warn("tar -czf failed; fallback to Compress-Archive:", outZip);
    outAbs = path.resolve(outZip);
    const ps = `$ErrorActionPreference='Stop'; Push-Location -LiteralPath ${JSON.stringify(staging)}; try { Compress-Archive -Path * -DestinationPath ${JSON.stringify(outAbs)} -CompressionLevel Fastest -Force } finally { Pop-Location }`;
    const z = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
      stdio: "inherit",
      shell: false,
    });
    const zCode = typeof z.status === "number" ? z.status : 1;
    if (zCode !== 0) {
      console.error("Compress-Archive failed");
      process.exit(zCode);
    }
  } else {
    console.error("tar failed");
    process.exit(tCode);
  }
} else {
  console.log(`Pack: ${outAbs}`);
}

fs.rmSync(staging, { recursive: true, force: true });

const stat = fs.statSync(outAbs);
console.log("Done:", outAbs);
console.log("Size:", stat.size, "bytes", "mtime:", stat.mtime.toISOString());
