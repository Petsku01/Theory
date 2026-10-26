"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { clusterSymbiosis, nodes, SPECIES_COLORS } from "@/lib/cortex-data";
import styles from "./NeuralCortex.module.css";

// Only the enhancement imports Three/WASM; the atlas and controls render on the server.
const CortexCanvas = dynamic(() => import("./CortexCanvas"), { ssr: false });
const clusters = [
  { id: "core", label: "Core", caption: "The person behind the systems", x: 400, y: 220 },
  { id: "projects", label: "Projects", caption: "Tools built to be used", x: 610, y: 125 },
  { id: "skills", label: "Skills", caption: "A practical technical toolkit", x: 180, y: 310 },
  { id: "experience", label: "Experience", caption: "People, support & systems", x: 185, y: 115 },
  { id: "research", label: "Research", caption: "Questions worth testing", x: 605, y: 330 },
];
const species = ["Human", "Machine", "Nature"];
function clusterColor(id: string) {
  const weights = clusterSymbiosis[id].speciesWeights;
  return SPECIES_COLORS[weights.indexOf(Math.max(...weights))];
}

export default function NeuralCortex() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeCluster, setActiveCluster] = useState("core");
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => { setMobile(media.matches); setReady(true); };
    const onVisibility = () => setForeground(document.visibilityState === "visible");
    const frame = requestAnimationFrame(() => { update(); onVisibility(); });
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    if (stageRef.current) observer.observe(stageRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Mobile waits five visible foreground seconds. This never gates content.
  useEffect(() => {
    if (!ready || reducedMotion || !visible || !foreground || paused || started) return;
    const timer = window.setTimeout(() => setStarted(true), mobile ? 5000 : 0);
    return () => window.clearTimeout(timer);
  }, [ready, reducedMotion, visible, foreground, paused, started, mobile]);

  const cluster = clusters.find((item) => item.id === activeCluster)!;
  const weights = clusterSymbiosis[activeCluster].speciesWeights;
  const running = started && !paused && !reducedMotion && visible && foreground;

  return (
    <section className={styles.cortex} aria-labelledby="cortex-heading">
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>01 / Living atlas</p><h2 id="cortex-heading">Neural Cortex<span> / Symbiosis</span></h2></div>
        <p className={styles.note}>One practice. Five connected territories.<br />Choose a cluster to explore the work.</p>
      </header>
      <div className={styles.layout}>
        <div className={styles.visual}>
          <div ref={stageRef} className={styles.stage} data-running={running}>
            <svg viewBox="0 0 800 440" className={styles.atlas} aria-hidden="true">
              <defs><radialGradient id="cortex-halo"><stop stopColor="#22D3EE" stopOpacity=".12" /><stop offset="1" stopColor="#05070A" stopOpacity="0" /></radialGradient></defs>
              <rect width="800" height="440" fill="url(#cortex-halo)" />
              {species.map((name, i) => <ellipse key={name} cx="400" cy="220" rx={270 - i * 30} ry={112 + i * 18} transform={`rotate(${i * 55 - 55} 400 220)`} fill="none" stroke={SPECIES_COLORS[i]} strokeOpacity=".38" strokeWidth="1" />)}
              {clusters.map((item) => <g key={item.id}>
                <path d={`M400 220 Q${item.x} 220 ${item.x} ${item.y}`} fill="none" stroke={clusterColor(item.id)} strokeOpacity=".4" strokeDasharray="3 7" />
                <circle cx={item.x} cy={item.y} r={activeCluster === item.id ? 23 : 8} fill="#0A0F14" stroke={clusterColor(item.id)} strokeWidth="2" />
                <circle cx={item.x} cy={item.y} r="3" fill={clusterColor(item.id)} />
                <text x={item.x} y={item.y + 42} textAnchor="middle" fill="#B5C5D3" fontSize="13" fontFamily="monospace">{item.label}</text>
              </g>)}
            </svg>
            {started && !reducedMotion && <div className={styles.canvas}>
              <ErrorBoundary fallback={<p className={styles.fallback}>3D unavailable. The atlas and all content remain available.</p>}>
                <CortexCanvas activeCluster={activeCluster} onClusterSelect={(id) => setActiveCluster(id ?? "core")} isMobile={mobile} running={running} />
              </ErrorBoundary>
            </div>}
            <span className={styles.coordinate}>PK / HUMAN × MACHINE × NATURE</span>
          </div>
          <div className={styles.legend} aria-label="Symbiotic species">
            {species.map((name, i) => <span key={name}><i style={{ background: SPECIES_COLORS[i] }} />{name}</span>)}
          </div>
          <div className={styles.controls}>
            <button type="button" disabled={reducedMotion} onClick={() => { setStarted(true); setPaused(started ? !paused : false); }}>
              {started && !paused ? "Pause motion" : "Activate 3D"}<span aria-hidden="true"> ↗</span>
            </button>
            <button type="button" onClick={() => setPaused(true)}>Skip intro / use static atlas</button>
            <span role="status">{reducedMotion ? "Reduced motion · static atlas" : running ? "Live organism" : "Static atlas · content always available"}</span>
          </div>
        </div>
        <div className={styles.sidebar}>
          <div className={styles.clusterNav} role="group" aria-label="Explore Cortex clusters">
            {clusters.map((item, i) => <button key={item.id} type="button" style={activeCluster === item.id ? { boxShadow: `inset 3px 0 ${clusterColor(item.id)}` } : undefined} aria-pressed={activeCluster === item.id} aria-controls="cortex-details" onClick={() => setActiveCluster(item.id)}>
              <span className={styles.index}>0{i + 1}</span><span>{item.label}</span><span aria-hidden="true">{activeCluster === item.id ? "−" : "+"}</span>
            </button>)}
          </div>
          <div id="cortex-details" className={styles.details}>
            <p className={styles.eyebrow}>{cluster.caption}</p><h3>{cluster.label}</h3>
            <div className={styles.mix} aria-label="Conceptual species composition, not measured skills">
              {weights.map((weight, i) => <span key={i} title={`${species[i]}: ${Math.round(weight * 100)}% conceptual weight`} style={{ flex: weight, background: SPECIES_COLORS[i] }} />)}
            </div>
            <ul>{nodes.filter((node) => node.cluster === activeCluster).map((node) => <li key={node.id}>
              {node.link ? <a href={node.link}>{node.label} <span aria-hidden="true">↗</span></a> : <strong>{node.label}</strong>}
              <p>{activeCluster === "core" ? node.fullDesc : node.shortDesc}</p>
            </li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}
