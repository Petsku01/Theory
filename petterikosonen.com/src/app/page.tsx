import HomeClient from "@/components/HomeClient";

export const metadata = {
  title: "Petteri Kosonen -- Application Specialist + AI Researcher",
  description:
    "Building tools that make AI safer. LLM fine-tuning, prompt security, and trustworthy automation.",
};

export default function Home() {
  return (
    <>
      {/* Accessible text fallback for screen readers */}
      <div className="sr-only" aria-label="Petteri Kosonen, Application Specialist and AI Researcher. Building tools for safer AI.">
        <h1>Petteri Kosonen</h1>
        <p>Application Specialist + AI Researcher</p>
        <p>Building tools that make AI safer: LLM fine-tuning, prompt security, and trustworthy automation.</p>
        <nav aria-label="Main sections">
          <ul>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#research">Research</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </div>

      <HomeClient />
    </>
  );
}