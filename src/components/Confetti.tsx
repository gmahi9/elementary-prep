import { useEffect, useRef } from 'react';

const colors = ['#ffc857', '#e85d4c', '#1f9d57', '#3d4fd8', '#d63d86', '#0e8a86'];

export function Confetti({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const pieces = Array.from({ length: 70 }, () => ({
      x: width * (0.2 + Math.random() * 0.6),
      y: height * 0.25,
      r: 4 + Math.random() * 5,
      vx: -3 + Math.random() * 6,
      vy: -6 - Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)] || '#ffc857',
      spin: Math.random() * 0.3,
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      pieces.forEach((piece) => {
        piece.vy += 0.18;
        piece.x += piece.vx;
        piece.y += piece.vy;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(frame * piece.spin);
        context.fillStyle = piece.color;
        context.fillRect(-piece.r, -piece.r / 2, piece.r * 2, piece.r);
        context.restore();
      });
      if (frame < 70) raf = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [burst]);

  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
