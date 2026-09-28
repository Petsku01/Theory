# Attack Chain: Initial Access to Domain Compromise

This detection chain correlates multiple stages of a typical intrusion.

## Chain Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Initial Access │────►│ Credential Access│────►│Lateral Movement │
│  (0-1 hours)    │     │  (1-4 hours)     │     │  (4-24 hours)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Office macro    │     │ LSASS access     │     │ PsExec/WMI      │
│ Encoded PS      │     │ Mimikatz         │     │ RDP from new IP │
│ Download cradle │     │ DCSync           │     │ Service install │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Stage 1: Initial Access Detection

**Time Window:** First hour after initial alert

### Trigger Rules
- `encoded_powershell.yaml` (with suspicious parent)
- `powershell_download_cradle.yaml`

### Enrichment Queries (Splunk)

```spl
| search index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"
  earliest=-1h latest=now
  (EventCode=1 OR EventCode=11)
  Computer="$affected_host$"
| eval event_type = case(
    EventCode=1, "process_create",
    EventCode=11, "file_create"
)
| stats values(Image) as processes 
        values(TargetFilename) as files_created
        values(CommandLine) as commands
        by Computer, User
```

## Stage 2: Credential Access Detection

**Time Window:** 1-4 hours after Stage 1

### Trigger Rules
- `lsass_memory_access.yaml`
- `dcsync_attack.yaml`
- `kerberoasting_detection.yaml`

### Correlation Logic

If Stage 1 triggered on host X, look for:

```spl
| search index=windows 
  earliest=-4h latest=now
  Computer="$stage1_host$"
  (
    (source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=10 
     TargetImage="*lsass.exe") OR
    (sourcetype="WinEventLog:Security" EventCode=4662 
     Properties="*1131f6aa*" OR Properties="*1131f6ad*") OR
    (sourcetype="WinEventLog:Security" EventCode=4769 
     TicketEncryptionType="0x17")
  )
| eval technique = case(
    EventCode=10, "LSASS Access",
    EventCode=4662, "DCSync",
    EventCode=4769, "Kerberoasting"
)
| stats count by technique, SourceImage, SubjectUserName
```

## Stage 3: Lateral Movement Detection

**Time Window:** 4-24 hours after Stage 2

### Trigger Rules
- `psexec_execution.yaml`
- `lateral_movement_detection.spl`

### Correlation Logic

Track the compromised user across the network:

```spl
| search index=windows 
  earliest=-24h latest=now
  User="$compromised_user$"
  (
    (sourcetype="WinEventLog:Security" EventCode=4624 LogonType IN (3,10)) OR
    (source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1 
     Image="*PSEXESVC*")
  )
| stats dc(Computer) as unique_hosts 
        values(Computer) as hosts_accessed
        count as login_count
        by User, LogonType
| where unique_hosts > 2
```

## Combined Attack Chain Query

Full correlation across all stages:

```spl
| multisearch
  [| search index=windows earliest=-24h
     source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1
     (CommandLine="*-enc*" OR CommandLine="*DownloadString*" OR 
      CommandLine="*IEX*" OR CommandLine="*Invoke-Expression*")
   | eval stage=1, technique="Initial Access"]
   
  [| search index=windows earliest=-24h
     source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=10
     TargetImage="*lsass.exe"
     GrantedAccess IN ("0x1010","0x1438","0x143a","0x1fffff")
   | eval stage=2, technique="Credential Access"]
   
  [| search index=windows earliest=-24h
     (source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" 
      EventCode=1 Image="*PSEXESVC*") OR
     (sourcetype="WinEventLog:Security" EventCode=4624 LogonType=3)
   | eval stage=3, technique="Lateral Movement"]

| sort _time
| streamstats current=f last(_time) as prev_time last(Computer) as prev_host 
  last(stage) as prev_stage by User
| eval time_diff = _time - prev_time
| eval chain_detected = if(stage > prev_stage AND time_diff < 86400, 1, 0)

| stats sum(chain_detected) as chain_score
        values(technique) as techniques
        values(Computer) as affected_hosts
        min(_time) as first_activity
        max(_time) as last_activity
        by User
        
| where chain_score >= 2
| eval severity = case(
    chain_score >= 3, "CRITICAL - Full Attack Chain",
    chain_score >= 2, "HIGH - Partial Chain",
    1=1, "MEDIUM"
)
```

## Response Actions

### Stage 1 Detected
1. Isolate endpoint from network
2. Collect memory dump
3. Pull Sysmon/Security logs for last 24h
4. Search for same file hash across environment

### Stage 2 Detected
1. Disable affected user account
2. Rotate service account passwords
3. Check for new service accounts created
4. Review krbtgt password age

### Stage 3 Detected
1. Identify all accessed systems
2. Check for persistence on each
3. Review scheduled tasks and services
4. Consider domain-wide password reset

## Testing This Chain

Use Atomic Red Team to simulate:

```bash
# Stage 1: Download cradle
Invoke-AtomicTest T1059.001 -TestNumbers 1

# Stage 2: LSASS access
Invoke-AtomicTest T1003.001 -TestNumbers 1

# Stage 3: PsExec
Invoke-AtomicTest T1021.002 -TestNumbers 1
```
