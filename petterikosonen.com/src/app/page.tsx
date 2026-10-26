import type { Metadata } from "next";
import Link from "next/link";
import HomeClient from "@/components/HomeClient";
import SelectedWork from "@/components/SelectedWork";

export const metadata: Metadata = {
  title: { absolute: "Petteri Kosonen — IT operations, security & applied AI" },
  description: "Application Specialist at 2M-IT and cybersecurity engineering student. Practical IT operations, LLM fine-tuning and software-agent evaluation, with open-source work to inspect.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="portfolio">
      <section className="portfolio-hero" aria-labelledby="home-title">
        <div>
          <p className="eyebrow">Petteri Kosonen / Turku, Finland</p>
          <h1 id="home-title">Practical systems.<br /><span>Inspectable work.</span></h1>
          <p className="hero-intro">I work where IT operations, security and applied AI meet.</p>
          <p className="hero-description">Application Specialist at 2M-IT. B.Eng. student in cybersecurity. Outside day-to-day support, I build tools and investigate how AI systems behave — with code and evidence you can examine.</p>
          <div className="portfolio-actions">
            <a className="primary-link" href="#selected-work">Explore selected work <span aria-hidden="true">↘</span></a>
            <Link className="text-link" href="/contact">Get in touch ↗</Link>
          </div>
        </div>
        <aside className="practice-note" aria-label="Areas of practice">
          <p className="eyebrow">Areas of practice</p>
          <ol>
            <li><span>01</span> IT operations & diagnostics</li>
            <li><span>02</span> Identity & cybersecurity</li>
            <li><span>03</span> LLM fine-tuning & evaluation</li>
          </ol>
          <Link href="/about" className="text-link">Background & technical skills ↗</Link>
        </aside>
      </section>

      <section id="selected-work" className="portfolio-section" aria-labelledby="work-title">
        <header className="section-heading"><p className="eyebrow">01 / Selected work</p><h2 id="work-title">From question to implementation.</h2><p>Three ways I approach practical engineering. The source is part of the story.</p></header>
        <SelectedWork />
        <Link href="/projects" className="text-link">Browse all projects ↗</Link>
      </section>

      <section className="portfolio-section skills-section" aria-labelledby="skills-title">
        <header className="section-heading"><p className="eyebrow">02 / Technical focus</p><h2 id="skills-title">Operations inform the experiments.</h2></header>
        <dl className="skills-list">
          <div><dt>Operations & identity</dt><dd>Microsoft 365, Entra ID, Intune, Active Directory, PowerShell and troubleshooting.</dd></div>
          <div><dt>AI engineering</dt><dd>Python, QLoRA, Unsloth, HuggingFace, prompt security and agent evaluation.</dd></div>
        </dl>
        <Link href="/research" className="text-link">Read research & engineering notes ↗</Link>
      </section>

      <HomeClient />

      <section className="portfolio-section contact-strip" aria-labelledby="contact-title">
        <div><p className="eyebrow">04 / Contact</p><h2 id="contact-title">Let’s talk about the work.</h2><p>IT operations, security or practical AI engineering.</p></div>
        <a className="primary-link" href="mailto:petteri.a.kosonen@proton.me">Email Petteri ↗</a>
      </section>
    </div>
  );
}
