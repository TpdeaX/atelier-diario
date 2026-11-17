<#
.SYNOPSIS
Sincroniza incrementalmente nuevos guardados de Instagram desde Microsoft Edge,
enriquece metadatos públicos sin descripción con yt-dlp, compila Atelier Diario
y opcionalmente sube los cambios a GitHub (origin main).

.USAGE
  .\scripts\sync-and-push.ps1                 # Sincroniza + enriquece + compila
  .\scripts\sync-and-push.ps1 -Push           # Todo + commit & push (TpdeaX)
  .\scripts\sync-and-push.ps1 -SkipEdgeScrape # Solo enriquece visuales pendientes + build
#>
param(
  [switch]$Push,
  [switch]$SkipEdgeScrape,
  [int]$MaxNew = 80,
  [int]$EnrichLimit = 60,
  [string]$MasterJson = "C:\Users\Joseph\.gemini\antigravity\brain\6a65644a-921e-4dac-b3d4-6b3a6fa1a823\scratch\instagram_all_saves.json"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

if (-not $SkipEdgeScrape) {
  $EdgeProc = Get-Process msedge -ErrorAction SilentlyContinue
  if (-not $EdgeProc) {
    Write-Warning "Microsoft Edge no está abierto. Ábrelo en instagram.com/<tu_usuario>/saved/all-posts/ y vuelve a ejecutar."
  } else {
    Write-Host "[1/4] Capturando nuevos guardados desde Edge (tope $MaxNew)..." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "update-ig-saves.ps1") -MaxNew $MaxNew -MasterJson $MasterJson
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

Write-Host "[2/4] Enriqueciendo guardados visuales públicos pendientes (yt-dlp metadata)..." -ForegroundColor Cyan
node (Join-Path $PSScriptRoot "enrich-visual-saves.mjs") --limit $EnrichLimit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/4] Compilando Atelier Diario (npm run build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Push) {
  Write-Host "[4/4] Verificando cambios Git y subiendo a origin/main (TpdeaX)..." -ForegroundColor Cyan
  $Dirty = git status --porcelain -- src/data/SavedVaultBank.ts
  if ($Dirty) {
    $Today = Get-Date -Format "yyyy-MM-dd HH:mm"
    git -c user.name="TpdeaX" -c user.email="personaljosephunu@gmail.com" add src/data/SavedVaultBank.ts
    git -c user.name="TpdeaX" -c user.email="personaljosephunu@gmail.com" commit -m "chore(vault): sync instagram saves ($Today)"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  git push origin main
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Sincronización y push completados." -ForegroundColor Green
} else {
  Write-Host "[4/4] Listo. Usa -Push para subir automáticamente a GitHub." -ForegroundColor Green
}
