# VDI Performance Diagnostic Script
# Run with elevated privileges for best results

param(
    [string]$OutputPath = "C:\temp\VDI_Diagnostics.txt",
    [switch]$DetailedOutput,
    [switch]$MonitorPerformance,
    [int]$MonitorDuration = 60
)

# Create output directory if it doesn't exist
$outputDir = Split-Path $OutputPath -Parent
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Initialize output
$output = @()
$output += "VDI Performance Diagnostic Report - $(Get-Date)"
$output += "=" * 60

#region System Resources
$output += "`n[SYSTEM RESOURCES]"
$output += "-" * 20

# Memory Information
try {
    $memory = Get-WmiObject -Class Win32_ComputerSystem
    $memoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
    $availableMemory = Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 1 -ErrorAction SilentlyContinue
    if ($availableMemory) {
        $availableMemoryGB = [math]::Round($availableMemory.CounterSamples[0].CookedValue / 1024, 2)
        $output += "Total Physical Memory: $memoryGB GB"
        $output += "Available Memory: $availableMemoryGB GB"
    } else {
        $output += "Total Physical Memory: $memoryGB GB"
        $output += "Available Memory: Unable to determine"
        $availableMemoryGB = $null
    }
} catch {
    $output += "Could not retrieve memory information"
    $memoryGB = $null
    $availableMemoryGB = $null
}

# CPU Information
try {
    $cpu = Get-WmiObject -Class Win32_Processor
    $cpuCounter = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 2 -MaxSamples 3 -ErrorAction SilentlyContinue
    if ($cpuCounter) {
        $cpuUsageAvg = $cpuCounter | 
            Select-Object -ExpandProperty CounterSamples | 
            Measure-Object -Property CookedValue -Average
    } else {
        $cpuUsageAvg = $null
    }
    
    $output += "CPU: $($cpu.Name)"
    $output += "CPU Cores: $($cpu.NumberOfCores)"
    if ($cpuUsageAvg) {
        $output += "CPU Usage (avg): $([math]::Round($cpuUsageAvg.Average, 2))%"
    } else {
        $output += "CPU Usage: Unable to determine"
    }
} catch {
    $output += "Could not retrieve CPU information"
    $cpuUsageAvg = $null
}

# Disk Performance
$output += "`n[DISK PERFORMANCE]"
$output += "-" * 20

$disks = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
foreach ($disk in $disks) {
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
    $totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)
    $percentFree = [math]::Round(($disk.FreeSpace / $disk.Size) * 100, 2)
    $output += "Drive $($disk.DeviceID) - Total: $totalSpaceGB GB, Free: $freeSpaceGB GB ($percentFree%)"
}

# Disk Queue Length
$avgDiskQueue = $null
try {
    $diskQueue = Get-Counter "\PhysicalDisk(_Total)\Current Disk Queue Length" -SampleInterval 2 -MaxSamples 5 -ErrorAction SilentlyContinue
    if ($diskQueue) {
        $avgDiskQueue = ($diskQueue.CounterSamples | Measure-Object -Property CookedValue -Average).Average
        $output += "Average Disk Queue Length: $([math]::Round($avgDiskQueue, 2)) (Should be < 2 per disk)"
    }
} catch {
    $output += "Could not retrieve disk queue length"
}

#endregion

#region Network Performance
$output += "`n[NETWORK PERFORMANCE]"
$output += "-" * 20

$networkAdapters = Get-WmiObject -Class Win32_NetworkAdapter | Where-Object { $_.NetConnectionStatus -eq 2 -and $_.AdapterType -like "*Ethernet*" }
foreach ($adapter in $networkAdapters) {
    $output += "Network Adapter: $($adapter.Name)"
    if ($adapter.Speed) {
        $speedMbps = [math]::Round($adapter.Speed / 1000000, 0)
        $output += "Speed: $speedMbps Mbps"
    } else {
        $output += "Speed: Unknown"
    }
}

# Test connectivity to common services
$testHosts = @("8.8.8.8", "1.1.1.1")
foreach ($testHost in $testHosts) {
    try {
        # First, quick connectivity test
        $ping = Test-Connection -ComputerName $testHost -Count 1 -Quiet -ErrorAction SilentlyContinue
        if ($ping) {
            # If connected, get detailed results
            $pingResults = Test-Connection -ComputerName $testHost -Count 3 -ErrorAction SilentlyContinue
            if ($pingResults) {
                # Check PowerShell version and use appropriate property
                if ($PSVersionTable.PSVersion.Major -ge 6) {
                    # PowerShell Core/7+ uses Latency property
                    if ($pingResults[0].PSObject.Properties['Latency']) {
                        $avgLatency = ($pingResults | Measure-Object -Property Latency -Average).Average
                        $output += "Ping to ${testHost}: Average $([math]::Round($avgLatency,1)) ms"
                    } else {
                        $output += "Ping to ${testHost}: Success"
                    }
                } else {
                    # Windows PowerShell 5.1 and below
                    # Try to extract ResponseTime from the result
                    if ($pingResults[0].PSObject.Properties['ResponseTime']) {
                        $avgLatency = ($pingResults | Measure-Object -Property ResponseTime -Average).Average
                        $output += "Ping to ${testHost}: Average $([math]::Round($avgLatency,1)) ms"
                    } else {
                        # Fallback: calculate from StatusCode or just report success
                        $output += "Ping to ${testHost}: Success"
                    }
                }
            } else {
                $output += "Ping to ${testHost}: Connection established but no detailed results"
            }
        } else {
            $output += "Ping to ${testHost}: Failed"
        }
    } catch {
        $output += "Ping to ${testHost}: Error testing connection - $_"
    }
}
#endregion

#region Process Analysis
$output += "`n[PROCESS ANALYSIS]"
$output += "-" * 20

# Top CPU consuming processes
$topCPUProcesses = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
$output += "Top 10 CPU Consuming Processes:"
foreach ($proc in $topCPUProcesses) {
    if ($proc.CPU -gt 0) {
        $cpuTime = [math]::Round($proc.CPU, 2)
        $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        $output += "  $($proc.ProcessName) - CPU: $cpuTime seconds, Memory: $memoryMB MB"
    }
}

# Top Memory consuming processes
$topMemoryProcesses = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10
$output += "`nTop 10 Memory Consuming Processes:"
foreach ($proc in $topMemoryProcesses) {
    $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
    $output += "  $($proc.ProcessName) - Memory: $memoryMB MB"
}
#endregion

#region Citrix Specific Checks
$output += "`n[CITRIX ENVIRONMENT]"
$output += "-" * 20

# Check if this is a Citrix session
$citrixSession = $env:SESSIONNAME
if ($citrixSession) {
    $output += "Session Name: $citrixSession"
    
    # Check for Citrix processes
    $citrixProcesses = Get-Process | Where-Object { $_.ProcessName -like "*wfica*" -or $_.ProcessName -like "*receiver*" -or $_.ProcessName -like "*workspace*" }
    if ($citrixProcesses) {
        $output += "Citrix Processes Found:"
        foreach ($proc in $citrixProcesses) {
            $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            $output += "  $($proc.ProcessName) - Memory: $memoryMB MB"
        }
    }
    
    # Check for published applications
    try {
        $publishedApps = Get-WmiObject -Class Win32_Process | Where-Object { $_.CommandLine -like "*Published*" }
        if ($publishedApps) {
            $output += "Published Applications: $($publishedApps.Count)"
        }
    } catch {
        $output += "Could not enumerate published applications"
    }
} else {
    $output += "Not running in a Citrix session"
}
#endregion

#region Windows Performance Issues
$output += "`n[WINDOWS PERFORMANCE]"
$output += "-" * 20

# Check Windows services that commonly cause issues
$criticalServices = @("Spooler", "BITS", "Themes", "Windows Search")
foreach ($service in $criticalServices) {
    $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
    if ($svc) {
        $output += "$service Service: $($svc.Status)"
    }
}

# Check for pending reboots
$rebootPending = $false
$rebootReasons = @()

# Check various registry keys for pending reboot indicators
$rebootKeys = @(
    @{Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"; Name = "Windows Update"},
    @{Path = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"; Name = "Component Servicing"},
    @{Path = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"; Property = "PendingFileRenameOperations"; Name = "File Operations"}
)

foreach ($key in $rebootKeys) {
    try {
        if ($key.Property) {
            $value = Get-ItemProperty -Path $key.Path -Name $key.Property -ErrorAction Stop
            if ($value.$($key.Property)) {
                $rebootPending = $true
                $rebootReasons += $key.Name
            }
        } else {
            if (Test-Path $key.Path) {
                $rebootPending = $true
                $rebootReasons += $key.Name
            }
        }
    } catch {
        # Key doesn't exist, which is normal
    }
}

if ($rebootPending) {
    $output += "Reboot Pending: Yes ($($rebootReasons -join ', '))"
} else {
    $output += "Reboot Pending: No"
}

# Check page file usage
try {
    $pageFile = Get-WmiObject -Class Win32_PageFileUsage
    if ($pageFile -and $pageFile.AllocatedBaseSize -gt 0) {
        $pageFileUsage = [math]::Round(($pageFile.CurrentUsage / $pageFile.AllocatedBaseSize) * 100, 2)
        $output += "Page File Usage: $($pageFile.CurrentUsage) MB / $($pageFile.AllocatedBaseSize) MB ($pageFileUsage%)"
    } elseif ($pageFile) {
        $output += "Page File Usage: $($pageFile.CurrentUsage) MB (unable to calculate percentage)"
    }
} catch {
    $output += "Could not retrieve page file information"
}
#endregion

#region Event Log Analysis
if ($DetailedOutput) {
    $output += "`n[RECENT ERROR EVENTS]"
    $output += "-" * 20
    
    # Check for recent errors
    try {
        $recentErrors = Get-EventLog -LogName System -EntryType Error -Newest 10 -ErrorAction SilentlyContinue
        if ($recentErrors) {
            foreach ($error in $recentErrors) {
                if ($error.Message) {
                    $messageLength = [Math]::Min(100, $error.Message.Length)
                    $truncatedMessage = $error.Message.Substring(0, $messageLength)
                    $output += "$($error.TimeGenerated) - $($error.Source): ${truncatedMessage}..."
                } else {
                    $output += "$($error.TimeGenerated) - $($error.Source): (No message available)"
                }
            }
        } else {
            $output += "No recent system errors found"
        }
    } catch {
        $output += "Could not retrieve event log information"
    }
}
#endregion

#region Startup Analysis
$output += "`n[STARTUP ANALYSIS]"
$output += "-" * 20

# Get startup programs
$startupItems = $null
try {
    $startupItems = Get-WmiObject -Class Win32_StartupCommand | Select-Object Name, Command, Location
    if ($startupItems) {
        $output += "Startup Items Count: $(@($startupItems).Count)"
        
        if ($DetailedOutput) {
            $output += "Startup Items:"
            foreach ($item in $startupItems) {
                $output += "  $($item.Name) - $($item.Location)"
            }
        }
    } else {
        $output += "Startup Items Count: 0"
    }
} catch {
    $output += "Could not enumerate startup items"
}

# Check boot time
try {
    $bootTime = Get-WmiObject -Class Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime
    $bootDateTime = [Management.ManagementDateTimeConverter]::ToDateTime($bootTime)
    $uptime = (Get-Date) - $bootDateTime
    $output += "System Uptime: $($uptime.Days) days, $($uptime.Hours) hours, $($uptime.Minutes) minutes"
} catch {
    $output += "Could not determine system uptime"
}
#endregion

# Performance recommendations
$output += "`n[RECOMMENDATIONS]"
$output += "-" * 20

$recommendations = @()

# Memory recommendations
if ($null -ne $availableMemoryGB -and $null -ne $memoryGB -and $memoryGB -gt 0) {
    $memUsedPercent = (1 - ($availableMemoryGB / $memoryGB)) * 100
    if ($memUsedPercent -gt 80) {
        $recommendations += "HIGH MEMORY USAGE: Consider increasing RAM allocation ($([math]::Round($memUsedPercent, 1))% used)"
    }
}

# CPU recommendations
if ($null -ne $cpuUsageAvg -and $cpuUsageAvg.Average -gt 80) {
    $recommendations += "HIGH CPU USAGE: Check for resource-intensive processes ($([math]::Round($cpuUsageAvg.Average, 1))% avg)"
}

# Disk recommendations
if ($null -ne $avgDiskQueue -and $avgDiskQueue -gt 2) {
    $recommendations += "HIGH DISK QUEUE: Storage performance may be limiting application startup (Queue: $([math]::Round($avgDiskQueue, 2)))"
}

# Startup recommendations
if ($null -ne $startupItems -and @($startupItems).Count -gt 20) {
    $recommendations += "MANY STARTUP ITEMS: Consider disabling unnecessary startup programs ($(@($startupItems).Count) items)"
}

if ($recommendations.Count -eq 0) {
    $output += "No immediate performance issues detected"
} else {
    foreach ($rec in $recommendations) {
        $output += "! $rec"
    }
}

# Output results
$output -join "`n" | Tee-Object -FilePath $OutputPath
Write-Host "`nDiagnostic report saved to: $OutputPath" -ForegroundColor Green

# Performance monitoring function
function Start-PerformanceMonitoring {
    param([int]$DurationSeconds = 60)
    
    Write-Host "`nStarting performance monitoring for $DurationSeconds seconds..." -ForegroundColor Green
    Write-Host "Launch your slow application now..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop monitoring early" -ForegroundColor Gray
    
    $startTime = Get-Date
    $samples = @()
    $interrupted = $false
    
    # Set up trap for Ctrl+C
    trap {
        Write-Host "`nMonitoring interrupted by user" -ForegroundColor Yellow
        $interrupted = $true
        continue
    }
    
    try {
        while (((Get-Date) - $startTime).TotalSeconds -lt $DurationSeconds) {
            # Collect performance sample
            try {
                $cpuSample = Get-Counter "\Processor(_Total)\% Processor Time" -ErrorAction SilentlyContinue
                $memSample = Get-Counter "\Memory\Available MBytes" -ErrorAction SilentlyContinue
                $diskSample = Get-Counter "\PhysicalDisk(_Total)\Current Disk Queue Length" -ErrorAction SilentlyContinue
                
                $sample = [PSCustomObject]@{
                    Time = Get-Date
                    CPU = if ($cpuSample) { $cpuSample.CounterSamples[0].CookedValue } else { 0 }
                    AvailableMemoryMB = if ($memSample) { $memSample.CounterSamples[0].CookedValue } else { 0 }
                    DiskQueue = if ($diskSample) { $diskSample.CounterSamples[0].CookedValue } else { 0 }
                }
                $samples += $sample
                
                # Display current stats
                Write-Host "." -NoNewline
                
            } catch {
                Write-Host "!" -NoNewline -ForegroundColor Red
            }
            
            Start-Sleep -Seconds 2
        }
    } catch {
        $interrupted = $true
    }
    
    Write-Host "" # New line after dots
    
    if ($samples -and $samples.Count -gt 0) {
        Write-Host "`nPerformance Summary during monitoring period:" -ForegroundColor Green
        Write-Host "-" * 50
        
        try {
            $cpuValues = $samples | Where-Object { $_.CPU -ne $null } | Select-Object -ExpandProperty CPU
            $memValues = $samples | Where-Object { $_.AvailableMemoryMB -ne $null } | Select-Object -ExpandProperty AvailableMemoryMB
            $queueValues = $samples | Where-Object { $_.DiskQueue -ne $null } | Select-Object -ExpandProperty DiskQueue
            
            if ($cpuValues -and $cpuValues.Count -gt 0) {
                $monitorAvgCPU = [math]::Round(($cpuValues | Measure-Object -Average).Average, 2)
                $monitorMaxCPU = [math]::Round(($cpuValues | Measure-Object -Maximum).Maximum, 2)
                Write-Host "CPU Usage: Average: $monitorAvgCPU%, Maximum: $monitorMaxCPU%"
            } else {
                Write-Host "CPU Usage: No valid samples collected"
                $monitorMaxCPU = 0
            }
            
            if ($memValues -and $memValues.Count -gt 0) {
                $monitorMinMem = [math]::Round(($memValues | Measure-Object -Minimum).Minimum, 0)
                $monitorAvgMem = [math]::Round(($memValues | Measure-Object -Average).Average, 0)
                Write-Host "Available Memory: Minimum: $monitorMinMem MB, Average: $monitorAvgMem MB"
            } else {
                Write-Host "Available Memory: No valid samples collected"
                $monitorMinMem = 999999
            }
            
            if ($queueValues -and $queueValues.Count -gt 0) {
                $monitorMaxQueue = [math]::Round(($queueValues | Measure-Object -Maximum).Maximum, 2)
                $monitorAvgQueue = [math]::Round(($queueValues | Measure-Object -Average).Average, 2)
                Write-Host "Disk Queue: Average: $monitorAvgQueue, Maximum: $monitorMaxQueue"
            } else {
                Write-Host "Disk Queue: No valid samples collected"
                $monitorMaxQueue = 0
            }
        } catch {
            Write-Host "Error processing monitoring data: $_" -ForegroundColor Red
            $monitorMaxCPU = 0
            $monitorMinMem = 999999
            $monitorMaxQueue = 0
        }
        
        # Analysis
        Write-Host "`nAnalysis:" -ForegroundColor Yellow
        if ($monitorMaxCPU -gt 90) {
            Write-Host "! High CPU usage detected - may be causing slowness" -ForegroundColor Red
        }
        if ($monitorMinMem -lt 500) {
            Write-Host "! Low memory availability detected - may be causing slowness" -ForegroundColor Red
        }
        if ($monitorMaxQueue -gt 2) {
            Write-Host "! High disk queue detected - storage bottleneck likely" -ForegroundColor Red
        }
        if ($monitorMaxCPU -le 90 -and $monitorMinMem -ge 500 -and $monitorMaxQueue -le 2) {
            Write-Host "* No obvious performance bottlenecks detected during monitoring" -ForegroundColor Green
        }
    } else {
        Write-Host "`nNo performance samples collected" -ForegroundColor Red
    }
}

# If MonitorPerformance switch is used, run the monitoring function
if ($MonitorPerformance) {
    Start-PerformanceMonitoring -DurationSeconds $MonitorDuration
}

# Show instructions for using the monitoring function
Write-Host "`n" -NoNewline
Write-Host "=== USAGE INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run basic diagnostics:" -ForegroundColor Yellow
Write-Host "  .\VDI_Diagnostic.ps1" -ForegroundColor White
Write-Host ""
Write-Host "To run with detailed output:" -ForegroundColor Yellow
Write-Host "  .\VDI_Diagnostic.ps1 -DetailedOutput" -ForegroundColor White
Write-Host ""
Write-Host "To monitor performance during application startup:" -ForegroundColor Yellow
Write-Host "  .\VDI_Diagnostic.ps1 -MonitorPerformance -MonitorDuration 120" -ForegroundColor White
Write-Host ""
Write-Host "To use the monitoring function separately:" -ForegroundColor Yellow
Write-Host "  . .\VDI_Diagnostic.ps1" -ForegroundColor White
Write-Host "  Start-PerformanceMonitoring -DurationSeconds 120" -ForegroundColor White
Write-Host ""
Write-Host "Output file location: $OutputPath" -ForegroundColor Gray