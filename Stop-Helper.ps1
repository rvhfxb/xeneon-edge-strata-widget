. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
if (Get-EdgeTask) {
    Stop-ScheduledTask -TaskName $edgeTaskName
    Write-Output 'Helper stopped. It will start again at the next logon.'
} else { Write-Output 'This helper is not installed.' }
