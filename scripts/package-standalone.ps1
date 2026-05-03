# Next.js standalone -> single .tgz for VPS upload (no npm ci on server).
# Extract over app dir, keep server .env. See server-hint.txt inside archive.

param(
  [switch] $SkipBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $projectRoot "release"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$staging = Join-Path $releaseDir "staging-$stamp"
$outFile = Join-Path $releaseDir "sell-is-life-standalone-$stamp.tgz"

Push-Location $projectRoot
try {
  if (-not $SkipBuild) {
    Write-Host "npm run build..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
  }

  $standalone = Join-Path $projectRoot ".next\standalone"
  if (-not (Test-Path $standalone)) {
    throw "Missing .next\standalone - run npm run build first."
  }

  New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
  New-Item -ItemType Directory -Path $staging -Force | Out-Null

  Write-Host "Copy standalone..."
  Copy-Item -Path (Join-Path $standalone "*") -Destination $staging -Recurse -Force

  $staticSrc = Join-Path $projectRoot ".next\static"
  $nextDir = Join-Path $staging ".next"
  New-Item -ItemType Directory -Path $nextDir -Force | Out-Null
  Copy-Item -Path $staticSrc -Destination $nextDir -Recurse -Force

  $publicSrc = Join-Path $projectRoot "public"
  if (Test-Path $publicSrc) {
    Copy-Item -Path $publicSrc -Destination (Join-Path $staging "public") -Recurse -Force
  }

  Remove-Item (Join-Path $staging ".env") -ErrorAction SilentlyContinue

  $hintLines = @(
    "Extract over your app directory on Linux (keep server .env):",
    "  mkdir -p /path/to/app ; cd /path/to/app",
    "  tar -xzf sell-is-life-standalone-*.tgz",
    "",
    "Run (PM2: cwd = this folder, script = server.js, env NODE_ENV=production):",
    "  export NODE_ENV=production",
    "  export PORT=3030",
    "  node server.js"
  )
  Set-Content -Path (Join-Path $staging "server-hint.txt") -Value ($hintLines -join "`n") -Encoding utf8

  Write-Host "Pack: $outFile"
  Push-Location $staging
  try {
    & tar -czf $outFile .
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
  }
  finally {
    Pop-Location
  }

  Remove-Item -Path $staging -Recurse -Force
  Write-Host "Done: $outFile"
  Get-Item $outFile | Select-Object FullName, Length, LastWriteTime
}
finally {
  Pop-Location
}
