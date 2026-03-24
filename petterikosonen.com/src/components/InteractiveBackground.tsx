"use client";

import { useEffect, useRef, useCallback } from "react";

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const pointsRef = useRef<Point[]>([]);
  const animationRef = useRef<number>(0);

  const initPoints = useCallback((width: number, height: number) => {
    const points: Point[] = [];
    const spacing = 80;
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 1;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        points.push({
          x: i * spacing,
          y: j * spacing,
          originX: i * spacing,
          originY: j * spacing,
          vx: 0,
          vy: 0,
        });
      }
    }
    pointsRef.current = points;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const mouse = mouseRef.current;
    const points = pointsRef.current;

    ctx.clearRect(0, 0, width, height);

    // Update points
    const mouseRadius = 150;
    const returnSpeed = 0.08;
    const mouseForce = 0.15;

    for (const point of points) {
      const dx = mouse.x - point.x;
      const dy = mouse.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouseRadius && dist > 0) {
        const force = (mouseRadius - dist) / mouseRadius;
        const angle = Math.atan2(dy, dx);
        point.vx -= Math.cos(angle) * force * mouseForce * 40;
        point.vy -= Math.sin(angle) * force * mouseForce * 40;
      }

      // Return to origin
      point.vx += (point.originX - point.x) * returnSpeed;
      point.vy += (point.originY - point.y) * returnSpeed;

      // Damping
      point.vx *= 0.92;
      point.vy *= 0.92;

      point.x += point.vx;
      point.y += point.vy;
    }

    // Draw connections
    const connectionDist = 100;
    ctx.strokeStyle = "rgba(34, 211, 238, 0.12)";
    ctx.lineWidth = 1;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDist) {
          const opacity = (1 - dist / connectionDist) * 0.15;
          ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw points
    for (const point of points) {
      const dx = point.x - point.originX;
      const dy = point.y - point.originY;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      const intensity = Math.min(displacement / 30, 1);
      
      const r = 34 + (167 - 34) * intensity;
      const g = 211 + (139 - 211) * intensity;
      const b = 238 + (250 - 238) * intensity;
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.4})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + intensity * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouse glow
    if (mouse.x > 0 && mouse.y > 0) {
      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
      gradient.addColorStop(0, "rgba(34, 211, 238, 0.08)");
      gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.04)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(mouse.x - 120, mouse.y - 120, 240, 240);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints(canvas.width, canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate, initPoints]);

  // Check for reduced motion preference
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
