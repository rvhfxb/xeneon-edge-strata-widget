$ErrorActionPreference = 'Stop'
$edgeTaskName = 'Strata Edge Helper'
$edgeRunner = Join-Path $PSScriptRoot 'scripts\server.cjs'
$edgeRunnerLiteral = "'" + $edgeRunner.Replace("'", "''") + "'"

function Get-EdgeTask {
    $edgeTask = Get-ScheduledTask -TaskName $edgeTaskName -ErrorAction SilentlyContinue
    if ($edgeTask -and -not ($edgeTask.Actions.Arguments -like ('*' + [WildcardPattern]::Escape($edgeRunnerLiteral) + '*'))) {
        throw 'Another installation uses the Strata Edge Helper task. Run its Uninstall-Helper.cmd first.'
    }
    return $edgeTask
}

function Assert-EdgePortFree {
    if (Get-NetTCPConnection -LocalPort 5199 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 5199 is already in use. You can reuse the existing Strata helper and import only the widget. To replace it, stop that helper first (see README.md).'
    }
}

function Stop-EdgeTask($Task) {
    if ($Task.State -in @('Running', 'Queued')) {
        try { Stop-ScheduledTask -TaskName $edgeTaskName }
        catch {
            # The task may finish between the state read and stop request.
            $edgeCurrent = Get-EdgeTask
            if ($edgeCurrent -and $edgeCurrent.State -notin @('Ready', 'Disabled')) { throw }
        }
    }
}

function Test-EdgeHelper {
    try {
        $edgeReply = Invoke-RestMethod -Uri 'http://127.0.0.1:5199/api/snapshot' -TimeoutSec 2
        return ($edgeReply.available -is [bool])
    } catch { return $false }
}

function Wait-EdgeHelper {
    for ($edgeAttempt = 0; $edgeAttempt -lt 20; $edgeAttempt++) {
        if (Test-EdgeHelper) {
            Write-Output 'Helper ready: http://127.0.0.1:5199/'
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw 'Helper did not start. Read helper-error.log and check that port 5199 is free.'
}
