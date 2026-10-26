const work = [
  {
    name: "Prompt Optimizer",
    field: "Applied AI / Fine-tuning",
    problem: "Vague prompts leave too much of the task undefined.",
    implementation: "An end-to-end Qwen2.5-3B pipeline using QLoRA: data generation, training, evaluation and publishing.",
    evidence: "Inspect the training pipeline and evaluation in the repository.",
    href: "https://github.com/Petsku01/prompt-optimizer",
    tech: "Python · Unsloth · QLoRA",
  },
  {
    name: "VET Pilot",
    field: "Research / Agent reliability",
    problem: "A convincing agent response is not the same as a verified software task.",
    implementation: "Challenge tasks and annotated trajectories for studying software-agent reliability.",
    evidence: "Read the pilot tasks, trajectory annotations and analysis.",
    href: "https://github.com/Petsku01/Theory/tree/main/Analyses/LLM/vet_pilot",
    tech: "Python · Evaluation · Verified trajectories",
  },
  {
    name: "VDI Performance Diagnostic",
    field: "IT operations / Diagnostics",
    problem: "VDI performance problems need a repeatable diagnostic starting point.",
    implementation: "A PowerShell diagnostic tool for investigating virtual desktop environments.",
    evidence: "Review the diagnostic script and its implementation.",
    href: "https://github.com/Petsku01/Theory/tree/main/VDI%20Performance%20Diagnostic",
    tech: "PowerShell · Troubleshooting",
  },
];

export default function SelectedWork() {
  return (
    <div className="work-list">
      {work.map((project, index) => (
        <article key={project.name} className="work-entry">
          <div className="work-heading">
            <p className="eyebrow">0{index + 1} / {project.field}</p>
            <h3>{project.name}</h3>
            <p className="work-tech">{project.tech}</p>
          </div>
          <dl className="work-story">
            <div><dt>Problem</dt><dd>{project.problem}</dd></div>
            <div><dt>Implementation</dt><dd>{project.implementation}</dd></div>
            <div><dt>Evidence</dt><dd><a href={project.href} className="text-link">{project.evidence} <span aria-hidden="true">↗</span></a></dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}
