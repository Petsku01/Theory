"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const lastMouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const animateRef = useRef<() => void>(() => {});
  const reduceMotion = useReducedMotion();

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const mouse = mouseRef.current;
    const lastMouse = lastMouseRef.current;
    const trail = trailRef.current;

    // Fade background (creates trail fade effect)
    ctx.fillStyle = "rgba(2, 6, 23, 0.08)";
    ctx.fillRect(0, 0, width, height);

    // Add new trail points when mouse moves
    if (mouse.x > 0 && mouse.y > 0) {
      const dx = mouse.x - lastMouse.x;
      const dy = mouse.y - lastMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Add points along the path for smooth trails
      if (dist > 2) {
        const steps = Math.min(Math.floor(dist / 3), 10);
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          trail.push({
            x: lastMouse.x + dx * t,
            y: lastMouse.y + dy * t,
            age: 0,
          });
        }
      }

      trail.push({ x: mouse.x, y: mouse.y, age: 0 });
      lastMouseRef.current = { x: mouse.x, y: mouse.y };
    }

    // Update and draw trail
    const maxAge = 60;
    const newTrail: TrailPoint[] = [];

    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      point.age++;

      if (point.age < maxAge) {
        newTrail.push(point);
      }
    }
    trailRef.current = newTrail;

    // Draw trail lines with gradient
    if (newTrail.length > 1) {
      for (let i = 1; i < newTrail.length; i++) {
        const prev = newTrail[i - 1];
        const curr = newTrail[i];
        
        const prevAlpha = 1 - prev.age / maxAge;
        const currAlpha = 1 - curr.age / maxAge;
        
        // Skip if both points are too old
        if (prevAlpha < 0.05 && currAlpha < 0.05) continue;

        // Calculate color based on age (cyan → purple → pink)
        const t = curr.age / maxAge;
        const r = Math.floor(34 + (236 - 34) * t);
        const g = Math.floor(211 + (72 - 211) * t);
        const b = Math.floor(238 + (153 - 238) * t);

        const gradient = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${prevAlpha * 0.8})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${currAlpha * 0.8})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2 + (1 - t) * 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }

      // Draw glow around recent points
      for (let i = Math.max(0, newTrail.length - 15); i < newTrail.length; i++) {
        const point = newTrail[i];
        const alpha = (1 - point.age / maxAge) * 0.4;
        const size = (1 - point.age / maxAge) * 20;

        if (alpha > 0.05) {
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
          gradient.addColorStop(0, `rgba(34, 211, 238, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 0.5})`);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw cursor glow
    if (mouse.x > 0 && mouse.y > 0) {
      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
      gradient.addColorStop(0, "rgba(34, 211, 238, 0.3)");
      gradient.addColorStop(0.4, "rgba(139, 92, 246, 0.15)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright point
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(() => animateRef.current());
  }, []);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  useEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseRef.current.x < 0) {
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    animationRef.current = requestAnimationFrame(() => animateRef.current());

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate, reduceMotion]);

  if (reduceMotion) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
