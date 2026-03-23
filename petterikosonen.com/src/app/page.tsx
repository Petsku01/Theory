import ContactConsole from "@/components/ContactConsole";
import ExperienceTimeline from "@/components/ExperienceTimeline";
import FeaturedProject from "@/components/FeaturedProject";
import HeroSection from "@/components/HeroSection";
import ScrollProgress from "@/components/ScrollProgress";
import SectionFrame from "@/components/SectionFrame";
import SkillsMatrix from "@/components/SkillsMatrix";
import StatusPill from "@/components/StatusPill";
import TerminalProjectCard from "@/components/TerminalProjectCard";
import { blogPosts, projects } from "@/lib/data";

const sections = [
  { id: "hero", label: "Hero" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "research", label: "Research" },
  { id: "contact", label: "Contact" },
];

export default function Home() {
  const [psg, promptKit, ...restProjects] = projects;

  return (
    <div className="space-y-8 pb-6">
      <ScrollProgress sections={sections} />
      <HeroSection />

      <SectionFrame
        id="projects"
        command="/projects --featured"
        title="Featured Projects"
        description="Prompt security testing and prompt engineering systems with practical output for real operations."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FeaturedProject
            title={psg.name}
            summary={psg.desc}
            points={[
              "Jailbreak defense validation and adversarial prompt testing workflows.",
              "Benchmark-oriented checks for safer LLM deployment decisions.",
              "Clear reporting model for repeatable prompt security reviews.",
            ]}
            tech={["Python", "JailbreakBench", "Security evaluation"]}
            link={psg.link}
            variant="cyan"
          />
          <FeaturedProject
            title={promptKit.name}
            summary={promptKit.desc}
            points={[
              "Pattern-driven prompt library with reusable structures.",
              "Prompt Doctor style analysis for prompt clarity and risk signals.",
              "Workflow modules for faster prompt experimentation.",
            ]}
            tech={["Python", "Prompt patterns", "AI workflow tooling"]}
            link={promptKit.link}
            variant="violet"
          />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {restProjects.slice(0, 6).map((project) => (
            <TerminalProjectCard key={project.link} project={project} />
          ))}
        </div>
      </SectionFrame>

      <SectionFrame id="experience" command="/experience --timeline" title="Experience Timeline">
        <ExperienceTimeline />
      </SectionFrame>

      <SectionFrame
        id="education"
        command="/education --certs"
        title="Education & Certifications"
        description="Formal studies plus continuous lab work in modern cybersecurity and cloud systems."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
            <h3 className="text-lg font-semibold text-text-0">Turku University of Applied Sciences</h3>
            <p className="mt-2 text-sm text-text-1">B.Eng. ICT, Data Networks and Cybersecurity (2020 - Present)</p>
          </article>
          <article className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
            <h3 className="text-lg font-semibold text-text-0">Turku Vocational Institute</h3>
            <p className="mt-2 text-sm text-text-1">IT Technician, IT Support (2017 - 2019)</p>
          </article>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="TryHackMe active" variant="green" />
          <StatusPill label="Security labs" variant="cyan" />
          <StatusPill label="Microsoft ecosystem" variant="amber" />
        </div>
      </SectionFrame>

      <SectionFrame id="skills" command="/skills --matrix" title="Skills Matrix">
        <SkillsMatrix />
      </SectionFrame>

      <SectionFrame
        id="research"
        command="/research --logs"
        title="Writing / Research Logs"
        description="Timestamped notes and experiments covering security engineering, diagnostics, and development tooling."
      >
        <div className="space-y-3">
          {blogPosts.map((post) => (
            <a
              key={post.link}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline block rounded-xl border border-line-0 bg-bg-2/75 p-4 transition-colors hover:border-accent-cyan/45"
            >
              <p className="font-mono text-xs uppercase tracking-[0.05em] text-text-2">{post.date}</p>
              <h3 className="mt-1 text-lg font-semibold text-text-0">{post.title}</h3>
              <p className="mt-1 text-sm text-text-1">{post.desc}</p>
            </a>
          ))}
        </div>
      </SectionFrame>

      <ContactConsole />
    </div>
  );
}
