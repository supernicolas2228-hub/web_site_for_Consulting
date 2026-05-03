# Standalone Next (full /api, /admin, data/) -> ~/sanchaevkirill.ru/public_html/app_runtime
# Passenger .htaccess from .remote-sanchaev-htaccess -> public_html/.htaccess
param([switch]$SkipEnvCopy)

$ErrorActionPreference = "Stop"
$here = Split-Path $PSScriptRoot -Parent
Set-Location $here

function Load-DotEnvBeget {
  $p = Join-Path $here ".env"
  if (-not (Test-Path $p)) { return }
  Get-Content $p -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^\s*#' -or $line -eq "") { return }
    if ($line -match '^(BEGET_SSH|BEGET_SSH_USER|BEGET_SSH_HOST|BEGET_SSH_IDENTITY)=(.*)$') {
      $k = $Matches[1]
      $v = $Matches[2].Trim()
      $q2 = [char]34; $q1 = [char]39
      if (($v.StartsWith($q2) -and $v.EndsWith($q2)) -or ($v.StartsWith($q1) -and $v.EndsWith($q1))) {
        $v = $v.Substring(1, $v.Length - 2)
      }
      [Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
  }
}

Load-DotEnvBeget

$target = [Environment]::GetEnvironmentVariable("BEGET_SSH", "Process")
$user = [Environment]::GetEnvironmentVariable("BEGET_SSH_USER", "Process")
$begetHost = [Environment]::GetEnvironmentVariable("BEGET_SSH_HOST", "Process")
if ($target) {
} elseif ($user -and $begetHost) {
  $target = "$user@$begetHost"
}
if (-not $target) {
  Write-Error "Set BEGET_SSH or BEGET_SSH_USER+BEGET_SSH_HOST in .env"
  exit 1
}

function Get-BegetSshIdentity {
  $e = [Environment]::GetEnvironmentVariable("BEGET_SSH_IDENTITY", "Process")
  if ($e) {
    if (Test-Path -LiteralPath $e) { return $e }
  }
  foreach ($c in @(
    (Join-Path $env:USERPROFILE ".ssh\id_ed25519_beget_supernh5"),
    (Join-Path $env:USERPROFILE ".ssh\id_ed25519_beget")
  )) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  return $null
}
$begetId = Get-BegetSshIdentity

Remove-Item Env:\BEGET_STATIC -ErrorAction SilentlyContinue
Remove-Item Env:\NEXT_PUBLIC_STATIC_EXPORT -ErrorAction SilentlyContinue

Write-Host "=== package-standalone (npm run build + tgz) ==="
& node (Join-Path $here "scripts\package-standalone.cjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$releaseDir = Join-Path $here "release"
$tgz = Get-ChildItem -Path $releaseDir -Filter "sell-is-life-standalone-*.tgz" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $tgz) {
  Write-Error "Missing release/sell-is-life-standalone-*.tgz"
  exit 1
}

$localTgz = $tgz.FullName
$remoteTgz = "~/sell-is-life-node.tgz"
$htSrc = Join-Path $here ".remote-sanchaev-htaccess"
if (-not (Test-Path $htSrc)) {
  Write-Error "Missing .remote-sanchaev-htaccess"
  exit 1
}
$remoteHt = "~/passenger-site.htaccess"
$remoteSh = "~/beget-node-remote-install.sh"
$localSh = Join-Path $here "scripts\beget-node-remote-install.sh"

Write-Host "=== scp -> $target ==="
if ($begetId) {
  & scp -i $begetId -o BatchMode=yes -o IdentitiesOnly=yes $localTgz "${target}:$remoteTgz"
  & scp -i $begetId -o BatchMode=yes -o IdentitiesOnly=yes $htSrc "${target}:$remoteHt"
  & scp -i $begetId -o BatchMode=yes -o IdentitiesOnly=yes $localSh "${target}:$remoteSh"
} else {
  & scp -o BatchMode=yes -o IdentitiesOnly=yes $localTgz "${target}:$remoteTgz"
  & scp -o BatchMode=yes -o IdentitiesOnly=yes $htSrc "${target}:$remoteHt"
  & scp -o BatchMode=yes -o IdentitiesOnly=yes $localSh "${target}:$remoteSh"
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$remoteApp = "~/sanchaevkirill.ru/public_html/app_runtime"
if (-not $SkipEnvCopy -and (Test-Path (Join-Path $here ".env"))) {
  Write-Host "=== scp .env -> app_runtime (use -SkipEnvCopy to skip) ==="
  if ($begetId) {
    & scp -i $begetId -o BatchMode=yes -o IdentitiesOnly=yes (Join-Path $here ".env") "${target}:${remoteApp}/.env"
  } else {
    & scp -o BatchMode=yes -o IdentitiesOnly=yes (Join-Path $here ".env") "${target}:${remoteApp}/.env"
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "scp .env failed; create .env on server in app_runtime manually"
  }
} elseif ($SkipEnvCopy) {
  Write-Host "=== SkipEnvCopy: left server .env unchanged ==="
}

Write-Host "=== ssh: install + Passenger restart ==="
$bash = "chmod +x ~/beget-node-remote-install.sh && bash ~/beget-node-remote-install.sh"
if ($begetId) {
  & ssh -i $begetId -o BatchMode=yes -o IdentitiesOnly=yes $target $bash
} else {
  & ssh -o BatchMode=yes -o IdentitiesOnly=yes $target $bash
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== OK: open https://sanchaevkirill.ru/admin (hard refresh) ==="
Write-Host "=== Health: GET https://sanchaevkirill.ru/api/health ==="
exit 0
