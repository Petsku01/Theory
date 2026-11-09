"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type CortexInteractionValue = {
  activeCluster: string | null;
  selectCluster: (cluster: string | null) => void;
  shakeTimestamp: number;
  isMobile: boolean;
  interactive: boolean;
};

const CortexInteractionContext = createContext<CortexInteractionValue | null>(
  null,
);

export function CortexInteractionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const interactive = pathname === "/";
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [shakeTimestamp, setShakeTimestamp] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!interactive) setActiveCluster(null);
  }, [interactive]);

  const selectCluster = useCallback((cluster: string | null) => {
    setActiveCluster(cluster);
    if (cluster !== null) {
      setShakeTimestamp((prev) => prev + 1);
    }
  }, []);

  const value = useMemo(
    () => ({
      activeCluster,
      selectCluster,
      shakeTimestamp,
      isMobile,
      interactive,
    }),
    [activeCluster, selectCluster, shakeTimestamp, isMobile, interactive],
  );

  return (
    <CortexInteractionContext.Provider value={value}>
      {children}
    </CortexInteractionContext.Provider>
  );
}

export function useCortexInteraction(): CortexInteractionValue {
  const ctx = useContext(CortexInteractionContext);
  if (!ctx) {
    throw new Error("useCortexInteraction must be used within CortexInteractionProvider");
  }
  return ctx;
}
