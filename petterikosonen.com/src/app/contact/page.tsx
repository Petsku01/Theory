import ContactConsole from "@/components/ContactConsole";
import SectionFrame from "@/components/SectionFrame";
import StatusPill from "@/components/StatusPill";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Petteri Kosonen for cybersecurity, AI safety, and IT support collaboration.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <ContactConsole />

      <SectionFrame command="/contact --recruiters" title="For Recruiters">
        <div className="space-y-4 text-text-1">
          <p>
            Looking for someone who can bridge IT operations, AI engineering, and security?
            Here is the quick summary.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line-0 bg-bg-2/80 p-4">
              <h3 className="font-semibold text-text-0">Current Role</h3>
              <p className="mt-1 text-sm">Application Specialist at 2M-IT (2022-present). 1st line IT support, phone, passwords, troubleshooting.</p>
            </div>
            <div className="rounded-xl border border-line-0 bg-bg-2/80 p-4">
              <h3 className="font-semibold text-text-0">Target Direction</h3>
              <p className="mt-1 text-sm">LLM fine-tuning engineer. Hands-on project: Qwen2.5-3B + QLoRA, full pipeline from data to HuggingFace.</p>
            </div>
            <div className="rounded-xl border border-line-0 bg-bg-2/80 p-4">
              <h3 className="font-semibold text-text-0">Availability</h3>
              <p className="mt-1 text-sm">Open to: Full-time, Contract, Consulting. Remote or Turku, Finland.</p>
            </div>
            <div className="rounded-xl border border-line-0 bg-bg-2/80 p-4">
              <h3 className="font-semibold text-text-0">Timezone</h3>
              <p className="mt-1 text-sm">Europe/Helsinki (UTC+2/+3). Flexible hours.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <StatusPill label="LLM fine-tuning" variant="cyan" />
            <StatusPill label="Prompt security" variant="cyan" />
            <StatusPill label="IT operations" variant="green" />
            <StatusPill label="Python" variant="cyan" />
            <StatusPill label="WebAssembly" variant="cyan" />
          </div>

          <div className="pt-2">
            <a
              href="https://github.com/Petsku01"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 font-mono text-xs text-accent-cyan transition-colors hover:bg-accent-cyan/20"
            >
              View GitHub Portfolio
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </SectionFrame>
    </div>
  );
}