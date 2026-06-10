"use client";

import { useMemo } from "react";
import * as THREE from "three";

// ── Canvas-textured grid floor ──
export function CyberGrid() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    ctx.strokeStyle = "rgba(0, 240, 255, 0.12)";
    ctx.lineWidth = 2;
    const spacing = 64;
    for (let x = spacing; x < canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = spacing; y < canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.85, "transparent");
    gradient.addColorStop(1, "rgba(10,10,15,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}