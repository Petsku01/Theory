# Atomic Red Team Test Mapping

Each detection rule linked to specific ART tests for validation.

## Usage

```powershell
# Install Atomic Red Team
IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing)
Install-AtomicRedTeam -getAtomics

# Run a specific test
Import-Module "C:\AtomicRedTeam\invoke-atomicredteam\Invoke-AtomicRedTeam.psd1"
Invoke-AtomicTest T1003.001 -TestNumbers 1
```

## Credential Access Rules

### lsass_memory_access.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1003.001-1 | Dump LSASS with Mimikatz | Yes - GrantedAccess 0x1FFFFF |
| T1003.001-2 | Dump LSASS with comsvcs.dll | Yes - MiniDump CallTrace |
| T1003.001-6 | ProcDump | Yes - GrantedAccess 0x1010 |
| T1003.001-7 | Windows Credential Editor | Yes - wce.exe |

**Test command:**
```powershell
# Safe test - just probes LSASS, doesn't dump
Invoke-AtomicTest T1003.001 -TestNumbers 2 -GetPrereqs
Invoke-AtomicTest T1003.001 -TestNumbers 2

# Check if detection fired
# Look for Sysmon Event 10 targeting lsass.exe within 60 seconds
```

**Cleanup:**
```powershell
Invoke-AtomicTest T1003.001 -TestNumbers 2 -Cleanup
```

### dcsync_attack.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1003.006-1 | DCSync with Mimikatz | Yes - 4662 with replication GUIDs |
| T1003.006-2 | DCSync with secretsdump | Yes |

**WARNING:** Only run on lab domain controller!

```powershell
# This WILL trigger detection - run on test DC only
Invoke-AtomicTest T1003.006 -TestNumbers 1
```

### kerberoasting_detection.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1558.003-1 | Rubeus kerberoast | Yes - 4769 with RC4 encryption |
| T1558.003-2 | GetUserSPNs.py | Yes |

```powershell
Invoke-AtomicTest T1558.003 -TestNumbers 1
```

## Execution Rules

### encoded_powershell.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1059.001-1 | PowerShell -EncodedCommand | Yes - enc flag in CommandLine |
| T1059.001-6 | PowerShell Download | Yes - download cradle patterns |

```powershell
# Safe encoded test (just runs whoami)
Invoke-AtomicTest T1059.001 -TestNumbers 1

# Download cradle test
Invoke-AtomicTest T1059.001 -TestNumbers 6
```

### powershell_download_cradle.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1105-1 | certutil download | Yes - certutil -urlcache |
| T1105-3 | PowerShell download | Yes - DownloadString |

```powershell
Invoke-AtomicTest T1105 -TestNumbers 1,3
```

## Persistence Rules

### scheduled_task_creation.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1053.005-1 | schtasks at logon | Yes - 4698 event |
| T1053.005-2 | schtasks at boot | Yes |
| T1053.005-5 | PowerShell scheduled task | Yes |

```powershell
Invoke-AtomicTest T1053.005 -TestNumbers 1

# Cleanup after testing
Invoke-AtomicTest T1053.005 -TestNumbers 1 -Cleanup
```

### registry_run_keys.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1547.001-1 | reg.exe Run key add | Yes - Sysmon 13 |
| T1547.001-2 | PowerShell Run key | Yes |

```powershell
Invoke-AtomicTest T1547.001 -TestNumbers 1,2

# Cleanup
Invoke-AtomicTest T1547.001 -TestNumbers 1,2 -Cleanup
```

## Defense Evasion Rules

### event_log_cleared.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1070.001-1 | wevtutil clear-log | Yes - 1102 event |
| T1070.001-2 | PowerShell Clear-EventLog | Yes |

**WARNING:** This clears actual logs. Run in lab only.

```powershell
# Creates a new test log to clear (safer)
Invoke-AtomicTest T1070.001 -TestNumbers 1
```

## Lateral Movement Rules

### psexec_execution.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1021.002-1 | PsExec command execution | Yes - PSEXESVC |
| T1021.002-2 | Remote service creation | Yes - sc.exe remote |

```powershell
# Requires network access to target
Invoke-AtomicTest T1021.002 -TestNumbers 1 -InputArgs @{target_host="TARGET-PC"}
```

## Impact Rules

### vss_deletion.yaml

| ART Test ID | Test Name | Expected Detection |
|-------------|-----------|-------------------|
| T1490-1 | vssadmin delete shadows | Yes |
| T1490-2 | wmic shadowcopy delete | Yes |

**WARNING:** Actually deletes shadow copies. Lab only!

```powershell
# Query only (safe)
vssadmin list shadows

# Delete (DESTRUCTIVE - lab only)
Invoke-AtomicTest T1490 -TestNumbers 1
```

## Test Result Template

Document test results:

| Date | Rule | ART Test | Detected | Notes |
|------|------|----------|----------|-------|
| 2024-01-15 | lsass_memory_access | T1003.001-2 | Yes | 15 sec to alert |
| 2024-01-15 | encoded_powershell | T1059.001-1 | Yes | Triggered correctly |
| 2024-01-15 | dcsync_attack | T1003.006-1 | Yes | Lab DC only |

## Validation Schedule

- Initial deployment: Test all mapped rules
- Monthly: Re-test critical rules (credential access, defense evasion)
- After rule changes: Re-test affected rules
- After Sysmon config changes: Re-test all rules
