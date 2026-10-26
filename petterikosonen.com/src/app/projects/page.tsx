import SelectedWork from "@/components/SelectedWork";
import { projects } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected engineering work and open-source tools: the problem, implementation and evidence.",
  alternates: { canonical: "/projects" },
};

export default function Projects() {
  return (
    <div className="portfolio">
      <header className="section-heading py-10">
        <p className="eyebrow">Engineering / Open source</p>
        <h1 className="mt-4 text-4xl sm:text-6xl">Work you can inspect.</h1>
        <p className="mt-5">Practical tools and experiments across AI, cybersecurity and IT operations. Start with the question, then follow the implementation.</p>
      </header>
      <section aria-labelledby="selected-title">
        <h2 id="selected-title" className="eyebrow mb-5">Selected case notes</h2>
        <SelectedWork />
      </section>
      <section className="portfolio-section" aria-labelledby="all-title">
        <header className="section-heading"><p className="eyebrow">Further exploration</p><h2 id="all-title">Repository index</h2></header>
        <ul className="project-index">
          {projects.map((project) => (
            <li key={project.link}>
              <div><h3><a className="text-link" href={project.link}>{project.name} ↗</a></h3><p>{project.desc}</p></div>
              <span className="eyebrow">{project.tech}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
