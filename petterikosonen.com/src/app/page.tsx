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
    <div className="space-y-10 pb-8 lg:space-y-14">
      <ScrollProgress sections={sections} />
      <HeroSection />

      <SectionFrame
        id="projects"
        command="/projects --featured"
        title="Featured Projects"
        description="Prompt security testing and prompt engineering systems with practical output for real operations."
      >
        <div className="grid gap-5 lg:grid-cols-2">
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
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
        <div className="grid gap-5 md:grid-cols-2">
          <article className="group rounded-2xl border border-line-0 bg-bg-2/60 p-6 transition-all duration-300 hover:border-line-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10 text-accent-violet">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-0">Turku University of Applied Sciences</h3>
                <p className="text-sm text-text-2">B.Eng. ICT, Data Networks and Cybersecurity</p>
              </div>
            </div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-bg-3/40 px-2.5 py-1 font-mono text-xs text-text-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              2020 - Present
            </p>
          </article>
          <article className="group rounded-2xl border border-line-0 bg-bg-2/60 p-6 transition-all duration-300 hover:border-line-1 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/10 text-accent-cyan">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-0">Turku Vocational Institute</h3>
                <p className="text-sm text-text-2">IT Technician, IT Support</p>
              </div>
            </div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-bg-3/40 px-2.5 py-1 font-mono text-xs text-text-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              2017 - 2019
            </p>
          </article>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
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
        <div className="grid gap-4 md:grid-cols-2">
          {blogPosts.map((post) => (
            <a
              key={post.link}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-outline group block overflow-hidden rounded-2xl border border-line-0 bg-bg-2/60 p-5 transition-all duration-300 hover:border-accent-cyan/35 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.06em] text-text-2">{post.date}</p>
              <h3 className="mt-2 text-lg font-bold text-text-0 transition-colors duration-200 group-hover:text-accent-cyan">{post.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-1">{post.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-text-2 transition-colors duration-200 group-hover:text-accent-cyan">
                Read more
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </SectionFrame>

      <ContactConsole />
    </div>
  );
}
