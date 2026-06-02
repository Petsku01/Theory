export interface BlogPost {
  title: string;
  date: string;
  desc: string;
  link: string;
}

export interface Project {
  name: string;
  desc: string;
  tech: string;
  link: string;
}

export const blogPosts: BlogPost[] = [
  {
    title: "Do Verified Trajectories Improve Software-Agent Reliability?",
    date: "2025-05-08",
    desc: "Research on conditioning LLM agents with verified experience trajectories: 4-condition pilot (80+240 runs) showing modest reliability gains over instruction-only baselines",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/LLM/do_verified_trajectories_improve_software_agent_reliability_cleaned_statfix.pdf"
  },
  {
    title: "Interface Reliability in Verified Software-Agent Evaluation",
    date: "2025-05-08",
    desc: "Paper examining whether verified trajectories improve interface reliability in software-agent evaluation tasks",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/LLM/Interface%20Reliability%20in%20Verified%20Software-Agent%20Evaluation_pk.pdf"
  },
  {
    title: "Prompt Optimizer: Fine-Tuning LLMs to Rewrite Vague Prompts",
    date: "2025-05-21",
    desc: "Qwen2.5-3B-Instruct + QLoRA pipeline that transforms vague prompts into structured, effective ones. 1183 pairs, full training and evaluation",
    link: "https://github.com/Petsku01/prompt-optimizer"
  },
  {
    title: "Salt Typhoon Cyberattack Analysis",
    date: "2025-07-01",
    desc: "Analysis of Chinese state-sponsored telecom espionage targeting nine U.S. carriers and global infrastructure",
    link: "https://github.com/Petsku01/Theory/tree/main/Analyses/Salt%20Typhoon"
  },
  {
    title: "SharePoint CVE-2025-53770 Analysis",
    date: "2025-07-01",
    desc: "Deep dive into the critical SharePoint RCE vulnerability bypass (ToolShell variant) with active exploitation",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/SharePoint%20Vulnerability%20(CVE-2025-53770)%20Analysis.md"
  },
  {
    title: "Naval Group Cyber Breach Analysis",
    date: "2025-07-01",
    desc: "Investigation of the alleged 1TB data theft from France's leading naval defense contractor",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Naval%20Group%20Cyber%20Breach%20Analysis%20(July%202025).markdown"
  },
  {
    title: "CitrixBleed 2 Vulnerability Analysis (CVE-2025-5777)",
    date: "2025-06-01",
    desc: "Critical session hijacking and MFA bypass in NetScaler ADC/Gateway with 11.5M+ attack attempts",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/CitrixBleed_Vulnerability_Analysis.markdown"
  },
  {
    title: "Spacecraft Software Security Vulnerabilities",
    date: "2025-06-01",
    desc: "Black Hat USA 2025 research on critical flaws in satellite command-and-control open-source software",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Spacecraft%20Software%20Security%20Vulnerabilities.markdown"
  },
  {
    title: "Helsinki 2024 Data Breach Investigation",
    date: "2025-06-01",
    desc: "OTKES investigation analysis of the KASKO breach affecting 300K+ people in Helsinki's education sector",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Helsinki%202024%20Data%20Breach%20Investigation.md"
  },
  {
    title: "The Red 40: China's Cyber Ecosystem",
    date: "2025-07-01",
    desc: "Analysis of 40 elite Chinese hackers from grassroots hacktivists to state-sponsored APT architects",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/red40.md"
  },
  {
    title: "The Conficker Worm",
    date: "2025-01-01",
    desc: "Technical and historical analysis of history's most restrained superworm despite infecting 9-15M systems",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/The%20Conficker%20Worm.md"
  },
  {
    title: "Prompt Engineering 07: Evaluating Prompts",
    date: "2025-04-01",
    desc: "Building evaluation loops that catch failures before users do -- from labeled datasets to automated scoring",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2007%20-%20Evaluating%20Prompts.md"
  },
  {
    title: "Prompt Engineering 06: Context Engineering and Long Context",
    date: "2025-04-01",
    desc: "Why long context degrades accuracy, why needle-in-a-haystack is misleading, and what actually works",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2006%20-%20Context%20Engineering%20and%20Long%20Context.md"
  },
  {
    title: "Prompt Engineering 05: Agent Design Patterns",
    date: "2025-04-01",
    desc: "ReAct, Reflection, Plan-and-Execute, Tool Use, Multi-Agent Orchestration -- five patterns for reliable agents",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2005%20-%20Agent%20Design%20Patterns.md"
  },
  {
    title: "Prompt Engineering 04: Prompting for RAG Systems",
    date: "2025-04-01",
    desc: "Prompt-side concerns in RAG: grounding, hallucination handling, chunk relevance, and retrieval quality",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2004%20-%20Prompting%20for%20RAG%20Systems.md"
  },
  {
    title: "Prompt Engineering 03: Structured Output and Production Prompts",
    date: "2025-04-01",
    desc: "From chat toy to production component: JSON mode, schema enforcement, cost control, and defense against misuse",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2003%20-%20Structured%20Output%20and%20Production%20Prompts.md"
  },
  {
    title: "Prompt Engineering 02: Reasoning and Chain of Thought",
    date: "2025-04-01",
    desc: "Why \"just answer\" fails, how CoT gives models compute budget, and advanced reasoning techniques",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2002%20-%20Reasoning%20and%20Chain%20of%20Thought.md"
  },
  {
    title: "Prompt Engineering 01: Fundamentals",
    date: "2025-04-01",
    desc: "Core principles of prompt engineering: clarity, specificity, structure, and iteration as the four levers",
    link: "https://github.com/Petsku01/Theory/blob/main/Analyses/Prompt%20Engineering%2001%20-%20Fundamentals.md"
  },
  {
    title: "Polymorphic Malware Detection",
    date: "2024-12-01",
    desc: "Exploring detection techniques for polymorphic malware",
    link: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py"
  },
  {
    title: "Honeypot Implementation",
    date: "2024-11-15",
    desc: "Building a meta honeypot for security research",
    link: "https://github.com/Petsku01/Theory/tree/main/Hpots"
  },
  {
    title: "VDI Performance Analysis",
    date: "2024-10-20",
    desc: "Diagnosing and troubleshooting VDI environments",
    link: "https://github.com/Petsku01/Theory/tree/main/VDI%20Performance%20Diagnostic"
  },
  {
    title: "MFA Implementation Patterns",
    date: "2024-09-10",
    desc: "Different approaches to multi-factor authentication",
    link: "https://github.com/Petsku01/Theory/tree/main/MFA_Theory"
  },
  {
    title: "Compression Algorithms in Rust",
    date: "2024-08-05",
    desc: "Testing and comparing compression techniques",
    link: "https://github.com/Petsku01/Theory/tree/main/Compression_tests"
  },
  {
    title: "Network Security Analysis",
    date: "2024-07-01",
    desc: "Tools and techniques for network security",
    link: "https://github.com/Petsku01/Theory/tree/main/Analyses"
  },
];

export const projects: Project[] = [
  { name: "Prompt Optimizer", desc: "LLM fine-tuning project: Qwen2.5-3B-Instruct + QLoRA transforms vague prompts into structured, effective ones. Full pipeline (data generation, training, evaluation, HuggingFace publish)", tech: "Python, Unsloth, QLoRA", link: "https://github.com/Petsku01/prompt-optimizer" },
  { name: "Prompt Security Guide", desc: "LLM security testing framework with jailbreak detection, defense testing, and JailbreakBench integration", tech: "Python", link: "https://github.com/Petsku01/Prompt-Security-Guide" },
  { name: "PromptKit", desc: "Prompt engineering toolkit with Prompt Doctor analysis and pattern library", tech: "Python", link: "https://github.com/Petsku01/promptkit" },
  { name: "VET Pilot", desc: "Verified software-agent evaluation: challenge tasks, trajectory annotation, and scalability analysis for LLM agents", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Analyses/LLM/vet_pilot" },
  { name: "VDI Performance Diagnostic", desc: "PowerShell tool for diagnosing VDI performance issues", tech: "PowerShell", link: "https://github.com/Petsku01/Theory/tree/main/VDI%20Performance%20Diagnostic" },
  { name: "Network Design Tool", desc: "Tool for network design and planning", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Network%20Design%20tool" },
  { name: "Honeypot System", desc: "Meta honeypot implementation for security research", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Hpots" },
  { name: "Backup System", desc: "GUI-based backup solution with Tkinter", tech: "Python", link: "https://github.com/Petsku01/Theory/tree/main/Backup_1.01" },
  { name: "Compression Tests", desc: "Compression algorithms and testing", tech: "Rust", link: "https://github.com/Petsku01/Theory/tree/main/Compression_tests" },
  { name: "MFA Theory", desc: "Multi-factor authentication implementations", tech: "JavaScript", link: "https://github.com/Petsku01/Theory/tree/main/MFA_Theory" },
  { name: "Pentesting Tools", desc: "Collection of penetration testing utilities", tech: "Various", link: "https://github.com/Petsku01/Theory/tree/main/Pentesting" },
  { name: "Hash Generator", desc: "Web-based hash generation tool", tech: "HTML/JavaScript", link: "https://github.com/Petsku01/Theory/blob/main/Hash_Generator.html" },
  { name: "Malware Detection Demo", desc: "Polymorphic malware detection demonstration", tech: "Python", link: "https://github.com/Petsku01/Theory/blob/main/malware_detection_polymorph_demo.py" },
  { name: "Lagswitch Detector", desc: "Tool for detecting suspected lagswitch behavior", tech: "Python", link: "https://github.com/Petsku01/Theory/blob/main/Flag_suspected_lagswitch.py" },
];