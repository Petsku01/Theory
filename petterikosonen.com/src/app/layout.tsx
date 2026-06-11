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
        <link rel="preload" href="/particles.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-992b1c46c4be5296be844edf64eaf03badc025791f1778e74fdf4098843cdc7e62a3be2b42e8060c40dab97b14988d6e" />
        <link rel="preload" href="/renderer3d.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-d8a8efe19c86d349c4be1ea64d106639f991c84293e6b2c899643382470390f62e20a7b83caa8d5c2e64454c13efb095" />
        <link rel="preload" href="/matrix_rain.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-ebd9556c24e22c4dd1130969485db5bda78e2c43b87301d69b8e3f0038545ae16459e56d68053dde776aca97c7364e26" />
        <link rel="preload" href="/mouse_trail.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-96c2c4cc25757839c8fc4ecde00e36c1d243b7f13a14403bcb1731c9bef70d64f387e681712fb4ec9571902d4a96d1f2" />
        <link rel="preload" href="/spring_cursor.wasm" as="fetch" crossOrigin="anonymous" integrity="sha384-4c76dc0ff626a208ce6aec77d3bbf28769f675f1d98053be0c95d0da4ce100a03f5ccbcee429841ba09a1ccdeb04a6fa" />
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
