# SharePoint Vulnerability Analysis and Mitigations (July 2025)

## Key Points
- **Active Exploitation**: Research suggests that critical vulnerabilities in Microsoft SharePoint Server, CVE-2025-53770 and CVE-2025-53771, are being actively exploited as of July 2025, affecting on-premises deployments.
- **Patches Available**: It seems likely that Microsoft has released patches for SharePoint Server 2019 and Subscription Edition, but SharePoint Server 2016 remains unpatched, increasing risk for users of that version.
- **Mitigation Urgency**: The evidence leans toward immediate action, including applying patches, enabling security features, and assuming compromise for exposed systems to mitigate risks like data theft and unauthorized access.

## Overview
As of July 22, 2025, Microsoft SharePoint Server, a widely used platform for document management and collaboration, is under attack due to two critical vulnerabilities: CVE-2025-53770 and CVE-2025-53771. These flaws, part of the "ToolShell" exploit chain, allow attackers to bypass authentication and execute code remotely, posing significant risks to organizations. This README provides a straightforward guide to understanding these vulnerabilities and the steps you can take to protect your systems.

## Affected Systems
- **Versions Impacted**: On-premises SharePoint Server 2016, 2019, and Subscription Edition. SharePoint Online (Microsoft 365) is not affected.
- **Risks**: Attackers can steal data, deploy persistent backdoors, and access connected services like Teams or OneDrive. Over 75 organizations, including government agencies and universities, have been breached since July 18, 2025.

## Current Mitigations
- **Apply Patches**: Install KB5002754 for SharePoint 2019 and KB5002768 for Subscription Edition. No patch is available for SharePoint 2016 yet.
- **Enable Security Features**: Turn on the Antimalware Scan Interface (AMSI) and deploy Microsoft Defender Antivirus to block malicious payloads.
- **Assume Compromise**: If your server was exposed before patching, investigate for signs of compromise, as attackers may have stolen cryptographic keys or installed backdoors.

For detailed guidance, see the comprehensive analysis below or visit [Microsoft's Security Response Center](https://msrc.microsoft.com/blog/2025/07/customer-guidance-for-sharepoint-vulnerability-cve-2025-53770/) and [CISA's alert](https://www.cisa.gov/news-events/alerts/2025/07/20/microsoft-releases-guidance-exploitation-sharepoint-vulnerability-cve-2025-53770).

---

# Comprehensive Analysis of SharePoint Vulnerabilities and Mitigations

## Introduction
As of July 22, 2025, Microsoft SharePoint Server is facing a serious security crisis due to two zero-day vulnerabilities, CVE-2025-53770 and CVE-2025-53771, which are actively exploited in the wild. These vulnerabilities, part of the "ToolShell" exploit chain, enable unauthenticated attackers to gain full control of on-premises SharePoint servers, posing risks of data theft, persistent backdoors, and lateral movement to connected services. This analysis provides a detailed breakdown of the vulnerabilities, their impact, and actionable mitigation strategies, drawing from official sources like Microsoft and the Cybersecurity and Infrastructure Security Agency (CISA), as well as insights from security researchers.

## Vulnerability Details

### CVE-2025-53770 (CVSS 9.8)
- **Type**: Remote Code Execution (RCE)
- **Description**: This critical vulnerability stems from unsafe deserialization of untrusted data in on-premises SharePoint Servers. Attackers exploit it by sending crafted POST requests to the `/_layouts/15/ToolPane.aspx` endpoint, allowing them to execute arbitrary code without authentication. It is a variant of CVE-2025-49704, which was addressed in the July 2025 Patch Tuesday but bypassed by this new exploit.
- **Impact**: Attackers gain full access to SharePoint content, including file systems, internal configurations, and cryptographic keys (ValidationKey and DecryptionKey). This enables the deployment of persistent backdoors, such as ASPX web shells (e.g., `spinstall0.aspx`), and lateral movement to connected services like Microsoft Teams or OneDrive.
- **Exploitation Status**: Actively exploited since July 18, 2025, with over 85 servers compromised globally, including federal agencies, universities, energy companies, and other organizations.
- **Affected Versions**:
  - SharePoint Server 2016 (builds prior to 16.0.5508.1000)
  - SharePoint Server 2019 (builds prior to 16.0.10417.20027)
  - SharePoint Server Subscription Edition (builds prior to 16.0.18526.20424)
  - SharePoint Server 2010 and 2013 (end-of-life, unsupported)

### CVE-2025-53771 (CVSS 6.3)
- **Type**: Spoofing Vulnerability
- **Description**: This medium-severity vulnerability allows attackers to bypass authentication by crafting malicious POST requests to `/_layouts/15/ToolPane.aspx` with a forged Referer header (e.g., `/_layouts/SignOut.aspx`). It is a variant of CVE-2025-49706 and serves as the entry point for the ToolShell exploit chain.
- **Impact**: Enables attackers to deliver payloads for CVE-2025-53770, facilitating unauthenticated remote code execution.
- **Exploitation Status**: No standalone exploitation reported, but it is actively used in the ToolShell chain.
- **Affected Versions**: Same as CVE-2025-53770.

### ToolShell Exploit Chain
- **Mechanism**: Combines CVE-2025-53771 (authentication bypass) and CVE-2025-53770 (RCE) to achieve unauthenticated server control. Attackers exploit deserialization flaws to extract cryptographic keys and deploy persistent web shells.
- **Discovery**: Identified by Eye Security on July 18, 2025, after detecting suspicious processes linked to malicious `.aspx` files.
- **Scale**: Over 75 organizations breached, with dozens of servers compromised across government, healthcare, education, and enterprise sectors.

## Impact and Scope
- **Affected Systems**: On-premises SharePoint Server deployments (2016, 2019, Subscription Edition) and self-managed instances in the cloud (e.g., Azure, AWS). SharePoint Online (Microsoft 365) is unaffected.
- **Victims**: Federal and state agencies, universities, energy companies, healthcare organizations, and large enterprises.
- **Risks**:
  - Data theft and exposure of sensitive information.
  - Persistent backdoors that allow ongoing unauthorized access.
  - Lateral movement to connected services like Teams and OneDrive.
  - Potential bypass of future patches due to stolen cryptographic keys, as warned by Google’s Threat Intelligence Group.

## Current Mitigations
Microsoft has released emergency patches for SharePoint Server 2019 and Subscription Edition, but SharePoint Server 2016 remains unpatched as of July 22, 2025. The following table summarizes the mitigation strategies:

| **Mitigation**                          | **Description**                                                                                     | **Action**                                                                                     |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| Apply Emergency Patches                 | Install KB5002754 for SharePoint 2019 and KB5002768 for Subscription Edition; no patch for 2016 yet. | Apply patches immediately where available to mitigate both CVE-2025-53770 and CVE-2025-53771.   |
| Enable Antimalware Scan Interface (AMSI)| Configure AMSI to scan scripts and code in memory, blocking malicious payloads, with Full Mode.     | Verify AMSI is enabled, set to Full Mode, and deploy Microsoft Defender Antivirus on all servers.|
| Disconnect Public-Facing Servers        | If unpatched or AMSI cannot be enabled, disconnect from the internet or use VPN/proxy/gateway.      | Isolate affected servers to prevent exploitation until patches are applied.                     |
| Rotate Cryptographic Keys               | Rotate ValidationKey and DecryptionKey to invalidate stolen credentials post-patching.              | Use PowerShell (`Update-SPMachineKey -WebApplication <WebAppURL>`), restart IIS with `iisreset.exe`. |
| Deploy Microsoft Defender for Endpoint  | Use for threat detection and response, monitoring for post-exploit activity like web shell deployment. | Check alerts in Microsoft Defender Security Center for IoCs, including suspicious POST requests.  |
| Assume Compromise and Investigate       | Assume exposed systems are compromised due to mass exploitation; conduct threat hunting.            | Scan for IoCs, review IIS logs, isolate hosts, and engage incident response for forensic analysis.|
| Block Exploit Patterns                  | Update IPS and WAF to block anomalous behavior, such as crafted Referer headers or malicious payloads.| Configure systems to detect and block known exploit patterns targeting ToolPane.aspx.            |
| Decommission Unsupported Versions       | Isolate or decommission SharePoint Server 2010 and 2013, as they are end-of-life and vulnerable.    | Migrate to supported versions or decommission to reduce risk.                                    |

### Detailed Mitigation Steps
1. **Apply Emergency Patches**:
   - **SharePoint Server 2019**: Install KB5002754, available from the [Microsoft Download Center](https://www.microsoft.com/en-us/download/details.aspx?id=108285).
   - **SharePoint Server Subscription Edition**: Install KB5002768, also available from the [Microsoft Download Center](https://www.microsoft.com/en-us/download/details.aspx?id=108285).
   - **SharePoint Server 2016**: No patch is available yet. Microsoft is testing a fix, so monitor the [MSRC Blog](https://msrc.microsoft.com/blog/2025/07/customer-guidance-for-sharepoint-vulnerability-cve-2025-53770/) for updates.

2. **Enable Antimalware Scan Interface (AMSI)**:
   - AMSI integration, enabled by default in SharePoint Server 2016/2019 (September 2023 update) and Subscription Edition (Version 23H2), scans scripts and code in memory to block malicious payloads.
   - Deploy Microsoft Defender Antivirus on all SharePoint servers and ensure AMSI is set to Full Mode for optimal protection.

3. **Disconnect Public-Facing Servers**:
   - For unpatched systems (e.g., SharePoint 2016) or those without AMSI, disconnect from the internet or restrict access via VPN, proxy, or gateway to prevent exploitation.

4. **Rotate Cryptographic Keys**:
   - Attackers are stealing ValidationKey and DecryptionKey, which can be used to forge trusted payloads even after patching.
   - After applying patches, rotate keys using the PowerShell command: `Update-SPMachineKey -WebApplication <WebAppURL>`.
   - Restart IIS with `iisreset.exe` to apply changes.

5. **Deploy Microsoft Defender for Endpoint**:
   - Monitor for post-exploit activity, such as web shell deployment or lateral movement, using Microsoft Defender for Endpoint or equivalent solutions.
   - Look for specific alerts in the Microsoft Defender Security Center, including:
     - "Possible web shell installation"
     - "Possible exploitation of SharePoint server vulnerabilities"
     - "Suspicious IIS worker process behavior"
     - "IIS worker process loaded suspicious .NET assembly"
     - "‘SuspSignoutReq’ malware was blocked on a SharePoint server"
     - "‘HijackSharePointServer’ malware was blocked on a SharePoint server"
   - Use advanced hunting queries, such as those for detecting file creation of `spinstall0.aspx`, available at [Microsoft 365 Defender](https://security.microsoft.com/v2/advanced-hunting).

6. **Assume Compromise and Investigate**:
   - Given the scale of exploitation, assume any internet-exposed SharePoint server is compromised if it was unpatched before July 2025.
   - Conduct threat hunting using Microsoft Defender for Endpoint or SIEM/SOAR tools. Review IIS logs for suspicious POST requests to `/_layouts/15/ToolPane.aspx` and check for IoCs like IPs 107.191.58.76, 104.238.159.149, and 96.9.125.147 (active July 18-19, 2025).
   - Isolate suspected hosts and collect memory and SharePoint ULS logs for forensic analysis.

7. **Block Exploit Patterns**:
   - Update intrusion prevention systems (IPS) and web application firewalls (WAF) to block crafted Referer headers or malicious payloads targeting `/_layouts/15/ToolPane.aspx`.

8. **Decommission Unsupported Versions**:
   - SharePoint Server 2010 and 2013 are end-of-life and will not receive patches. Isolate or decommission these systems to reduce risk.

## Recommendations for Administrators
- **Immediate Action**: Apply patches for SharePoint 2019 and Subscription Edition immediately. For SharePoint 2016, monitor for patch updates and implement interim mitigations.
- **Strengthen Security Posture**:
  - Verify AMSI is enabled and configured correctly.
  - Deploy and actively monitor Microsoft Defender for Endpoint or equivalent solutions.
  - Rotate cryptographic keys regularly to prevent misuse of stolen credentials.
- **Incident Response**:
  - If a breach is suspected, report to CISA at Report@cisa.gov or (888) 282-0870.
  - Isolate affected systems and engage incident response teams for forensic analysis.
- **Adopt Zero-Trust Principles**: Implement a zero-trust security model to minimize risks, ensuring no user or service is inherently trusted, especially for internet-exposed systems.
- **Stay Informed**: Regularly check the [Microsoft Security Response Center](https://msrc.microsoft.com/blog/2025/07/customer-guidance-for-sharepoint-vulnerability-cve-2025-53770/) and [CISA alerts](https://www.cisa.gov/news-events/alerts/2025/07/20/microsoft-releases-guidance-exploitation-sharepoint-vulnerability-cve-2025-53770) for updates.

## References
- [Microsoft Security Response Center: Customer Guidance for SharePoint Vulnerability CVE-2025-53770](https://msrc.microsoft.com/blog/2025/07/customer-guidance-for-sharepoint-vulnerability-cve-2025-53770/)
- [CISA Alert: Microsoft Releases Guidance on Exploitation of SharePoint Vulnerability (CVE-2025-53770)](https://www.cisa.gov/news-events/alerts/2025/07/20/microsoft-releases-guidance-exploitation-sharepoint-vulnerability-cve-2025-53770)
- [Wiz Blog: SharePoint Vulnerabilities (CVE-2025-53770 & CVE-2025-53771)](https://www.wiz.io/blog/sharepoint-vulnerabilities-cve-2025-53770-cve-2025-53771-everything-you-need-to-k)
- [Eye Security Blog: SharePoint Under Siege: ToolShell Mass Exploitation](https://www.eyesecurity.com/blog/sharepoint-under-siege-toolshell-mass-exploitation)

## Conclusion
The CVE-2025-53770 and CVE-2025-53771 vulnerabilities represent a significant threat to on-premises SharePoint Server deployments, with active exploitation impacting organizations worldwide. Administrators must act swiftly to apply available patches, enable security features like AMSI, and investigate for signs of compromise. By following the mitigation steps outlined above and staying vigilant for updates, organizations can protect their SharePoint environments from these critical vulnerabilities.