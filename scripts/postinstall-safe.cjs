/**
 * postinstall: запускает ensure-env только если файл на месте.
 * Упрощает npm install на сервере при поэтапной заливке (без падения на отсутствующем скрипте).
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ensure = path.join(__dirname, "ensure-env.cjs");
if (!fs.existsSync(ensure)) {
  console.warn(
    "[postinstall] нет scripts/ensure-env.cjs — пропуск. Доложите папку scripts/ и повторите npm install.",
  );
  process.exit(0);
}

const r = spawnSync(process.execPath, [ensure], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});
process.exit(r.status === 0 ? 0 : r.status ?? 1);
