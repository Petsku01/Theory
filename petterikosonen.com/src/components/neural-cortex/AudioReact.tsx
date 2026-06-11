"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type CortexNode } from "@/lib/cortex-data";
import { nodes } from "@/lib/cortex-data";
import { CLUSTER_COLORS } from "@/components/neural-cortex/utils";

// ── Web Audio ambient drone + micro-tones on node select ──
// Very subtle: low sine drones that shift pitch based on camera proximity to clusters,
// and a short resonant tone when a node is selected.

function hexToFreq(hex: string): number {
  // Map hex color to a frequency (220-880 Hz range)
  const num = parseInt(hex.replace("#", ""), 16);
  return 220 + ((num % 660));
}

const CLUSTER_FREQS: Record<string, number> = {
  core: 174.61,       // F3
  projects: 261.63,   // C4
  skills: 349.23,     // F4
  experience: 440.0,  // A4
  research: 523.25,   // C5
};

export function AudioReact({
  selectedId,
}: {
  selectedId: string | null;
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const initializedRef = useRef(false);

  // Initialize audio context on first interaction (browser requires gesture)
  const initAudio = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.035; // Very quiet overall
    master.connect(ctx.destination);
    masterGainRef.current = master;

    // Low drone: 3 layered sine waves at harmonically related frequencies
    const droneFreqs = [55, 82.41, 110]; // A1, E2, A2
    droneFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0.3 - i * 0.08; // Fade each harmonic

      osc.connect(gain);
      gain.connect(master);
      osc.start();
      oscillatorsRef.current.push(osc);
    });

    // Add a filtered noise layer for texture
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 0.7;

    noise.connect(filter);
    filter.connect(master);
    noise.start();
  }, []);

  // Play a micro-tone when a node is selected
  useEffect(() => {
    if (!selectedId || !ctxRef.current || !masterGainRef.current) return;

    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const ctx = ctxRef.current;
    const cluster = node.cluster;
    const baseFreq = CLUSTER_FREQS[cluster] ?? 440;

    // Short resonant tone: fast attack, slow decay
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = baseFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.85);

    return () => {
      try { osc.stop(); } catch {}
    };
  }, [selectedId]);

  // Initialize on first click anywhere
  useEffect(() => {
    const handler = () => {
      initAudio();
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
    document.addEventListener("click", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [initAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      if (ctxRef.current) {
        ctxRef.current.close();
      }
    };
  }, []);

  return null; // No UI — pure audio
}