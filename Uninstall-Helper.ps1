. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
if (Get-EdgeTask) {
    Stop-ScheduledTask -TaskName $edgeTaskName
    Unregister-ScheduledTask -TaskName $edgeTaskName -Confirm:$false
    Write-Output 'Strata Edge Helper removed from Task Scheduler. Files and Strata are unchanged.'
} else { Write-Output 'This helper is not installed.' }
