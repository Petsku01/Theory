# Tuning Guide: Enterprise Active Directory Environment

Exclusions and tuning for large AD environments with SCCM/Intune.

## LSASS Access Rule Tuning

### Verified Safe Exclusions

These have been validated as safe to exclude in enterprise AD:

```yaml
filter_enterprise_ad:
    # Microsoft Endpoint Configuration Manager (SCCM/MECM)
    SourceImage|startswith:
        - 'C:\Windows\CCM\'
        - 'C:\Windows\CCMSetup\'
    
    # Azure AD Connect
    SourceImage|contains:
        - 'Microsoft Azure AD Sync'
        - 'Azure AD Connect'
    
    # Credential Guard (virtualization-based security)
    SourceImage|endswith:
        - '\lsaiso.exe'
    
    # DFS Replication (domain controllers)
    SourceImage|endswith:
        - '\dfsr.exe'
        - '\dfsrs.exe'
```

### DO NOT EXCLUDE (Common Mistakes)

```yaml
# DANGEROUS - attackers use these:
- '\svchost.exe'          # Process injection target
- '\rundll32.exe'         # LOLBin
- 'AppData\'              # User-writable path
- '\services.exe'         # Can be abused for persistence
```

## PowerShell Rule Tuning

### SCCM-Specific Exclusions

```yaml
filter_sccm:
    ParentImage|startswith:
        - 'C:\Windows\CCM\CcmExec.exe'
        - 'C:\Windows\CCM\RemCtrl\CmRcService.exe'
    CommandLine|contains:
        - 'Microsoft\\ConfigMgr'
        - '{00000000-0000-0000-0000-'  # SCCM GUIDs
```

### Intune/Endpoint Manager

```yaml
filter_intune:
    ParentImage|contains:
        - 'Microsoft Intune Management Extension'
        - 'IntuneManagementExtension'
    CommandLine|contains:
        - 'IntuneScripts'
        - 'deviceHealthScripts'
```

### DSC (Desired State Configuration)

```yaml
filter_dsc:
    ParentImage|endswith:
        - '\WmiPrvSE.exe'
        - '\dsc\LocalConfigurationManager.exe'
    CommandLine|contains:
        - 'DSCConfiguration'
        - 'PartialConfiguration'
```

## Scheduled Task Tuning

### Known Legitimate Enterprise Tasks

Add these to your exclusion list after verification:

| Task Pattern | Owner | Purpose |
|--------------|-------|---------|
| `\Microsoft\Windows\UpdateOrchestrator\*` | Microsoft | Windows Update |
| `\Microsoft\Windows\WindowsUpdate\*` | Microsoft | Windows Update |
| `\Microsoft\Configuration Manager\*` | SCCM | Endpoint management |
| `\Microsoft\Windows\TaskScheduler\*` | Microsoft | System maintenance |

### SCCM Scheduled Tasks

```yaml
filter_sccm_tasks:
    TaskContent|contains:
        - '\CCM\'
        - 'Configuration Manager'
        - 'ccmsetup'
```

## Kerberoasting Tuning

### Service Accounts to Exclude

Create a lookup table of your legitimate service accounts that request RC4 tickets:

```csv
# service_accounts_rc4.csv
service_name,owner,ticket_reason,approved_date
svc_backup,IT Operations,Legacy backup software,2025-01-15
svc_monitoring,Security,Nagios compatibility,2024-06-01
```

### Legacy Application List

Document applications that legitimately require RC4:

| Application | Vendor | Ticket Type | Remediation Plan |
|-------------|--------|-------------|------------------|
| OldApp v3.2 | VendorX | RC4 required | Upgrade Q2 2026 |

## Registry Run Key Tuning

### Verified Legitimate Autostart Entries

```yaml
filter_legitimate_autostart:
    Details|contains:
        - 'C:\Program Files\Microsoft Office'
        - 'C:\Program Files\Common Files\Microsoft'
        - 'C:\Program Files (x86)\Microsoft'
        - '"C:\Windows\System32\SecurityHealth'
```

## Validation Checklist

Before deploying in your environment:

- [ ] Identify all SCCM/MECM client paths
- [ ] Document Azure AD Connect servers
- [ ] List all service accounts with RC4 Kerberos
- [ ] Inventory legitimate scheduled tasks
- [ ] Baseline PowerShell parent processes for 2 weeks
- [ ] Map all EDR/AV process paths
