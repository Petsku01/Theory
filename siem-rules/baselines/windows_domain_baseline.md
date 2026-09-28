# False Positive Baseline: Windows Domain Environment

Establishing what "normal" looks like before deploying detections.

## Why This Matters

Most detection rules fail in production because nobody baselined normal behavior first.

**Bad approach:** Deploy rule → Get flooded with alerts → Exclude everything → Miss real attacks

**Good approach:** Baseline first → Understand normal → Deploy with targeted exclusions → Catch real attacks

## Baseline Collection Queries

Run these BEFORE deploying detection rules.

### LSASS Access Baseline

Who normally touches LSASS in your environment?

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" 
  EventCode=10 TargetImage="*lsass.exe"
  earliest=-7d latest=now
| stats count 
        dc(Computer) as unique_hosts 
        values(Computer) as sample_hosts
        values(CallTrace) as call_traces
        by SourceImage, GrantedAccess
| sort - count
| head 50
```

**Expected legitimate entries:**
- `C:\Windows\System32\csrss.exe` - Window subsystem (ignore)
- `C:\Windows\System32\svchost.exe` - Only with specific CallTrace (see tuning guide)
- EDR/AV binaries - Add to exclusion list
- SCCM/Intune agent - Add to exclusion list

**Red flags in baseline:**
- Any process from `C:\Users\*`
- Any process from `C:\Temp\*` or `C:\Windows\Temp\*`
- rundll32.exe, regsvr32.exe, powershell.exe

### PowerShell Execution Baseline

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"
  EventCode=1 Image="*powershell*"
  earliest=-7d latest=now
| rex field=CommandLine "(?<encoding_flag>-[eE][nN][cC][oO]?[dD]?[eE]?[dD]?[cC]?[oO]?[mM]?[mM]?[aA]?[nN]?[dD]?)"
| eval encoded = if(isnotnull(encoding_flag), "yes", "no")
| stats count 
        dc(Computer) as hosts
        dc(User) as users
        values(ParentImage) as parent_processes
        by encoded
```

**What you'll find:**
- SCCM deployments often use `-EncodedCommand`
- DSC uses encoded PS legitimately
- Intune remediation scripts use encoding

Document these parent processes and exclude in your rule.

### Scheduled Task Baseline

```spl
index=windows sourcetype="WinEventLog:Security" EventCode=4698
  earliest=-7d latest=now
| spath input=TaskContent output=command path=Actions.Exec.Command
| spath input=TaskContent output=args path=Actions.Exec.Arguments
| stats count 
        dc(Computer) as hosts
        values(Computer) as sample_hosts
        by TaskName, command, SubjectUserName
| sort - count
```

**Expected legitimate:**
- Microsoft\Windows\* paths
- SCCM and Intune tasks
- Backup software (Veeam, Commvault)
- Monitoring agents

**Suspicious patterns to flag:**
- Tasks created by regular users (not SYSTEM or admin accounts)
- Tasks pointing to user directories
- Tasks with obfuscated names

### Network Connection Baseline

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"
  EventCode=3 
  earliest=-7d latest=now
| where NOT cidrmatch("10.0.0.0/8", DestinationIp) AND 
        NOT cidrmatch("172.16.0.0/12", DestinationIp) AND
        NOT cidrmatch("192.168.0.0/16", DestinationIp)
| stats count 
        dc(Computer) as hosts
        dc(DestinationIp) as unique_destinations
        values(DestinationPort) as ports
        by Image
| sort - count
| head 50
```

**Document and whitelist:**
- Your EDR cloud endpoints
- Microsoft update servers
- Your SaaS applications
- Browser processes (Chrome, Firefox, Edge)

### Service Installation Baseline

```spl
index=windows sourcetype="WinEventLog:System" EventCode=7045
  earliest=-7d latest=now
| stats count 
        dc(Computer) as hosts
        values(Computer) as sample_hosts
        by ServiceName, ImagePath, ServiceType
| sort - count
```

**Legitimate software that installs services:**
- Windows Updates
- SCCM/Intune
- EDR products
- Backup software
- Print drivers

## Baseline Documentation Template

For each rule you deploy, document:

| Rule Name | Baseline Date | Normal FP Rate | Exclusions Applied | Validation Date |
|-----------|---------------|----------------|---------------------|-----------------|
| lsass_memory_access | 2024-01-15 | 50/day | EDR, SCCM | 2024-01-22 |
| encoded_powershell | 2024-01-15 | 200/day | SCCM, DSC | 2024-01-22 |
| scheduled_task_creation | 2024-01-15 | 20/day | Windows native | 2024-01-22 |

## Re-Baseline Triggers

Run baseline queries again when:

1. New software deployed (EDR, monitoring, backup)
2. Major Windows updates
3. Infrastructure changes (new DCs, servers)
4. Detection rule shows sudden FP spike
5. Every 90 days as maintenance

## Minimum Baseline Period

- 7 days: Catches daily business patterns
- 14 days: Better, catches bi-weekly processes  
- 30 days: Best, catches monthly tasks (patching, reporting)

Start with 7-day baseline, extend if you see obvious gaps.
