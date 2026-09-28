# Cloud-Native Environment Tuning

For AWS/Azure-focused organizations with minimal on-premises infrastructure.

## Environment Profile

- Primary workloads in AWS/Azure/GCP
- Identity: Azure AD / Entra ID (no on-prem AD)
- Endpoints: Cloud-managed (Intune, Jamf)
- Servers: EC2/Azure VMs, containers, serverless

## Rule Adjustments

### LSASS Memory Access (lsass_memory_access.yaml)

Cloud environments have different legitimate access patterns:

**Azure AD Connect (if hybrid):**
```yaml
filter:
  SourceImage|contains:
    - 'C:\Program Files\Microsoft Azure AD Sync\'
    - 'C:\Program Files\Microsoft Azure AD Connect\'
```

**Azure VM Agent:**
```yaml
filter:
  SourceImage|contains:
    - 'C:\WindowsAzure\'
    - 'C:\Packages\Plugins\'
```

**AWS Systems Manager Agent:**
```yaml
filter:
  SourceImage|contains:
    - 'C:\Program Files\Amazon\SSM\'
    - 'C:\Program Files\Amazon\XenTools\'
```

### Encoded PowerShell (encoded_powershell.yaml)

Cloud management tools that use encoding:

**Azure Automation:**
```yaml
filter:
  ParentImage|contains:
    - 'C:\Packages\Plugins\Microsoft.CPlat.Core.RunCommandWindows\'
    - 'C:\WindowsAzure\GuestAgent\'
```

**Intune Management Extension:**
```yaml
filter:
  ParentImage|contains:
    - 'C:\Program Files (x86)\Microsoft Intune Management Extension\'
```

**AWS Run Command:**
```yaml
filter:
  ParentImage|contains:
    - 'C:\Program Files\Amazon\SSM\Plugins\'
```

### Scheduled Task Creation (scheduled_task_creation.yaml)

Cloud-managed scheduled tasks:

**Azure Update Management:**
```yaml
filter:
  TaskName|contains:
    - 'Microsoft\\Azure\\'
    - 'WindowsAzure'
```

**AWS Patch Manager:**
```yaml
filter:
  TaskName|contains:
    - 'Amazon\SSM'
    - 'AWS'
```

## Cloud-Specific Detections

These detections are more relevant for cloud environments.

### IMDS Token Theft (AWS)

```yaml
title: AWS IMDS Token Access Attempt
status: experimental
logsource:
  product: aws
  service: vpc-flow
detection:
  selection:
    dstaddr: '169.254.169.254'
    dstport: 80
  filter_ec2:
    # Legitimate EC2 metadata access
    srcaddr|cidr: '10.0.0.0/8'
  condition: selection and not filter_ec2
```

### Azure Instance Metadata Access

```yaml
title: Azure IMDS Access from Unusual Process
logsource:
  product: windows
  category: network_connection
detection:
  selection:
    DestinationIp: '169.254.169.254'
  filter_azure_agent:
    Image|contains:
      - 'WindowsAzure'
      - 'GuestAgent'
  condition: selection and not filter_azure_agent
```

### Cloud Shell Abuse

```yaml
title: Suspicious Azure Cloud Shell Activity
logsource:
  product: azure
  service: activitylogs
detection:
  selection:
    operationName: 'Microsoft.Portal/consoles/write'
  timeframe: 1h
  condition: selection | count() > 10 by userPrincipalName
```

## Log Sources for Cloud

### AWS

Required logs (send to your SIEM):
- CloudTrail (all regions, management + data events)
- VPC Flow Logs
- GuardDuty findings
- Security Hub findings

### Azure

Required logs:
- Azure Activity Log
- Azure AD Sign-in Logs
- Azure AD Audit Logs
- Defender for Cloud alerts
- NSG Flow Logs

### GCP

Required logs:
- Cloud Audit Logs
- VPC Flow Logs
- Security Command Center findings

## Cloud-to-On-Prem Attack Detection

If you have any hybrid connectivity:

### VPN Tunnel Abuse

```spl
index=aws sourcetype="aws:cloudtrail"
  eventName IN ("CreateVpnConnection", "ModifyVpnConnection", "AttachVpnGateway")
| stats count by userIdentity.arn, sourceIPAddress, awsRegion
```

### Peering Manipulation

```spl
index=azure sourcetype="azure:activity"
  operationName="Microsoft.Network/virtualNetworks/virtualNetworkPeerings/write"
| stats count by caller, callerIpAddress, resourceGroup
```

## Don't Bother With

These detections have low value in cloud-native environments:

- **DCSync** - No domain controllers
- **PsExec lateral movement** - No network shares typically
- **Kerberoasting** - No Kerberos
- **Pass-the-hash** - Cloud auth is token-based

## Focus On Instead

- **OAuth token theft** - The cloud equivalent of credential theft
- **Service principal abuse** - Compromised app credentials
- **Permission escalation** - IAM policy changes
- **Cross-tenant access** - B2B compromise risk
- **Impossible travel** - Geo-based anomaly detection
