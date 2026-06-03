import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labs - Petteri Kosonen",
  description: "Interactive security and LLM experimentation tools. All processing runs client-side in your browser.",
};

export default function LabsLayout({ children }: { children: React.ReactNode }) {
  return children;
}