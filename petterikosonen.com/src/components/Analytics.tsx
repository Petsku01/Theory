"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Simple privacy-focused analytics - stores nothing, just logs page views
// Replace with Plausible, Umami, or similar when ready for production

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Log page view (replace with actual analytics when deployed)
    if (process.env.NODE_ENV === "production") {
      // Example: Send to your own analytics endpoint
      // fetch("/api/analytics", { method: "POST", body: JSON.stringify({ path: pathname }) });
      console.log(`[Analytics] Page view: ${pathname}`);
    }
  }, [pathname]);

  return null;
}
