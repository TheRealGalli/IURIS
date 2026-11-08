import { useEffect, useRef, useState } from 'react';
import './IurisMascot.css';

type Motion = 'rest' | 'hello' | 'stretch' | 'sway' | 'peek';
const DURATION: Record<Exclude<Motion, 'rest'>, number> = { hello: 1050, stretch: 1700, sway: 2100, peek: 2900 };
const GESTURES = ['stretch', 'sway', 'peek'] as const;

/** Un piccolo logo a riposo; React sceglie un gesto, poi lascia una lunga pausa. */
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
      // Nessun ciclo continuo: 1–3 secondi di gesto, poi 22–40 secondi di quiete.
      next = window.setTimeout(() => {
        if (visible()) perform(first && last.current === 'rest' ? 'peek' : choose()); else schedule();
      }, first ? 10500 : 22000 + Math.random() * 18000);
    };
    const perform = (gesture: Exclude<Motion, 'rest'>) => {
      if (playing || !visible()) return;
      clearTimeout(next); playing = true; last.current = gesture;
      if (gesture === 'hello') greeted.current = true;
      setMotion(gesture);
      finish = window.setTimeout(() => { playing = false; setMotion('rest'); schedule(); }, DURATION[gesture]);
    };
    // Il primo incontro rivela l'occhio; le interazioni successive variano il gesto.
    const hover = () => perform(last.current === 'rest' ? 'peek' : choose());
    const focus = () => perform('peek');
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
      <text className="iuris-mascot-letter" x="40" y="40">I</text>
      <g className="iuris-mascot-eye">
        <g className="iuris-mascot-lid">
          <path d="M18 40C29 25 51 25 62 40C51 55 29 55 18 40Z" />
          <circle className="iuris-mascot-pupil" cx="40" cy="40" r="5" />
        </g>
      </g>
    </svg>
  </span>;
}
