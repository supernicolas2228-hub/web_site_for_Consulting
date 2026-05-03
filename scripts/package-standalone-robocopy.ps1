# Windows-friendly pack: standalone + static + public -> release/*.tgz
# Uses robocopy + tar (avoids Node fs.cpSync issues on some environments).
param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $projectRoot "release"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$staging = Join-Path ([System.IO.Path]::GetTempPath()) "sell-pack-$stamp"
$outFile = Join-Path $releaseDir "sell-is-life-standalone-$stamp.tgz"

Push-Location $projectRoot
try {
  if (-not $SkipBuild) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
  }

  $standalone = Join-Path $projectRoot ".next\standalone"
  if (-not (Test-Path $standalone)) {
    throw "Missing .next\standalone. Run npm run build first."
  }

  New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging -Force | Out-Null

  Write-Host "robocopy standalone..."
  & robocopy $standalone $staging /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS /MT:8
  if ($LASTEXITCODE -ge 8) { throw "robocopy standalone failed exit $LASTEXITCODE" }

  $nextDir = Join-Path $staging ".next"
  New-Item -ItemType Directory -Path $nextDir -Force | Out-Null
  $staticSrc = Join-Path $projectRoot ".next\static"
  Write-Host "robocopy static..."
  & robocopy $staticSrc (Join-Path $nextDir "static") /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS /MT:8
  if ($LASTEXITCODE -ge 8) { throw "robocopy static failed exit $LASTEXITCODE" }

  $publicSrc = Join-Path $projectRoot "public"
  if (Test-Path $publicSrc) {
    Write-Host "robocopy public..."
    & robocopy $publicSrc (Join-Path $staging "public") /E /COPY:DAT /R:2 /W:2 /NFL /NDL /NJH /NJS /MT:8
    if ($LASTEXITCODE -ge 8) { throw "robocopy public failed exit $LASTEXITCODE" }
  }

  Remove-Item (Join-Path $staging ".env") -ErrorAction SilentlyContinue

  $hint = @(
    "Extract into app_runtime on Linux (keep server .env).",
    "  cd ~/app_runtime; tar -xzf ~/sell-is-life-standalone-*.tgz",
    "",
    "Restart: touch ~/app_runtime/tmp/restart.txt",
    ""
  ) -join "`n"
  Set-Content -Path (Join-Path $staging "server-hint.txt") -Value $hint -Encoding utf8

  Write-Host "tar -> $outFile"
  Push-Location $staging
  try {
    & tar -czf $outFile .
    if ($LASTEXITCODE -ne 0) { throw "tar failed $LASTEXITCODE" }
  } finally {
    Pop-Location
  }

  Remove-Item $staging -Recurse -Force
  Write-Host "Done: $outFile"
  Get-Item $outFile | Select-Object FullName, Length, LastWriteTime
}
finally {
  Pop-Location
}
