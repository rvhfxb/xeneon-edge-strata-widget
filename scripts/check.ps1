# Headless layout check + screenshots for the Strata Edge widget (file:// like iCUE).
# Usage: powershell -File strata-edge/scripts/check.ps1 [-OutDir <dir>]
param([string]$OutDir = (Join-Path $PSScriptRoot '..\..\artifacts'))
$ErrorActionPreference = 'Continue'   # Chrome writes progress to stderr; PowerShell 5.1 would treat it as an error
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Google Chrome not found' }
$index = (Resolve-Path (Join-Path $PSScriptRoot '..\widget\index.html')).Path -replace '\\', '/'
$profile = Join-Path $env:TEMP 'strata-edge-check-profile'
New-Item -ItemType Directory -Force $OutDir | Out-Null
$failed = $false
foreach ($case in @(@{w=2560;h=720;q='check'}, @{w=1280;h=360;q='check'}, @{w=736;h=207;q='check'}, @{w=2560;h=720;q='check&light'})) {
  $url = "file:///$index`?$($case.q)"
  $name = "strata-edge-$($case.w)x$($case.h)$(if ($case.q -match 'light') { '-light' })"
  $common = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', "--window-size=$($case.w),$($case.h)",
              '--virtual-time-budget=6000', "--user-data-dir=$profile")
  $dom = & $chrome @common --dump-dom $url 2>$null | Out-String
  $m = [regex]::Match($dom, 'data-check="([^"]*)"')
  $result = if ($m.Success) { [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) } else { '{"error":"no check result"}' }
  & $chrome @common "--screenshot=$(Join-Path $OutDir "$name.png")" $url 2>$null | Out-Null
  "$name $result"
  if ($result -notmatch '"bad":\[\]') { $failed = $true }
}
if ($failed) { exit 1 }
