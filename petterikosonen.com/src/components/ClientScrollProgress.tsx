"use client";

import ScrollProgress from "@/components/ScrollProgress";

interface Props {
  sections: Array<{ id: string; label: string }>;
}

export default function ClientScrollProgress({ sections }: Props) {
  return <ScrollProgress sections={sections} />;
}