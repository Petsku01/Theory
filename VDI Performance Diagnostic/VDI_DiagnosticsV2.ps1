# VDI Performance Diagnostic Script - Final Optimized Version
param(
    [string]$OutputPath = "C:\temp\VDI_Diagnostics.txt",
    [switch]$DetailedOutput,
    [switch]$MonitorPerformance,
    [int]$MonitorDuration = 60
)

# Initialize
$ErrorActionPreference = "SilentlyContinue"
$outputDir = Split-Path $OutputPath -Parent
if (!(Test-Path $outputDir)) { 
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null 
}

$output = @("VDI Performance Diagnostic Report - $(Get-Date)")

# Cache WMI queries
$os = Get-WmiObject Win32_OperatingSystem
$cs = Get-WmiObject Win32_ComputerSystem
$cpu = Get-WmiObject Win32_Processor
$disks = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"

# Initialize variables
$memoryGB = 0
$availGB = $null
$avgCpu = $null
$avgQueue = $null

# System Resources
$output += "`n[SYSTEM RESOURCES]"

if ($cs -and $cs.TotalPhysicalMemory -and $cs.TotalPhysicalMemory -gt 0) {
    $memoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
    try {
        $availMem = Get-Counter "\Memory\Available MBytes"
        if ($availMem.CounterSamples[0].CookedValue -gt 0) {
            $availGB = [math]::Round($availMem.CounterSamples[0].CookedValue / 1024, 2)
        }
    } catch {}
    $output += "Memory: $memoryGB GB total, $(if($availGB){"$availGB GB"}else{"N/A"}) available"
}

if ($cpu -and $cpu.Name) {
    $cpuInfo = "$($cpu.Name) ($($cpu.NumberOfCores) cores)"
    try {
        $cpuUsage = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 3
        if ($cpuUsage.CounterSamples) {
            $validSamples = @($cpuUsage.CounterSamples | Where-Object {$_.CookedValue -ge 0})
            if ($validSamples.Count -gt 0) {
                $avgCpu = [math]::Round(($validSamples | Measure-Object CookedValue -Average).Average, 2)
            }
        }
    } catch {}
    $output += "CPU: $cpuInfo - Usage: $(if($avgCpu){"$avgCpu%"}else{"N/A"})"
}

# Disk Performance
$output += "`n[DISK PERFORMANCE]"

if ($disks) {
    foreach ($disk in $disks) {
        if ($disk.Size -and $disk.Size -gt 0) {
            $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            $totalGB = [math]::Round($disk.Size / 1GB, 2)
            $pctFree = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 2)
            $output += "$($disk.DeviceID) $totalGB GB total, $freeGB GB free ($pctFree%)"
        }
    }
}

try {
    $diskQueue = Get-Counter "\PhysicalDisk(_Total)\Current Disk Queue Length" -SampleInterval 2 -MaxSamples 5
    if ($diskQueue.CounterSamples) {
        $validQ = @($diskQueue.CounterSamples | Where-Object {$_.CookedValue -ge 0})
        if ($validQ.Count -gt 0) {
            $avgQueue = [math]::Round(($validQ | Measure-Object CookedValue -Average).Average, 2)
            $output += "Disk Queue: $avgQueue (should be < 2)"
        }
    }
} catch {}

# Network
$output += "`n[NETWORK]"

$adapters = Get-WmiObject Win32_NetworkAdapter -Filter "NetConnectionStatus=2"
if ($adapters) {
    $adapters | Where-Object {$_.AdapterType -like "*Ethernet*"} | ForEach-Object {
        $speed = if ($_.Speed -and $_.Speed -gt 0) { 
            "$([math]::Round($_.Speed/1000000,0)) Mbps" 
        } else { 
            "Unknown" 
        }
        $output += "$($_.Name): $speed"
    }
}

"8.8.8.8", "1.1.1.1" | ForEach-Object {
    if (Test-Connection $_ -Count 1 -Quiet) {
        $output += "Ping ${_}: OK"
    } else {
        $output += "Ping ${_}: Failed"
    }
}

# Process Analysis
$output += "`n[TOP PROCESSES]"

try {
    $topProcs = Get-Process | 
        Where-Object {$_.WorkingSet64 -gt 50MB} | 
        Sort-Object WorkingSet64 -Descending | 
        Select-Object -First 10
    
    foreach ($p in $topProcs) {
        $mem = [math]::Round($p.WorkingSet64/1MB,0)
        $output += "$($p.ProcessName): ${mem}MB"
    }
} catch {}

# Citrix Check
if ($env:SESSIONNAME) {
    $citrix = @(Get-Process | Where-Object {$_.ProcessName -match "wfica|receiver|workspace"})
    if ($citrix.Count -gt 0) {
        $output += "`n[CITRIX] Session: $env:SESSIONNAME"
        $citrix | ForEach-Object { 
            $output += "$($_.ProcessName): $([math]::Round($_.WorkingSet64/1MB,0))MB" 
        }
    }
}

# Windows Performance
$output += "`n[WINDOWS]"

"Spooler", "BITS", "Windows Search" | ForEach-Object {
    $svc = Get-Service $_ -ErrorAction SilentlyContinue
    if ($svc) { $output += "${_}: $($svc.Status)" }
}

$rebootPending = $false
if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") { 
    $rebootPending = $true 
}
if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") { 
    $rebootPending = $true 
}
try {
    $pending = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name PendingFileRenameOperations
    if ($pending.PendingFileRenameOperations) { $rebootPending = $true }
} catch {}
$output += "Reboot Pending: $(if($rebootPending){'Yes'}else{'No'})"

$pf = Get-WmiObject Win32_PageFileUsage
if ($pf -and $pf.AllocatedBaseSize -and $pf.AllocatedBaseSize -gt 0) {
    $pfUsage = [math]::Round(($pf.CurrentUsage / $pf.AllocatedBaseSize) * 100, 2)
    $output += "Page File: $($pf.CurrentUsage)/$($pf.AllocatedBaseSize) MB ($pfUsage%)"
}

if ($os -and $os.LastBootUpTime) {
    try {
        $boot = [Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)
        $uptime = (Get-Date) - $boot
        $output += "Uptime: $($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
    } catch {}
}

$startupCount = @(Get-WmiObject Win32_StartupCommand).Count
$output += "Startup Items: $startupCount"

# Event Log (if detailed)
if ($DetailedOutput) {
    try {
        $errors = Get-EventLog System -EntryType Error -Newest 5
        if ($errors) {
            $output += "`n[RECENT ERRORS]"
            $errors | ForEach-Object {
                $msg = if($_.Message) { 
                    $_.Message.Substring(0, [Math]::Min(80, $_.Message.Length)) 
                } else { 
                    "No message" 
                }
                $output += "$($_.TimeGenerated.ToString('HH:mm')) $($_.Source): $msg"
            }
        }
    } catch {}
}

# Recommendations
$output += "`n[RECOMMENDATIONS]"
$recs = @()

if ($null -ne $availGB -and $availGB -gt 0 -and $memoryGB -gt 0) {
    $memUsed = (1 - ($availGB / $memoryGB)) * 100
    if ($memUsed -gt 80) { 
        $recs += "High memory usage: $([math]::Round($memUsed,1))%" 
    }
}

if ($null -ne $avgCpu -and $avgCpu -gt 80) { 
    $recs += "High CPU usage: $avgCpu%" 
}

if ($null -ne $avgQueue -and $avgQueue -gt 2) { 
    $recs += "High disk queue: $avgQueue" 
}

if ($startupCount -gt 20) { 
    $recs += "Many startup items: $startupCount" 
}

if ($recs.Count -eq 0) {
    $output += "No immediate issues detected"
} else {
    $recs | ForEach-Object { $output += "! $_" }
}

# Save output
$output -join "`n" | Out-File -FilePath $OutputPath -Encoding UTF8
$output -join "`n" | Write-Host
Write-Host "`nReport saved to: $OutputPath" -ForegroundColor Green

# Performance Monitor Function
function Start-PerformanceMonitor {
    param([int]$Duration = 60)
    
    Write-Host "`nMonitoring for $Duration seconds... Launch your application now." -ForegroundColor Yellow
    
    $end = (Get-Date).AddSeconds($Duration)
    $samples = @()
    
    while ((Get-Date) -lt $end) {
        $sample = @{}
        
        try {
            $c = Get-Counter "\Processor(_Total)\% Processor Time"
            if ($c.CounterSamples[0].CookedValue -ge 0) {
                $sample.CPU = $c.CounterSamples[0].CookedValue
            }
        } catch {}
        
        try {
            $m = Get-Counter "\Memory\Available MBytes"  
            if ($m.CounterSamples[0].CookedValue -gt 0) {
                $sample.MemMB = $m.CounterSamples[0].CookedValue
            }
        } catch {}
        
        try {
            $q = Get-Counter "\PhysicalDisk(_Total)\Current Disk Queue Length"
            if ($q.CounterSamples[0].CookedValue -ge 0) {
                $sample.Queue = $q.CounterSamples[0].CookedValue
            }
        } catch {}
        
        if ($sample.Count -gt 0) {
            $samples += $sample
            Write-Host "." -NoNewline
        }
        
        Start-Sleep -Seconds 2
    }
    
    Write-Host "`n`nResults:" -ForegroundColor Green
    
    if ($samples.Count -eq 0) {
        Write-Host "No performance data collected" -ForegroundColor Yellow
        return
    }
    
    $cpuData = @($samples | Where-Object {$_.CPU} | ForEach-Object {$_.CPU})
    $memData = @($samples | Where-Object {$_.MemMB} | ForEach-Object {$_.MemMB})
    $queueData = @($samples | Where-Object {$_.Queue} | ForEach-Object {$_.Queue})
    
    if ($cpuData.Count -gt 0) {
        $maxCpu = [math]::Round(($cpuData | Measure-Object -Maximum).Maximum, 1)
        Write-Host "CPU Max: $maxCpu%"
        if ($maxCpu -gt 90) { 
            Write-Host "! High CPU detected" -ForegroundColor Red 
        }
    }
    
    if ($memData.Count -gt 0) {
        $minMem = [math]::Round(($memData | Measure-Object -Minimum).Minimum, 0)
        Write-Host "Memory Min: ${minMem}MB"
        if ($minMem -lt 500) { 
            Write-Host "! Low memory detected" -ForegroundColor Red 
        }
    }
    
    if ($queueData.Count -gt 0) {
        $maxQueue = [math]::Round(($queueData | Measure-Object -Maximum).Maximum, 1)
        Write-Host "Disk Queue Max: $maxQueue"
        if ($maxQueue -gt 2) { 
            Write-Host "! Storage bottleneck detected" -ForegroundColor Red 
        }
    }
}

if ($MonitorPerformance) {
    Start-PerformanceMonitor -Duration $MonitorDuration
}

Write-Host "`nUsage: .\VDI_Diagnostic.ps1 [-DetailedOutput] [-MonitorPerformance] [-MonitorDuration seconds]" -ForegroundColor Cyan
