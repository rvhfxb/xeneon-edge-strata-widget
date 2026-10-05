. (Join-Path $PSScriptRoot 'Helper-Common.ps1')
$edgeExisting = Get-EdgeTask
if ($edgeExisting -and $edgeExisting.State -eq 'Running') {
    Write-Output 'This helper is already running. Stop it before reinstalling.'
    exit 0
}
Assert-EdgePortFree
$edgeNode = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$edgeVersion = & $edgeNode -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$edgeVersion -lt 22) { throw 'Install Node.js 22 or later, then retry.' }
# Validate the local configuration before registering a task.
& $edgeNode -e 'require(process.argv[1]).readConfig()' $edgeRunner
if ($LASTEXITCODE -ne 0) { throw 'Invalid helper.config.json.' }
$edgeUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$edgeQuote = { param($value) "'" + $value.Replace("'", "''") + "'" }
$edgeCommand = '& ' + (& $edgeQuote $edgeNode) + ' ' + (& $edgeQuote $edgeRunner) + ' 1>> ' + (& $edgeQuote (Join-Path $PSScriptRoot 'helper-output.log')) + ' 2>> ' + (& $edgeQuote (Join-Path $PSScriptRoot 'helper-error.log')) + '; exit $LASTEXITCODE'
$edgeAction = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -Command "' + $edgeCommand + '"') -WorkingDirectory $PSScriptRoot
$edgeTrigger = New-ScheduledTaskTrigger -AtLogOn -User $edgeUser
$edgePrincipal = New-ScheduledTaskPrincipal -UserId $edgeUser -LogonType Interactive -RunLevel Limited
$edgeSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $edgeTaskName -Action $edgeAction -Trigger $edgeTrigger -Principal $edgePrincipal -Settings $edgeSettings -Description 'Strata Edge read-only monitor; local port 5199.' -Force | Out-Null
Start-ScheduledTask -TaskName $edgeTaskName
Wait-EdgeHelper
Write-Output 'Registered for this user at logon. Keep this folder in its current location.'
