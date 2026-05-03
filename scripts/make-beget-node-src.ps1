# ZIP of Next.js source for Beget Node deploy (extract to app_runtime, then npm ci && npm run build)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "app"))) {
  Write-Error "Missing app/ under $root"
  exit 1
}
$staging = Join-Path $env:TEMP ("sil-beget-src-" + [guid]::NewGuid().ToString("n").Substring(0, 12))
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$dirs = @(
  "app", "components", "config", "lib", "public", "scripts", "data"
)
foreach ($d in $dirs) {
  $src = Join-Path $root $d
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $staging $d) -Recurse -Force
  }
}

$files = @(
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "tsconfig.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "next-env.d.ts",
  ".env.example",
  ".eslintrc.json"
)
foreach ($f in $files) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $staging $f) -Force
  }
}

$d = Get-Date -Format "yyyyMMdd-HHmm"
$zip = Join-Path $root ("beget-node-src-" + $d + ".zip")
if (Test-Path $zip) { Remove-Item $zip -Force }
# tar создаёт записи с / (Linux/Beget); Compress-Archive давал app\file внутри zip — на сервере ломалось.
Push-Location $staging
try {
  $tar = Get-Command tar.exe -ErrorAction Stop
  & $tar.Source -a -c -f "$zip" .
} catch {
  Write-Warning "tar.exe not found, using Compress-Archive (may break paths on Beget; install tar or use WSL)."
  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zip -Force
} finally {
  Pop-Location
}
Remove-Item $staging -Recurse -Force
Write-Host "Done: $zip"
Write-Host "Upload ZIP contents into app_runtime on Beget (merge/replace). Keep server .env separate."
