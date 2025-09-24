# VDI Performance Diagnostic Script - V3 (Fixed)
param(
    [string]$OutputPath = "C:\temp\VDI_Diagnostics.txt",
    [switch]$DetailedOutput,
    [switch]$MonitorPerformance,
    [int]$MonitorDuration = 60
)

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

# Initialize variables for later use
$avgCpu = $null
$avgQueue = $null
$availGB = $null
$memoryGB = $null

# System Resources
$output += "`n[SYSTEM RESOURCES]"

if ($cs.TotalPhysicalMemory -and $cs.TotalPhysicalMemory -gt 0) {
    $memoryGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
    $availMem = (Get-Counter "\Memory\Available MBytes" -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
    if ($availMem -and $availMem -ge 0) { 
        $availGB = [math]::Round($availMem / 1024, 2) 
    }
    $output += "Memory: $memoryGB GB total, $(if($null -ne $availGB){"$availGB GB"}else{"N/A"}) available"
}

if ($cpu.Name) {
    $cpuInfo = "$($cpu.Name) ($($cpu.NumberOfCores) cores)"
    $cpuUsage = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 3 -ErrorAction SilentlyContinue
    if ($cpuUsage) {
        $validSamples = $cpuUsage.CounterSamples | Where-Object {$_.CookedValue -ge 0}
        if ($validSamples) { 
            $avgCpu = [math]::Round(($validSamples | Measure-Object CookedValue -Average).Average, 2) 
        }
    }
    $output += "CPU: $cpuInfo - Usage: $(if($null -ne $avgCpu){"$avgCpu%"}else{"N/A"})"
}

# Disk Performance
$output += "`n[DISK PERFORMANCE]"

foreach ($disk in $disks) {
    if ($disk.Size -and $disk.Size -gt 0) {
        $freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        $totalGB = [math]::Round($disk.Size / 1GB, 2)
        $pctFree = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 2)
        $output += "$($disk.DeviceID) $totalGB GB total, $freeGB GB free ($pctFree%)"
    }
}

$diskQueue = Get-Counter "\PhysicalDisk(_Total)\Current Disk Queue Length" -SampleInterval 2 -MaxSamples 5 -ErrorAction SilentlyContinue
if ($diskQueue) {
    $validQ = $diskQueue.CounterSamples | Where-Object {$_.CookedValue -ge 0}
    if ($validQ) {
        $avgQueue = [math]::Round(($validQ | Measure-Object CookedValue -Average).Average, 2)
        $output += "Disk Queue: $avgQueue (should be < 2)"
    }
}

# Network
$output += "`n[NETWORK]"

Get-WmiObject Win32_NetworkAdapter -Filter "NetConnectionStatus=2 AND AdapterType LIKE '%Ethernet%'" | ForEach-Object {
    $speed = if ($_.Speed -and $_.Speed -gt 0) { 
        "$([math]::Round($_.Speed/1000000,0)) Mbps" 
    } else { 
        "Unknown" 
    }
    $output += "$($_.Name): $speed"
}

@("8.8.8.8", "1.1.1.1") | ForEach-Object {
    $output += "Ping ${_}: $(if(Test-Connection $_ -Count 1 -Quiet){'OK'}else{'Failed'})"
}

# Process Analysis
$output += "`n[TOP PROCESSES]"

Get-Process | Where-Object {$_.WorkingSet64 -gt 50MB} | 
    Sort-Object WorkingSet64 -Descending | 
    Select-Object -First 10 | ForEach-Object {
        $output += "$($_.ProcessName): $([math]::Round($_.WorkingSet64/1MB,0))MB"
    }

# Citrix Check
if ($env:SESSIONNAME) {
    $citrix = Get-Process | Where-Object {$_.ProcessName -match "wfica|receiver|workspace"}
    if ($citrix) {
        $output += "`n[CITRIX] Session: $env:SESSIONNAME"
        $citrix | ForEach-Object { 
            $output += "$($_.ProcessName): $([math]::Round($_.WorkingSet64/1MB,0))MB" 
        }
    }
}

# Windows Performance
$output += "`n[WINDOWS]"

@("Spooler", "BITS", "Windows Search") | ForEach-Object {
    $svc = Get-Service $_ -ErrorAction SilentlyContinue
    if ($svc) { 
        $output += "${_}: $($svc.Status)" 
    }
}

$rebootPending = (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") -or
                 (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") -or
                 ($null -ne (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations)

$output += "Reboot Pending: $(if($rebootPending){'Yes'}else{'No'})"

$pf = Get-WmiObject Win32_PageFileUsage
if ($pf -and $pf.AllocatedBaseSize -and $pf.AllocatedBaseSize -gt 0) {
    $pfUsage = [math]::Round(($pf.CurrentUsage / $pf.AllocatedBaseSize) * 100, 2)
    $output += "Page File: $($pf.CurrentUsage)/$($pf.AllocatedBaseSize) MB ($pfUsage%)"
}

if ($os.LastBootUpTime) {
    $boot = [Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime)
    $uptime = (Get-Date) - $boot
    $output += "Uptime: $($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
}

$startupCount = @(Get-WmiObject Win32_StartupCommand).Count
$output += "Startup Items: $startupCount"

# Event Log (if detailed)
if ($DetailedOutput) {
    $errors = Get-EventLog System -EntryType Error -Newest 5 -ErrorAction SilentlyContinue
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
}

# Recommendations
$output += "`n[RECOMMENDATIONS]"
$recs = @()

if ($null -ne $availGB -and $null -ne $memoryGB -and $memoryGB -gt 0) {
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

if ($recs.Count -gt 0) {
    $recs | ForEach-Object { $output += "! $_" }
} else {
    $output += "No immediate issues detected"
}

# Save and display output
$outputText = $output -join "`n"
$outputText | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host $outputText
Write-Host "`nReport saved to: $OutputPath" -ForegroundColor Green

# Performance Monitor
if ($MonitorPerformance) {
    Write-Host "`nMonitoring for $MonitorDuration seconds... Launch your application now." -ForegroundColor Yellow
    
    $end = (Get-Date).AddSeconds($MonitorDuration)
    $samples = @()
    
    while ((Get-Date) -lt $end) {
        $sample = @{}
        
        $counters = @(
            @{Name='CPU'; Path='\Processor(_Total)\% Processor Time'},
            @{Name='MemMB'; Path='\Memory\Available MBytes'},
            @{Name='Queue'; Path='\PhysicalDisk(_Total)\Current Disk Queue Length'}
        )
        
        foreach ($counter in $counters) {
            $value = (Get-Counter $counter.Path -ErrorAction SilentlyContinue).CounterSamples[0].CookedValue
            if ($null -ne $value -and $value -ge 0) { 
                $sample[$counter.Name] = $value 
            }
        }
        
        if ($sample.Count -gt 0) {
            $samples += $sample
            Write-Host "." -NoNewline
        }
        
        Start-Sleep -Seconds 2
    }
    
    Write-Host "`n`nResults:" -ForegroundColor Green
    
    if ($samples.Count -eq 0) {
        Write-Host "No performance data collected" -ForegroundColor Yellow
    } else {
        # CPU Maximum
        $cpuData = $samples | Where-Object {$_.CPU} | ForEach-Object {$_.CPU}
        if ($cpuData) {
            $cpuMax = [math]::Round(($cpuData | Measure-Object -Maximum).Maximum, 1)
            Write-Host "CPU Max: $cpuMax%"
            if ($cpuMax -gt 90) {
                Write-Host "! High CPU detected" -ForegroundColor Red
            }
        }
        
        # Memory Minimum
        $memData = $samples | Where-Object {$_.MemMB} | ForEach-Object {$_.MemMB}
        if ($memData) {
            $memMin = [math]::Round(($memData | Measure-Object -Minimum).Minimum, 0)
            Write-Host "Memory Min: ${memMin}MB"
            if ($memMin -lt 500) {
                Write-Host "! Low memory detected" -ForegroundColor Red
            }
        }
        
        # Disk Queue Maximum
        $queueData = $samples | Where-Object {$_.Queue} | ForEach-Object {$_.Queue}
        if ($queueData) {
            $queueMax = [math]::Round(($queueData | Measure-Object -Maximum).Maximum, 1)
            Write-Host "Disk Queue Max: $queueMax"
            if ($queueMax -gt 2) {
                Write-Host "! Storage bottleneck detected" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`nUsage: .\VDI_Diagnostic.ps1 [-DetailedOutput] [-MonitorPerformance] [-MonitorDuration seconds]" -ForegroundColor Cyan
