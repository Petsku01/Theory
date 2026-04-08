import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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
    default: "Petteri Kosonen — Security Engineer",
    template: "%s | Petteri Kosonen",
  },
  description:
    "B.Eng. student specializing in Data Networks and Cybersecurity. Building practical AI safety tools and resilient security systems.",
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
    title: "Petteri Kosonen — Security Engineer",
    description: "B.Eng. student specializing in Data Networks and Cybersecurity. WASM-powered portfolio.",
    type: "website",
    locale: "en_US",
    url: "https://petterikosonen.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Petteri Kosonen — Security Engineer",
    description: "Cybersecurity, AI safety, and WebAssembly",
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
        <link rel="preload" href="/particles.wasm" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/renderer3d.wasm" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/matrix_rain.wasm" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/mouse_trail.wasm" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/spring_cursor.wasm" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        {/* Background layers */}
        <AmbientBackground />
        <Suspense fallback={null}>
          <ClientEffects />
        </Suspense>
        <Analytics />

        <a
          href="#main-content"
          className="focus-outline sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 z-50 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-bold text-text-inverse"
        >
          Skip to content
        </a>

        <div className="relative z-10 flex min-h-screen flex-col">
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
