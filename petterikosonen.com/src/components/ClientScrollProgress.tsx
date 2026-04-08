"use client";

import dynamic from "next/dynamic";

const ScrollProgress = dynamic(() => import("@/components/ScrollProgress"), { ssr: false });

interface Props {
  sections: Array<{ id: string; label: string }>;
}

export default function ClientScrollProgress({ sections }: Props) {
  return <ScrollProgress sections={sections} />;
}
