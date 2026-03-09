'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

interface CollisionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const MAX_FLAKES = 80;
const COLLISION_SCAN_INTERVAL = 2000;

export default function SnowEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<Snowflake[]>([]);
  const rectsRef = useRef<CollisionRect[]>([]);
  const animRef = useRef<number>(0);
  const lastScanRef = useRef<number>(0);

  const scanCollisionRects = useCallback(() => {
    const rects: CollisionRect[] = [];
    const selectors = 'button, a, input, textarea, select, [role="button"], .card, h1, h2, h3, img, nav, aside, header';
    const elements = document.querySelectorAll(selectors);
    elements.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10 || r.bottom < 0 || r.top > window.innerHeight) return;
      rects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
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

    // Spread initial flakes across the full screen height so there's no empty gap
    const flakes = flakesRef.current;
    flakes.length = 0;
    for (let i = 0; i < MAX_FLAKES; i++) {
      flakes.push(createFlake(w, h, true));
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (now - lastScanRef.current > COLLISION_SCAN_INTERVAL) {
        scanCollisionRects();
        lastScanRef.current = now;
      }

      ctx.clearRect(0, 0, w, h);
      const rects = rectsRef.current;

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];

        // Physics
        f.vy += 15 * dt;
        f.vy = Math.min(f.vy, 60 + f.radius * 10);
        f.wobblePhase += f.wobbleSpeed * dt;
        f.vx = Math.sin(f.wobblePhase) * (10 + f.radius * 2);

        const newX = f.x + f.vx * dt;
        const newY = f.y + f.vy * dt;

        // Check collision with DOM elements
        let collided = false;
        for (let j = 0; j < rects.length; j++) {
          const r = rects[j];
          if (
            newX + f.radius > r.left &&
            newX - f.radius < r.right &&
            f.y + f.radius <= r.top + 2 &&
            newY + f.radius >= r.top - 1
          ) {
            collided = true;
            break;
          }
        }

        // Off screen or collided — instantly respawn at top
        if (collided || newY > h + 5) {
          flakes[i] = createFlake(w, h, false);
          const nf = flakes[i];
          ctx.globalAlpha = nf.opacity;
          ctx.beginPath();
          ctx.arc(nf.x, nf.y, nf.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        f.x = newX;
        f.y = newY;

        // Wrap horizontally
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        // Draw
        ctx.globalAlpha = f.opacity;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
      }
      ctx.globalAlpha = 1;

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
    // scatter: spread across full viewport; respawn: just above top edge
    y: scatter ? Math.random() * h : -(Math.random() * 30 + 5),
    vx: 0,
    vy: 20 + Math.random() * 25,
    radius,
    opacity: 0.12 + Math.random() * 0.22,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 1.5 + Math.random() * 2,
  };
}
