. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
$edgeTask = Get-EdgeTask
if (-not $edgeTask) { throw 'Run Install-Helper.cmd first.' }
if ($edgeTask.State -ne 'Running') {
    Assert-EdgePortFree
    Enable-ScheduledTask -TaskName $edgeTaskName | Out-Null
    Start-ScheduledTask -TaskName $edgeTaskName
}
Wait-EdgeHelper
