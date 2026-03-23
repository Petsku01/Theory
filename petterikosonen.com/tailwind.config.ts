import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
        },
        line: {
          0: "var(--line-0)",
          1: "var(--line-1)",
        },
        text: {
          0: "var(--text-0)",
          1: "var(--text-1)",
          2: "var(--text-2)",
          inverse: "var(--text-inverse)",
        },
        accent: {
          cyan: "var(--accent-cyan)",
          green: "var(--accent-green)",
          amber: "var(--accent-amber)",
          red: "var(--accent-red)",
          violet: "var(--accent-violet)",
        },
      },
      boxShadow: {
        terminal: "0 10px 28px rgba(0, 0, 0, 0.36)",
        glowCyan: "0 0 0 1px var(--glow-cyan), 0 0 28px -10px var(--glow-cyan)",
        glowGreen: "0 0 0 1px var(--glow-green), 0 0 24px -8px var(--glow-green)",
        glowRed: "0 0 0 1px var(--glow-red), 0 0 24px -8px var(--glow-red)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasis: "var(--ease-emphasis)",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(34,211,238,0.24), 0 0 20px rgba(34,211,238,0.18)" },
          "50%": { boxShadow: "0 0 0 1px rgba(34,211,238,0.45), 0 0 32px rgba(34,211,238,0.3)" },
        },
        scan: {
          "0%": { backgroundPosition: "0 -100%" },
          "100%": { backgroundPosition: "0 200%" },
        },
      },
      animation: {
        blink: "blink 1s linear infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        scan: "scan 12s linear infinite",
      },
    },
  },
};

export default config;
