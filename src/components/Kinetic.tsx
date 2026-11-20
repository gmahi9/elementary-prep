import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from 'motion/react';
import { prefersReducedMotion } from '../lib/orbit';

function stayStill(reduce: boolean | null): boolean {
  return reduce === true || (reduce == null && prefersReducedMotion());
}

export function RevealLines({ lines }: { lines: readonly string[] }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const text = lines.join('\n');
  useEffect(() => {
    const root = ref.current;
    if (!root || stayStill(reduce)) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('[data-line]', {
        yPercent: 110,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }, root);
    return () => ctx.revert();
  }, [reduce, text]);
  return (
    <h2 className="display" ref={ref}>
      {lines.map((line) => (
        <span className="line-mask" key={line}>
          <span className="line" data-line>{line}</span>
        </span>
      ))}
    </h2>
  );
}

export function TypeLine({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (stayStill(reduce)) {
      node.textContent = text;
      setDone(true);
      return undefined;
    }
    setDone(false);
    node.textContent = '';
    const proxy = { n: 0 };
    const tween = gsap.to(proxy, {
      n: text.length,
      duration: Math.min(2.6, 0.4 + text.length * 0.028),
      ease: 'none',
      delay: 0.28,
      onUpdate: () => {
        node.textContent = text.slice(0, Math.round(proxy.n));
      },
      onComplete: () => setDone(true),
    });
    return () => { tween.kill(); };
  }, [reduce, text]);
  return (
    <span className={done ? 'type-wrap done' : 'type-wrap'} aria-hidden="true">
      <span ref={ref} />
      <span className="caret" />
    </span>
  );
}
