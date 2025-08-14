# The "Red Hackers" Who Shaped China's Cyber Ecosystem

## Overview
This README analyzes the July 2025 report *"The 'Red Hackers' Who Shaped China’s Cyber Ecosystem"* by Eugenio Benincasa (CSS, ETH Zürich), which traces the evolution of China's "red hackers" or "Honkers" (红客) from 1990s hacktivists to architects of its modern cyber ecosystem. The report identifies 40 elite individuals ("The Red 40") whose careers bridge grassroots patriotism to state-sponsored advanced persistent threats (APTs) and professional cybersecurity. This analysis integrates the full 74-page report, 2025 web updates (e.g., i-SOON leaks, APT40/41 activities), and X posts for real-time context.

Key themes include origins, skill development, professionalization, state integration, and legacy in today's "New School" hackers, with insights on global implications.

## Key Insights

### 1. Origins and Structure (1990s–2000s)
- **Context**: China's 1994 internet connection via CERNET (university network) enabled hacking culture. Geopolitical triggers (e.g., 1998 Indonesia riots, 1999 US embassy bombing) sparked "cyber patriotic wars" against US, Taiwan, Japan.
- **Groups**: Major players included Green Army (1997, Gong Wei/goodwell), China Eagle Union (1997, Wan Tao/eagle), Honker Union (2000, Lin Yong/lion), Xfocus (1999, Zhang Xundi/xundi). Red Hacker Alliance (RHA) coordinated efforts.
- **Demographics**: Mostly male students (teens–20s). Groups claimed large memberships (e.g., Honker ~80,000), but cores were small (~200 total). Core members handled technical/strategic roles; registered users were often amateurs.
- **Motivations**: Nationalism, curiosity, status-seeking. Post-2001, shifted to skill-building as government discouraged mass hacktivism.

| Group              | Founded | Founder                  | Core Members (Est.) | Registered Users (Peak) |
|--------------------|---------|--------------------------|---------------------|-------------------------|
| Green Army         | 1997    | Gong Wei (goodwell)      | 40                  | 3,000                   |
| China Eagle Union  | 1997    | Wan Tao (eagle)          | 50                  | 113,059 (2007)          |
| Honker Union       | 2000    | Lin Yong (lion)          | 8                   | 80,000                  |
| Xfocus             | 1999    | Zhang Xundi (xundi)      | 18                  | 51,249 (2012)           |
| Ph4nt0m Security   | 2001/02 | Wu Hanqing (ci)          | 20                  | 6,903 (2006)            |
| EvilOctal Security | 2002    | Lin Lin (bingxue fengqing) | 31                | 9,562 (2007)            |
| 0x557              | 2003    | Wang Junqing (la0wang)   | 23                  | N/A                     |
| NCPH               | 2004    | Tan Dailin (wicked rose) | 10                  | N/A                     |

### 2. Skill Development and Tools
- **Training**: No formal education; groups served as "academies." Taiwanese hacker Coolfire's "Hacker Entry-Level Tutorial Series" and "13 Rules" (e.g., minimize harm, restore systems) shaped "defense through offense" ethos.
- **Tool Development**: Evolved from DDoS/defacements (1990s) to zero-days (2000s). Key tools:
  - **Glacier RAT** (1999, Huang Xin): China's first domestic Trojan.
  - **X-Scan** (2000, Huang Xin): Vulnerability scanner, still used.
  - **HTRAN** (2003, Lin Yong): Network obfuscation tool.
  - **GinWui rootkit** (2006, Tan Dailin): Targeted US DoD.
  - **PlugX/ShadowPad** (2008, Tan Dailin/Zhou Jibing): Core to APT campaigns.
- **Elite Talent**: Red 40 (e.g., from Green Army, Xfocus, 0x557) dominated via informal challenges. Tools shared freely, later repurposed for APTs.

**Timeline of Offensive Tools**:
```
1999: Glacier RAT (Huang Xin)
2000: X-Scan (Huang Xin)
2003: HTRAN (Lin Yong)
2006: GinWui rootkit (Tan Dailin)
2008: PlugX/ShadowPad (Tan Dailin, Zhou Jibing)
```

### 3. Transition to Professionals (2000s–2010s)
- **Decline of Groups**: Fractured due to:
  - **Government Crackdowns**: 2009 Criminal Law Amendment VII criminalized intrusions, leading to arrests (e.g., Tan Dailin). People’s Daily (2001) condemned "web terrorism."
  - **Internal Issues**: Leadership disputes, aging members (e.g., Wan Tao noted fading passion).
  - **Economic Pull**: ICT sector growth offered jobs.
- **Professionalization**: Red 40 founded firms:
  - **NSFOCUS** (2000, Gong Wei): Intrusion detection, MAPP partner (2009).
  - **Knownsec** (2007, Zhao Wei): Cloud security leader.
  - **Anluo Tech** (2000, Dong Zhiqiang): Early APT detection.
- **Big Tech Roles**: Wu Hanqing (Alibaba Cloud Shield), Ji Xinhua (Tencent Security Platform). Tackled threats like Panda Burning Incense virus (2007).
- **State Recruitment**: PLA/MSS used forums (e.g., EvilOctal) for hiring. Tan Dailin trained for PLA ops (2006). Topsec/Venustech (PLA-linked) employed Red 40 as instructors.

**Red 40 Career Trajectories (2000s–2010)**:
| Name                | Group         | Role (2000s–2010)                     |
|---------------------|---------------|---------------------------------------|
| Gong Wei (goodwell) | Green Army    | Founded NSFOCUS (IDS, firewalls)      |
| Wu Hanqing (ci)     | Ph4nt0m       | Alibaba Cloud security architect      |
| Tan Dailin (wicked rose) | NCPH     | PLA-trained, GinWui rootkit developer |

### 4. Current Roles and Legacy (2010s–2025)
- **Industry Surge**: Snowden leaks (2013) and Xi Jinping's "cyber powerhouse" push (2014) integrated cybersecurity with AI/big data. Red 40 led:
  - **Vulnerability Labs**: Tencent’s Xuanwu/Yunding, Alibaba’s YunDun.
  - **Startups**: UCloud (Ji Xinhua, 2012), Moan Tech (Wei Xingguo, 2016), Hufu (Wang Wei, 2019).
- **APT Involvement**: Red 40 in state ops:
  - **APT41**: Tan Dailin, indicted for 100+ hacks (2020, Treasury breach 2024).
  - **APT17**: Zeng Xiaoyong (envymask), SharePoint exploits (2024).
  - **APT27**: Zhou Shuai (coldface), sanctioned (Mar 2025).
  - **Red Hotel (Aquatic Panda)**: i-SOON (Wu Haibo/Chen Cheng), 20 govts targeted.
- **Tool Networks**: PlugX/ShadowPad shared across 10+ APTs (MITRE ATT&CK). i-SOON leaks (2024–2025) show exploit-sharing with Pangu Team.
- **Mentoring New School**: Red 40 judge CTFs (XPwn/MOSEC), run Operation Myth (Wang Yingjian, 2015). Attack-defense firms (e.g., BoundaryX) dominate.

**Red 40 Trajectories (2010s–2025)**:
| Name                | Group         | Current Role (2025)                   |
|---------------------|---------------|---------------------------------------|
| Wu Hanqing (ci)     | Ph4nt0m       | Alibaba Cloud security chief          |
| Ji Xinhua           | Xfocus        | UCloud founder, Tencent security lead |
| Tan Dailin (wicked rose) | NCPH     | APT41 operator, indicted (2020)       |

### 2025 Web and X Updates
- **Report Coverage**: Wired (Jul 18, 2025) calls Honkers "backbone of espionage." RUSI (Jul 22, 2025) ties Red 40 to cyber power. Natto Thoughts (2024–2025) links HTRAN to APT1.
- **i-SOON Leaks**: US indicted 12 nationals (Mar 2025) for hacks on 20 govts (Justice.gov). Economist (Mar 25, 2025): "Bigger, stealthier." Sekoia.io (Nov 2024) details hack-for-hire ($55k/Vietnam data).
- **APT Activities**: CSIS (2025) reports SE Asia hacks. FBI removed PlugX from 4k US systems (Jan 2025). APT40 exploits SharePoint (BleepingComputer, Jul 2024).
- **X Insights**: @KimZetter (Jul 2025) notes PLA/MSS recruitment. Threads on North Korean VPS links, SharePoint vulnerabilities.
- **Context**: Cybersecurity Ventures (Feb 2025) estimates $10.5T global cybercrime, with China prominent.

## Conclusions and Implications
- **Evolution**: Red hackers transformed from patriotic amateurs to state-backed pros, creating a hybrid ecosystem blending innovation and control.
- **Legacy**: Red 40's tools (PlugX), firms (NSFOCUS), and mentoring shape New School hackers. i-SOON leaks confirm ongoing APT enablement.
- **Global Lessons**: Nations can harness informal talent, but ethical/legal risks loom (e.g., coercion). Ukraine’s IT Army parallels Honkers.
- **Future**: Monitor New School’s APT integration. Explore "blue hackers" (non-aligned) for untapped insights.

## Sources
- Benincasa, E. (2025). *The 'Red Hackers' Who Shaped China’s Cyber Ecosystem*. CSS, ETH Zürich. [PDF](https://ethz.ch/content/dam/ethz/special-interest/gess/cis/center-for-securities-studies/pdfs/before-vegas-cyberdefense-report.pdf)
- Web: Wired, RUSI, Natto Thoughts, Justice.gov (2025)
- X: @KimZetter, @CyberThreatIntel (2025)
- Additional: MITRE ATT&CK, SentinelOne, Sekoia.io, CSIS


-pk