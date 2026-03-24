'use client';

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "shard" | "ember";
}

const COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#DC2626", // darker red
  "#FB923C", // light orange
  "#FDE047", // bright yellow
  "#7F1D1D", // deep crimson
  "#FFFFFF", // white-hot core
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function ExplosionEffect({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initParticles = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const arr: Particle[] = [];

    // Core burst — fast outward
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(4, 18);
      arr.push({
        x: cx + randomBetween(-20, 20),
        y: cy + randomBetween(-20, 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: randomBetween(2, 6),
        alpha: 1,
        decay: randomBetween(0.008, 0.02),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: randomBetween(-0.1, 0.1),
        shape: "circle",
      });
    }

    // Shards — angular debris
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(2, 12);
      arr.push({
        x: cx + randomBetween(-40, 40),
        y: cy + randomBetween(-40, 40),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: randomBetween(3, 10),
        alpha: 1,
        decay: randomBetween(0.006, 0.016),
        color: COLORS[Math.floor(Math.random() * 5)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: randomBetween(-0.15, 0.15),
        shape: "shard",
      });
    }

    // Embers — slow floating sparks
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(1, 6);
      arr.push({
        x: cx + randomBetween(-60, 60),
        y: cy + randomBetween(-60, 60),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(0, 2),
        radius: randomBetween(1, 3),
        alpha: 1,
        decay: randomBetween(0.004, 0.012),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: 0,
        rotationSpeed: 0,
        shape: "ember",
      });
    }

    return arr;
  }, []);

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const parts = initParticles(w, h);
    const start = performance.now();

    let flashAlpha = 0.7;
    let frameId = 0;

    const animate = () => {
      const elapsed = performance.now() - start;

      ctx.clearRect(0, 0, w, h);

      // Initial white flash
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 200, 150, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
        flashAlpha -= 0.035;
      }

      let alive = 0;

      for (const p of parts) {
        if (p.alpha <= 0) continue;
        alive++;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.vx *= 0.995; // drag
        p.vy *= 0.995;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === "circle") {
          // Glowing circle
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(0.6, p.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "shard") {
          // Angular shard
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.radius);
          ctx.lineTo(p.radius * 0.4, p.radius * 0.5);
          ctx.lineTo(-p.radius * 0.4, p.radius * 0.5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Ember — small bright dot with trail
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.globalAlpha = Math.max(0, p.alpha * 0.3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.vx * 3, -p.vy * 3);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.radius * 0.5;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Ring shockwave in first 600ms
      if (elapsed < 600) {
        const progress = elapsed / 600;
        const ringRadius = progress * Math.max(w, h) * 0.6;
        ctx.save();
        ctx.globalAlpha = (1 - progress) * 0.3;
        ctx.strokeStyle = "#F97316";
        ctx.lineWidth = 3 + (1 - progress) * 8;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (alive > 0 && elapsed < 4000) {
        frameId = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [initParticles, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
