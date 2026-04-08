import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import AmbientBackground from "@/components/AmbientBackground";
import InteractiveBackground from "@/components/InteractiveBackground";
import SpotlightCursor from "@/components/SpotlightCursor";

export const viewport: Viewport = {
  themeColor: "#05070A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://petterikosonen.com"),
  title: "Petteri Kosonen",
  description:
    "B.Eng. Student specializing in Data Networks and Cybersecurity. IT Support Specialist with experience in Microsoft technologies and security.",
  keywords: ["Petteri Kosonen", "Cybersecurity", "IT Support", "Developer", "Finland"],
  authors: [{ name: "Petteri Kosonen" }],
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    title: "Petteri Kosonen",
    description: "B.Eng. Student specializing in Data Networks and Cybersecurity",
    type: "website",
    locale: "en_US",
    url: "https://petterikosonen.com",
  },
  twitter: {
    card: "summary",
    title: "Petteri Kososen",
    description: "B.Eng. Student specializing in Data Networks and Cybersecurity",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        <AmbientBackground />
        <InteractiveBackground />
        <SpotlightCursor />
        <Analytics />
        <a
          href="#main-content"
          className="focus-outline sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 z-50 rounded bg-accent-cyan px-4 py-2 text-sm font-semibold text-text-inverse"
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
