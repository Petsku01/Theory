import HomeClient from "@/components/HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Building tools that make AI safer. LLM fine-tuning, prompt security, and trustworthy automation.",
};

export default function Home() {
  return (
    <>
      {/* Accessible text fallback for screen readers */}
      <div className="sr-only" aria-label="Petteri Kosonen, Application Specialist and AI Researcher. Building tools for safer AI.">
        <p>Application Specialist + AI Researcher</p>
        <p>Building tools that make AI safer: LLM fine-tuning, prompt security, and trustworthy automation.</p>
      </div>
      {/* Outside sr-only so :focus reveal is not clipped; same pattern as skip-link. */}
      <nav aria-label="Main sections">
        <ul>
          <li>
            <a href="#projects" className="hero-a11y-link">
              Projects
            </a>
          </li>
          <li>
            <a href="#research" className="hero-a11y-link">
              Research
            </a>
          </li>
          <li>
            <a href="#about" className="hero-a11y-link">
              About
            </a>
          </li>
          <li>
            <a href="/contact" className="hero-a11y-link">
              Contact
            </a>
          </li>
        </ul>
      </nav>

      <HomeClient />
    </>
  );
}