# VDI Performance Diagnostic Script

A  PowerShell diagnostic tool for troubleshooting performance issues in Virtual Desktop Infrastructure (VDI) environments, with specific support for Citrix environments.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Parameters](#parameters)
- [Output](#output)
- [Monitoring Mode](#monitoring-mode)
- [Detected Issues](#detected-issues)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

This script provides systematic diagnostics for VDI performance issues, helping IT  quickly identify bottlenecks affecting application startup times and overall system performance in virtual desktop environments.

## Features

- **System Resource Analysis** - CPU, Memory, Disk, Network metrics
- **Process Analysis** - Top resource consumers identification
- **Citrix/VDI Detection** - Environment-specific diagnostics
- **Windows Health Checks** - Services, pending reboots, page file
- **Real-Time Monitoring** - Performance tracking during issue reproduction
- **Intelligent Recommendations** - Actionable solutions based on findings
- **Comprehensive Error Handling** - Safe execution with detailed error reporting
- **Event Log Analysis** - Historical error investigation
- **Startup Program Analysis** - Boot time and startup item evaluation

## Requirements

- Windows PowerShell 5.1 or PowerShell 7+
- Windows 7/Server 2008 R2 or later
- Administrator privileges (recommended)
- 10MB free disk space for reports

## Installation

1. Download `VDI_Diagnostic.ps1` to your target system
2. Open PowerShell as Administrator
3. Navigate to the script directory
4. If needed, adjust execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```

## Usage

### Basic Diagnostic
```powershell
.\VDI_Diagnostic.ps1
```

### Detailed Analysis with Event Logs
```powershell
.\VDI_Diagnostic.ps1 -DetailedOutput
```

### Real-Time Performance Monitoring
```powershell
.\VDI_Diagnostic.ps1 -MonitorPerformance -MonitorDuration 120
```

### Custom Output Location
```powershell
.\VDI_Diagnostic.ps1 -OutputPath "D:\Reports\VDI_Report.txt"
```

### Full Analysis
```powershell
.\VDI_Diagnostic.ps1 -DetailedOutput -MonitorPerformance -MonitorDuration 180 -OutputPath "C:\Diagnostics\Full_Report.txt"
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `OutputPath` | String | `C:\temp\VDI_Diagnostics.txt` | Report file location |
| `DetailedOutput` | Switch | `$false` | Include event logs and detailed startup items |
| `MonitorPerformance` | Switch | `$false` | Enable real-time monitoring mode |
| `MonitorDuration` | Integer | `60` | Monitoring duration in seconds (1-3600) |

## Output

The script generates a structured report containing:

```
VDI Performance Diagnostic Report - [Timestamp]
============================================================

[SYSTEM RESOURCES]
- Physical memory status
- CPU utilization
- Core count

[DISK PERFORMANCE]  
- Drive capacity and free space
- Disk queue length metrics

[NETWORK PERFORMANCE]
- Active adapters and speeds
- Connectivity test results
- Latency measurements

[PROCESS ANALYSIS]
- Top 10 CPU consumers
- Top 10 memory consumers

[CITRIX ENVIRONMENT]
- Session detection
- Citrix process enumeration
- Published application count

[WINDOWS PERFORMANCE]
- Critical service status
- Pending reboot detection
- Page file utilization

[STARTUP ANALYSIS]
- Startup item count
- System uptime
- Detailed item list (if DetailedOutput)

[RECOMMENDATIONS]
- Specific actions based on findings
```

## Monitoring Mode

The MonitorPerformance feature provides real-time diagnostics:

1. Script begins monitoring system metrics
2. User reproduces the performance issue
3. Script collects samples every 2 seconds
4. Analysis identifies the bottleneck

### Monitored Metrics
- CPU usage (average and peak)
- Available memory (minimum and average)
- Disk queue length (average and maximum)

### Sample Output
```
Starting performance monitoring for 120 seconds...
Launch your slow application now...
Press Ctrl+C to stop monitoring early
....................

Performance Summary during monitoring period:
--------------------------------------------------
CPU Usage: Average: 45.2%, Maximum: 92.1%
Available Memory: Minimum: 234 MB, Average: 512 MB
Disk Queue: Average: 3.2, Maximum: 8.5

Analysis:
! High CPU usage detected - may be causing slowness
! High disk queue detected - storage bottleneck likely
```

## Detected Issues

| Issue | Detection Threshold | Recommendation |
|-------|-------------------|----------------|
| Memory Exhaustion | >80% used | Increase RAM allocation |
| CPU Saturation | >80% average | Check resource-intensive processes |
| Disk Bottleneck | Queue >2 | Review storage performance |
| Excessive Startup Items | >20 items | Disable unnecessary programs |
| Pending Reboots | Registry flags | Schedule system restart |
| Service Issues | Service stopped | Start/restart affected service |
| Page File Thrashing | High usage | Increase page file size |

## Troubleshooting

### Script Won't Run
```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Verify execution policy
Get-ExecutionPolicy

# Run as Administrator
Start-Process PowerShell -Verb RunAs
```

### Incomplete Results
- Ensure running as Administrator for full WMI access
- Check if antivirus is blocking PowerShell operations
- Verify Windows Performance Counters are functional:
  ```powershell
  Get-Counter -ListSet * | Select-Object -First 5
  ```

### No Issues Detected But System Still Slow
Consider these possibilities:
- Server-side resource constraints
- Network infrastructure issues
- User profile corruption
- Application-specific problems
- GPU/graphics acceleration issues

### Performance Counter Errors
```powershell
# Rebuild performance counters
lodctr /R
winmgmt /resyncperf
```

## Advanced Usage

### Scheduled Diagnostics
Create a scheduled task for regular health checks:
```powershell
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\VDI_Diagnostic.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "VDI Health Check" -Action $Action -Trigger $Trigger -RunLevel Highest
```

### Remote Execution
For remote diagnostics (requires appropriate permissions):
```powershell
Invoke-Command -ComputerName "VDI-HOST-01" -FilePath ".\VDI_Diagnostic.ps1"
```

### Batch Processing
Diagnose multiple systems:
```powershell
$Computers = @("VDI-01", "VDI-02", "VDI-03")
foreach ($Computer in $Computers) {
    Copy-Item ".\VDI_Diagnostic.ps1" -Destination "\\$Computer\C$\Temp\"
    Invoke-Command -ComputerName $Computer -ScriptBlock {
        & "C:\Temp\VDI_Diagnostic.ps1" -OutputPath "C:\Temp\$env:COMPUTERNAME-Diagnostic.txt"
    }
}
```

## Sample Report Output

```
VDI Performance Diagnostic Report - 2024-12-20 10:30:45
============================================================

[SYSTEM RESOURCES]
--------------------
Total Physical Memory: 8.00 GB
Available Memory: 1.52 GB
CPU: Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz
CPU Cores: 4
CPU Usage (avg): 67.23%

[DISK PERFORMANCE]
--------------------
Drive C: - Total: 119.24 GB, Free: 15.67 GB (13.15%)
Average Disk Queue Length: 3.45 (Should be < 2 per disk)

[RECOMMENDATIONS]
--------------------
! HIGH MEMORY USAGE: Consider increasing RAM allocation (81.0% used)
! HIGH DISK QUEUE: Storage performance may be limiting application startup (Queue: 3.45)
```

## Error Handling Features

- **Null Safety**: All object references checked before access
- **Protected Loops**: All foreach loops validate collections exist
- **Division Protection**: Prevents division by zero errors
- **Try-Catch Blocks**: Comprehensive error handling throughout
- **Graceful Degradation**: Continues execution even if subsystems fail
- **Detailed Error Messages**: Specific error context in all catch blocks
- **Parameter Validation**: Input validation prevents invalid parameters

## Performance Impact

The script itself has minimal performance impact:
- CPU: <2% average during execution
- Memory: <50MB PowerShell process
- Disk: Minimal I/O for report writing
- Network: Only for ping tests (if enabled)
- Duration: 15-30 seconds (basic), 60+ seconds (monitoring mode)

## Best Practices

1. **Run as Administrator** for complete diagnostics
2. **Use Monitoring Mode** when reproducing specific issues
3. **Save Reports** for trend analysis and comparison
4. **Run During Issues** for most relevant data
5. **Review Recommendations First** before analyzing raw data
6. **Schedule Regular Checks** in problematic environments
7. **Compare Multiple Reports** to identify patterns

## Limitations

- Cannot detect network issues beyond the local endpoint
- Does not analyze application-specific logs
- Cannot diagnose GPU/graphics acceleration issues
- Limited to Windows performance metrics
- Requires local execution (no agentless remote diagnostics)
- Does not modify or fix issues (diagnostic only)


## Author -pk

VDI Performance Diagnostic Script - Enterprise VDI Troubleshooting Tool

## Version 

### v1.0.2 (Current)
- Initial release with comprehensive safety improvements
- Complete error handling and null safety
- Protected foreach loops and array operations
- Enhanced error messages with context
- Parameter validation and admin detection
- Maximum sample limits in monitoring
- Safe division operations

### Planned Features
- HTML report output option
- Email report capability
- Historical comparison mode
- GPU diagnostics
- Network path analysis
- Application-specific modules


## Quick Reference Card

| Command | Purpose |
|---------|---------|
| `.\VDI_Diagnostic.ps1` | Quick health check |
| `.\VDI_Diagnostic.ps1 -DetailedOutput` | Full analysis with events |
| `.\VDI_Diagnostic.ps1 -MonitorPerformance` | 60-second monitoring |
| `.\VDI_Diagnostic.ps1 -MonitorPerformance -MonitorDuration 300` | 5-minute monitoring |
| `Get-Help .\VDI_Diagnostic.ps1 -Full` | Complete parameter help |

