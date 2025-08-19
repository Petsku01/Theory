Helsinki 2024 Data Breach Investigation Analysis

Overview

My report summarizes the P2024-01_Helsinki_tutkintaselostus.pdf, a detailed report by Finland’s Safety Investigation Authority (Onnettomuustutkintakeskus) on a major data breach in the City of Helsinki’s Education and Training Sector (KASKO) in April 2024. I’ve dug into the document to break down what happened, why, and how to prevent similar incidents. This is a must-read for anyone interested in cybersecurity, municipal IT, or data protection, offering a clear case study on systemic vulnerabilities and response strategies.
File Reference

File: P2024-01_Helsinki_tutkintaselostus.pdf
Source: Published by Onnettomuustutkintakeskus, available on their official website. (https://tietosuoja.fi/-/onnettomuustutkintakeskus-julkaisi-suosituksia-helsingin-kaupunkiin-kohdistuneen-tietomurron-seurauksena-tietosuojavaltuutetun-toimisto-jatkaa-asian-tutkintaa)
Publication Date: June 17, 2025


What’s in the Report?

The report details a sophisticated cyberattack that stole ~2 terabytes of sensitive data, including personal details of ~150,000 students, their guardians, and all 38,000 city employees. The breach exploited outdated systems and weak monitoring in KASKO’s network. Here’s the breakdown:
The Breach

Timeline: February–April 2024, with the main attack from April 25–30, 2024.

How It Happened:

Attackers probed a VPN router (Cisco ASA 5515) with 300,000+ connection attempts (Feb–Apr), unnoticed due to poor monitoring (page 4).
On April 25 at 13:17, they used a high school student’s credentials, sourced from the dark web, to access the internal network, exposing weak access control policies for non-admin accounts (pages 4, 75).
They scanned 9,945 IP addresses across 34 ports, triggering ignored firewall alerts (page 5).
By 15:07, the attacker accessed servers via remote desktop, stole Active Directory credentials, and controlled a virtual server environment and backup systems (page 5).
From April 26–30, they copied ~2 terabytes from network drives, mostly at night, using “Living Off The Land” (LOTL) techniques that mimic normal system activity to evade antivirus detection (page 11).
Attempts to breach other city domains and 1,700 devices failed (page 5).



Why It Happened

Tech Issues: An outdated, unpatched VPN router and a backup server infected with multiple versions of Neshta malware, rendering backups unusable (pages 5–6).
Organizational Gaps: No real-time firewall monitoring, incomplete logs, weak credentials, and insufficient staff training increased vulnerabilities (pages 19–75).
Management: Decentralized IT governance and unclear responsibilities delayed responses (page 75).

Response

Detection: Alerts on April 25 were missed due to a ticketing system error and no monitoring service. Critical alerts at 03:10 on April 30 prompted DigiHelsinki to lock accounts, revealing the breach (page 6).
Containment: The VPN router was disconnected on April 30 at 13:40, with its cable unplugged to preserve evidence. The backup server was isolated on May 8 after malware detection (pages 6–7).
Management: The city formed group(KASKO MIM) for response, holding dozens of meetings (page 7).
Communication: Notifications started April 30 via intranet, followed by Wilma (school platform), daycare channels, and a website (hel.fi/tietomurto) in multiple languages. Public disclosure began May 1 after media reports, with a briefing on May 13 via Helsinki Channel. Due to unidentified victims, including those with protected identities (turvakielto), the city used public GDPR notifications, reported to the Data Protection Ombudsman on May 8 (pages 8–10).

Consequences

Data Loss: ~2 terabytes stolen, including IDs, emails, and addresses (page 5).
Risks: Potential identity theft and fraud for affected individuals.
Costs: €2.6 million allocated for cybersecurity upgrades via DigiHelsinki Oy (page 83).
Reputation: Significant trust damage, with risks of future attacks (page 88).

Recommendations
The report (pages 81–83) offers five steps to prevent future breaches:

Harmonize data management laws across sectors to close gaps (2025-S4).
Develop accessible cybersecurity tools (e.g., Hyöky) for public organizations (2025-S5).
Create clear, multi-channel, age-appropriate breach communication protocols (2025-S6).
Support municipalities in regular risk assessments to fix vulnerabilities (2025-S7).
Helsinki’s action plan includes staff training, secure remote access, and better data management, with regular reporting (page 83).

Stakeholder Feedback
Pages 86–91 summarize input from key players:

Traficom: Stressed funding for tools like HAVARO and clearer NIS2 Directive roles.
Helsinki: Described the attack as professional, justified public notifications due to identification challenges, and pushed for centralized IT governance.
Kuntaliitto: Found recommendations broad, suggesting detailed action lists and more municipal support for existing regulations.

Why It Matters

This breach is a stark lesson for local governments. The student credentials entry point (page 4) highlights how a minor weakness can lead to massive data loss, exposing the need for robust access controls. Missed alerts due to no monitoring underscore the importance of real-time detection. The communication challenges, especially for those with protected identities (page 10), show the complexity of GDPR compliance. The breach also ties to EU regulations like the NIS2 Directive and Cyber Resilience Act, which set cybersecurity standards for devices and software (pages 83–84).

Resources

Full Report: P2024-01_Helsinki_tutkintaselostus.pdf
https://turvallisuustutkinta.fi/material/sites/otkes/otkes/hlsztol3t/P2024-01_Helsinki_tutkintaselostus.pdf

(https://tietosuoja.fi/-/onnettomuustutkintakeskus-julkaisi-suosituksia-helsingin-kaupunkiin-kohdistuneen-tietomurron-seurauksena-tietosuojavaltuutetun-toimisto-jatkaa-asian-tutkintaa)



My Final Thoughts

Reading this report, I was struck by how a sihongle student’s credentials could unravel such a massive breach—a tiny flaw with huge consequences. The lack of monitoring and outdated tech were glaring issues, and the communication hurdles show how tough it is to notify tusands under GDPR. The recommendations are practical, but funding and coordination will be critical, especially for smaller municipalities.

-PK
