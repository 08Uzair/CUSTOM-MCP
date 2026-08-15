<#
.SYNOPSIS
    {{PROJECT_NAME}} - AI Integration Generator launcher.
    Installs dependencies for every service and starts both servers in ONE
    VS Code terminal with live, labelled output.

.SERVICES
    MCP Server  : http://localhost:{{PORT_MCP_SERVER}}/health
    AI Server   : http://localhost:{{PORT_AI_SERVER}}/api/health

    The chat UI is a single drop-in component (ai-chat/AiChat.jsx) that you
    copy into your own application - see ai-chat/INSTALL.md.

.USAGE
    .\run.ps1                 Install missing deps, then start everything
    .\run.ps1 -Install        Force reinstall of ALL deps, then start
    .\run.ps1 -SkipInstall    Start without running npm install
    .\run.ps1 -Dev            Start node services with --watch (auto-restart)
    .\run.ps1 -Stop           Stop all running services

    Press Ctrl+C to stop everything (children are killed automatically).
#>

param(
    [switch]$Install,
    [switch]$SkipInstall,
    [switch]$Dev,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# ============================================================
# SERVICE DEFINITIONS
# ============================================================

$Services = @(
    @{
        Name    = "MCP SERVER"
        Folder  = "mcp-server"
        Args    = @("src/server.js")
        Url     = "http://localhost:{{PORT_MCP_SERVER}}/health"
        Timeout = 60
    },
    @{
        Name    = "AI SERVER"
        Folder  = "ai-server"
        Args    = @("src/server.js")
        Url     = "http://localhost:{{PORT_AI_SERVER}}/api/health"
        Timeout = 60
    }
)

$Ports = @({{PORT_AI_SERVER}}, {{PORT_MCP_SERVER}})

# ============================================================
# HELPERS
# ============================================================

function Write-Step {
    param([string]$Text, [string]$Color = "White")
    Write-Host ""
    Write-Host $Text -ForegroundColor $Color
}

function Write-Line {
    param([string]$Name, [string]$Text)
    $stamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$stamp][$Name] $Text"
}

function Test-Url {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    try {
        taskkill /PID $ProcessId /T /F | Out-Null
        Write-Line "LAUNCHER" "Stopped PID $ProcessId"
    }
    catch {
        Write-Line "LAUNCHER" "Could not stop PID $ProcessId" 
    }
}

# ============================================================
# STOP MODE  (also used by the cleanup below)
# ============================================================

function Stop-LauncherServices {
    Write-Step "STOPPING {{PROJECT_NAME}} SERVICES" "Yellow"

    $found = $false

    # 1. Kill anything still listening on our ports.
    foreach ($port in $Ports) {
        $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($connection in $listeners) {
            $found = $true
            Write-Line "LAUNCHER" "Port $port is held by PID $($connection.OwningProcess) - killing..."
            Stop-ProcessTree -ProcessId $connection.OwningProcess
        }
    }

    # 2. Kill leftover node/cmd processes launched from this project folder.
    $projectProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -in @("node.exe", "npm.cmd", "cmd.exe") -and
            $_.CommandLine -and
            $_.CommandLine.ToLower().Contains($Root.ToLower())
        }

    foreach ($process in $projectProcesses) {
        $found = $true
        Write-Line "LAUNCHER" "Stopping project process PID $($process.ProcessId)"
        Stop-ProcessTree -ProcessId $process.ProcessId
    }

    Write-Step $(if ($found) { "All services stopped." } else { "No running services were found." }) "Green"
}

if ($Stop) {
    Stop-LauncherServices
    exit 0
}

# ============================================================
# PREFLIGHT: node, npm and folders
# ============================================================

Write-Step "{{PROJECT_NAME}} - STARTUP" "Cyan"

$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$npmCmd  = (Get-Command npm.cmd -ErrorAction Stop).Source

Write-Host "Root: $Root" -ForegroundColor DarkGray
Write-Host "Node: $nodeExe" -ForegroundColor DarkGray

foreach ($service in $Services) {
    if (-not (Test-Path -LiteralPath (Join-Path $Root $service.Folder))) {
        Write-Host "[$($service.Name)] Folder not found: $(Join-Path $Root $service.Folder)" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# .ENV FILES  (create from .env.example when missing)
# ============================================================

Write-Step "Preparing .env files..." "Cyan"

foreach ($service in $Services) {
    $folder = Join-Path $Root $service.Folder
    $example = Join-Path $folder ".env.example"
    $envFile = Join-Path $folder ".env"

    if (-not (Test-Path -LiteralPath $example)) { continue }

    if (Test-Path -LiteralPath $envFile) {
        Write-Line $service.Name ".env already exists (kept)"
    }
    else {
        Copy-Item -LiteralPath $example -Destination $envFile
        Write-Line $service.Name "created .env from .env.example - fill in your secrets"
    }
}

# ============================================================
# INSTALL: npm i for ai-server and mcp-server
# ============================================================

$needInstall = $Install
if (-not $SkipInstall -and -not $needInstall) {
    $needInstall = ($Services | Where-Object { -not (Test-Path -LiteralPath (Join-Path (Join-Path $Root $_.Folder) "node_modules")) }).Count -gt 0
}

if ($needInstall) {
    Write-Step "Installing dependencies with npm..." "Cyan"

    foreach ($service in $Services) {
        $folder = Join-Path $Root $service.Folder

        if ($Install) {
            Write-Line $service.Name "npm install (forced)"
        }
        else {
            Write-Line $service.Name "npm install (node_modules missing)"
        }

        Push-Location $folder
        try {
            & $npmCmd install --no-fund --no-audit
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[$($service.Name)] npm install FAILED." -ForegroundColor Red
                exit 1
            }
        }
        finally {
            Pop-Location
        }
    }

    Write-Step "All dependencies installed successfully." "Green"
}

# ============================================================
# LOG FILES  (one per service, tailed into this terminal)
# ============================================================

$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

foreach ($service in $Services) {
    $logName = ($service.Name -replace " ", "-") + ".log"
    $service.Log = Join-Path $LogDir $logName
    Remove-Item -LiteralPath $service.Log -Force -ErrorAction SilentlyContinue
}

# ============================================================
# START ALL SERVICES (detached processes with redirected output)
# ============================================================

$script:Processes = @()   # { name, pid, log }

foreach ($service in $Services) {
    $folder = Join-Path $Root $service.Folder
    $args = @($service.Args)

    # Development mode adds --watch so the servers restart on file change.
    if ($Dev) {
        $args = @("--watch") + $args
    }

    Write-Line "LAUNCHER" "Starting $($service.Name)..."
    Write-Line "LAUNCHER" "  $nodeExe $($args -join ' ')  (cwd: $folder)"

    $stdoutLog = $service.Log
    $stderrLog = [System.IO.Path]::ChangeExtension($stdoutLog, ".err.log")
    Remove-Item -LiteralPath $stderrLog -Force -ErrorAction SilentlyContinue

    $process = Start-Process `
        -FilePath $nodeExe `
        -ArgumentList $args `
        -WorkingDirectory $folder `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -NoNewWindow `
        -PassThru

    $script:Processes += @{ Name = $service.Name; Pid = $process.Id; Log = $stdoutLog; ErrLog = $stderrLog }
}

Start-Sleep -Milliseconds 500

# ============================================================
# HEALTH CHECK  (wait until every service answers)
# ============================================================

Write-Step "Waiting for services to come up..." "Cyan"

$ready = @{}
foreach ($service in $Services) { $ready[$service.Name] = $false }

$startedAt = Get-Date
while ($true) {
    $allReady = $true
    $deadline = $startedAt.AddSeconds((@($Services.Timeout | Measure-Object -Maximum).Maximum))

    foreach ($service in $Services) {
        if ($ready[$service.Name]) { continue }
        $allReady = $false

        if (Test-Url -Url $service.Url) {
            $ready[$service.Name] = $true
            Write-Host "[$($service.Name)] READY  $($service.Url)" -ForegroundColor Green
        }
        elseif ((Get-Date) -gt $deadline) {
            Write-Host "[$($service.Name)] did not become ready within $($service.Timeout)s - check the logs/" -ForegroundColor Yellow
            $ready[$service.Name] = $true   # don't spin forever; keep monitoring
        }
    }

    if ($allReady) { break }
    Start-Sleep -Milliseconds 1000
}

# ============================================================
# SUMMARY
# ============================================================

Write-Step "ALL SERVICES STARTED - press Ctrl+C to stop everything" "Green"
foreach ($service in $Services) {
    $state = if ($ready[$service.Name]) { "UP" } else { "NOT READY" }
    Write-Host "[$state] $($service.Name.PadRight(10)) $($service.Url)" -ForegroundColor $(if ($ready[$service.Name]) { "Cyan" } else { "Yellow" })
}
Write-Host ""
Write-Host "Live output below (log files in $LogDir):" -ForegroundColor DarkGray
Write-Host "--------------------------------------------------" -ForegroundColor DarkGray

# ============================================================
# MONITOR: tail the log files into this single terminal
# ============================================================

$lastLine = @{}
foreach ($process in $script:Processes) {
    $lastLine["$($process.Name):$($process.Log)"] = 0
    $lastLine["$($process.Name):$($process.ErrLog)"] = 0
}

try {
    while ($true) {
        foreach ($process in $script:Processes) {
            $log = $process.Log

            # Crash detection: process died after it was healthy once.
            $alive = Get-Process -Id $process.Pid -ErrorAction SilentlyContinue
            if ($ready[$process.Name] -and -not $alive) {
                Write-Line "LAUNCHER" "$($process.Name) process exited - see logs/ for details"
                $ready[$process.Name] = $false
            }

            # Only follow the log of a process that is still alive.
            if (-not $alive) { continue }

            foreach ($log in @($process.Log, $process.ErrLog)) {
                $lines = @(Get-Content -LiteralPath $log -ErrorAction SilentlyContinue)
                $count = $lines.Count
                $lastIndex = $lastLine["$($process.Name):$log"]

                if ($count -gt $lastIndex) {
                    for ($i = $lastIndex; $i -lt $count; $i++) {
                        Write-Line $process.Name $lines[$i]
                    }
                    $lastLine["$($process.Name):$log"] = $count
                }
            }
        }

        Start-Sleep -Milliseconds 400
    }
}
finally {
    Write-Step "Stopping services..." "Yellow"

    foreach ($process in $script:Processes) {
        Stop-ProcessTree -ProcessId $process.Pid
    }

    Stop-LauncherServices
}
