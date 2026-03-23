import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import AmbientBackground from "@/components/AmbientBackground";
import SpotlightCursor from "@/components/SpotlightCursor";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: "#05070A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Petteri Kosonen",
  description:
    "B.Eng. Student specializing in Data Networks and Cybersecurity. IT Support Specialist with experience in Microsoft technologies and security.",
  keywords: ["Petteri Kosonen", "Cybersecurity", "IT Support", "Developer", "Finland"],
  authors: [{ name: "Petteri Kosonen" }],
  manifest: "/manifest.json",
  alternates: {
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
    title: "Petteri Kosonen",
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
    <html lang="en" className={`${spaceGrotesk.variable} ${manrope.variable} ${ibmPlexMono.variable}`}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        <AmbientBackground />
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
            <main id="main-content" role="main" className="mt-6 flex-1 pb-10">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
