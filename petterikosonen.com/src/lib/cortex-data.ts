/**
 * Neural Cortex -- node graph data structure
 * Defines all nodes, clusters, and edges for the 3D portfolio
 */

export interface CortexNode {
  id: string;
  label: string;
  type: "core" | "project" | "skill" | "experience" | "research";
  shortDesc: string;
  fullDesc?: string;
  tech?: string[];
  link?: string;
  color: string; // hex color
  size: number; // node radius multiplier
  cluster: string; // which group it belongs to
}

export interface CortexEdge {
  from: string;
  to: string;
  strength: number; // 0-1, affects particle speed/density
}

// Positions are calculated dynamically in layout
// This is the semantic relationship graph
export const nodes: CortexNode[] = [
  // ── Core ──
  {
    id: "petteri",
    label: "Petteri Kosonen",
    type: "core",
    shortDesc: "Security Engineer + AI Researcher",
    fullDesc:
      "Building tools that make AI safer. Security engineer at 2M-IT, focused on LLM fine-tuning, prompt security, and trustworthy automation.",
    color: "#00ff88",
    size: 2.0,
    cluster: "core",
  },

  // ── Projects cluster ──
  {
    id: "prompt-optimizer",
    label: "Prompt Optimizer",
    type: "project",
    shortDesc: "LLM fine-tuning pipeline",
    fullDesc:
      "Qwen2.5-3B-Instruct + QLoRA transforms vague prompts into structured, effective ones. Full pipeline: data generation, training, evaluation, HuggingFace publish.",
    tech: ["Python", "Unsloth", "QLoRA", "HuggingFace"],
    link: "https://github.com/Petsku01/prompt-optimizer",
    color: "#00ff88",
    size: 1.4,
    cluster: "projects",
  },
  {
    id: "psg",
    label: "Prompt Security Guide",
    type: "project",
    shortDesc: "Jailbreak defense testing",
    fullDesc:
      "LLM security testing framework with jailbreak detection, defense evaluation, and JailbreakBench integration.",
    tech: ["Python", "JailbreakBench", "Security evaluation"],
    link: "https://github.com/Petsku01/Prompt-Security-Guide",
    color: "#00f0ff",
    size: 1.3,
    cluster: "projects",
  },
  {
    id: "promptkit",
    label: "PromptKit",
    type: "project",
    shortDesc: "Prompt engineering toolkit",
    fullDesc:
      "Pattern-driven prompt library with Prompt Doctor analysis and workflow modules for faster prompt experimentation.",
    tech: ["Python", "Prompt patterns", "AI workflow tooling"],
    link: "https://github.com/Petsku01/promptkit",
    color: "#a78bfa",
    size: 1.2,
    cluster: "projects",
  },
  {
    id: "vet-pilot",
    label: "VET Pilot",
    type: "project",
    shortDesc: "Verified agent evaluation",
    fullDesc:
      "Verified software-agent evaluation: challenge tasks, trajectory annotation, and scalability analysis for LLM agents.",
    tech: ["Python"],
    link: "https://github.com/Petsku01/Theory/tree/main/Analyses/LLM/vet_pilot",
    color: "#fbbf24",
    size: 1.1,
    cluster: "projects",
  },

  // ── Skills cluster ──
  {
    id: "security",
    label: "Security",
    type: "skill",
    shortDesc: "Operational security (78%)",
    fullDesc: "Defender EDR, threat triage, XSS/SQLi basics, TryHackMe labs. Growing into adversarial AI security.",
    tech: ["EDR", "Threat triage", "XSS/SQLi", "TryHackMe"],
    color: "#ff0055",
    size: 1.2,
    cluster: "skills",
  },
  {
    id: "cloud",
    label: "Cloud / Microsoft",
    type: "skill",
    shortDesc: "Advanced support (85%)",
    fullDesc: "Entra ID, Intune, Exchange Online, Active Directory, Office 365. Enterprise-grade Microsoft administration.",
    tech: ["Entra ID", "Intune", "Exchange Online", "AD", "O365"],
    color: "#00f0ff",
    size: 1.2,
    cluster: "skills",
  },
  {
    id: "automation",
    label: "Automation",
    type: "skill",
    shortDesc: "Practical automation (72%)",
    fullDesc: "PowerShell scripting, Python automation, ServiceNow flows, SQL diagnostics.",
    tech: ["PowerShell", "Python", "ServiceNow", "SQL"],
    color: "#00ff88",
    size: 1.1,
    cluster: "skills",
  },
  {
    id: "ai-prompting",
    label: "AI / Prompting",
    type: "skill",
    shortDesc: "Applied research (68%)",
    fullDesc: "Prompt engineering, LLM guardrails, jailbreak testing, PromptKit patterns. Building the frontier of prompt security.",
    tech: ["Prompt engineering", "LLM guardrails", "Jailbreak testing", "PromptKit"],
    color: "#a78bfa",
    size: 1.1,
    cluster: "skills",
  },

  // ── Experience cluster ──
  {
    id: "2m-it",
    label: "2M-IT",
    type: "experience",
    shortDesc: "Application Specialist (2022-)",
    fullDesc: "First-line IT support: phone, passwords, troubleshooting. Email/service channel preferred over phone.",
    color: "#00f0ff",
    size: 1.1,
    cluster: "experience",
  },
  {
    id: "turku-amk",
    label: "Turku AMK",
    type: "experience",
    shortDesc: "B.Eng. Cybersecurity (2020-)",
    fullDesc: "ICT, Data Networks and Cybersecurity. Applied research in LLM security and prompt engineering.",
    color: "#a78bfa",
    size: 1.0,
    cluster: "experience",
  },

  // ── Research cluster ──
  {
    id: "reframing",
    label: "Reframing Attack",
    type: "research",
    shortDesc: "Prompt injection preprint",
    fullDesc:
      "9 models, 10 categories, 222 tests. Cloud models: 88% direct refusal, reframed prompts drop to 52%. V2.2 with cross-model review.",
    link: "https://github.com/Petsku01/Prompt-Security-Guide",
    color: "#ff0055",
    size: 1.2,
    cluster: "research",
  },
  {
    id: "blog",
    label: "Daily Research",
    type: "research",
    shortDesc: "LLM research blog",
    fullDesc: "Daily analysis of AI, security, and the tech stack. Automated pipeline with multi-model analysis.",
    color: "#fbbf24",
    size: 1.0,
    cluster: "research",
  },

  // ── Demo / Easter egg ──
  {
    id: "injection-scanner",
    label: "Injection Scanner",
    type: "project",
    shortDesc: "Try to break in",
    fullDesc:
      "Interactive demo: type a prompt injection attempt and watch the neural graph react. Benign prompts keep the network stable; adversarial inputs cause red distortion.",
    color: "#ff0055",
    size: 1.3,
    cluster: "projects",
  },

  // ── Additional skill nodes ──
  {
    id: "python",
    label: "Python",
    type: "skill",
    shortDesc: "Primary language",
    fullDesc: "Scripting, automation, data pipelines, ML training. The backbone of most projects.",
    tech: ["Python", "FastAPI", "Pandas", "PyTorch"],
    color: "#22d3ee",
    size: 1.0,
    cluster: "skills",
  },
  {
    id: "linux",
    label: "Linux",
    type: "skill",
    shortDesc: "Systems & networking",
    fullDesc: "Server administration, networking, shell scripting, WSL environments.",
    tech: ["Bash", "systemd", "Networking", "Docker"],
    color: "#fbbf24",
    size: 1.0,
    cluster: "skills",
  },
  {
    id: "web-dev",
    label: "Web Dev",
    type: "skill",
    shortDesc: "Full-stack (Next.js)",
    fullDesc: "React/Next.js, Tailwind, Three.js, WebGL. Building this portfolio and interactive demos.",
    tech: ["React", "Next.js", "Tailwind", "Three.js"],
    color: "#a855f7",
    size: 1.0,
    cluster: "skills",
  },

  // ── Additional project nodes ──
  {
    id: "hetuguard",
    label: "HetuGuard",
    type: "project",
    shortDesc: "Finnish SSN scanner",
    fullDesc: "CLI tool for detecting and redacting Finnish personal identity codes. 370+ tests, multiple formats.",
    tech: ["Python", "Regex", "CLI"],
    link: "https://github.com/Petsku01/hetuguard",
    color: "#22d3ee",
    size: 1.1,
    cluster: "projects",
  },

  // ── Additional research nodes ──
  {
    id: "llm-research",
    label: "LLM Research Daily",
    type: "research",
    shortDesc: "Automated LLM scanning",
    fullDesc: "Daily automated pipeline scanning Hacker News for LLM research. Multi-model analysis with DeepSeek V4 Pro and Kimi K2.6.",
    color: "#ef4444",
    size: 1.0,
    cluster: "research",
  },
];

export const edges: CortexEdge[] = [
  // Core to projects
  { from: "petteri", to: "prompt-optimizer", strength: 0.9 },
  { from: "petteri", to: "psg", strength: 0.9 },
  { from: "petteri", to: "promptkit", strength: 0.8 },
  { from: "petteri", to: "vet-pilot", strength: 0.7 },

  // Core to skills
  { from: "petteri", to: "security", strength: 0.8 },
  { from: "petteri", to: "cloud", strength: 0.7 },
  { from: "petteri", to: "automation", strength: 0.6 },
  { from: "petteri", to: "ai-prompting", strength: 0.9 },

  // Projects to skills
  { from: "prompt-optimizer", to: "ai-prompting", strength: 0.9 },
  { from: "psg", to: "security", strength: 0.9 },
  { from: "psg", to: "ai-prompting", strength: 0.7 },
  { from: "promptkit", to: "ai-prompting", strength: 0.8 },
  { from: "vet-pilot", to: "automation", strength: 0.6 },

  // Skills to each other
  { from: "security", to: "cloud", strength: 0.5 },
  { from: "automation", to: "cloud", strength: 0.4 },

  // Core to experience
  { from: "petteri", to: "2m-it", strength: 0.6 },
  { from: "petteri", to: "turku-amk", strength: 0.7 },
  { from: "2m-it", to: "security", strength: 0.5 },
  { from: "2m-it", to: "cloud", strength: 0.8 },

  // Core to research
  { from: "petteri", to: "reframing", strength: 0.8 },
  { from: "petteri", to: "blog", strength: 0.6 },
  { from: "reframing", to: "psg", strength: 0.9 },
  { from: "blog", to: "ai-prompting", strength: 0.7 },

  // Injection scanner -- connected to PSG and security
  { from: "injection-scanner", to: "psg", strength: 0.9 },
  { from: "injection-scanner", to: "security", strength: 0.8 },
  { from: "injection-scanner", to: "petteri", strength: 0.7 },

  // HetuGuard connections
  { from: "hetuguard", to: "petteri", strength: 0.7 },
  { from: "hetuguard", to: "python", strength: 0.8 },
  { from: "hetuguard", to: "security", strength: 0.6 },

  // Additional skill connections
  { from: "python", to: "ai-prompting", strength: 0.8 },
  { from: "python", to: "automation", strength: 0.8 },
  { from: "python", to: "prompt-optimizer", strength: 0.7 },
  { from: "linux", to: "security", strength: 0.7 },
  { from: "linux", to: "cloud", strength: 0.5 },
  { from: "linux", to: "automation", strength: 0.6 },
  { from: "web-dev", to: "automation", strength: 0.5 },
  { from: "web-dev", to: "ai-prompting", strength: 0.4 },
  { from: "web-dev", to: "injection-scanner", strength: 0.6 },

  // Additional research connections
  { from: "llm-research", to: "petteri", strength: 0.7 },
  { from: "llm-research", to: "blog", strength: 0.8 },
  { from: "llm-research", to: "ai-prompting", strength: 0.7 },
];

// Cluster centers for layout (will be spread around these)
export const clusterPositions: Record<string, [number, number, number]> = {
  core: [0, 0, 0],
  projects: [6, 0, -5],
  skills: [-6, 0, -5],
  experience: [-5, 0, 5],
  research: [5, 0, 5],
};