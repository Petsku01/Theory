# DESIGN_SPEC.md

## Project Vision
**Concept:** `Security Terminal`  
A cinematic cybersecurity interface that combines terminal-native visual language with modern editorial layout. The site should feel like a live secure console, not a generic developer template.

**Design Principles**
- Distinctive cyber aesthetic without visual noise.
- Fast by default: animation budgeted and layered progressively.
- Accessible first: contrast, reduced motion, keyboard navigation, semantic structure.
- Content-forward: projects and expertise remain the hero.

---

## 1. Color Palette (Exact Hex Values)

### Core Surfaces
- `--bg-0`: `#05070A` (global background)
- `--bg-1`: `#0A0F14` (section surface)
- `--bg-2`: `#101821` (elevated cards/panels)
- `--bg-3`: `#16222E` (hover/focus elevated)
- `--line-0`: `#1E2B38` (default borders)
- `--line-1`: `#2B3D4F` (strong borders/dividers)

### Text
- `--text-0`: `#EAF2F8` (primary)
- `--text-1`: `#B5C5D3` (secondary)
- `--text-2`: `#7F95A8` (muted)
- `--text-inverse`: `#040608` (for bright badges/buttons)

### Accent System (Terminal + Security)
- `--accent-cyan`: `#22D3EE` (primary action/highlight)
- `--accent-green`: `#39FF88` (success/security signal)
- `--accent-amber`: `#F4B942` (warning/status)
- `--accent-red`: `#FF5C7A` (threat/error)
- `--accent-violet`: `#7C8CFF` (AI/experimental accents)

### Glow/FX Colors
- `--glow-cyan`: `#22D3EE66`
- `--glow-green`: `#39FF884D`
- `--glow-red`: `#FF5C7A4D`

### Accessibility Targets
- Minimum contrast ratio: `4.5:1` for body text, `3:1` for large text and UI components.
- Avoid cyan text on black for long paragraphs; use `--text-0`/`--text-1` for readability.

---

## 2. Typography

### Font Stack
- **Display / Headings:** `Space Grotesk` (700, 600, 500)
- **Body / UI:** `Manrope` (600, 500, 400)
- **Terminal / Code:** `IBM Plex Mono` (500, 400)

### Type Scale (Desktop)
- `display-xl`: 72/76, 700, `Space Grotesk` (hero name)
- `display-lg`: 56/60, 700
- `h1`: 44/52, 700
- `h2`: 32/40, 600
- `h3`: 24/32, 600
- `h4`: 20/28, 600
- `body-lg`: 20/32, 400, `Manrope`
- `body`: 17/28, 400
- `body-sm`: 15/24, 500
- `label`: 13/18, 600, letter spacing `0.04em`
- `mono-md`: 15/22, 500, `IBM Plex Mono`
- `mono-sm`: 13/18, 400

### Type Scale (Mobile)
- `display-xl`: 44/48
- `h1`: 36/42
- `h2`: 28/34
- `body`: 16/26
- `body-sm`: 14/22

### Typographic Behavior
- Headings: tight letter spacing (`-0.02em`) for premium editorial feel.
- Monospace only for terminal UI, tags, timestamps, status labels.
- Keep line length to `65-75ch` for long-form readability.

---

## 3. Component List with Descriptions

### Global Components
1. **AmbientBackground**
- Layered radial gradients + subtle grid/noise texture.
- Optional animated matrix rain only in hero viewport.

2. **TopNav (Sticky Command Bar)**
- Semi-transparent glass strip with blur, scanline border.
- Includes logo, section links, CTA (`Contact`).
- Active section indicator with animated underscore.

3. **SectionFrame**
- Reusable container for each section with terminal-like border corners.
- Optional header metadata (`/experience`, `/projects`).

4. **StatusPill**
- Compact mono chip for `Open to Work`, `Studying`, `Security`, etc.
- Color variants: cyan, green, amber, red.

### Hero Components
5. **HeroCommandIntro**
- Headline + role subtitle + typed rotating keywords (e.g., `defender`, `builder`, `analyst`).
- Includes primary and secondary CTAs.

6. **MatrixCanvas (Subtle)**
- Low-opacity falling glyphs in constrained region behind hero text.
- GPU-light canvas with capped frame rate.

7. **LiveSignalPanel**
- Faux real-time security metrics (e.g., alerts processed, uptime, labs built).
- Animated counters with reduced-motion fallback.

### Project/Work Components
8. **TerminalProjectCard**
- Project card styled like a command output window.
- Header: project name + status indicator + tech tags.
- Body: impact description + key capabilities.
- Footer: links (`GitHub`, `Demo`, `Case Study`).

9. **PromptSecurityShowcase**
- Highlight module for Prompt Security Guide with architecture mini-diagram.

10. **PromptKitShowcase**
- Highlight module for PromptKit with workflow steps and prompt health checks.

11. **ExperienceTimeline**
- Vertical timeline with command timestamps and role summaries.

### Interaction/Utility Components
12. **SpotlightCursor**
- Soft radial cursor spotlight on desktop only.
- Disabled for touch devices and reduced-motion users.

13. **GlitchLink**
- Brief channel-shift hover effect for select links/CTAs.
- Duration under 180ms to keep subtle.

14. **ScrollProgressRail**
- Right-side minimal progress rail with section markers.
- Clickable jump points with aria labels.

15. **ContactConsole**
- Terminal-like contact panel with social links and “copy email” command.

16. **FooterSignature**
- Clean close-out with short personal note + RSS/GitHub/LinkedIn.

---

## 4. Animation Specifications

### Motion Principles
- Motion should communicate state, not decorate randomly.
- Keep durations short and consistent.
- Always provide reduced-motion equivalents.

### Timing Tokens
- `--motion-fast`: `120ms`
- `--motion-base`: `220ms`
- `--motion-slow`: `420ms`
- `--ease-standard`: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- `--ease-emphasis`: `cubic-bezier(0.16, 1, 0.3, 1)`

### Specific Animations
1. **Hero Load Sequence**
- Staggered reveal: badge -> headline -> subtitle -> CTAs -> metrics.
- Stagger step: `70ms`; total under `900ms`.

2. **Typing Intro**
- Type speed: `40-55ms`/char.
- Pause after phrase: `1200ms`.
- Caret blink: `1s` linear infinite.

3. **Matrix Rain**
- Render only in hero; opacity `0.10-0.16`.
- Max FPS target: `30`.
- Suspend when tab hidden (`visibilitychange`).

4. **Project Card Hover**
- TranslateY `-3px`, border glow pulse, subtle noise shift.
- Duration `180-220ms`.

5. **Glitch Hover**
- 2-frame RGB split + 1-frame reset.
- Trigger on hover/focus only; no infinite loops.

6. **Scroll Progress + Section Entry**
- Section fade/slide in: `opacity 0->1`, `y 12->0`, duration `320ms`.
- Trigger once per section.

### Accessibility Motion Rules
- `prefers-reduced-motion: reduce` disables matrix, typing loops, cursor spotlight, and complex parallax.
- Replace with instant state changes and opacity-only transitions.

---

## 5. Page Structure (Sections + Content)

### 0. Global Shell
- Sticky nav
- Ambient background layers
- Skip link and semantic landmarks

### 1. Hero: `Secure by Design`
- Name, role, one-line positioning statement.
- Typed keyword strip.
- Primary CTA: `View Projects`
- Secondary CTA: `Contact`
- Side panel with live security stats.

### 2. Featured Projects
- Two large spotlight modules:
- `Prompt Security Guide` (LLM security testing, jailbreak defense validation)
- `PromptKit` (prompt engineering toolkit, pattern-based prompting)
- Then grid of additional projects in TerminalProjectCard format.

### 3. Experience Timeline
- Roles with concise impact bullets.
- Security/IT support achievements and tools.

### 4. Education + Certifications
- Degree progression and relevant certifications/labs.
- Optional trust badges (TryHackMe, course completions).

### 5. Skills Matrix
- Grouped by `Security`, `Cloud/Microsoft`, `Automation`, `AI/Prompting`.
- Visualized as command blocks + confidence labels.

### 6. Writing / Research
- Blog/research links pulled from `blogPosts`.
- Format as timestamped logs.

### 7. Contact Console
- Email, GitHub, LinkedIn, TryHackMe.
- “Send signal” style CTA and timezone/location note.

### 8. Footer Signature
- Copyright, RSS, compact closing phrase.

---

## 6. Responsive Breakpoints

### Breakpoint System
- `xs`: `0-479px`
- `sm`: `480px`
- `md`: `768px`
- `lg`: `1024px`
- `xl`: `1280px`
- `2xl`: `1536px`

### Layout Rules by Size
1. **xs / sm**
- Single-column layout.
- Matrix effect reduced density.
- Spotlight cursor disabled.
- Project cards full-width stacked.

2. **md**
- Hero splits into text + compact stats panel.
- Projects become 2-column where possible.
- Sticky nav keeps condensed labels.

3. **lg+**
- Full hero composition with richer ambient effects.
- Scroll progress rail visible.
- Alternating timeline layout.

4. **xl / 2xl**
- Larger type scaling, increased whitespace.
- Max content width: `1200px` (reading blocks still constrained by `75ch`).

---

## Performance + Accessibility Implementation Rules
- Use Next.js dynamic imports for heavy visuals (`MatrixCanvas`, optional Three.js elements).
- Keep animation work on `transform` and `opacity`; avoid layout thrashing.
- Preload only critical fonts; use `font-display: swap`.
- Respect semantic headings (`h1` once), `nav/main/footer`, and aria labels for custom controls.
- Ensure visible focus states with cyan outline (`#22D3EE`) + offset.
- Add automated checks: Lighthouse, axe, keyboard-only test path.

---

## Suggested Tailwind Token Mapping
- Extend Tailwind with semantic tokens under `theme.extend.colors` (`bg`, `text`, `accent`, `line`).
- Add `fontFamily` keys: `display`, `body`, `mono`.
- Define shared box shadows:
- `shadow-cyan-glow: 0 0 0 1px #22D3EE33, 0 0 24px #22D3EE1F`
- `shadow-green-glow: 0 0 0 1px #39FF8833, 0 0 24px #39FF881A`
- Add animation keyframes: `typing`, `caret`, `glitch`, `scanline`.

---

## Content Tone Guidelines
- Voice: precise, curious, security-minded, pragmatic.
- Avoid buzzword-heavy copy; emphasize outcomes and real tools.
- Keep project descriptions impact-first: `problem -> approach -> result`.

