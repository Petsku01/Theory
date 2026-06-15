import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import AmbientBackground from "@/components/AmbientBackground";
import ClientEffects from "@/components/ClientEffects";

export const viewport: Viewport = {
  themeColor: "#05070A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://petterikosonen.com"),
  title: {
    default: "Petteri Kosonen — Application Specialist",
    template: "%s | Petteri Kosonen",
  },
  description:
    "Application Specialist at 2M-IT, B.Eng. student in Cybersecurity. Building practical AI tools and resilient systems.",
  keywords: ["Petteri Kosonen", "Cybersecurity", "IT Support", "WebAssembly", "AI Safety", "Finland"],
  authors: [{ name: "Petteri Kosonen" }],
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    title: "Petteri Kosonen — Application Specialist",
    description: "Application Specialist at 2M-IT. Cybersecurity, AI research, and prompt engineering.",
    type: "website",
    locale: "en_US",
    url: "https://petterikosonen.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Petteri Kosonen — Application Specialist",
    description: "Cybersecurity, AI research, and prompt engineering",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/particles.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-mSscRsS-Upa-hE7fZOrwO63AJXkfF3jnT99AmIQ83H5io74rQugGDEDauXsUmI1u" />
        <link rel="preload" href="/renderer3d.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-2Kjv4ZyG00nEvh6mTRBmOfmRyEKT5rLImWQzgkcDkPYuIKe4PKqNXC5kRUwT77CV" />
        <link rel="preload" href="/matrix_rain.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-69lVbCTiLE3REwlpSF21vaeOLEO4cwHWm44_ADhUWuFkWeVtaAU93ndqypfHNk4m" />
        <link rel="preload" href="/spring_cursor.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-THbcD_YmogjOaux307vyh2n2dfHZgFO-DJXQ2kzhAKA_XMvO5CmEG6CaHM3rBKb6" />
        <link rel="preload" href="/wasm/wasm_particles_bg.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-EBKBC4eTKHOk8xDNioPw9SYRnHUHZEdXlPhCI2Y9xo0SoqnE6vjDD23Y7wnDbdbR" />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        {/* Background layers */}
        <AmbientBackground />
        <ClientEffects />
        <Analytics />

        <a
          href="#main-content"
          className="focus-outline sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 z-50 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-bold text-text-inverse"
        >
          Skip to content
        </a>

        <div className="relative z-[45] flex min-h-screen flex-col">
          <div className="container-shell py-4">
            <Navbar />
            <main id="main-content" role="main" className="mt-8 flex-1 pb-12">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
