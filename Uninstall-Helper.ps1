. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
$edgeTask = Get-EdgeTask
if ($edgeTask) {
    Stop-EdgeTask $edgeTask
    Unregister-ScheduledTask -TaskName $edgeTaskName -Confirm:$false
    Write-Output 'Strata Edge Helper removed from Task Scheduler. Files and Strata are unchanged.'
} else { Write-Output 'This helper is not installed.' }
