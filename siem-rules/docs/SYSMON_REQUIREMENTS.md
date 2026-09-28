# Sysmon Configuration Requirements

These detection rules require specific Sysmon event types to be enabled.

## Required Sysmon Events by Rule

| Rule | Required Events | Sysmon Config |
|------|-----------------|---------------|
| LSASS Memory Access | Event 10 (ProcessAccess) | Must log access to lsass.exe |
| PowerShell Execution | Event 1 (ProcessCreate) | Log command lines |
| Registry Run Keys | Event 13 (RegistryValueSet) | Monitor Run key paths |
| Scheduled Tasks | Event 1 + Security 4698 | Process creation + audit |
| DNS Tunneling | Event 22 (DNSQuery) | All DNS queries |
| Network Beaconing | Event 3 (NetworkConnect) | Outbound connections |
| File Operations | Event 11 (FileCreate) | Monitor target paths |

## Minimum Sysmon Configuration

```xml
<Sysmon schemaversion="4.90">
  <EventFiltering>
    
    <!-- Event 1: Process Creation - Required for most rules -->
    <ProcessCreate onmatch="exclude">
      <!-- Add noisy exclusions for your environment -->
    </ProcessCreate>
    
    <!-- Event 3: Network Connection - Required for beaconing detection -->
    <NetworkConnect onmatch="include">
      <DestinationPort condition="is">80</DestinationPort>
      <DestinationPort condition="is">443</DestinationPort>
      <DestinationPort condition="is">8080</DestinationPort>
    </NetworkConnect>
    
    <!-- Event 10: Process Access - Required for LSASS detection -->
    <ProcessAccess onmatch="include">
      <TargetImage condition="end with">lsass.exe</TargetImage>
    </ProcessAccess>
    
    <!-- Event 11: File Create - Required for ransomware detection -->
    <FileCreate onmatch="include">
      <TargetFilename condition="contains">.encrypted</TargetFilename>
      <TargetFilename condition="contains">.locked</TargetFilename>
      <TargetFilename condition="contains">README</TargetFilename>
      <TargetFilename condition="contains">DECRYPT</TargetFilename>
    </FileCreate>
    
    <!-- Event 13: Registry Value Set - Required for persistence detection -->
    <RegistryEvent onmatch="include">
      <TargetObject condition="contains">CurrentVersion\Run</TargetObject>
      <TargetObject condition="contains">CurrentVersion\RunOnce</TargetObject>
    </RegistryEvent>
    
    <!-- Event 22: DNS Query - Required for DNS tunneling -->
    <DnsQuery onmatch="exclude">
      <QueryName condition="end with">.local</QueryName>
    </DnsQuery>
    
  </EventFiltering>
</Sysmon>
```

## Recommended Configurations

For production use, consider these community Sysmon configs:

1. **SwiftOnSecurity** (balanced): https://github.com/SwiftOnSecurity/sysmon-config
2. **Olaf Hartong** (modular): https://github.com/olafhartong/sysmon-modular  
3. **Neo23x0** (focused): https://github.com/Neo23x0/sysmon-config

## Performance Considerations

High-volume events to tune carefully:
- Event 1 (ProcessCreate): Filter noisy processes
- Event 3 (NetworkConnect): Limit to interesting ports/processes
- Event 7 (ImageLoad): Very noisy, enable selectively
- Event 22 (DNSQuery): Generates many events

## Windows Security Audit Requirements

Some rules require Windows Security auditing:

```powershell
# Enable Process Creation auditing (for 4688)
auditpol /set /subcategory:"Process Creation" /success:enable

# Enable Directory Service Access (for DCSync - 4662)
auditpol /set /subcategory:"Directory Service Access" /success:enable

# Enable Kerberos Service Ticket Operations (for Kerberoasting - 4769)
auditpol /set /subcategory:"Kerberos Service Ticket Operations" /success:enable

# Enable Object Access for scheduled tasks (4698)
auditpol /set /subcategory:"Other Object Access Events" /success:enable
```

## Validation

Test that events are being generated:

```powershell
# Check Sysmon is running
Get-Service Sysmon*

# View recent Sysmon events
Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 10

# Check Security event logging
Get-WinEvent -LogName Security -MaxEvents 10 | Where-Object {$_.Id -eq 4688}
```
