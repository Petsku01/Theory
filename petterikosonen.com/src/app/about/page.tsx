import SectionFrame from "@/components/SectionFrame";
import StatusPill from "@/components/StatusPill";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About - Petteri Kosonen",
  description: "Background, skills, and expertise of Petteri Kosonen - B.Eng. student specializing in Data Networks and Cybersecurity.",
};

export default function About() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line-0 bg-bg-1/90 px-5 py-10 shadow-terminal sm:px-8">
        <span className="section-label">/about --profile</span>
        <h1 className="mt-4 text-4xl font-bold text-text-0 sm:text-5xl">Operator Profile</h1>
        <p className="mt-3 max-w-3xl text-text-1">
          Engineering student focused on data networks and cybersecurity, with hands-on responsibility across modern Microsoft cloud support and security operations.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="team player" variant="green" />
          <StatusPill label="calm under pressure" variant="cyan" />
          <StatusPill label="continuous learner" variant="amber" />
        </div>
      </section>

      <SectionFrame command="/about --background" title="Background">
        <div className="space-y-4 text-text-1">
          <p>
            I work at the intersection of practical IT support and cybersecurity. My day-to-day work blends incident handling, user support, and cloud platform troubleshooting in environments where reliability matters.
          </p>
          <p>
            My studies in Information and Communication Technology at Turku University of Applied Sciences reinforce this with formal training in data networks and security.
          </p>
        </div>
      </SectionFrame>

      <SectionFrame command="/about --stack" title="Technology Focus">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
            <h3 className="text-lg font-semibold text-text-0">Identity & Security</h3>
            <p className="mt-2 text-sm text-text-1">Entra ID, MFA, Conditional Access, Defender EDR, Intune, Active Directory.</p>
          </article>
          <article className="rounded-xl border border-line-0 bg-bg-2/80 p-5">
            <h3 className="text-lg font-semibold text-text-0">Operations & Automation</h3>
            <p className="mt-2 text-sm text-text-1">PowerShell automation, Exchange Online, Office 365 administration, Linux/Windows servers, Python, SQL.</p>
          </article>
        </div>
      </SectionFrame>
    </div>
  );
}
