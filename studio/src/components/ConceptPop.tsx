import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useCorso } from '../lib/data';
import { padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { href } from '../lib/router';
import { TIPO_SINGOLARE } from '../lib/types';
import { LivelloDot } from './ui';

/**
 * Popover per i link ai concetti (a.cx) dentro un contenitore: al clic (o al passaggio del mouse su desktop)
 * mostra nome, tipo e definizione breve senza lasciare la pagina.
 */
export function useConceptPop(ref: RefObject<HTMLElement>, opzioni?: { hover?: boolean; rispettaSelezione?: boolean }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [stato, setStato] = useState<{ id: string; x: number; y: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  const apri = useCallback((a: HTMLElement) => {
    const id = a.dataset.c!;
    const r = a.getBoundingClientRect();
    const w = Math.min(340, window.innerWidth - 24);
    const x = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const sotto = r.bottom + 220 < window.innerHeight;
    setStato({ id, x, y: sotto ? r.bottom + 8 : Math.max(12, r.top - 8 - 200) });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hover = opzioni?.hover !== false && window.matchMedia('(hover: hover)').matches;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a.cx') as HTMLElement | null;
      if (!a) return;
      e.preventDefault();
      if (opzioni?.rispettaSelezione && !window.getSelection()?.isCollapsed) return;
      apri(a);
    };
    const onOver = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a.cx') as HTMLElement | null;
      if (!a) return;
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => apri(a), 260);
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a.cx')) clearTimeout(timer.current);
    };
    el.addEventListener('click', onClick);
    if (hover) { el.addEventListener('mouseover', onOver); el.addEventListener('mouseout', onOut); }
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onOver);
      el.removeEventListener('mouseout', onOut);
      clearTimeout(timer.current);
    };
  }, [ref, apri, opzioni?.hover, opzioni?.rispettaSelezione]);

  useEffect(() => {
    if (!stato) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') setStato(null); return; }
      const t = e.target as HTMLElement;
      if (popRef.current?.contains(t) || t.closest('a.cx')) return;
      setStato(null);
    };
    const onScroll = () => setStato(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [stato]);

  const c = stato ? idx.concettoById.get(stato.id) : null;
  if (!stato || !c) return null;
  const m = padronanza(p, idx.domandePerConcetto.get(c.id));
  return (
    <div ref={popRef} className="pop fade-in" style={{ left: stato.x, top: stato.y }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="eyebrow">{TIPO_SINGOLARE[c.tipo] ?? c.tipo}</span>
        {m.totali > 0 && <LivelloDot valore={m.valore} viste={m.viste} />}
      </div>
      <h4>{c.nome}</h4>
      {c.latino && c.latino !== c.nome && <div className="faint small" style={{ fontStyle: 'italic', marginBottom: 4 }}>{c.latino}</div>}
      <div className="muted">{c.breve}</div>
      <div className="row" style={{ marginTop: 10 }}>
        <a className="btn btn-sm" href={href(`/concetto/${c.id}`)}>Apri la scheda</a>
        <a className="btn btn-sm btn-ghost" href={href(`/mappa?grafo=1&c=${c.id}`)}>Sulla mappa</a>
      </div>
    </div>
  );
}
