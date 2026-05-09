param(
  [string]$FontPath = "",
  [switch]$SkipNeovim,
  [switch]$SkipZoxide
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-OhMyPosh {
  if (Test-Command "oh-my-posh") {
    Write-Step "oh-my-posh 已安装。"
    return
  }

  if (-not (Test-Command "winget")) {
    throw "未找到 winget。请先安装 App Installer，或手动安装 oh-my-posh。"
  }

  Write-Step "安装 oh-my-posh"
  winget install --id JanDeDobbeleer.OhMyPosh --source winget --accept-package-agreements --accept-source-agreements
}

function Install-Neovim {
  if ($SkipNeovim) {
    return
  }

  if (Test-Command "nvim") {
    Write-Step "Neovim 已安装。"
    return
  }

  if (-not (Test-Command "winget")) {
    throw "未找到 winget。请先安装 App Installer，或手动安装 Neovim。"
  }

  Write-Step "安装 Neovim"
  winget install --id Neovim.Neovim --source winget --accept-package-agreements --accept-source-agreements
}

function Install-Zoxide {
  if ($SkipZoxide) {
    return
  }

  if (Test-Command "zoxide") {
    Write-Step "zoxide 已安装。"
    return
  }

  if (-not (Test-Command "winget")) {
    throw "未找到 winget。请先安装 App Installer，或手动安装 zoxide。"
  }

  Write-Step "安装 zoxide"
  winget install --id ajeetdsouza.zoxide --source winget --accept-package-agreements --accept-source-agreements
}

function Install-Fonts {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    $Path = Join-Path $repoRoot "assets\fonts\Meslo"
    Write-Step "未传入 FontPath，使用仓库内置字体：$Path"
  }

  if (-not (Test-Path $Path)) {
    throw "字体路径不存在：$Path"
  }

  $fontSource = Resolve-Path $Path
  $tempDir = Join-Path $env:TEMP ("longyin-fonts-" + [Guid]::NewGuid().ToString("N"))

  if ((Get-Item $fontSource.Path).PSIsContainer) {
    $scanRoot = $fontSource.Path
  }
  elseif ($fontSource.Path.EndsWith(".zip", [StringComparison]::OrdinalIgnoreCase)) {
    Write-Step "解压字体：$($fontSource.Path)"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    Expand-Archive -Path $fontSource.Path -DestinationPath $tempDir -Force
    $scanRoot = $tempDir
  }
  else {
    $scanRoot = Split-Path $fontSource.Path -Parent
  }

  $fonts = Get-ChildItem -Path $scanRoot -Recurse -File |
    Where-Object { $_.Extension -in @(".ttf", ".otf") }

  if ($fonts.Count -eq 0) {
    throw "没有在字体路径中找到 .ttf 或 .otf 文件：$Path"
  }

  $fontShell = New-Object -ComObject Shell.Application
  $fontsFolder = $fontShell.Namespace(0x14)

  Write-Step "安装字体文件：$($fonts.Count) 个"
  foreach ($font in $fonts) {
    $fontsFolder.CopyHere($font.FullName)
  }
}

function Update-Profile {
  $profilePath = $PROFILE
  $profileDir = Split-Path $profilePath
  New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

  if (-not (Test-Path $profilePath)) {
    New-Item -ItemType File -Force -Path $profilePath | Out-Null
  }

  $start = "# >>> longyin windows terminal setup >>>"
  $end = "# <<< longyin windows terminal setup <<<"
  $existing = Get-Content -Path $profilePath -Raw -ErrorAction SilentlyContinue

  if ($null -eq $existing) {
    $existing = ""
  }

  $block = @"
$start
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
  oh-my-posh init pwsh | Invoke-Expression
}

if (Get-Command zoxide -ErrorAction SilentlyContinue) {
  Invoke-Expression (& { (zoxide init powershell | Out-String) })
}

Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle InlineView
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineKeyHandler -Key RightArrow -Function AcceptSuggestion
Set-PSReadLineKeyHandler -Chord Ctrl+u -Function BackwardDeleteLine
Set-PSReadLineKeyHandler -Chord Ctrl+k -Function ForwardDeleteLine
Set-PSReadLineKeyHandler -Chord Ctrl+w -Function BackwardKillWord
Set-PSReadLineKeyHandler -Chord Ctrl+a -Function BeginningOfLine
Set-PSReadLineKeyHandler -Chord Ctrl+e -Function EndOfLine

function vz { nvim `$PROFILE }
function sz { . `$PROFILE }

function gst { git status @args }
function gco { git checkout @args }
function gcb { git checkout -b @args }
function gb { git branch @args }
function gba { git branch -a @args }
function ga { git add @args }
function gaa { git add -A @args }
function gcmsg { git commit -m @args }
function gp { git push @args }
function gll { git pull @args }
function glo { git log --oneline --decorate --graph @args }
function gd { git diff @args }
function gds { git diff --staged @args }
$end
"@

  $pattern = "(?s)$([regex]::Escape($start)).*?$([regex]::Escape($end))"
  if ($existing -match $pattern) {
    $updated = [regex]::Replace($existing, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $block })
  }
  else {
    $separator = if ($existing.Trim().Length -gt 0) { "`r`n`r`n" } else { "" }
    $updated = $existing.TrimEnd() + $separator + $block + "`r`n"
  }

  Set-Content -Path $profilePath -Value $updated -Encoding UTF8
  Write-Step "已更新 PowerShell profile：$profilePath"
}

Install-OhMyPosh
Install-Neovim
Install-Zoxide
Install-Fonts -Path $FontPath
Update-Profile

Write-Host ""
Write-Host "完成。请重开 Windows Terminal。" -ForegroundColor Green
Write-Host "如果图标仍不显示，请在 Windows Terminal 的 Defaults 或 PowerShell Profile 中把 Font face 设为 Nerd Font。"
