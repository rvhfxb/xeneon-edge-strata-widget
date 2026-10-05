param([string]$Root = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference = 'Stop'
# Shadow OS-mutating commands; this exercises shipped scripts without installing
# or stopping any real task, process or service.
$global:edgeTest_mockTask = $null
$global:edgeTest_mockPortBusy = $false
$global:edgeTest_healthy = $true
$global:edgeTest_stopFailure = $false
$global:edgeTest_stopRace = $false
$global:edgeTest_registered = 0
$global:edgeTest_started = 0
$global:edgeTest_stopped = 0
$global:edgeTest_removed = 0
function Get-ScheduledTask { param($TaskName,$ErrorAction) return $global:edgeTest_mockTask }
function Get-NetTCPConnection { param($LocalPort,$State,$ErrorAction) if ($global:edgeTest_mockPortBusy) { return @{LocalPort=5199} } }
function New-ScheduledTaskAction { param($Execute,$Argument,$WorkingDirectory) return [pscustomobject]@{Execute=$Execute;Arguments=$Argument;WorkingDirectory=$WorkingDirectory} }
function New-ScheduledTaskTrigger { param([switch]$AtLogOn,$User) return @{User=$User} }
function New-ScheduledTaskPrincipal { param($UserId,$LogonType,$RunLevel) if ($LogonType -ne 'Interactive' -or $RunLevel -ne 'Limited') { throw 'Unexpected principal' }; return @{UserId=$UserId} }
function New-ScheduledTaskSettingsSet { param($ExecutionTimeLimit,$MultipleInstances,$RestartCount,$RestartInterval,[switch]$StartWhenAvailable,[switch]$AllowStartIfOnBatteries,[switch]$DontStopIfGoingOnBatteries) return @{RestartCount=$RestartCount} }
function Register-ScheduledTask { param($TaskName,$Action,$Trigger,$Principal,$Settings,$Description,[switch]$Force) $global:edgeTest_registered++; $global:edgeTest_mockTask=[pscustomobject]@{State='Ready';Actions=$Action}; return $global:edgeTest_mockTask }
function Start-ScheduledTask { param($TaskName) $global:edgeTest_started++; $global:edgeTest_mockTask.State='Running'; $global:edgeTest_healthy=$true }
function Stop-ScheduledTask { param($TaskName)
    if ($global:edgeTest_mockTask.State -notin @('Running','Queued')) { throw 'Task has no running instance' }
    if ($global:edgeTest_stopRace) { $global:edgeTest_mockTask.State='Ready'; throw 'Task finished before stop' }
    if ($global:edgeTest_stopFailure) { throw 'Access denied' }
    $global:edgeTest_stopped++; $global:edgeTest_mockTask.State='Ready'
}
function Enable-ScheduledTask { param($TaskName) }
function Unregister-ScheduledTask { param($TaskName,$Confirm) $global:edgeTest_removed++;$global:edgeTest_mockTask=$null }
function Invoke-RestMethod { param($Uri,$TimeoutSec) if (-not $global:edgeTest_healthy) { throw 'Connection refused' }; return [pscustomobject]@{available=$false} }
function Assert-Check { param($condition,$message) if (-not $condition) { throw $message } }
function Assert-Throws { param($block,$fragment) try { & $block } catch { if ($_.Exception.Message -like ('*'+$fragment+'*')) { return }; throw }; throw 'Expected failure did not occur' }

& (Join-Path $Root 'Install-Helper.ps1')
Assert-Check ($global:edgeTest_registered -eq 1 -and $global:edgeTest_started -eq 1) 'Install did not register/start'
Assert-Check ($global:edgeTest_mockTask.Actions.WorkingDirectory -eq $Root) 'Working directory does not match extraction'
Assert-Check ($global:edgeTest_mockTask.Actions.Arguments.Contains('-WindowStyle Hidden')) 'Task is not hidden'
# Parse the embedded action to catch quoting problems, including relocated paths.
$tokens=$null;$errors=$null
[Management.Automation.Language.Parser]::ParseInput($global:edgeTest_mockTask.Actions.Arguments.Substring($global:edgeTest_mockTask.Actions.Arguments.IndexOf('-Command "')+10).TrimEnd('"'),[ref]$tokens,[ref]$errors) | Out-Null
Assert-Check (-not $errors) 'Action command contains a syntax error'
& (Join-Path $Root 'Start-Helper.ps1')
Assert-Check ($global:edgeTest_started -eq 1) 'Start is not idempotent'
& (Join-Path $Root 'Stop-Helper.ps1')
& (Join-Path $Root 'Start-Helper.ps1')
Assert-Check ($global:edgeTest_started -eq 2 -and $global:edgeTest_stopped -eq 1) 'Stop/start failed'
& (Join-Path $Root 'Uninstall-Helper.ps1')
Assert-Check ($global:edgeTest_removed -eq 1 -and $null -eq $global:edgeTest_mockTask) 'Uninstall failed'
$global:edgeTest_mockPortBusy=$true
Assert-Throws { & (Join-Path $Root 'Install-Helper.ps1') } 'Port 5199'
Assert-Check ($global:edgeTest_registered -eq 1) 'Port collision modified tasks'
$global:edgeTest_mockPortBusy=$false
$global:edgeTest_mockTask=[pscustomobject]@{State='Running';Actions=[pscustomobject]@{Arguments='node C:\other\server.cjs'}}
Assert-Throws { & (Join-Path $Root 'Stop-Helper.ps1') } 'Another installation'
Assert-Check ($global:edgeTest_stopped -eq 2) 'Foreign task was stopped'

function New-MockTask($State) {
    return [pscustomobject]@{State=$State;Actions=[pscustomobject]@{Arguments=("node '" + (Join-Path $Root 'scripts\server.cjs').Replace("'", "''") + "'")}}
}
foreach ($state in @('Ready','Disabled')) {
    $global:edgeTest_mockTask=New-MockTask $state
    $before=$global:edgeTest_stopped
    & (Join-Path $Root 'Stop-Helper.ps1')
    & (Join-Path $Root 'Stop-Helper.ps1')
    Assert-Check ($global:edgeTest_stopped -eq $before) "Stopped a $state task"
    & (Join-Path $Root 'Uninstall-Helper.ps1')
    & (Join-Path $Root 'Uninstall-Helper.ps1')
    Assert-Check ($null -eq $global:edgeTest_mockTask) "Uninstall failed for $state"
}
$global:edgeTest_mockTask=New-MockTask 'Running'
$global:edgeTest_healthy=$false
$before=$global:edgeTest_started
& (Join-Path $Root 'Start-Helper.ps1')
Assert-Check ($global:edgeTest_started -eq $before+1 -and $global:edgeTest_healthy) 'Stale Running did not recover'
# Unreachable Strata is still a healthy bridge (available=false).
& (Join-Path $Root 'Start-Helper.ps1')
Assert-Check ($global:edgeTest_started -eq $before+1) 'Strata offline caused an unnecessary helper restart'
$global:edgeTest_healthy=$false
$global:edgeTest_mockPortBusy=$true
$before=$global:edgeTest_stopped
Assert-Throws { & (Join-Path $Root 'Start-Helper.ps1') } 'Port 5199'
Assert-Check ($global:edgeTest_stopped -eq $before) 'Unresponsive occupied port caused a stop'
$global:edgeTest_mockPortBusy=$false
$global:edgeTest_stopFailure=$true
Assert-Throws { & (Join-Path $Root 'Stop-Helper.ps1') } 'Access denied'
$global:edgeTest_stopFailure=$false
$global:edgeTest_stopRace=$true
& (Join-Path $Root 'Stop-Helper.ps1')
Assert-Check ($global:edgeTest_mockTask.State -eq 'Ready') 'Stop race was not tolerated'
$global:edgeTest_stopRace=$false
Write-Output 'Helper script regressions passed: stopped/disabled repeat calls, stale Running recovery, offline Strata, occupied-port protection, stop race, real stop failure, relocation and foreign-task protection.'
