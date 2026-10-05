. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
$edgeTask = Get-EdgeTask
if (-not $edgeTask) { throw 'Run Install-Helper.cmd first.' }
if ($edgeTask.State -eq 'Running' -and (Test-EdgeHelper)) {
    Write-Output 'Helper already ready: http://127.0.0.1:5199/'
    return
}
# A stale Running state is recoverable only when the port is free. Leave an
# unresponsive listener alone; it may belong to another helper installation.
Assert-EdgePortFree
Stop-EdgeTask $edgeTask
Assert-EdgePortFree
Enable-ScheduledTask -TaskName $edgeTaskName | Out-Null
Start-ScheduledTask -TaskName $edgeTaskName
Wait-EdgeHelper
