# Converting Sigma Rules to SIEMs: A Guide for Python

## Introduction

This guide provides a clear, step-by-step process for converting any Sigma rule to these SIEM platforms, ensuring  deployment of detection logic across diverse environments.

## Prerequisites

Before converting Sigma rules, ensure you have the following:

1. **Python 3.9+**: Required to run `sigma-cli`. Install from [python.org](https://www.python.org/downloads/).
2. **sigma-cli**: Install via pip:
   ```bash
   pip install sigmatools
   ```
3. **Backend Plugins**: Install the required backend plugin for your target SIEM. For example:
   - Splunk: `sigma plugin install splunk`
   - Elastic: `sigma plugin install es-qs`
   - Microsoft Sentinel: `sigma plugin install azure`
   - QRadar: `sigma plugin install qradar`
   You can list all available plugins with:
   ```bash
   sigma plugin list
   ```
4. **Sigma Rules**: Obtain rules from the [SigmaHQ repository](https://github.com/SigmaHQ/sigma) or create your own in YAML format.
5. **Configuration Files**: Download from the Sigma repository (`tools/config/`) for field mappings. Clone the repository:
   ```bash
   git clone https://github.com/SigmaHQ/sigma.git
   ```

## Understanding Sigma Rules

A Sigma rule is a YAML file that defines detection logic. Key components include:
- **title**: Descriptive name of the rule.
- **id**: Unique identifier (e.g., UUID).
- **logsource**: Specifies the log source (e.g., `process_creation`, `windows`).
- **detection**: Defines the logic using fields and conditions.
- **fields**: Lists fields to include in query output.
- **falsepositives**: Notes potential legitimate activities that may trigger the rule.
- **level**: Severity (e.g., `high`, `medium`).
- **tags**: MITRE ATT&CK references.

**Example Sigma Rule**:
```yaml
title: Suspicious PowerShell Command Execution
id: 123e4567-e89b-12d3-a456-426614174000
description: Detects PowerShell executions with suspicious parameters.
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\powershell.exe'
    CommandLine|contains:
      - '-EncodedCommand'
      - '-WindowStyle Hidden'
  condition: selection
fields:
  - CommandLine
  - ParentImage
falsepositives:
  - Legitimate administrative scripts
level: high
tags:
  - attack.execution
  - attack.t1059.001
```

## Conversion Process

The `sigma-cli` tool, built on the `pySigma` library, converts Sigma rules into SIEM-specific query languages. Each SIEM requires a specific backend and configuration file to map Sigma fields to the SIEM’s schema.

### Step 1: Install Backend Plugins

Install the backend plugin for your target SIEM to enable conversion. Use the following command:
```bash
sigma plugin install <backend>
```
**Examples**:
- Splunk: `sigma plugin install splunk`
- Elastic: `sigma plugin install es-qs`
- Microsoft Sentinel: `sigma plugin install azure`
- QRadar: `sigma plugin install qradar`

To verify available plugins, run:
```bash
sigma plugin list
```

### Step 2: Convert Rules

Use the `sigma convert` command with the appropriate backend (`-t`) and configuration file (`-c`). Save your Sigma rule as `your_rule.yml` and run the command from the directory containing the rule and configuration files.

#### Splunk
- **Query Language**: Search Processing Language (SPL)
- **Backend**: `-t splunk`
- **Config File**: `tools/config/splunk-windows.yml`
- **Command**:
  ```bash
  sigma convert -t splunk -c tools/config/splunk-windows.yml your_rule.yml
  ```
- **Example Output**:
  ```spl
  source="WinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1 process="*\\powershell.exe" ("-EncodedCommand" OR "-WindowStyle Hidden")
  | fields CommandLine, ParentImage
  ```
- **Notes**:
  - Adjust the `source` to match your Splunk index (e.g., `index=sysmon`).
  - Map fields like `Image` to `process` and `CommandLine` to `command_line` in the config file if needed.
  - Test in Splunk’s Search interface.

#### Elastic (Elasticsearch/OpenSearch)
- **Query Language**: Kibana Query Language (KQL)
- **Backend**: `-t es-qs`
- **Config File**: `tools/config/ecs-windows.yml`
- **Command**:
  ```bash
  sigma convert -t es-qs -c tools/config/ecs-windows.yml your_rule.yml
  ```
- **Example Output**:
  ```kql
  event.category:process AND process.executable:*\\powershell.exe AND process.command_line:("-EncodedCommand" OR "-WindowStyle Hidden")
  ```
- **Notes**:
  - Use Elastic Common Schema (ECS) fields (e.g., `process.executable`, `process.command_line`).
  - Elastic is case-sensitive; ensure string matches align with your data.
  - Test in Kibana’s KQL search bar.

#### Microsoft Sentinel
- **Query Language**: Kusto Query Language (KQL)
- **Backend**: `-t 四`
- **Config File**: `tools/config/microsoft-sentinel.yml`
- **Command**:
  ```bash
  sigma convert -t azure -c tools/config/microsoft-sentinel.yml your_rule.yml
  ```
- **Example Output**:
  ```kql
  SysmonEvent
  | where EventID == 1
  | where Process endswith "\\powershell.exe"
  | where CommandLine contains "-EncodedCommand" or CommandLine contains "-WindowStyle Hidden"
  | project CommandLine, ParentProcess
  ```
- **Notes**:
  - Use `SysmonEvent` or `SecurityEvent` tables based on your log source.
  - Map fields like `Image` to `Process` or `NewProcessName` for SecurityEvent logs.
  - Test in Sentinel’s Logs section.

#### QRadar
- **Query Language**: Ariel Query Language (AQL)
- **Backend**: `-t qradar`
- **Config File**: `tools/config/qradar.yml`
- **Command**:
  ```bash
  sigma convert -t qradar -c tools/config/qradar.yml your_rule.yml
  ```
- **Example Output**:
  ```aql
  SELECT * FROM events WHERE
  LOWER(PROCESS) LIKE '%\\powershell.exe'
  AND (PROCESS_COMMANDLINE LIKE '%-EncodedCommand%' OR PROCESS_COMMANDLINE LIKE '%-WindowStyle Hidden%')
  ```
- **Notes**:
  - Map fields like `Image` to `PROCESS` and `CommandLine` to `PROCESS_COMMANDLINE`.
  - QRadar is case-sensitive; `LOWER()` is used for consistency.
  - Test in QRadar’s Log Activity tab.

### Step 3: Tests and Deploy

- **Verify Log Sources**: Ensure your SIEM ingests the required logs:
  - **Process Creation**: Sysmon Event ID 1 or Windows Event ID 4688.
  - **Network Connections**: Sysmon Event ID 3 or network monitoring (e.g., Zeek).
  - **Registry Events**: Sysmon Event ID 13 or Windows Event ID 4657.
- **Check Field Mappings**: Update the configuration file if your SIEM uses custom field names (e.g., `process_command_line` instead of `CommandLine`).
- **Reduce False Positives**: Use the `falsepositives` section of the Sigma rule to guide exclusions (e.g., `NOT command_line="*sccm*"` for administrative scripts).
- **Performance**: Limit queryਮ

query scope with time ranges (e.g., `earliest=-24h` in Splunk) or specific filters (e.g., `EventType: SetValue` for registry events).
- **Deploy Queries**: Save as alerts or correlation rules in your SIEM:
  - **Splunk**: Save as a scheduled search or alert.
  - **Elastic**: Create a detection rule in Kibana.
  - **Microsoft Sentinel**: Set up an analytic rule.
  - **QRadar**: Create a custom rule or event rule.

## Considerations

- **Field Mapping**: Customize configuration files for non-standard field names (e.g., `Image` to `process.executable`).
- **Threat Intelligence**: For rules involving IPs, integrate with a threat intelligence feed for dynamic updates.
- **Case Sensitivity**: Splunk and Sentinel are case-insensitive, but Elastic and QRadar may require case handling (e.g., add case variations or use `LOWER()`).
- **Performance Optimization**: Use specific filters and time ranges to reduce query load.
- **Automation**: Integrate `sigma-cli` into CI/CD pipelines for automated rule conversion and deployment.

## Troubleshooting

- **Field Errors**: Verify your SIEM’s log schema and update the configuration file if fields are missing.
- **No Results**: Ensure required log sources are enabled and ingested.
- **False Positives**: Add exclusions based on the `falsepositives` section of the rule.
- **Syntax Issues**: Validate Sigma rules with:
  ```bash
  sigma check your_rule.yml
  ```

## Resources

- **Sigma Documentation**: [sigmahq.io/docs](https://sigmahq.io/docs/)
- **Sigma GitHub Repository**: [github.com/SigmaHQ/sigma](https://github.com/SigmaHQ/sigma)
- **sigma-cli GitHub Repository**: [github.com/SigmaHQ/sigma-cli](https://github.com/SigmaHQ/sigma-cli)
- **Community Support**: Join discussions on GitHub or the Sigma Slack channel.
- **Exabeam Blog**: [Automating Sigma Rule Conversion](https://www.exabeam.com/blog/security-operations-center/seamless-security-automating-sigma-rule-conversion-with-generative-ai/)
- **SOC Prime Blog**: [Sigma Rules Guide](https://socprime.com/blog/sigma-rules-the-beginners-guide/)

