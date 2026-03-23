"use client";

import SectionFrame from "@/components/SectionFrame";
import StatusPill from "@/components/StatusPill";
import { useState } from "react";

export default function LLMLabs() {
  // Prompt Analyzer
  const [promptInput, setPromptInput] = useState("");
  const [promptAnalysis, setPromptAnalysis] = useState<{
    wordCount: number;
    charCount: number;
    hasSystemContext: boolean;
    hasExamples: boolean;
    hasConstraints: boolean;
    hasOutputFormat: boolean;
    score: number;
    suggestions: string[];
  } | null>(null);

  // Jailbreak Pattern Detector
  const [jailbreakInput, setJailbreakInput] = useState("");
  const [jailbreakResult, setJailbreakResult] = useState<{
    patterns: string[];
    riskLevel: "low" | "medium" | "high";
    explanation: string;
  } | null>(null);

  // Token Estimator
  const [tokenInput, setTokenInput] = useState("");
  const [tokenEstimate, setTokenEstimate] = useState<{
    chars: number;
    words: number;
    estimatedTokens: number;
    cost4o: string;
    costClaude: string;
  } | null>(null);

  // System Prompt Builder
  const [role, setRole] = useState("");
  const [task, setTask] = useState("");
  const [constraints, setConstraints] = useState("");
  const [outputFormat, setOutputFormat] = useState("");

  const analyzePrompt = () => {
    if (!promptInput.trim()) return;

    const text = promptInput.toLowerCase();
    const wordCount = promptInput.split(/\s+/).filter(Boolean).length;
    const charCount = promptInput.length;

    const hasSystemContext = /you are|act as|role:|assistant|expert/.test(text);
    const hasExamples = /example:|for example|e\.g\.|such as|like this/.test(text);
    const hasConstraints = /must|should|don't|do not|never|always|only|limit/.test(text);
    const hasOutputFormat = /format:|output:|respond with|return|json|list|bullet/.test(text);

    let score = 20; // Base score
    if (hasSystemContext) score += 20;
    if (hasExamples) score += 25;
    if (hasConstraints) score += 20;
    if (hasOutputFormat) score += 15;
    if (wordCount > 20) score = Math.min(100, score + 10);
    if (wordCount > 50) score = Math.min(100, score + 10);

    const suggestions: string[] = [];
    if (!hasSystemContext) suggestions.push("Add role/context (e.g., 'You are an expert in...')");
    if (!hasExamples) suggestions.push("Include examples for better output quality");
    if (!hasConstraints) suggestions.push("Add constraints to guide behavior");
    if (!hasOutputFormat) suggestions.push("Specify desired output format");
    if (wordCount < 10) suggestions.push("Prompt may be too short - add more detail");

    setPromptAnalysis({
      wordCount,
      charCount,
      hasSystemContext,
      hasExamples,
      hasConstraints,
      hasOutputFormat,
      score: Math.min(100, score),
      suggestions,
    });
  };

  const detectJailbreak = () => {
    if (!jailbreakInput.trim()) return;

    const text = jailbreakInput.toLowerCase();
    const patterns: string[] = [];
    let riskScore = 0;

    const checks = [
      { pattern: /ignore (previous|all|prior|above) (instructions|rules|prompts)/i, name: "Instruction override", weight: 3 },
      { pattern: /pretend (you are|to be|you're)/i, name: "Role hijacking", weight: 2 },
      { pattern: /dan|do anything now|jailbreak/i, name: "Known jailbreak (DAN)", weight: 3 },
      { pattern: /you (can|will|must) (now )?do anything/i, name: "Capability override", weight: 3 },
      { pattern: /developer mode|maintenance mode/i, name: "Mode switching", weight: 2 },
      { pattern: /hypothetically|imagine|fictional|story/i, name: "Fictional framing", weight: 1 },
      { pattern: /base64|encode|decode|rot13/i, name: "Encoding evasion", weight: 2 },
      { pattern: /system prompt|reveal|show me your/i, name: "Prompt extraction", weight: 2 },
      { pattern: /opposite day|opposite of what/i, name: "Inversion attack", weight: 2 },
      { pattern: /for (educational|research|academic) purposes/i, name: "Educational pretext", weight: 1 },
    ];

    for (const check of checks) {
      if (check.pattern.test(text)) {
        patterns.push(check.name);
        riskScore += check.weight;
      }
    }

    let riskLevel: "low" | "medium" | "high" = "low";
    let explanation = "No significant jailbreak patterns detected.";

    if (riskScore >= 5) {
      riskLevel = "high";
      explanation = "Multiple high-risk patterns detected. This prompt likely attempts to bypass safety measures.";
    } else if (riskScore >= 2) {
      riskLevel = "medium";
      explanation = "Some concerning patterns detected. Review carefully before processing.";
    } else if (patterns.length > 0) {
      explanation = "Minor patterns detected but may be benign in context.";
    }

    setJailbreakResult({ patterns, riskLevel, explanation });
  };

  const estimateTokens = () => {
    if (!tokenInput.trim()) return;

    const chars = tokenInput.length;
    const words = tokenInput.split(/\s+/).filter(Boolean).length;
    // Rough estimation: ~4 chars per token for English
    const estimatedTokens = Math.ceil(chars / 4);
    
    // Approximate costs (GPT-4o: $2.50/1M input, Claude 3.5: $3/1M input)
    const cost4o = ((estimatedTokens / 1_000_000) * 2.5).toFixed(6);
    const costClaude = ((estimatedTokens / 1_000_000) * 3).toFixed(6);

    setTokenEstimate({ chars, words, estimatedTokens, cost4o, costClaude });
  };

  const buildSystemPrompt = () => {
    const parts: string[] = [];
    
    if (role.trim()) {
      parts.push(`You are ${role.trim()}.`);
    }
    
    if (task.trim()) {
      parts.push(`\nYour task is to ${task.trim()}.`);
    }
    
    if (constraints.trim()) {
      parts.push(`\nConstraints:\n${constraints.trim().split('\n').map(c => `- ${c.trim()}`).join('\n')}`);
    }
    
    if (outputFormat.trim()) {
      parts.push(`\nOutput format: ${outputFormat.trim()}`);
    }

    return parts.join('\n');
  };

  const generatedPrompt = buildSystemPrompt();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/llm-labs --interactive</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">LLM Labs</h1>
        <p className="mt-3 max-w-3xl text-text-1">
          Interactive tools for prompt engineering, LLM security testing, and AI workflow experimentation. All processing happens client-side.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="prompt engineering" variant="violet" />
          <StatusPill label="security testing" variant="cyan" />
          <StatusPill label="client-side" variant="green" />
        </div>
      </section>

      <SectionFrame command="/lab --prompt-analysis" title="Prompt Analyzer">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor="prompt-input" className="sr-only">Prompt to analyze</label>
            <textarea
              id="prompt-input"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Paste your prompt here to analyze its structure and get improvement suggestions..."
              className="focus-outline h-40 w-full resize-none rounded border border-line-1 bg-bg-1 px-3 py-2 font-mono text-sm text-text-0"
            />
            <button
              type="button"
              onClick={analyzePrompt}
              className="focus-outline mt-3 rounded border border-accent-violet/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-violet transition-colors hover:bg-accent-violet/15"
            >
              Analyze Prompt
            </button>
          </div>

          {promptAnalysis && (
            <div className="space-y-3">
              <div className="rounded-xl border border-line-0 bg-bg-2/75 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-text-1">Prompt Score</span>
                  <span className={`font-mono text-lg ${promptAnalysis.score >= 70 ? "text-accent-green" : promptAnalysis.score >= 40 ? "text-accent-amber" : "text-accent-red"}`}>
                    {promptAnalysis.score}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-line-0">
                  <div
                    className={`h-full ${promptAnalysis.score >= 70 ? "bg-accent-green" : promptAnalysis.score >= 40 ? "bg-accent-amber" : "bg-accent-red"}`}
                    style={{ width: `${promptAnalysis.score}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-line-0 bg-bg-0 p-2 text-center">
                  <p className="font-mono text-xs text-text-2">Words</p>
                  <p className="font-mono text-sm text-text-1">{promptAnalysis.wordCount}</p>
                </div>
                <div className="rounded border border-line-0 bg-bg-0 p-2 text-center">
                  <p className="font-mono text-xs text-text-2">Chars</p>
                  <p className="font-mono text-sm text-text-1">{promptAnalysis.charCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Context", ok: promptAnalysis.hasSystemContext },
                  { label: "Examples", ok: promptAnalysis.hasExamples },
                  { label: "Constraints", ok: promptAnalysis.hasConstraints },
                  { label: "Format", ok: promptAnalysis.hasOutputFormat },
                ].map((item) => (
                  <p
                    key={item.label}
                    className={`rounded border px-2 py-1 text-xs ${item.ok ? "border-accent-green/40 bg-accent-green/10 text-accent-green" : "border-line-0 bg-bg-0 text-text-2"}`}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </p>
                ))}
              </div>

              {promptAnalysis.suggestions.length > 0 && (
                <div className="rounded border border-accent-amber/40 bg-accent-amber/10 p-3">
                  <p className="font-mono text-xs uppercase tracking-[0.05em] text-accent-amber">Suggestions</p>
                  <ul className="mt-2 space-y-1 text-xs text-text-1">
                    {promptAnalysis.suggestions.map((s) => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionFrame>

      <SectionFrame command="/lab --jailbreak-detector" title="Jailbreak Pattern Detector">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm text-text-1">
              Paste a prompt to detect common jailbreak/injection patterns. Tests include DAN, role hijacking, encoding evasion, and more.
            </p>
            <label htmlFor="jailbreak-input" className="sr-only">Prompt to check for jailbreak patterns</label>
            <textarea
              id="jailbreak-input"
              value={jailbreakInput}
              onChange={(e) => setJailbreakInput(e.target.value)}
              placeholder="Paste a suspicious prompt to analyze..."
              className="focus-outline h-32 w-full resize-none rounded border border-line-1 bg-bg-1 px-3 py-2 font-mono text-sm text-text-0"
            />
            <button
              type="button"
              onClick={detectJailbreak}
              className="focus-outline mt-3 rounded border border-accent-cyan/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-cyan transition-colors hover:bg-accent-cyan/15"
            >
              Detect Patterns
            </button>
          </div>

          {jailbreakResult && (
            <div className="space-y-3">
              <div className={`rounded-xl border p-4 ${
                jailbreakResult.riskLevel === "high" 
                  ? "border-accent-red/50 bg-accent-red/10" 
                  : jailbreakResult.riskLevel === "medium"
                  ? "border-accent-amber/50 bg-accent-amber/10"
                  : "border-accent-green/50 bg-accent-green/10"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">Risk Level</span>
                  <StatusPill 
                    label={jailbreakResult.riskLevel} 
                    variant={jailbreakResult.riskLevel === "high" ? "red" : jailbreakResult.riskLevel === "medium" ? "amber" : "green"} 
                  />
                </div>
                <p className="mt-2 text-sm text-text-1">{jailbreakResult.explanation}</p>
              </div>

              {jailbreakResult.patterns.length > 0 && (
                <div className="rounded border border-line-0 bg-bg-2/75 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">Detected Patterns</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {jailbreakResult.patterns.map((p) => (
                      <span key={p} className="rounded border border-accent-red/40 bg-accent-red/10 px-2 py-1 text-xs text-accent-red">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionFrame>

      <SectionFrame command="/lab --token-estimator" title="Token & Cost Estimator">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor="token-input" className="sr-only">Text to estimate tokens</label>
            <textarea
              id="token-input"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste text to estimate token count and API costs..."
              className="focus-outline h-32 w-full resize-none rounded border border-line-1 bg-bg-1 px-3 py-2 font-mono text-sm text-text-0"
            />
            <button
              type="button"
              onClick={estimateTokens}
              className="focus-outline mt-3 rounded border border-accent-green/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-green transition-colors hover:bg-accent-green/15"
            >
              Estimate
            </button>
          </div>

          {tokenEstimate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-line-0 bg-bg-2/75 p-3">
                <p className="font-mono text-xs text-text-2">Characters</p>
                <p className="font-mono text-lg text-text-0">{tokenEstimate.chars.toLocaleString()}</p>
              </div>
              <div className="rounded border border-line-0 bg-bg-2/75 p-3">
                <p className="font-mono text-xs text-text-2">Words</p>
                <p className="font-mono text-lg text-text-0">{tokenEstimate.words.toLocaleString()}</p>
              </div>
              <div className="rounded border border-line-0 bg-bg-2/75 p-3">
                <p className="font-mono text-xs text-text-2">Est. Tokens</p>
                <p className="font-mono text-lg text-accent-cyan">{tokenEstimate.estimatedTokens.toLocaleString()}</p>
              </div>
              <div className="rounded border border-line-0 bg-bg-2/75 p-3">
                <p className="font-mono text-xs text-text-2">GPT-4o Input</p>
                <p className="font-mono text-lg text-accent-green">${tokenEstimate.cost4o}</p>
              </div>
            </div>
          )}
        </div>
      </SectionFrame>

      <SectionFrame command="/lab --prompt-builder" title="System Prompt Builder">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label htmlFor="role-input" className="mb-1 block font-mono text-xs uppercase tracking-[0.05em] text-text-2">Role / Identity</label>
              <input
                id="role-input"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="an expert Python developer"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
            </div>
            <div>
              <label htmlFor="task-input" className="mb-1 block font-mono text-xs uppercase tracking-[0.05em] text-text-2">Primary Task</label>
              <input
                id="task-input"
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="help users write clean, efficient code"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
            </div>
            <div>
              <label htmlFor="constraints-input" className="mb-1 block font-mono text-xs uppercase tracking-[0.05em] text-text-2">Constraints (one per line)</label>
              <textarea
                id="constraints-input"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="Never execute code directly&#10;Always explain your reasoning&#10;Use type hints"
                className="focus-outline h-24 w-full resize-none rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
            </div>
            <div>
              <label htmlFor="format-input" className="mb-1 block font-mono text-xs uppercase tracking-[0.05em] text-text-2">Output Format</label>
              <input
                id="format-input"
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="Provide code with comments, then explain"
                className="focus-outline w-full rounded border border-line-1 bg-bg-1 px-3 py-2 text-sm text-text-0"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.05em] text-text-2">Generated System Prompt</p>
            <div className="rounded-xl border border-line-0 bg-bg-0 p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm text-text-1">
                {generatedPrompt || "(Fill in fields to generate a system prompt)"}
              </pre>
            </div>
            {generatedPrompt && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                className="focus-outline mt-3 rounded border border-accent-cyan/60 px-3 py-2 font-mono text-xs uppercase tracking-[0.04em] text-accent-cyan transition-colors hover:bg-accent-cyan/15"
              >
                Copy to Clipboard
              </button>
            )}
          </div>
        </div>
      </SectionFrame>

      <SectionFrame command="/llm --projects" title="Related Projects">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { name: "Prompt Security Guide", desc: "LLM security testing framework", url: "https://github.com/Petsku01/Prompt-Security-Guide" },
            { name: "PromptKit", desc: "Prompt engineering toolkit", url: "https://github.com/Petsku01/promptkit" },
          ].map((project) => (
            <a
              key={project.url}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline flex items-center justify-between rounded-xl border border-line-0 bg-bg-2/75 p-4 transition-colors hover:border-accent-violet/45"
            >
              <div>
                <span className="text-sm font-semibold text-text-0">{project.name}</span>
                <p className="text-xs text-text-2">{project.desc}</p>
              </div>
              <StatusPill label="GitHub" variant="violet" />
            </a>
          ))}
        </div>
      </SectionFrame>
    </div>
  );
}
