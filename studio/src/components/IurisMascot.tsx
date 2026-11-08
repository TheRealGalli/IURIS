import { useEffect, useRef, useState } from 'react';
import './IurisMascot.css';

type Motion = 'rest' | 'hello' | 'stretch' | 'sway' | 'twirl' | 'loop';
const DURATION: Record<Exclude<Motion, 'rest'>, number> = { hello: 1050, stretch: 1700, sway: 2100, twirl: 2600, loop: 2200 };
const GESTURES = ['stretch', 'sway', 'twirl', 'loop'] as const;

/** Un piccolo logo a riposo; React sceglie un gesto, poi alterna brevi pause e piccoli loop. */
export default function IurisMascot({ variant = 'small', active = true, greet = false }: {
  variant?: 'small' | 'guide' | 'working'; active?: boolean; greet?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const greeted = useRef(false), last = useRef<Motion>('rest');
  const [motion, setMotion] = useState<Motion>('rest');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(preference.matches);
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    setMotion('rest');
    if (!active || reduced) return;
    let next = 0, finish = 0, frame = 0, playing = false;
    const node = root.current;
    const trigger = node?.closest('a, button') ?? node;
    const visible = () => !document.hidden && !!node?.getBoundingClientRect().width;
    const choose = () => {
      const choices = GESTURES.filter((gesture) => gesture !== last.current);
      return choices[Math.floor(Math.random() * choices.length)];
    };
    const schedule = (first = false) => {
      clearTimeout(next);
      // Piccoli loop alternati, senza ripetere due volte di fila lo stesso gesto.
      next = window.setTimeout(() => {
        if (visible()) perform(first && last.current === 'rest' ? 'twirl' : choose()); else schedule();
      }, first ? 2200 : 3500 + Math.random() * 4000);
    };
    const perform = (gesture: Exclude<Motion, 'rest'>) => {
      if (playing || !visible()) return;
      clearTimeout(next); playing = true; last.current = gesture;
      if (gesture === 'hello') greeted.current = true;
      setMotion(gesture);
      finish = window.setTimeout(() => { playing = false; setMotion('rest'); schedule(); }, DURATION[gesture]);
    };
    // La I può arrotolarsi in un puntino e riaprirsi; nessun occhio disegnato.
    const hover = () => perform(last.current === 'rest' ? 'twirl' : choose());
    const focus = () => perform('twirl');
    const visibility = () => {
      clearTimeout(next); clearTimeout(finish); cancelAnimationFrame(frame);
      playing = false; setMotion('rest');
      if (!document.hidden) schedule();
    };
    trigger?.addEventListener('pointerenter', hover);
    trigger?.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    if (greet && !greeted.current) frame = requestAnimationFrame(() => perform('hello'));
    else schedule(!greet);
    return () => {
      clearTimeout(next); clearTimeout(finish); cancelAnimationFrame(frame);
      trigger?.removeEventListener('pointerenter', hover);
      trigger?.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, greet, reduced]);

  return <span ref={root} className={`iuris-mascot iuris-mascot--${variant}`} data-motion={motion} data-awake={active && !reduced} aria-hidden="true">
    <svg viewBox="0 0 80 80" fill="none" focusable="false">
      <g className="iuris-mascot-core">
        <text className="iuris-mascot-letter" x="40" y="40">I</text>
        <circle className="iuris-mascot-dot" cx="40" cy="40" r="4.5" />
      </g>
    </svg>
  </span>;
}
