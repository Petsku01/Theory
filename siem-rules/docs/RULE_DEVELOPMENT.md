# Detection Rule Development Guide

This guide covers best practices for developing high-quality detection rules that minimize false positives while maximizing true positive detection rates.

## Table of Contents

1. [Rule Development Lifecycle](#rule-development-lifecycle)
2. [Sigma Rule Standards](#sigma-rule-standards)
3. [Detection Logic Best Practices](#detection-logic-best-practices)
4. [MITRE ATT&CK Integration](#mitre-attck-integration)
5. [Testing & Validation](#testing--validation)
6. [Performance Optimization](#performance-optimization)

---

## Rule Development Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DETECTION RULE DEVELOPMENT LIFECYCLE                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │ Research │ -> │  Design  │ -> │  Build   │ -> │   Test   │ -> │  Deploy  │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│        │               │               │               │               │        │
│        v               v               v               v               v        │
│   - Threat intel  - Detection    - Write rule   - Atomic tests  - Staged       │
│   - IOC analysis    hypothesis   - Add metadata - Sample logs     rollout      │
│   - ATT&CK map    - Scope        - Review PR    - FP analysis   - Monitor      │
│   - Log sources     definition                                  - Tune         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Research

1. **Understand the Threat**
   - Analyze threat intelligence reports
   - Study malware samples and attack techniques
   - Review existing detections and their gaps

2. **Map to MITRE ATT&CK**
   - Identify primary technique
   - Note sub-techniques if applicable
   - Document procedure examples

3. **Identify Data Sources**
   - Windows Event Logs (Security, Sysmon, PowerShell)
   - Network traffic (NetFlow, PCAP, DNS)
   - Endpoint telemetry (EDR, AV logs)

### Phase 2: Design

1. **Create Detection Hypothesis**
   ```
   IF [observable/behavior] THEN [attacker action] WITH [confidence]
   ```

2. **Define Scope**
   - What environments does this apply to?
   - What are the known false positive scenarios?
   - What data is required?

### Phase 3: Build

Follow the Sigma rule standards below to create high-quality rules.

### Phase 4: Test

Use Atomic Red Team or manual testing to validate detection.

### Phase 5: Deploy

Staged rollout with monitoring and tuning period.

---

## Sigma Rule Standards

### Required Fields

Every Sigma rule MUST include:

```yaml
title: Descriptive Rule Title              # Max 100 characters
id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # UUIDv4
status: experimental | test | stable       # Rule maturity
description: |                             # Detailed description
    What this rule detects and why it matters.
    Include attack context and expected behavior.
author: Your Name                          # Rule author
date: 2026/01/22                          # Creation date
modified: 2026/01/22                       # Last modification

logsource:                                 # Log source definition
    product: windows                       # Product name
    category: process_creation             # Log category
    
detection:                                 # Detection logic
    selection:
        # Selection criteria
    condition: selection

level: informational | low | medium | high | critical

tags:
    - attack.execution                     # Tactic
    - attack.t1059.001                     # Technique
```

### Recommended Fields

```yaml
references:
    - https://attack.mitre.org/techniques/T1059/001/
    - https://example.com/threat-report
    
falsepositives:
    - Legitimate administrative scripts
    - SCCM/Intune deployment scripts
    
fields:
    - CommandLine
    - ParentCommandLine
    - User
    - Computer
```

### Status Definitions

| Status | Description | Usage |
|--------|-------------|-------|
| `experimental` | New rule, minimal testing | Initial development |
| `test` | In testing phase, may have issues | QA/validation |
| `stable` | Production ready, well tested | Deployment |
| `deprecated` | No longer maintained | Legacy rules |

### Level Definitions

| Level | Score | Description | Response |
|-------|-------|-------------|----------|
| `informational` | 0-20 | Unusual but not malicious | Log only |
| `low` | 21-40 | Potentially suspicious | Queue for review |
| `medium` | 41-60 | Likely malicious activity | Investigate soon |
| `high` | 61-80 | Strong indicator of attack | Investigate immediately |
| `critical` | 81-100 | Active attack in progress | Incident response |

---

## Detection Logic Best Practices

### Use Specific Selectors

**Bad** - Too broad
```yaml
detection:
    selection:
        Image|endswith: '.exe'
    condition: selection
```

**Good** - Specific targeting
```yaml
detection:
    selection:
        Image|endswith: '\powershell.exe'
        CommandLine|contains:
            - '-EncodedCommand'
            - '-enc'
            - '-e '
    condition: selection
```

### Combine Multiple Indicators

```yaml
detection:
    selection_process:
        Image|endswith: '\powershell.exe'
    selection_cmdline:
        CommandLine|contains:
            - '-EncodedCommand'
            - '-WindowStyle Hidden'
    selection_parent:
        ParentImage|endswith:
            - '\winword.exe'
            - '\excel.exe'
            - '\outlook.exe'
    condition: selection_process and selection_cmdline and selection_parent
```

### Use Filters to Reduce False Positives

```yaml
detection:
    selection:
        Image|endswith: '\powershell.exe'
        CommandLine|contains: '-enc'
    filter_legitimate:
        User|contains: 'SYSTEM'
        ParentImage|endswith: '\sccm.exe'
    filter_signed:
        CommandLine|contains: 'C:\Program Files'
    condition: selection and not (filter_legitimate or filter_signed)
```

### Leverage Modifiers

| Modifier | Description | Example |
|----------|-------------|---------|
| `contains` | Substring match | `CommandLine\|contains: '-enc'` |
| `startswith` | Prefix match | `Image\|startswith: 'C:\\Windows'` |
| `endswith` | Suffix match | `Image\|endswith: '.exe'` |
| `re` | Regex match | `CommandLine\|re: '.*-e[nc]{1,2}\s'` |
| `cidr` | CIDR notation | `DestinationIP\|cidr: '10.0.0.0/8'` |
| `all` | All values must match | `selection\|all` |

### Aggregate Detections

For behavioral patterns requiring multiple events:

```yaml
detection:
    selection:
        EventID: 4625  # Failed logon
    timeframe: 5m
    condition: selection | count(TargetUserName) by SourceIP > 10
```

---

## MITRE ATT&CK Integration

### Tag Format

```yaml
tags:
    - attack.tactic_name                  # Tactic (lowercase, dots to underscores)
    - attack.t1234                        # Technique ID
    - attack.t1234.001                    # Sub-technique ID
    - cve.2024.12345                      # CVE reference
    - detection.emerging_threats          # Custom tags
```

### Common Tactics and Techniques

```yaml
# Execution
- attack.execution
- attack.t1059           # Command and Scripting Interpreter
- attack.t1059.001       # PowerShell
- attack.t1059.003       # Windows Command Shell

# Persistence
- attack.persistence
- attack.t1547.001       # Registry Run Keys
- attack.t1053.005       # Scheduled Task

# Credential Access
- attack.credential_access
- attack.t1003.001       # LSASS Memory
- attack.t1558.003       # Kerberoasting

# Defense Evasion
- attack.defense_evasion
- attack.t1564.004       # NTFS Alternate Data Streams
- attack.t1070.001       # Clear Windows Event Logs
```

---

## Testing & Validation

### Atomic Red Team Integration

```powershell
# Install Atomic Red Team
IEX (IWR 'https://raw.githubusercontent.com/redcanaryco/invoke-atomicredteam/master/install-atomicredteam.ps1' -UseBasicParsing)

# Run specific technique test
Invoke-AtomicTest T1059.001 -TestNumbers 1

# Get test details
Get-AtomicTest T1059.001
```

### Sample Log Validation

Create a test file with expected log format:

```json
// test_logs/powershell_encoded.json
{
  "EventID": 4688,
  "NewProcessName": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  "CommandLine": "powershell.exe -EncodedCommand JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA=",
  "ParentProcessName": "C:\\Windows\\System32\\cmd.exe",
  "SubjectUserName": "attacker",
  "TimeCreated": "2026-01-22T10:30:00Z"
}
```

### Validation Script

```python
#!/usr/bin/env python3
"""Validate Sigma rule against sample logs."""

import json
import yaml
from pathlib import Path

def load_rule(rule_path: str) -> dict:
    """Load and parse Sigma rule."""
    with open(rule_path) as f:
        return yaml.safe_load(f)

def load_logs(log_path: str) -> list:
    """Load sample log events."""
    with open(log_path) as f:
        return [json.loads(line) for line in f]

def evaluate_rule(rule: dict, event: dict) -> bool:
    """Evaluate if event matches rule detection logic."""
    detection = rule.get('detection', {})
    # Simplified evaluation - production would use sigma-cli
    for key, value in detection.get('selection', {}).items():
        field = key.split('|')[0]
        modifier = key.split('|')[1] if '|' in key else None
        
        if field not in event:
            return False
        
        if modifier == 'contains':
            if not any(v in event[field] for v in (value if isinstance(value, list) else [value])):
                return False
    
    return True

def main():
    rule = load_rule('Sigma_rules/execution/suspicious_powershell.yaml')
    logs = load_logs('test_logs/powershell_encoded.json')
    
    matches = sum(1 for log in logs if evaluate_rule(rule, log))
    print(f"Matched {matches}/{len(logs)} events")

if __name__ == "__main__":
    main()
```

---

## Performance Optimization

### Index-Time Filtering

Add early filtering to reduce search scope:

```yaml
# Splunk optimized
logsource:
    product: windows
    service: sysmon
    definition: 'source="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"'
```

### Field Extraction Hints

Specify fields to aid parser optimization:

```yaml
fields:
    - Image
    - CommandLine
    - ParentImage
    - User
```

### Time-Based Aggregation

For correlation rules, use appropriate timeframes:

```yaml
detection:
    selection:
        EventID: 4625
    timeframe: 5m           # Keep short for performance
    condition: selection | count() by SourceIP > 10
```

### Avoid Expensive Operations

| Operation | Performance | Alternative |
|-----------|-------------|-------------|
| `.*regex.*` | Slow | Use `contains` |
| `NOT field=*` | Slow | Filter in condition |
| Deep nesting | Slow | Flatten conditions |
| `re: (?i)` | Slow | Lowercase in pipeline |

---

## Rule Templates

### Process Execution Template

```yaml
title: 
id:                                       # Generate with: uuidgen
status: experimental
description: |
    Detects [BEHAVIOR] which may indicate [THREAT].
    [ADDITIONAL CONTEXT]
references:
    - https://attack.mitre.org/techniques/TXXXX/
author: Your Name
date: 2026/01/22

logsource:
    product: windows
    category: process_creation
    
detection:
    selection:
        Image|endswith: '\process.exe'
        CommandLine|contains:
            - 'suspicious_arg1'
            - 'suspicious_arg2'
    filter:
        ParentImage|endswith: '\legitimate_parent.exe'
    condition: selection and not filter
    
falsepositives:
    - Legitimate use case 1
    - Legitimate use case 2
    
level: medium

tags:
    - attack.execution
    - attack.tXXXX
```

### Network Connection Template

```yaml
title: 
id: 
status: experimental
description: |
    Detects [NETWORK BEHAVIOR] which may indicate [THREAT].

logsource:
    product: windows
    category: network_connection
    
detection:
    selection:
        DestinationPort:
            - 4444
            - 5555
        Initiated: 'true'
    filter:
        DestinationIp|cidr:
            - '10.0.0.0/8'
            - '172.16.0.0/12'
            - '192.168.0.0/16'
    condition: selection and not filter

level: high

tags:
    - attack.command_and_control
    - attack.tXXXX
```

---

## Next Steps

- [MITRE ATT&CK Mapping](MITRE_ATTACK_MAPPING.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
