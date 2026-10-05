param([string]$OutDir = (Join-Path $PSScriptRoot '..\..\artifacts'))
$ErrorActionPreference = 'Stop'
$edgeRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function Get-EdgeFileHash([string]$Path) {
    $edgeStream = [IO.File]::OpenRead($Path)
    $edgeSha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($edgeSha.ComputeHash($edgeStream)).Replace('-','').ToLower() }
    finally { $edgeStream.Dispose(); $edgeSha.Dispose() }
}
$edgeManifest = Get-Content -LiteralPath (Join-Path $edgeRoot 'widget\manifest.json') -Raw | ConvertFrom-Json
$edgeVersion = $edgeManifest.version
if ($edgeVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid version.' }
$edgeCli = & node -p "require.resolve('icuewidget-cli/node-bin/icuewidget.js', {paths:[process.argv[1]]})" $edgeRoot
if ($LASTEXITCODE -ne 0) { throw 'Run npm ci in strata-edge first.' }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$edgeWidget = Join-Path $OutDir "strata-edge-$edgeVersion.icuewidget"
& node (Join-Path $PSScriptRoot 'test-import.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Import validation failed.' }
& node (Join-Path $PSScriptRoot 'check-production.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Development code was found in the production widget.' }
& node (Join-Path $PSScriptRoot 'test-upstream.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Pinned CSS validation failed.' }
& node $edgeCli package (Join-Path $edgeRoot 'widget') --output $edgeWidget
if ($LASTEXITCODE -ne 0) { throw 'iCUE package failed.' }
# A fresh staging folder prevents logs, personal snapshots or development files
# from accidentally entering the public release.
$edgeStageParent = Join-Path $edgeRoot ('dist\stage-' + [guid]::NewGuid().ToString('N'))
$edgeStage = Join-Path $edgeStageParent "Strata-Edge-$edgeVersion"
New-Item -ItemType Directory -Force -Path (Join-Path $edgeStage 'scripts') | Out-Null
Copy-Item -LiteralPath (Join-Path $edgeRoot 'widget') -Destination $edgeStage -Recurse
Copy-Item -LiteralPath $edgeWidget -Destination $edgeStage
foreach ($edgeFile in @('README.md','README.en.md','CHANGELOG.md','LICENSE','THIRD-PARTY-NOTICES.md','helper.config.json','Helper-Common.ps1',
    'Install-Helper.ps1','Start-Helper.ps1','Stop-Helper.ps1','Uninstall-Helper.ps1',
    'Install-Helper.cmd','Start-Helper.cmd','Stop-Helper.cmd','Uninstall-Helper.cmd')) {
    Copy-Item -LiteralPath (Join-Path $edgeRoot $edgeFile) -Destination $edgeStage
}
# Keep README images available offline without including unrelated documentation assets.
New-Item -ItemType Directory -Force -Path (Join-Path $edgeStage 'docs\images') | Out-Null
foreach ($edgeImage in @('strata-edge-dark.png','strata-edge-light.png')) {
    Copy-Item -LiteralPath (Join-Path $edgeRoot ('docs\images\' + $edgeImage)) -Destination (Join-Path $edgeStage 'docs\images')
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'server.cjs') -Destination (Join-Path $edgeStage 'scripts')
$edgeChecksums = Get-ChildItem -LiteralPath $edgeStage -File -Recurse | Sort-Object FullName | ForEach-Object {
    $edgeRelative = $_.FullName.Substring($edgeStage.Length + 1).Replace('\','/')
    (Get-EdgeFileHash $_.FullName) + '  ' + $edgeRelative
}
$edgeChecksums | Set-Content -LiteralPath (Join-Path $edgeStage 'SHA256SUMS.txt') -Encoding ascii
$edgeArchive = Join-Path $OutDir "strata-edge-$edgeVersion.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $edgeArchive) { Remove-Item -LiteralPath $edgeArchive -Force }
[IO.Compression.ZipFile]::CreateFromDirectory($edgeStageParent, $edgeArchive)
@($edgeWidget,$edgeArchive) | ForEach-Object {
    (Get-EdgeFileHash $_) + '  ' + [IO.Path]::GetFileName($_)
} | Set-Content -LiteralPath (Join-Path $OutDir "strata-edge-$edgeVersion-SHA256SUMS.txt") -Encoding ascii
Write-Output ('Release: ' + $edgeArchive)
