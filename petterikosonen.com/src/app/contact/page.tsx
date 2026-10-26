import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Petteri Kosonen about IT operations, cybersecurity and applied AI engineering.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="portfolio">
      <header className="section-heading py-10">
        <p className="eyebrow">Contact / Turku, Finland</p>
        <h1 className="mt-4 text-4xl sm:text-6xl">Let’s talk about the work.</h1>
        <p className="mt-5">For conversations about IT operations, cybersecurity, LLM fine-tuning or collaboration, email is the best place to start.</p>
      </header>
      <section className="portfolio-section" aria-labelledby="email-title">
        <h2 id="email-title" className="eyebrow mb-5">Email</h2>
        <a className="text-link break-all" href="mailto:petteri.a.kosonen@proton.me">petteri.a.kosonen@proton.me ↗</a>
        <p className="mt-6">Europe/Helsinki (UTC+2/+3).</p>
      </section>
      <section className="portfolio-section" aria-labelledby="background-title">
        <header className="section-heading"><p className="eyebrow">Professional background</p><h2 id="background-title">Operations experience. Engineering curiosity.</h2></header>
        <dl className="skills-list">
          <div><dt>Current work</dt><dd>Application Specialist at 2M-IT since 2022: first-line IT support and troubleshooting.</dd></div>
          <div><dt>Technical direction</dt><dd>Cybersecurity engineering studies and hands-on AI projects, from QLoRA fine-tuning to agent evaluation.</dd></div>
        </dl>
        <div className="portfolio-actions">
          <a className="text-link" href="https://github.com/Petsku01">GitHub ↗</a>
          <a className="text-link" href="https://www.linkedin.com/in/petteri-kosonen-511907172/">LinkedIn ↗</a>
          <a className="text-link" href="https://tryhackme.com/p/Petsku">TryHackMe ↗</a>
        </div>
      </section>
    </div>
  );
}
