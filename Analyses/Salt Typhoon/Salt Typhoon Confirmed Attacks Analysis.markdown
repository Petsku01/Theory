# Salt Typhoon Cyberattack: Confirmed Attacks in 2025

## Key Points
- **Confirmed Victims**: At least nine U.S. telecommunications companies, including Verizon, AT&T, T-Mobile (disputed), Spectrum, Lumen, Consolidated Communications, Windstream, and two unnamed providers, plus one unnamed Canadian telecom and Viasat, a satellite communications company.
- **Global Reach**: Reports suggest several dozen countries, including those in Europe and the Indo-Pacific, were affected, though specific non-North American victims remain unconfirmed.
- **Espionage Focus**: The campaign, likely backed by China’s Ministry of State Security, targeted sensitive data, including call metadata and surveillance systems, posing significant national security risks.
- **Controversy**: T-Mobile denies being impacted, despite reports listing it as a victim, highlighting uncertainty in some claims.
- **Urgent Action Needed**: The attacks expose vulnerabilities in telecom infrastructure, urging immediate patching, monitoring, and regulatory oversight.

### What We Know
Salt Typhoon, a Chinese state-sponsored cyber espionage campaign, has targeted telecommunications networks since at least 2019, with breaches detected in September 2024. It seems likely that the attackers exploited outdated systems to access sensitive data, such as call records and surveillance systems, affecting high-profile individuals like U.S. politicians.

### Why It’s Serious
The evidence leans toward Salt Typhoon being one of the most severe telecom hacks in recent years, compromising critical infrastructure and potentially allowing foreign actors to monitor communications. This could undermine trust in telecom providers and national security.

### What You Can Do
Telecom companies should patch vulnerabilities, enhance monitoring, and secure access points. Individuals, especially those in sensitive roles, should use encrypted communication tools to protect their data.

---

# Comprehensive Analysis of Salt Typhoon Confirmed Attacks

## Overview
Salt Typhoon is a sophisticated cyber espionage campaign, likely orchestrated by China’s Ministry of State Security (MSS), targeting telecommunications infrastructure worldwide. First reported in September 2024, the campaign has been active since at least 2019, compromising sensitive data and surveillance systems. This analysis, crafted from the perspective of a human cybersecurity analyst, details all confirmed attacks as of July 18, 2025, drawing from authoritative sources to outline the scope, methods, impacts, and necessary defenses. It serves as a critical resource for cybersecurity professionals, policymakers, and organizations aiming to understand and mitigate this threat.

## Confirmed Attacks
The following entities have been confirmed as victims of the Salt Typhoon cyberattack, based on reports from reputable sources:

| **Entity**                     | **Country** | **Date Reported** | **Source**                                                                 |
|--------------------------------|-------------|-------------------|---------------------------------------------------------------------------|
| Verizon                        | USA         | October 2024      | [SecurityWeek](https://www.securityweek.com/chinas-salt-typhoon-hacked-att-verizon-report/) |
| AT&T                           | USA         | October 2024      | [SecurityWeek](https://www.securityweek.com/chinas-salt-typhoon-hacked-att-verizon-report/) |
| T-Mobile (disputed)            | USA         | November 2024     | [Wall Street Journal](https://www.wsj.com/politics/national-security/t-mobile-hacked-in-massive-chinese-breach-of-telecom-networks-4b2d7f92) |
| Spectrum                       | USA         | Late 2024         | [Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)                   |
| Lumen                          | USA         | Late 2024         | [Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)                   |
| Consolidated Communications    | USA         | Late 2024         | [Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)                   |
| Windstream                     | USA         | Late 2024         | [Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)                   |
| Unnamed U.S. Telecom (1)       | USA         | Late 2024         | [Reuters](https://www.reuters.com/technology/cybersecurity/chinese-salt-typhoon-cyberespionage-targets-att-networks-secure-carrier-says-2024-12-29/) |
| Unnamed U.S. Telecom (2)       | USA         | Late 2024         | [Reuters](https://www.reuters.com/technology/cybersecurity/chinese-salt-typhoon-cyberespionage-targets-att-networks-secure-carrier-says-2024-12-29/) |
| Unnamed Canadian Telecom       | Canada      | February 2025     | [Ars Technica](https://arstechnica.com/security/2025/06/suspected-china-state-hackers-exploited-patched-flaw-to-breach-canadian-telecom/) |
| Viasat                         | Global      | June 2025         | [Bloomberg](https://www.bloomberg.com/news/articles/2025-06-17/viasat-identified-as-victim-in-china-linked-salt-typhoon-hack) |

**Additional Notes**:
- **Total U.S. Victims**: Nine U.S. telecommunications companies, including seven named (Verizon, AT&T, T-Mobile, Spectrum, Lumen, Consolidated Communications, Windstream) and two unnamed providers, as reported by Reuters.
- **T-Mobile Controversy**: T-Mobile has denied being impacted by Salt Typhoon, stating no sensitive consumer data was compromised ([Foreign Policy](https://foreignpolicy.com/2024/12/19/salt-typhoon-hack-explained-us-china-cyberattack/)). However, multiple sources, including the Wall Street Journal, list T-Mobile as a victim, creating uncertainty.
- **Global Scope**: Reports indicate that several dozen countries, including those in Europe and the Indo-Pacific, were compromised. Potential victims in Thailand, Italy, and South Africa have been mentioned in media reports but lack confirmation as of July 2025.
- **High-Profile Targets**: The campaign accessed call data from high-profile individuals, including U.S. President-elect Donald Trump, Vice President-elect J.D. Vance, and members of Kamala Harris’s campaign, via telecom systems rather than personal devices.

## The Attack
### Timeline
- **Active Since 2019**: The campaign likely began one to two years before its discovery, indicating long-term undetected access.
- **September 2024**: Initial reports emerged of breaches in U.S. telecommunications systems.
- **Through January 2025**: Ongoing intrusions were reported, with additional details uncovered.
- **February–June 2025**: Further victims, including an unnamed Canadian telecom and Viasat, were identified.

### How It Happened
- **Delivery and Exploitation**:
  - Attackers exploited a seven-year-old Cisco vulnerability (CVE-2018-0171) in unpatched routers to gain initial access.
  - Employed “Living Off The Land” (LOTL) tactics, using legitimate tools like PowerShell and Windows Management Instrumentation Command-line (WMIC) to blend with normal network activity and evade antivirus detection.
  - Deployed custom malware, such as “JumbledPath,” to chain remote connections between compromised Cisco devices and attacker-controlled hosts.
  - Chained additional vulnerabilities (e.g., CVE-2023-20198, CVE-2023-20273) to escalate privileges and enable lateral movement across networks.
  - Utilized the “GhostSpider” backdoor malware for persistent access and prolonged surveillance ([Picus Security](https://www.picussecurity.com/resource/blog/salt-typhoon-telecommunications-threat)).

- **Targets**:
  - Compromised “lawful intercept” systems used for court-ordered wiretaps, exposing call metadata, call contents, and surveillance data critical to national security.
  - Targeted telecommunications networks to gather intelligence on key government officials and corporate intellectual property.
  - Accessed call data from high-profile individuals, including U.S. political figures, enhancing espionage capabilities.

- **Scope**:
  - Confirmed breaches in nine U.S. telecoms, one Canadian telecom, and Viasat.
  - Global impact across several dozen countries, though specific non-North American victims remain unconfirmed.

### Why It Happened
- **Technological Vulnerabilities**:
  - Outdated telecom systems and unpatched Cisco devices created exploitable entry points.
  - Complex, sprawling network architectures increased the attack surface, complicating detection and containment.

- **Organizational Gaps**:
  - Poor network management and inadequate monitoring allowed attackers to remain undetected for years.
  - Reliance on vulnerable edge devices, such as routers, without robust security measures.

- **Sophistication of Attackers**:
  - Likely backed by China’s MSS, Salt Typhoon (also known as Earth Estries, FamousSparrow, GhostEmperor, and UNC2286) employed advanced techniques, including DLL sideloading, multi-layer encryption, and frequent backdoor updates.
  - The group’s high degree of organization, with multiple teams targeting different sectors, indicates significant resources and expertise ([Varonis](https://www.varonis.com/blog/salt-typhoon)).

## Response
- **Detection**:
  - CISA threat hunters identified Salt Typhoon on federal networks, leading to court-ordered server seizures in January 2025.
  - The FBI announced a $10 million bounty for information on individuals associated with the campaign in April 2025 ([Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)).

- **Containment**:
  - Affected telecoms are still working to expel attackers due to the campaign’s depth and persistence.
  - CISA, NSA, and FBI issued hardening guidance for Cisco devices in December 2024 to address exploited vulnerabilities.

- **Management**:
  - The U.S. House Committee on Homeland Security requested documents from the Department of Homeland Security in March 2025 to review the federal response ([Congress.gov](https://www.congress.gov/crs-product/IF12798)).
  - The Cyber Safety Review Board was not reconvened by March 2025, delaying a comprehensive investigation.
  - The U.S. Treasury sanctioned Sichuan Juxinhe Network Technology Co. and hacker Yin Kecheng in January 2025 for their involvement in Salt Typhoon and related attacks ([Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)).

## Consequences
- **Data Loss**:
  - Massive exposure of call metadata, communications, and surveillance data, undermining U.S. national security.
  - Compromised intellectual property and government communications, enhancing China’s espionage capabilities.

- **Risks**:
  - Potential for Chinese operatives to evade U.S. monitoring by exploiting compromised surveillance systems.
  - Significant erosion of public trust in telecommunications providers, impacting consumer confidence.

- **Costs**:
  - High remediation and compliance costs for affected companies, including system recovery, legal fees, and infrastructure upgrades.

- **Reputation**:
  - Described as one of the worst telecom hacks by Sen. Mark Warner, highlighting its severity ([Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)).
  - Public concern over the security of critical infrastructure has intensified, prompting calls for regulatory action.

## Recommendations
To mitigate the risks posed by Salt Typhoon and prevent similar attacks, the following measures are recommended:

- **Patch Vulnerabilities**:
  - Apply patches for known flaws (e.g., CVE-2018-0171, CVE-2023-20198, CVE-2023-20273).
  - Follow Cisco’s IOS XE hardening guides for secure device configuration ([CISA Guidance](https://www.cisa.gov/news-events/cybersecurity-advisories)).

- **Enhance Monitoring**:
  - Deploy real-time threat detection and AI-driven tools, such as Armis Centrix™, to identify anomalies early.
  - Regularly audit network activity for signs of unauthorized access.

- **Strengthen Access Controls**:
  - Implement multi-factor authentication (MFA) for all critical systems.
  - Use strong, unique passwords and disable non-essential services (e.g., telnet, SMI).

- **Network Segmentation**:
  - Isolate external services in demilitarized zones (DMZs) with strict access control lists (ACLs) to limit lateral movement.

- **Encrypted Communications**:
  - Encourage senior officials and organizations to use end-to-end encrypted messaging to protect sensitive data.

## Stakeholder Feedback
- **CISA Director Jen Easterly**:
  - Emphasized outdated telecom architectures and edge devices as critical vulnerabilities, urging modernization ([Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)).

- **FBI**:
  - Highlighted the attack’s sophistication and offered a $10 million bounty for information, encouraging public cooperation ([FBI Alert](https://www.fbi.gov/news???
- **Industry Experts**:
  - Dmitri Alperovitch called for an independent Cyber Safety Review Board to assess the breach’s impact fully.
  - Cisco Talos stressed securing credentials and monitoring over relying solely on patches ([Cisco Talos Blog](https://blog.talosintelligence.com/)).

- **Congress**:
  - Sen. Ron Wyden blocked a CISA nominee pending a telecom security report, while Rep. William Timmons pushed for stronger defenses ([Wikipedia](https://en.wikipedia.org/wiki/Salt_Typhoon)).

## Why It Matters
Salt Typhoon represents a critical wake-up call for the telecommunications industry and governments worldwide (not coming). Its exploitation of long-standing vulnerabilities in critical infrastructure highlights the urgent need for better cybersecurity practices. The compromise of surveillance systems and sensitive data poses significant risks to national security, potentially allowing adversaries to evade monitoring. The campaign’s global reach, affecting dozens of countries, underscores the interconnected nature of modern cyber threats. Alignment with standards like the EU’s Cyber Resilience Act and NIST frameworks is essential to bolster defenses and restore trust.

## Resources
- [Cisco Talos Blog: Salt Typhoon Campaign Analysis](https://blog.talosintelligence.com/) (February 20, 2025)
- [CISA Guidance: Enhanced Visibility and Hardening Guidance](https://www.cisa.gov/news-events/cybersecurity-advisories) (December 3, 2024)
- [FBI Alert: Salt Typhoon Information Request](https://www.fbi.gov/???) (April 24, 2025)
- [U.S. Treasury: Salt Typhoon Sanctions Announcement](https://home.treasury.gov/???) (January 17, 2025)
- [Wikipedia: Salt Typhoon](https://en.wikipedia.org/wiki/Salt_Typhoon) (accessed July 18, 2025)

## Final Thoughts
-Holy f**cking s***
-pk