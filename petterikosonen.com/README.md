# petterikosonen.com

Personal portfolio and security demos site. Live at [petterikosonen.com](https://petterikosonen.com).

## Stack

- **Next.js 16** (Turbopack) — App Router, static generation
- **React 19** — Server & client components
- **Tailwind CSS 4** — Utility-first styling
- **TypeScript 5** — Strict mode

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — experience, education, skills |
| `/about` | Background & Microsoft technology expertise |
| `/projects` | Open source projects from GitHub |
| `/blog` | Security & development write-ups |
| `/security-demos` | Interactive client-side demos (XSS, SQLi, hashing, JWT, passwords) |
| `/kuu` | Kuu — AI experiment page |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, metadata, security headers
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Minimal black theme
│   ├── about/page.tsx
│   ├── blog/page.tsx
│   ├── projects/page.tsx
│   ├── security-demos/
│   │   ├── layout.tsx      # Metadata for client page
│   │   └── page.tsx        # Interactive security tools
│   ├── kuu/page.tsx
│   ├── not-found.tsx
│   ├── sitemap.ts
│   └── feed.xml/route.ts   # RSS feed
├── components/
│   ├── Navbar.tsx           # Responsive nav with mobile menu
│   ├── Footer.tsx
│   ├── ErrorBoundary.tsx
│   └── Analytics.tsx
└── lib/
    └── data.ts              # Shared blog/project data with TS types
```

## Features

- Security headers (CSP, X-Frame-Options, HSTS via hosting)
- RSS feed at `/feed.xml`
- XML sitemap
- Skip-to-content link & ARIA landmarks
- Mobile-responsive hamburger navigation
- Error boundary
- Client-side security demos (sandboxed XSS, JWT decoder, hash generator)
