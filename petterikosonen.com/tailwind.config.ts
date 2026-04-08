import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "-apple-system", "sans-serif"],
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
        "terminal-lg": "0 20px 60px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)",
        glowCyan: "0 0 0 1px var(--glow-cyan), 0 0 28px -10px var(--glow-cyan)",
        glowGreen: "0 0 0 1px var(--glow-green), 0 0 24px -8px var(--glow-green)",
        glowRed: "0 0 0 1px var(--glow-red), 0 0 24px -8px var(--glow-red)",
        glowViolet: "0 0 0 1px var(--glow-violet), 0 0 24px -8px var(--glow-violet)",
        "glow-lg": "0 0 0 1px rgba(34,211,238,0.2), 0 0 60px -10px rgba(34,211,238,0.3), 0 0 100px -20px rgba(124,140,255,0.15)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.05)",
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
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        blink: "blink 1s linear infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        scan: "scan 12s linear infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "gradient-shift": "gradient-shift 6s ease infinite",
      },
    },
  },
};

export default config;
