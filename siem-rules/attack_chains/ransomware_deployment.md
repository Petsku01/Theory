# Attack Chain: Ransomware Deployment

Pre-encryption behavior that gives you time to respond.

## Kill Chain (Time-Critical)

```
Ransomware typically follows this pattern with ~30-60 minute window:

[Discovery]──►[Credential Theft]──►[Lateral Movement]──►[Inhibit Recovery]──►[Encryption]
  5-10 min        10-15 min           15-30 min            5 min               START
                                                              ▲
                                                              │
                                                    LAST CHANCE TO STOP
```

## Critical Detection: Pre-Encryption Indicators

### Shadow Copy Deletion (YOU HAVE 5 MINUTES)

This is your final warning before encryption starts:

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1
  (
    (Image="*vssadmin*" CommandLine="*delete*shadows*") OR
    (Image="*wmic*" CommandLine="*shadowcopy*delete*") OR
    (Image="*bcdedit*" (CommandLine="*recoveryenabled*no*" OR 
                        CommandLine="*bootstatuspolicy*ignoreallfailures*")) OR
    (Image="*wbadmin*" CommandLine="*delete*catalog*")
  )
| eval urgency="CRITICAL - ENCRYPTION IMMINENT"
| eval response="ISOLATE HOST IMMEDIATELY"
```

### Service Stopping (10-15 MINUTES REMAINING)

Ransomware stops backup and database services:

```spl
index=windows sourcetype="WinEventLog:System" EventCode=7036
  (param1="*SQL*" OR param1="*Exchange*" OR param1="*Veeam*" OR 
   param1="*Backup*" OR param1="*Shadow*" OR param1="*Volume Shadow*")
  param2="stopped"
| bucket _time span=5m
| stats count as services_stopped values(param1) as services by _time, Computer
| where services_stopped >= 3
| eval urgency="HIGH - Pre-encryption service kill"
```

### Mass File Modification (ENCRYPTION IN PROGRESS)

Too late to prevent, but isolate to contain:

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=11
| bucket _time span=1m
| stats dc(TargetFilename) as unique_files by _time, Computer, Image
| where unique_files > 100
| eval urgency="CRITICAL - ACTIVE ENCRYPTION"
| eval response="NETWORK ISOLATION - PULL CABLE IF NECESSARY"
```

## Pre-Cursor Detection (Hours Before Encryption)

### Reconnaissance Phase

```spl
index=windows source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1
| search 
  (Image="*net.exe" CommandLine="*view*" OR CommandLine="*group*domain*") OR
  (Image="*nltest*" CommandLine="*dclist*") OR
  (Image="*adfind*") OR
  (Image="*bloodhound*" OR Image="*sharphound*") OR
  (Image="*ping*" AND CommandLine="*-n*1*")
| bucket _time span=5m
| stats count dc(CommandLine) as unique_commands values(CommandLine) as commands 
  by _time, Computer, User
| where unique_commands > 3
```

### Credential Access Phase

See: [lsass_memory_access.yaml](../Sigma_rules/credential_access/lsass_memory_access.yaml)

### Lateral Movement Phase

```spl
index=windows 
  (
    (sourcetype="WinEventLog:Security" EventCode=4624 LogonType=3) OR
    (source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1 
     Image IN ("*PSEXESVC*", "*mstsc.exe*", "*wmic.exe*"))
  )
| bucket _time span=1h
| stats dc(Computer) as unique_targets count by _time, User
| where unique_targets > 5
```

## Full Attack Chain Correlation

```spl
| tstats count where index=windows by _time, host, source span=5m
| append 
  [| search index=windows earliest=-4h
   | eval detection_type = case(
       EventCode=1 AND match(CommandLine, "(?i)(net|adfind|bloodhound)"), "recon",
       EventCode=10 AND match(TargetImage, "lsass"), "credential_access",
       EventCode=4624 AND LogonType=3, "lateral_movement",
       EventCode=7036 AND match(param1, "(?i)(sql|backup|veeam)"), "service_kill",
       EventCode=1 AND match(CommandLine, "(?i)(vssadmin|bcdedit).*delete"), "recovery_inhibit",
       EventCode=11, "file_modify",
       1=1, null()
   )
   | where isnotnull(detection_type)
   | stats earliest(_time) as first_seen 
           latest(_time) as last_seen 
           count as event_count 
           by detection_type, Computer, User]

| stats values(detection_type) as kill_chain_stages
        sum(event_count) as total_events
        min(first_seen) as attack_start
        max(last_seen) as latest_activity
        by Computer, User

| eval stages_hit = mvcount(kill_chain_stages)
| where stages_hit >= 3

| eval time_span = latest_activity - attack_start
| eval severity = case(
    match(kill_chain_stages, "recovery_inhibit"), "CRITICAL",
    stages_hit >= 4, "HIGH",
    stages_hit >= 3, "MEDIUM",
    1=1, "LOW"
)

| table Computer, User, kill_chain_stages, total_events, 
        time_span, attack_start, severity
| sort - severity
```

## Automated Response Playbook

### When service_kill OR recovery_inhibit detected:

1. **Immediate (automated if possible):**
   - Firewall rule to block host from SMB (ports 445, 139)
   - Disable user account
   - Send page to on-call

2. **Within 5 minutes:**
   - SSH/RDP to host and run `shutdown /s /f /t 0`
   - If unable to reach, physical isolation

3. **Within 15 minutes:**
   - Identify all hosts with same user sessions
   - Quarantine those hosts
   - Check for lateral movement artifacts

4. **Within 1 hour:**
   - Full forensic triage of patient zero
   - Map all accessed file shares
   - Check backup integrity

## Testing

Simulate without actual encryption using Atomic Red Team:

```powershell
# Service enumeration
Invoke-AtomicTest T1007 -TestNumbers 1

# Shadow copy query (safe - just lists)
Invoke-AtomicTest T1490 -TestNumbers 7

# NOTE: Do NOT run shadow deletion tests in production
```
