import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/labs/llm" },
  title: "LLM Labs",
  description: "Interactive LLM security demos, prompt engineering tools, and AI safety experiments.",
};

export default function LLMLabsLayout({ children }: { children: React.ReactNode }) {
  return children;
}