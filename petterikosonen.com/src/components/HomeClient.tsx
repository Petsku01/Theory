"use client";

import NeuralCortex from "@/components/neural-cortex/NeuralCortex";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function HomeClient() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Petteri Kosonen</h2>
            <p className="text-neutral-400">Application Specialist + AI Researcher</p>
          </div>
        </div>
      }
    >
      <NeuralCortex />
    </ErrorBoundary>
  );
}