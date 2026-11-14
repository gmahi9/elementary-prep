import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const colors = ['#8d4520', '#e39455', '#2f7eb8', '#5a96c4', '#96c4e8', '#f3e2c4', '#1c2430'];

export default function Confetti({ burst }: { burst: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const [cheer, setCheer] = useState(0);

  useEffect(() => {
    if (!burst || reduce) return undefined;
    setCheer(burst);
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const pieces = Array.from({ length: 84 }, () => ({
      x: width * (0.35 + Math.random() * 0.3),
      y: height * 0.32,
      w: 5 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      vx: -5 + Math.random() * 10,
      vy: -8 - Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)] || '#e39455',
      spin: Math.random() * 0.28,
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
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        context.restore();
      });
      if (frame < 72) raf = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(tick);
    const hide = window.setTimeout(() => setCheer(0), 1700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hide);
    };
  }, [burst, reduce]);

  if (reduce) return null;
  return (
    <>
      <canvas ref={ref} className="confetti" aria-hidden="true" />
      {cheer > 0 && (
        <div className="cheer" aria-hidden="true">
          <motion.p className="bubble" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            Yes!
          </motion.p>
          <motion.svg
            className="mascot"
            viewBox="0 0 88 88"
            initial={{ y: 16, scale: 0.9 }}
            animate={{ y: [16, -6, 0], scale: 1, rotate: [0, -6, 4, 0] }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >
            <circle cx="44" cy="46" r="28" fill="#fffcf7" stroke="#1c2430" strokeWidth="2.5" />
            <circle cx="34" cy="44" r="3" fill="#1c2430" />
            <circle cx="54" cy="44" r="3" fill="#1c2430" />
            <path d="M34 54c3 5 17 5 20 0" fill="none" stroke="#8d4520" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="52" r="3.2" fill="#e39455" />
            <circle cx="60" cy="52" r="3.2" fill="#e39455" />
            <motion.path
              d="M16 50c-6 2-8 10-4 14"
              fill="none"
              stroke="#2f7eb8"
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ rotate: [-8, 10, -8] }}
              transition={{ duration: 0.6, repeat: 2 }}
              style={{ originX: '16px', originY: '50px' }}
            />
            <motion.path
              d="M72 50c6 2 8 10 4 14"
              fill="none"
              stroke="#2f7eb8"
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ rotate: [8, -10, 8] }}
              transition={{ duration: 0.6, repeat: 2 }}
              style={{ originX: '72px', originY: '50px' }}
            />
          </motion.svg>
        </div>
      )}
    </>
  );
}
