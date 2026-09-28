# Detection Coverage

Honest inventory of detection rules in this repository.

## Sigma Rules

### Credential Access (TA0006)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1003.001 LSASS Memory | [lsass_memory_access.yaml](../Sigma_rules/credential_access/lsass_memory_access.yaml) | Test | Medium - requires CallTrace tuning |
| T1003.006 DCSync | [dcsync_attack.yaml](../Sigma_rules/credential_access/dcsync_attack.yaml) | Test | Low - update DC filter for your environment |
| T1558.003 Kerberoasting | [kerberoasting_detection.yaml](../Sigma_rules/credential_access/kerberoasting_detection.yaml) | Test | Medium - legacy apps use RC4 |

### Execution (TA0002)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1059.001 PowerShell | [encoded_powershell.yaml](../Sigma_rules/execution/encoded_powershell.yaml) | Test | Medium - SCCM uses encoded commands |
| T1059.001 PowerShell | [powershell_download_cradle.yaml](../Sigma_rules/execution/powershell_download_cradle.yaml) | Test | Low - focus on IEX+download combo |

### Persistence (TA0003)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1053.005 Scheduled Task | [scheduled_task_creation.yaml](../Sigma_rules/persistence/scheduled_task_creation.yaml) | Test | High - needs environment tuning |
| T1547.001 Registry Run Keys | [registry_run_keys.yaml](../Sigma_rules/persistence/registry_run_keys.yaml) | Test | High - legitimate software uses these |

### Defense Evasion (TA0005)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1070.001 Log Clearing | [event_log_cleared.yaml](../Sigma_rules/defense_evasion/event_log_cleared.yaml) | Stable | Very Low |
| T1564.004 ADS Execution | [EADS.yaml](../Sigma_rules/EADS.yaml) | Test | Medium - colon in paths causes FPs |

### Lateral Movement (TA0008)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1021.002 SMB/PsExec | [psexec_execution.yaml](../Sigma_rules/lateral_movement/psexec_execution.yaml) | Test | Low - PsExec is distinctive |

### Impact (TA0040)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1490 VSS Deletion | [vss_deletion.yaml](../Sigma_rules/impact/vss_deletion.yaml) | Stable | Very Low - ransomware indicator |

### Command and Control (TA0011)

| Technique | Rule | Status | FP Rate |
|-----------|------|--------|---------|
| T1071.004 DNS Tunneling | [dns_tunneling.yaml](../Sigma_rules/network/dns_tunneling.yaml) | Test | Medium - CDNs use long names |
| T1071.001 Beaconing | [suspicious_beaconing.yaml](../Sigma_rules/network/suspicious_beaconing.yaml) | Test | High - requires tuning |

## Legacy Rules (Need Review)

These existed before restructuring - validation status:

| File | Purpose | Status | Action |
|------|---------|--------|--------|
| DMSS.yaml | Rogue antivirus detection | Reviewed - experimental | Usable but high FP |
| EADS.yaml | NTFS ADS execution | Fixed | Ready to test |
| pmcd.yaml | Unknown | Needs review | Check content |
| socm.yaml | Unknown | Needs review | Check content |
| SPCE.yaml | Unknown | Needs review | Check content |

## Splunk Queries

| File | Purpose | Status |
|------|---------|--------|
| [credential_theft_detection.spl](../Splunk_queries/detection/credential_theft_detection.spl) | Multi-technique credential theft | Test |
| [ransomware_behavior.spl](../Splunk_queries/detection/ransomware_behavior.spl) | Ransomware indicators with risk scoring | Test |
| [lateral_movement_detection.spl](../Splunk_queries/detection/lateral_movement_detection.spl) | PsExec/WMI/WinRM/RDP detection | Test |
| [apt_multi_stage.spl](../Splunk_queries/correlation/apt_multi_stage.spl) | Multi-stage attack correlation | Test |

## Coverage Gaps

Major ATT&CK tactics with no coverage:

- **Initial Access (TA0001)**: No phishing, exploit detection
- **Privilege Escalation (TA0004)**: No token manipulation, UAC bypass
- **Discovery (TA0007)**: No network scanning, account enumeration
- **Collection (TA0009)**: No data staging, keylogging detection
- **Exfiltration (TA0010)**: No data exfiltration detection
- **Linux/macOS**: Windows-only coverage
- **Cloud**: No AWS/Azure/GCP rules

## Prerequisites

See [SYSMON_REQUIREMENTS.md](SYSMON_REQUIREMENTS.md) for:
- Required Sysmon event IDs
- Windows audit policy settings
- Recommended Sysmon configurations

## Rule Status Definitions

- **Stable**: Tested in production, tuned, documented FP rate
- **Test**: Logic validated, needs environment-specific tuning
- **Experimental**: Concept only, expect high false positive rate
