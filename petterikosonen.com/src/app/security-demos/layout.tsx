import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Demos — Petteri Kosonen",
  description: "Interactive client-side security demonstrations: XSS, SQL injection, hashing, password analysis, JWT decoding, and encoding tools.",
};

export default function SecurityDemosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
