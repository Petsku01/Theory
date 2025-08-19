# README: Workday Data Breach via Salesforce Instance Hacking (August 2025)

## Overview
This document details the Workday data breach disclosed on August 18, 2025, attributed to the threat actor group **ShinyHunters** (tracked as UNC6040). The breach involved unauthorized access to a third-party **Salesforce CRM instance** through social engineering tactics. Workday, a leading provider of HRM and finance software serving over **11,000 organizations** (including 60% of Fortune 500 companies), detected the breach on August 6, 2025, and promptly notified affected parties. No core HR systems, employee records, financial data, or customer tenants were compromised. The stolen data was limited to business contact information, posing risks for follow-on phishing and extortion campaigns.

This incident is part of a broader wave of attacks targeting Salesforce environments since early 2025, affecting organizations like Google, Adidas, Qantas, Allianz Life, Louis Vuitton, Dior, Tiffany & Co., Chanel, Cisco, Pandora, and Air France-KLM. Despite extensive research across web sources, cybersecurity reports, and X posts, no specific **README file** from ShinyHunters related to the Workday breach has been identified. The group typically uses **Telegram channels**, **hacking forums**, or **qTox/email** for extortion demands, posting teaser leaks, file samples, or negotiation screenshots rather than formal README files in data dumps. For example, the Allianz Life breach (2.8 million records, July 16, 2025) was announced via Telegram 



**Sources**: [Workday Blog](https://www.workday.com), [Cybersecurity News](https://cybersecuritynews.com), [X Posts](https://x.com), [Dark Web Monitoring](https://socradar.io).

## Attack Methodology
The breach leveraged **social engineering** rather than exploiting technical vulnerabilities in Salesforce:

- **Voice Phishing (Vishing) and Text Phishing**: Attackers impersonated Workday IT or HR staff via phone calls, texts, or emails to trick employees into authorizing a malicious **OAuth application** in the Salesforce CRM instance.
- **OAuth Abuse**: Once authorized, attackers used tools like modified **Salesforce Data Loder** or custom **Python scripts** to exfiltrate data.
- **Anonymity**: Attacks originated from **Mullvad VPN** and **TOR IPs** to evade detection.

This approach exploits OAuth's trust mechanism, where a single employee's error grants broad access. Stolen data from prior breaches enhances phishing credibility, making lures more convincing.

**Sources**: [BleepingComputer](https://www.bleepingcomputer.com), [The Hacker News](https://thehackernews.com), [Mandiant Reports](https://www.mandiant.com).

## Impacted Data
The compromise was confined to a disconnected Salesforce CRM instance, with no access to Workday’s core systems:

- **Data Types**:
  - Names
  - Email addresses
  - Phone numbers
  - Other publicly available business contact details
- **Sensitivity**: Low to medium; no sensitive PII (e.g., SSNs, Tax IDs, birth dates) or HR/financial data was accessed, unlike related breaches (e.g., Allianz Life included Tax IDs).
- **Risks**: Enables targeted spear-phishing, vishing, or extortion against Workday’s 11,000+ customers.

| Data Type          | Sensitivity Level | Potential Risks                  | Examples from Campaign         |
|--------------------|-------------------|----------------------------------|--------------------------------|
| Names             | Low-Medium       | Identity spoofing in phishing   | Used in vishing against Adidas |
| Email Addresses   | Medium           | Spear-phishing/extortion emails | Extortion against Qantas       |
| Phone Numbers     | Medium           | Vishing/SMS scams               | Follow-on attacks post-Google  |
| Business Notes    | Low              | Enhanced social engineering     | Seen in LVMH subsidiary leaks  |

**Scale**: Exact figures undisclosed for Workday, but comparable breaches (e.g., Allianz Life: 2.8 million records) suggest a potential for millions of records, though the actual scale remains unconfirmed.

**Sources**: [SecurityWeek](https://www.securityweek.com), [Dark Reading](https://www.darkreading.com), [Allianz Life Leak Analysis](https://socradar.io).

## Attribution and Broader Campaign
- **Threat Actor**: **ShinyHunters**, a financially motivated group with ties to Scattered Spider and Lapsus$. Known for high-profile breaches like AT&T (110M records), Ticketmaster, and Snowflake-linked incidents.
- **Campaign Scope**: Over **91 organiztations** targeted globally since early 2025, with extortions via teaser leaks on Telegram, qTox negotiations, and threats of public dumps.
- **Evolution**: Shift from data sales (2020–2024) to **extortion-as-a-service**, with plans for a dedicated leak site. Recent activity includes a Telegram channel reopened on August 8, 2025, demanding ransoms (e.g., 4 BTC ~$400K paid by one victim).
- **Workday Status**: No public data leak as of August 19, 2025, but risks remain due to ShinyHunters’ ongoing operations.

X discussions highlight OAuth vulnerabilities and mitigation strategies, with no mentions of a Workday-specific README.

**Sources**: [Krebs on Security](https://krebsonsecurity.com), [ThreatPost](https://threatpost.com), [X Cybersecurity Threads](https://x.com), [Telegram Monitoring](https://socradar.io).

## Workday’s Response and Mitigations
Workday acted swiftly to contain the breach:

- **Actions**:
  - Isolated the affected Salesforce CRM instance.
  - Enhanced internal security controls.
  - Notified impacted customers and partners via a blog post on August 18, 2025.
- **Recommendations**:
  1. **Audit OAuth Apps**: Review and revoke suspicious OAuth applications in Salesforce.
  2. **Enforce MFA**: Implement multi-factor authentication and conditional access policies.
  3. **Training**: Conduct vishing/phishing simulation training for employees.
  4. **Monitoring**: Track API activity and data exports for anomalies using SIEM tools.
  5. **Threat Intelligence**: Leverage platforms like SOCRadar or FraudGuard to monitor ShinyHunters’ tactics, techniques, and procedures (TTPs).

**Sources**: [Workday Blog](https://www.workday.com), [Salesforce Security Advisory](https://www.salesforce.com), [Cybersecurity Dive](https://www.cybersecuritydive.com).

## Potential Implications
The breach highlights **SaaS supply chain risks**, where human error in third-party platforms like Salesforce can lead to significant exposure. Potential consequences include:

- **Regulatory Scrutiny**: Exposure of PII may trigger investigations under **GDPR**, **CCPA**, or other data protection laws, potentially leading to fines. Organizations should monitor for regulatory updates, as fines under GDPR (up to 4% of annual revenue) or CCPA (up to $7,500 per violation) could apply if PII exposure is deemed mishandled.
- **Reputational Impact**: Limited scope mitigates damage for Workday (serving 70M+ users), but underscores the need for **zero-trust architectures** in cloud environments.
- **Ongoing Risks**: ShinyHunters’ plans for a leak site and direct extortions increase the likelihood of future data dumps or targeted attacks using stolen contacts.

**Sources**: [SC Media](https://www.scmagazine.com), [InfoSecurity Magazine](https://www.infosecurity-magazine.com), [GDPR Compliance Reports](https://www.gdpreu.org).

-pk
