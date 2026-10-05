# Live-data layout check; diagnostics are injected through Chrome DevTools.
param([string]$OutDir = (Join-Path $PSScriptRoot '..\..\artifacts'))
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'verify-browser.cjs') $OutDir --live
exit $LASTEXITCODE
