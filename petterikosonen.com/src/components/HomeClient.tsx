"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

// Keep WebGL, Three.js and WASM off the initial page's import path.
const NeuralCortex = dynamic(() => import("@/components/neural-cortex/NeuralCortex"), {
  ssr: false,
  loading: () => <p role="status">Loading the interactive experiment…</p>,
});

export default function HomeClient() {
  const [active, setActive] = useState(false);

  return (
    <section className="portfolio-section cortex-experiment" aria-labelledby="cortex-title">
      <div className="section-heading">
        <p className="eyebrow">03 / Interactive experiment</p>
        <h2 id="cortex-title">Neural Cortex</h2>
        <p>A different way to explore the connections between my work. Optional, graphics-intensive, and only loaded when you choose to start it.</p>
      </div>
      <button type="button" className="primary-link" aria-expanded={active} aria-controls="cortex-experiment" onClick={() => setActive(!active)}>
        {active ? "Close experiment" : "Launch Neural Cortex"} <span aria-hidden="true">{active ? "×" : "↗"}</span>
      </button>
      {active && (
        <div id="cortex-experiment" className="cortex-viewport">
          <ErrorBoundary fallback={<p role="status">The graphics experiment could not start. All portfolio content is available above.</p>}>
            <NeuralCortex />
          </ErrorBoundary>
        </div>
      )}
    </section>
  );
}
