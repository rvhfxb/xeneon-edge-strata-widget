. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
$edgeTask = Get-EdgeTask
if ($edgeTask) {
    Stop-EdgeTask $edgeTask
    Write-Output 'Helper stopped (or already stopped). Logon startup remains unchanged.'
} else { Write-Output 'This helper is not installed.' }
