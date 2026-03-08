'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  settled: boolean;
  settledTimer: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

interface CollisionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MAX_FLAKES = 100;
const SETTLED_LIFETIME = 3000;
const COLLISION_SCAN_INTERVAL = 2000;

export default function SnowEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<Snowflake[]>([]);
  const rectsRef = useRef<CollisionRect[]>([]);
  const animRef = useRef<number>(0);
  const lastScanRef = useRef<number>(0);

  const scanCollisionRects = useCallback(() => {
    const rects: CollisionRect[] = [];
    // Query interactive/visible elements for collision
    const selectors = 'button, a, input, textarea, select, [role="button"], .card, h1, h2, h3, img, nav, aside, header';
    const elements = document.querySelectorAll(selectors);
    elements.forEach((el) => {
      const r = el.getBoundingClientRect();
      // Skip tiny or invisible elements
      if (r.width < 10 || r.height < 10 || r.bottom < 0 || r.top > window.innerHeight) return;
      rects.push({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      });
    });
    rectsRef.current = rects;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', handleResize);

    // Initialize snowflakes
    const flakes = flakesRef.current;
    for (let i = flakes.length; i < MAX_FLAKES; i++) {
      flakes.push(createFlake(w, h, true));
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap dt
      lastTime = now;

      // Periodically rescan DOM rects
      if (now - lastScanRef.current > COLLISION_SCAN_INTERVAL) {
        scanCollisionRects();
        lastScanRef.current = now;
      }

      ctx.clearRect(0, 0, w, h);
      const rects = rectsRef.current;

      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];

        if (f.settled) {
          f.settledTimer += dt * 1000;
          // Fade out settled snow
          const fadeProgress = f.settledTimer / SETTLED_LIFETIME;
          if (fadeProgress >= 1) {
            flakes[i] = createFlake(w, h, false);
            continue;
          }
          const alpha = f.opacity * (1 - fadeProgress);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
          continue;
        }

        // Physics: gravity + wind wobble
        f.vy += 20 * dt; // gravity
        f.vy = Math.min(f.vy, 80 + f.radius * 15); // terminal velocity
        f.wobblePhase += f.wobbleSpeed * dt;
        f.vx = Math.sin(f.wobblePhase) * (12 + f.radius * 3);

        const newX = f.x + f.vx * dt;
        const newY = f.y + f.vy * dt;

        // Check collision with DOM elements — land on top surfaces
        let collided = false;
        for (let j = 0; j < rects.length; j++) {
          const r = rects[j];
          // Check if flake is approaching the top edge of an element
          if (
            newX + f.radius > r.left &&
            newX - f.radius < r.right &&
            f.y + f.radius <= r.top + 2 && // was above or at the top
            newY + f.radius >= r.top - 1 // now at or past the top
          ) {
            f.y = r.top - f.radius;
            f.x = newX;
            f.settled = true;
            f.settledTimer = 0;
            f.vy = 0;
            f.vx = 0;
            collided = true;
            break;
          }
        }

        if (!collided) {
          f.x = newX;
          f.y = newY;

          // Floor collision
          if (f.y + f.radius >= h) {
            f.y = h - f.radius;
            f.settled = true;
            f.settledTimer = 0;
            f.vy = 0;
            f.vx = 0;
          }

          // Wrap horizontally
          if (f.x < -10) f.x = w + 10;
          if (f.x > w + 10) f.x = -10;

          // Off top (shouldn't happen but safety)
          if (f.y < -50) {
            flakes[i] = createFlake(w, h, false);
            continue;
          }
        }

        // Draw
        const alpha = f.settled ? f.opacity * (1 - f.settledTimer / SETTLED_LIFETIME) : f.opacity;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [scanCollisionRects]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9997,
      }}
    />
  );
}

function createFlake(w: number, h: number, scatter: boolean): Snowflake {
  const radius = 0.5 + Math.random() * 1.5;
  return {
    x: Math.random() * w,
    y: scatter ? -(Math.random() * h) : -(Math.random() * 20 + 5),
    vx: 0,
    vy: 15 + Math.random() * 30,
    radius,
    opacity: 0.15 + Math.random() * 0.25,
    settled: false,
    settledTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 1.5 + Math.random() * 2,
  };
}
