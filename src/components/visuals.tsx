import { useEffect, useRef, useState, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, type HTMLMotionProps } from 'motion/react';
import type { SectionId } from '../types';

type TapProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'>;

function allowTilt(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTiltMotion(enabled = true) {
  const reduce = useReducedMotion();
  const fine = useRef(allowTilt());
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 260, damping: 22, mass: 0.35 });
  const rotateY = useSpring(ry, { stiffness: 260, damping: 22, mass: 0.35 });
  useEffect(() => {
    fine.current = allowTilt() && reduce !== true;
    if (!enabled || reduce === true) {
      rx.set(0);
      ry.set(0);
    }
  }, [enabled, reduce, rx, ry]);
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || reduce === true || !fine.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rx.set(y * -6);
    ry.set(x * 7);
  };
  const onPointerLeave = () => {
    rx.set(0);
    ry.set(0);
  };
  return { rotateX, rotateY, onPointerMove, onPointerLeave };
}

type TiltProps = Pick<HTMLMotionProps<'li'>, 'initial' | 'whileInView' | 'viewport' | 'transition' | 'className' | 'children'>;

export function TiltCard({ className, children, ...rest }: TiltProps) {
  const tilt = useTiltMotion();
  return (
    <motion.li
      className={className}
      {...rest}
      style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 900 }}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      {children}
    </motion.li>
  );
}

export function Tap({ className, children, ...rest }: TapProps) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      className={className}
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Counter({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    if (reduce) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }
    const from = shownRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 480);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (value - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, value]);
  return <>{shown}</>;
}

export function Flame({ active }: { active: boolean }) {
  return (
    <svg className={active ? 'flame on' : 'flame'} viewBox="0 0 32 32" aria-hidden="true">
      <path className="flicker" d="M16 3c1.6 4.2 6.4 6.2 7.4 11.2 1.2 5.6-2.6 11.6-7.4 11.6s-8.8-5.6-7.6-11.4C9.4 9.6 13.2 8 16 3z" />
      <path className="core" d="M16 14c.8 2 3 2.8 3.2 5.4.3 2.6-1.4 5-3.2 5s-3.6-2.2-3.4-4.8c.3-2.2 2.2-3.2 3.4-5.6z" />
    </svg>
  );
}

export function Ring({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const radius = 16;
  const length = 2 * Math.PI * radius;
  return (
    <svg className="ring" viewBox="0 0 40 40" aria-hidden="true">
      <circle className="ring-track" cx="20" cy="20" r={radius} />
      <g transform="rotate(-90 20 20)">
        <motion.circle
          className="ring-value"
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={length}
          initial={false}
          animate={{ strokeDashoffset: length * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
        />
      </g>
    </svg>
  );
}

export function SectionIcon({ id }: { id: SectionId }) {
  if (id === 'cogat') {
    return (
      <svg className="tab-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 8h7v7H8zM17 8h7v7h-7zM8 17h7v7H8z" />
        <circle cx="20.5" cy="20.5" r="3.2" />
      </svg>
    );
  }
  if (id === 'iready') {
    return (
      <svg className="tab-icon" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="18" width="6" height="8" rx="1.5" />
        <rect x="13" y="12" width="6" height="14" rx="1.5" />
        <rect x="20" y="7" width="6" height="19" rx="1.5" />
      </svg>
    );
  }
  if (id === 'map') {
    return (
      <svg className="tab-icon" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 8.5h12.5A5.5 5.5 0 0 1 25 14v10.5H12.5A5.5 5.5 0 0 1 7 19V8.5z" />
        <path d="M16 8.5v16" />
      </svg>
    );
  }
  return (
    <svg className="tab-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5l1.8 6.2L24 13l-6.2 1.8L16 21l-1.8-6.2L8 13l6.2-1.8L16 5z" />
      <path d="M24 18l.8 2.2L27 21l-2.2.8L24 24l-.8-2.2L21 21l2.2-.8L24 18z" />
    </svg>
  );
}

const badgeShapes: Record<string, ReactNode> = {
  'first-star': <path d="M16 4l2.4 6.4H25l-5.2 4 2 6.4L16 17.2 10.2 20.8l2-6.4L7 10.4h6.6L16 4z" />,
  'streak-5': <path d="M16 4c1.4 3.6 5.2 5.2 6 9.2.9 4.6-2.2 9.8-6 9.8s-7.2-4.8-6.2-9.6C10.6 9.2 13.6 8 16 4z" />,
  'streak-10': <path d="M16 3c1.6 4 6 5.6 7 10 1.1 5-2.4 11-7 11s-8.4-5.4-7.2-10.8C9.8 8.4 13.2 7.2 16 3z" />,
  'warm-up': <><circle cx="16" cy="16" r="5" /><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M24.5 7.5l-2 2M9.5 22.5l-2 2" /></>,
  century: <><circle cx="16" cy="14" r="6" /><path d="M10 20l-2 8 8-3 8 3-2-8" /></>,
  'skill-star': <><circle cx="16" cy="16" r="9" /><path d="M16 9l1.6 4h4.2l-3.4 2.6 1.3 4.2L16 17.4 12.3 19.8l1.3-4.2L10.2 13h4.2L16 9z" /></>,
  'test-taker': <><rect x="9" y="6" width="14" height="20" rx="2" /><path d="M12 12h8M12 16h8M12 20h5" /></>,
  'page-turner': <path d="M6 8h9.5A4.5 4.5 0 0 1 20 12.5V25H10.5A4.5 4.5 0 0 1 6 20.5V8zm14 0h6v13.5A3.5 3.5 0 0 1 22.5 25H20" />,
  'number-navigator': <><rect x="6" y="6" width="8" height="8" rx="2" /><rect x="18" y="6" width="8" height="8" rx="2" /><rect x="6" y="18" width="8" height="8" rx="2" /><rect x="18" y="18" width="8" height="8" rx="2" /></>,
  'puzzle-pilot': <path d="M8 8h6v4a3 3 0 1 0 0 6v6H8V8zm10 0h6v16h-6v-4a3 3 0 1 1 0-6V8z" />,
  'idea-spark': <path d="M16 5l1.5 5.2 5.5 1.3-5.5 1.3L16 18l-1.5-5.2L9 11.5l5.5-1.3L16 5zm8 12l.8 2.4 2.2.6-2.2.6L24 23l-.8-2.4-2.2-.6 2.2-.6L24 17z" />,
  comeback: <path d="M24 12a8 8 0 1 0 1.2 7" />,
};

export function BadgeArt({ id, earned }: { id: string; earned: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      className={earned ? 'badge-art on' : 'badge-art'}
      viewBox="0 0 32 32"
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.86, opacity: 0.4 }}
      animate={
        earned && !reduce
          ? { scale: [1, 1.06, 1], opacity: 1, rotate: [0, -6, 6, 0] }
          : { scale: 1, opacity: earned ? 1 : 0.45, rotate: 0 }
      }
      transition={earned && !reduce ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : { type: 'spring', stiffness: 260, damping: 20 }}
    >
      <circle cx="16" cy="16" r="13" />
      {badgeShapes[id] || <circle cx="16" cy="16" r="4" />}
      {id === 'comeback' && <path d="M22 8l4 4-4 1" />}
    </motion.svg>
  );
}

export function QuestionSwap({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={id}
        className="swap"
        initial={reduce ? false : { opacity: 0, x: 22, rotateY: -8 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        exit={reduce ? undefined : { opacity: 0, x: -18, rotateY: 6 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="grain" />
    </div>
  );
}
