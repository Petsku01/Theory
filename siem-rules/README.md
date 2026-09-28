# SIEM Detection Rules

Production-ready detection rules for Windows security monitoring.

Tested with Atomic Red Team. Tuned for real environments. No bloat.

## Structure

```
Sigma_rules/
  credential_access/    # LSASS, DCSync, Kerberoasting (3 rules)
  execution/            # PowerShell techniques (2 rules)
  persistence/          # Scheduled tasks, registry run keys (2 rules)
  defense_evasion/      # Log clearing (1 rule)
  lateral_movement/     # PsExec, remote services (1 rule)
  impact/               # Ransomware/VSS deletion (1 rule)
  network/              # DNS tunneling, beaconing (2 rules)
  legacy/               # Older rules, may need work (2 rules)

Splunk_queries/
  detection/            # Credential theft, ransomware, lateral movement
  correlation/          # Multi-stage APT detection

attack_chains/          # Multi-stage detection playbooks
  initial_access_to_domain_compromise.md
  ransomware_deployment.md

tuning/                 # Environment-specific configuration
  enterprise_ad.md      # SCCM, Intune, traditional AD
  cloud_native.md       # AWS, Azure, cloud-managed endpoints

baselines/              # Normal behavior documentation
  windows_domain_baseline.md

tests/
  test_runner.py        # Sigma validation and test execution
  atomic_red_team_mapping.md  # ART test validation
  *.json                      # Sample log test cases

docs/
  COVERAGE.md           # Honest assessment of detection gaps
  SYSMON_REQUIREMENTS.md # Required logging config
  RULE_DEVELOPMENT.md   # Writing detection rules
```

## Quick Start

```bash
# Set up Python environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate   # Linux/Mac

# Install sigma-cli
pip install sigma-cli pysigma pysigma-backend-splunk

# Validate all rules
python tests/test_runner.py

# Convert to your SIEM
sigma convert -t splunk -p splunk_windows Sigma_rules/credential_access/lsass_memory_access.yaml
sigma convert -t elasticsearch Sigma_rules/execution/encoded_powershell.yaml
```

## Deployment Workflow

1. **Enable logging** - See [docs/SYSMON_REQUIREMENTS.md](docs/SYSMON_REQUIREMENTS.md)
2. **Baseline first** - Run queries from [baselines/](baselines/) for 7-14 days
3. **Pick tuning profile** - [tuning/enterprise_ad.md](tuning/enterprise_ad.md) or [tuning/cloud_native.md](tuning/cloud_native.md)
4. **Deploy rules** - Start with high-fidelity: `vss_deletion`, `event_log_cleared`
5. **Validate with ART** - See [tests/atomic_red_team_mapping.md](tests/atomic_red_team_mapping.md)
6. **Tune iteratively** - Document every exclusion

## Attack Chain Detection

Individual rules are useful. Correlated chains catch real attacks:

- [Initial Access to Domain Compromise](attack_chains/initial_access_to_domain_compromise.md) - PowerShell -> LSASS -> Lateral Movement
- [Ransomware Deployment](attack_chains/ransomware_deployment.md) - Recon -> Creds -> Service Kill -> Encryption

## What's Covered

| Tactic | Techniques | Confidence |
|--------|------------|------------|
| Credential Access | LSASS, DCSync, Kerberoasting | High (ART validated) |
| Execution | PowerShell obfuscation/download | High |
| Persistence | Scheduled tasks, registry run keys | High |
| Defense Evasion | Log clearing | High (low FP) |
| Lateral Movement | PsExec/SMB | Medium |
| Impact | Ransomware indicators | High (low FP) |
| C2 | DNS tunneling, beaconing | Medium (needs tuning) |

## Known Gaps

- Initial access (phishing, exploits) - need email/proxy logs
- Privilege escalation - partially covered by LSASS
- Discovery - high FP rate, skipped intentionally
- Exfiltration - need DLP/proxy integration
- Linux/macOS - Windows only
- Cloud - see [tuning/cloud_native.md](tuning/cloud_native.md) for guidance

Full assessment: [docs/COVERAGE.md](docs/COVERAGE.md)

## License

MIT
