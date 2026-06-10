"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Proximity auto-select: zoom close enough and node opens without click ──
export function ProximitySelector({
  positions,
  onProximitySelect,
  selectedId,
  nodeSizes,
}: {
  positions: Map<string, THREE.Vector3>;
  onProximitySelect: (id: string | null) => void;
  selectedId: string | null;
  nodeSizes: Map<string, number>;
}) {
  const { camera } = useThree();
  const autoIdRef = useRef<string | null>(null);
  const throttleRef = useRef<number>(0);
  const lastSelectRef = useRef<number>(0);
  const selectedIdRef = useRef(selectedId);

  // Sync selectedId to ref to avoid stale closure in useFrame
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Reset auto-tracking when user manually selects (click overrides proximity)
  useEffect(() => {
    if (selectedId !== null) {
      autoIdRef.current = null;
    }
  }, [selectedId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoIdRef.current !== null) {
        onProximitySelect(null);
      }
    };
  }, [onProximitySelect]);

  useFrame(() => {
    const now = performance.now();
    // Throttle: check once every 200ms
    if (now - throttleRef.current < 200) return;
    throttleRef.current = now;

    if (positions.size === 0) return;

    const camPos = camera.position;

    // Find closest node to camera
    let closestId: string | null = null;
    let minDist = Infinity;
    for (const [id, pos] of positions) {
      const dist = camPos.distanceTo(pos);
      if (dist < minDist) {
        minDist = dist;
        closestId = id;
      }
    }

    if (autoIdRef.current !== null) {
      // Currently auto-selected -- check if should deselect

      // Handle deleted node: force deselect
      const autoPos = positions.get(autoIdRef.current);
      if (!autoPos) {
        autoIdRef.current = null;
        onProximitySelect(null);
        return;
      }

      // Use AUTO-SELECTED node's size for deselect threshold (not closest)
      const autoSize = nodeSizes.get(autoIdRef.current) ?? 1;
      const SELECT_DIST = 4 + autoSize * 2;
      const DESELECT_DIST = SELECT_DIST + 3 + autoSize * 2;

      // Grace period: don't deselect for 2s after selecting (camera needs time to arrive)
      const graceElapsed = now - lastSelectRef.current > 2000;
      const dist = camPos.distanceTo(autoPos);

      // Deselect if: grace period elapsed AND too far, OR extremely far (break grace)
      if (graceElapsed || dist > DESELECT_DIST * 2.5) {
        if (dist > DESELECT_DIST) {
          autoIdRef.current = null;
          onProximitySelect(null);
          // Check if another node is close enough
          if (closestId) {
            const closestSize = nodeSizes.get(closestId) ?? 1;
            const newSelectDist = 4 + closestSize * 2;
            if (minDist <= newSelectDist) {
              autoIdRef.current = closestId;
              lastSelectRef.current = now;
              onProximitySelect(closestId);
            }
          }
          return;
        }
      }
    } else {
      // No auto-selection -- check if a node is close enough
      // Don't auto-select if there's already a manual (click) selection
      if (selectedIdRef.current === null && closestId) {
        const closestSize = nodeSizes.get(closestId) ?? 1;
        const SELECT_DIST = 4 + closestSize * 2;
        if (minDist <= SELECT_DIST) {
          autoIdRef.current = closestId;
          throttleRef.current = now;
          lastSelectRef.current = now;
          onProximitySelect(closestId);
        }
      }
    }
  });

  return null;
}