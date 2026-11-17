param(
    [int]$MaxScrolls = 40,
    [int]$StopAfterKnownStreak = 6,
    [string]$MasterJson = "C:\Users\Joseph\.gemini\antigravity\brain\6a65644a-921e-4dac-b3d4-6b3a6fa1a823\scratch\instagram_all_saves.json",
    [string]$VaultTsPath = "C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\src\data\SavedVaultBank.ts",
    [string]$DeltaOutPath = "C:\Users\Joseph\.gemini\antigravity\scratch\omni-life\scripts\ig_new_delta.json",
    [switch]$DryRun
)

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IgWinInput {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);
}
"@

function Normalize-IgUrl([string]$url) {
    if (-not $url) { return "" }
    return ($url.Trim() -split '\?')[0].TrimEnd('/') + '/'
}

function Get-Shortcode([string]$url) {
    if ($url -match "instagram\.com/(?:p|reel|tv)/([^/?#]+)") {
        return $Matches[1]
    }
    return ""
}

# 1. Cargar shortcodes conocidos desde MasterJson y SavedVaultBank.ts
$knownShortcodes = New-Object System.Collections.Generic.HashSet[string]
$existingRows = @()

if (Test-Path $MasterJson) {
    try {
        $rawMaster = Get-Content -Raw -Encoding UTF8 $MasterJson | ConvertFrom-Json
        foreach ($e in $rawMaster) {
            if ($e.url) {
                $existingRows += $e
                $sc = Get-Shortcode $e.url
                if ($sc) { [void]$knownShortcodes.Add($sc) }
            }
        }
    } catch {
        Write-Warning "No se pudo leer MasterJson: $_"
    }
}

if (Test-Path $VaultTsPath) {
    $tsText = Get-Content -Raw -Encoding UTF8 $VaultTsPath
    $matches = [regex]::Matches($tsText, 'instagram\.com/(?:p|reel|tv)/([^/"''?#]+)')
    foreach ($m in $matches) {
        [void]$knownShortcodes.Add($m.Groups[1].Value)
    }
}

Write-Output "Shortcodes conocidos en base: $($knownShortcodes.Count)"

# 2. Localizar ventana Edge abierta en Instagram Guardados
$root = [System.Windows.Automation.AutomationElement]::RootElement
$winCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Window
)
$wins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $winCond)
$igWin = $wins | Where-Object {
    $_.Current.Name -match "Instagram" -and ($_.Current.Name -match "All Posts|Guardado|Saved|Collections")
} | Select-Object -First 1

if (-not $igWin) {
    $igWin = $wins | Where-Object { $_.Current.Name -match "Instagram" } | Select-Object -First 1
}

if (-not $igWin) {
    Write-Output "ERROR: Abre Microsoft Edge en https://www.instagram.com/<tu_usuario>/saved/all-posts/ e intenta de nuevo."
    exit 1
}

[IgWinInput]::SetForegroundWindow([IntPtr]$igWin.Current.NativeWindowHandle) | Out-Null
Start-Sleep -Milliseconds 350

$linkCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Hyperlink
)

$newItems = [ordered]@{}
$knownStreak = 0
$noNewScrolls = 0
$reachedFrontier = $false

for ($i = 0; $i -lt $MaxScrolls; $i++) {
    $addedThisScroll = 0
    $links = $igWin.FindAll([System.Windows.Automation.TreeScope]::Descendants, $linkCond)

    foreach ($l in $links) {
        $val = ""
        try {
            $vp = $l.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $val = [string]$vp.Current.Value
        } catch {}
        if ($val -match "instagram\.com/(p|reel|tv)/") {
            $normUrl = Normalize-IgUrl $val
            $sc = Get-Shortcode $normUrl
            if (-not $sc) { continue }

            if ($knownShortcodes.Contains($sc)) {
                $knownStreak++
                if ($knownStreak -ge $StopAfterKnownStreak) {
                    $reachedFrontier = $true
                    break
                }
            } else {
                $knownStreak = 0
                $cap = [string]$l.Current.Name
                if (-not $newItems.Contains($normUrl)) {
                    $newItems[$normUrl] = $cap
                    $addedThisScroll++
                } elseif ([string]::IsNullOrWhiteSpace($newItems[$normUrl]) -and -not [string]::IsNullOrWhiteSpace($cap)) {
                    $newItems[$normUrl] = $cap
                }
            }
        }
    }

    if ($reachedFrontier) { break }

    if ($addedThisScroll -eq 0 -and $i -gt 0) {
        $noNewScrolls++
        if ($noNewScrolls -ge 4) { break }
    } else {
        $noNewScrolls = 0
    }

    $rect = $igWin.Current.BoundingRectangle
    $cx = [int]($rect.Left + $rect.Width / 2)
    $cy = [int]($rect.Top + $rect.Height / 2)
    [IgWinInput]::SetCursorPos($cx, $cy) | Out-Null
    [IgWinInput]::mouse_event(0x0800, 0, 0, -760, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 900
}

Write-Output "NUEVOS=$($newItems.Count) FRONTERA_ALCANZADA=$reachedFrontier"

if ($newItems.Count -eq 0) {
    Write-Output "No hay nuevos guardados desde el último corte."
    exit 0
}

$deltaArr = @()
$idx = 1
foreach ($k in $newItems.Keys) {
    $deltaArr += [PSCustomObject]@{
        index = $idx
        url = $k
        caption = $newItems[$k]
    }
    $idx++
}

if ($DryRun) {
    $deltaArr | ConvertTo-Json -Depth 4 | Write-Output
    exit 0
}

$deltaDir = Split-Path -Parent $DeltaOutPath
if (-not (Test-Path $deltaDir)) { New-Item -ItemType Directory -Path $deltaDir -Force | Out-Null }
$deltaArr | ConvertTo-Json -Depth 4 | Set-Content -Path $DeltaOutPath -Encoding UTF8

# Actualizar MasterJson anteponiendo los nuevos guardados
if (Test-Path $MasterJson) {
    $merged = @()
    $nIdx = 1
    foreach ($d in $deltaArr) {
        $merged += [PSCustomObject]@{ index = $nIdx; url = $d.url; caption = $d.caption }
        $nIdx++
    }
    foreach ($old in $existingRows) {
        $merged += [PSCustomObject]@{ index = $nIdx; url = $old.url; caption = $old.caption }
        $nIdx++
    }
    $merged | ConvertTo-Json -Depth 4 | Set-Content -Path $MasterJson -Encoding UTF8
}

# Fusionar en SavedVaultBank.ts
$mergeScript = Join-Path $PSScriptRoot "merge-ig-saves.mjs"
if (Test-Path $mergeScript) {
    node $mergeScript --delta "$DeltaOutPath"
}
