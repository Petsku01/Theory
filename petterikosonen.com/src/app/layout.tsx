import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import AmbientBackground from "@/components/AmbientBackground";
import ClientEffects from "@/components/ClientEffects";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="en" className={`${manrope.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable}`}>
      <head />
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
