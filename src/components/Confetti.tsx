import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { Mascot } from './Mascot';

const colors = ['#ffc56a', '#ffb15a', '#7ec4ef', '#fffaf6', '#9fd4f5', '#f3a06a', '#c9b7f2', '#7ed0c0'];

function star(context: CanvasRenderingContext2D, radius: number) {
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const length = point % 2 === 0 ? radius : radius * 0.42;
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

export default function Confetti({ burst, finale }: { burst: number; finale: boolean }) {
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
    const count = finale ? 128 : 72;
    const pieces = Array.from({ length: count }, () => ({
      x: width * (0.32 + Math.random() * 0.36),
      y: height * (finale ? 0.42 : 0.34),
      w: 5 + Math.random() * 7,
      h: 3 + Math.random() * 5,
      vx: -6 + Math.random() * 12,
      vy: -9 - Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)] || '#ffb15a',
      spin: Math.random() * 0.28,
      star: Math.random() > (finale ? 0.35 : 0.62),
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
        if (piece.star) star(context, piece.w);
        else context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        context.restore();
      });
      if (frame < (finale ? 96 : 72)) raf = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(tick);
    const hide = window.setTimeout(() => setCheer(0), 1700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hide);
    };
  }, [burst, finale, reduce]);

  if (reduce) return null;
  return (
    <>
      <canvas ref={ref} className="confetti" aria-hidden="true" />
      {cheer > 0 && (
        <div className="cheer" aria-hidden="true">
          <motion.p className="bubble" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {finale ? 'You did it!' : 'Yes!'}
          </motion.p>
          <motion.div
            initial={{ y: 16, scale: 0.9, rotate: -6 }}
            animate={{ y: [16, -8, 0], scale: 1, rotate: [-6, 6, 0] }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >
            <Mascot className="mascot" />
          </motion.div>
        </div>
      )}
    </>
  );
}
