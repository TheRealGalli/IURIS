import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Indice } from '../lib/data';
import { inDemo } from '../lib/archivio';
import { href, vai } from '../lib/router';
import { aggiungiSegnoTestoOriginale, riepilogoBackup } from '../lib/store';
import { originaliMateria } from '../lib/originali';
import { DOCUMENTI_LETTURA, caricaSezioneLettura, preparaBlocchi } from '../lib/letture-client';
import { registraRisposta, type Voto } from '../lib/srs';
import { passiTour } from '../lib/tour-passi';
import { Icon } from './ui';
import IurisMascot from './IurisMascot';
import './Tour.css';

type Rect = { x: number; y: number; w: number; h: number };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
function attesa(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Tour interrotto', 'AbortError'));
    const abort = () => { clearTimeout(timer); reject(new DOMException('Tour interrotto', 'AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
async function trova(selector: string, signal: AbortSignal) {
  for (let i = 0; i < 100; i++) {
    signal.throwIfAborted();
    const el = [...document.querySelectorAll<HTMLElement>(selector)].find((n) => n.getBoundingClientRect().width > 0 && !n.matches(':disabled'));
    if (el) return el;
    await attesa(80, signal);
  }
  throw new Error('Questa parte della pagina non è ancora disponibile.');
}

export default function Tour({ idx, onClose }: { idx: Indice; onClose: (to?: string) => void }) {
  const passi = useMemo(() => passiTour(idx), [idx]);
  const [index, setIndex] = useState(0);
  const [pronto, setPronto] = useState(false), [errore, setErrore] = useState(''), [tentativo, setTentativo] = useState(0);
  const [rett, setRett] = useState<Rect | null>(null), [pos, setPos] = useState({ x: 16, y: 100 });
  const [premendo, setPremendo] = useState(false);
  const root = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null), cursor = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);
  const azioniFatte = useRef(new Set<string>()), target = useRef('');
  const fine = index === passi.length - 1, passo = passi[index];
  const sezioni = passi.filter((p, i) => !i || passi[i - 1].sezione !== p.sezione);
  const avanti = () => setIndex((i) => Math.min(i + 1, passi.length - 1));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chiudiRef = useRef(onClose);
  chiudiRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      window.getSelection()?.removeAllRanges();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const proteggiFocus = (e: KeyboardEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      // Anche quando il lettore focalizza un pannello durante un'animazione,
      // i tasti restano nella visita, senza attivare scorciatoie sottostanti.
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === 'Escape') chiudiRef.current();
      else root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    };
    window.addEventListener('keydown', proteggiFocus, true);
    return () => window.removeEventListener('keydown', proteggiFocus, true);
  }, []);

  useEffect(() => {
    const controller = new AbortController(), signal = controller.signal;
    target.current = ''; setPronto(false); setErrore(''); setRett(null); setPremendo(false);
    const sposta = async (el: HTMLElement) => {
      const margine = el.style.scrollMarginTop;
      el.style.scrollMarginTop = '100px';
      el.scrollIntoView({ block: innerWidth < 700 ? 'start' : 'center', inline: 'nearest', behavior: ridotto ? 'instant' : 'smooth' });
      try { await attesa(ridotto ? 40 : 500, signal); }
      finally { el.style.scrollMarginTop = margine; }
      const r = el.getBoundingClientRect();
      if (cursor.current) cursor.current.style.transform = `translate(${clamp(r.left + Math.min(r.width / 2, 100), 12, innerWidth - 36)}px, ${clamp(r.top + Math.min(r.height / 2, 55), 50, innerHeight - 50)}px)`;
      await attesa(ridotto ? 30 : 600, signal);
    };
    const clicca = async (selector: string): Promise<void> => {
      if (document.querySelector('.mobile-reader-choose') && !document.querySelector('.mobile-reader-sheet') && /Segni salvati|Mappa personale|Fonti e scorciatoie/.test(selector)) await clicca('.mobile-reader-choose');
      const hidden = document.querySelector<HTMLElement>(selector);
      if (hidden && !hidden.getBoundingClientRect().width) {
        if (hidden.classList.contains('originali-colore')) await clicca('.lettura-colore-attivo');
        else if (hidden.matches('[aria-label="Ripristina modifica ai segni"]')) {
          await clicca('[aria-label="Fonti e scorciatoie"]');
          await clicca('[data-mobile-redo]');
          await clicca('[aria-label="Chiudi pannello"]'); return;
        }
      }
      const el = await trova(selector, signal);
      await sposta(el); signal.throwIfAborted();
      setPremendo(true); await attesa(ridotto ? 20 : 140, signal);
      if (inDemo()) el.click();
      setPremendo(false); await attesa(ridotto ? 60 : 420, signal);
    };
    const seleziona = async (n: number) => {
      await trova('[data-lettura-block] p', signal);
      const paragrafi = [...document.querySelectorAll<HTMLElement>('[data-lettura-block] p, [data-lettura-block] li')].filter((p) => (p.textContent?.length ?? 0) > 90);
      const p = paragrafi[n] ?? paragrafi[0];
      if (!p) throw new Error('Il passaggio da mostrare non è ancora disponibile.');
      document.querySelectorAll('[data-tour-selection]').forEach((el) => el.removeAttribute('data-tour-selection'));
      p.setAttribute('data-tour-selection', 'true');
      await sposta(p); signal.throwIfAborted();
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = []; let node: Node | null;
      while ((node = walker.nextNode())) if (node.textContent?.length) nodes.push(node as Text);
      if (!nodes.length) throw new Error('Il testo non è selezionabile.');
      let restano = Math.min(120, p.textContent?.length ?? 0), end = nodes[0], offset = 0;
      for (const node of nodes) { end = node; offset = Math.min(restano, node.length); restano -= offset; if (!restano) break; }
      const range = document.createRange(); range.setStart(nodes[0], 0); range.setEnd(end, offset);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      const r = range.getBoundingClientRect();
      if (cursor.current) cursor.current.style.transform = `translate(${clamp(r.right, 12, innerWidth - 36)}px, ${clamp(r.bottom, 50, innerHeight - 50)}px)`;
      await attesa(ridotto ? 60 : 750, signal);
    };
    const mostra = async () => {
      if (location.hash !== href(passo.route)) {
        const base = passo.route.split('?')[0].split('/')[1] ?? '';
        const navPath = base === 'lezione' ? '/percorso' : base === 'concetto' ? '/glossario' : `/${base}`;
        const nav = [...document.querySelectorAll<HTMLElement>(`.side a[href="${href(navPath)}"], .tabbar a[href="${href(navPath)}"], .mobile-tabs a[href="${href(navPath)}"]`)].find((el) => el.getBoundingClientRect().width > 0);
        if (nav) { await sposta(nav); signal.throwIfAborted(); setPremendo(true); await attesa(140, signal); if (inDemo()) nav.click(); setPremendo(false); }
        vai(passo.route);
      }
      await attesa(100, signal);
      // Saltando direttamente a Mappe prepariamo due passaggi autentici della
      // lezione: la mappa resta quella dell'app, alimentata dal normale store.
      if (passo.id === 'personale' && inDemo() && !riepilogoBackup().segni) {
        const d = DOCUMENTI_LETTURA.find((d) => d.materia === idx.corso.materia.slug);
        const meta = d?.sezioni.find((s) => !s.soloTitolo);
        const originale = originaliMateria(idx.corso.materia.slug).find((x) => x.id === d?.id);
        if (d && meta && originale) {
          const lettura = await caricaSezioneLettura(meta); signal.throwIfAborted();
          const blocchi = preparaBlocchi(lettura, idx.concettoById).filter((b) => b.testo.length > 90).slice(0, 2);
          if (inDemo()) blocchi.forEach((b, i) => {
            const citazione = b.testo.slice(0, 100);
            aggiungiSegnoTestoOriginale(originale.materia, originale, { pagina: b.pagina, testo: citazione, tipo: i ? 'sottolineato' : 'evidenziato', colore: i ? 'rosa' : 'giallo', ancoreTesto: [{ edizione: d.edizione, blocco: b.id, inizio: 0, fine: citazione.length, citazione, prefisso: '', suffisso: b.testo.slice(citazione.length, citazione.length + 40) }] });
          });
        }
      }
      // I comandi della mappa vivono in un foglio sui dispositivi touch.
      // Nel tour il foglio è non modale, così la guida può mostrarne i comandi.
      if (passo.target === '.map-tools' && document.querySelector('.mobile-map-filters') && !document.querySelector('.mobile-map-sheet')) await clicca('.mobile-map-filters');
      else if (passo.target !== '.map-tools' && document.querySelector('.mobile-map-sheet')) await clicca('[aria-label="Chiudi strumenti mappa"]');
      const unaVolta = ['evidenzia', 'sottolinea', 'statistiche'].includes(passo.id);
      if (!unaVolta || !azioniFatte.current.has(passo.id)) {
        for (const a of passo.azioni ?? []) {
          signal.throwIfAborted();
          if ('click' in a) { if (!a.soloSe || document.querySelector(a.soloSe)) await clicca(a.click); }
          else if ('seleziona' in a) await seleziona(a.seleziona);
          else if ('esempioStatistiche' in a && inDemo()) {
            const usate = new Set<string>();
            [...idx.domandePerConcetto.values()].slice(0, 12).forEach((qs, i) => qs.slice(0, 5).forEach((q) => {
              if (!usate.has(q.id)) { registraRisposta(idx.corso.materia.slug, q.id, (i % 4 + 1) as Voto); usate.add(q.id); }
            }));
          }
        }
        azioniFatte.current.add(passo.id);
      }
      const el = await trova(passo.target, signal); await sposta(el);
      signal.throwIfAborted(); target.current = passo.target; setPronto(true);
      titolo.current?.focus({ preventScroll: true });
    };
    mostra().catch((e) => {
      if (signal.aborted) return;
      setPremendo(false); setErrore(e.message); setPronto(true);
    });
    return () => controller.abort();
  }, [index, tentativo, idx]);

  useEffect(() => { if (pronto) titolo.current?.focus({ preventScroll: true }); }, [pronto, index]);

  useEffect(() => {
    let frame = 0;
    const misura = () => {
      if (target.current) {
        const el = document.querySelector(target.current), r = el?.getBoundingClientRect();
        if (r && r.width && r.height) {
          const x = clamp(r.left - 6, 6, innerWidth - 18), y = clamp(r.top - 6, 6, innerHeight - 18);
          const next = { x, y, w: Math.max(12, Math.min(r.right + 6, innerWidth - 6) - x), h: Math.max(12, Math.min(r.bottom + 6, innerHeight - 6) - y) };
          setRett((old) => old && Object.keys(next).every((k) => Math.abs(old[k as keyof Rect] - next[k as keyof Rect]) < 1) ? old : next);
          const bw = bubble.current?.offsetWidth ?? 370, bh = bubble.current?.offsetHeight ?? 300;
          let bx = innerWidth - bw - 24, by = innerHeight - bh - 24;
          if (innerWidth > 700) {
            if (innerWidth - r.right > bw + 32) { bx = r.right + 22; by = r.top; }
            else if (r.left > bw + 32) { bx = r.left - bw - 22; by = r.top; }
            else if (innerHeight - r.bottom > bh + 30) { bx = r.left; by = r.bottom + 20; }
            else if (r.top > bh + 30) { bx = r.left; by = r.top - bh - 20; }
          } else {
            bx = 12; by = innerHeight - bh - 12;
            const sheet = el?.closest('.mobile-sheet')?.getBoundingClientRect();
            if (sheet) by = Math.max(50, sheet.top - bh - 12);
          }
          const p = { x: clamp(bx, 12, innerWidth - bw - 12), y: clamp(by, 12, innerHeight - bh - 12) };
          setPos((old) => Math.abs(old.x - p.x) < 1 && Math.abs(old.y - p.y) < 1 ? old : p);
        }
      }
      frame = requestAnimationFrame(misura);
    };
    frame = requestAnimationFrame(misura);
    return () => cancelAnimationFrame(frame);
  }, []);

  const keyboard = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    if (e.key === 'Tab') {
      const controls = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select') ?? [])].filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === titolo.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    if ((e.target as HTMLElement).tagName === 'SELECT') return;
    if (e.key === 'ArrowRight' && pronto && !fine) { e.preventDefault(); avanti(); }
    if (e.key === 'ArrowLeft' && index) { e.preventDefault(); setIndex(index - 1); }
  };
  return createPortal(<div className="tour-layer" ref={root} role="dialog" aria-modal="true" aria-label="Visita guidata di IURIS" onKeyDown={keyboard}>
    <div className="tour-shade" style={{ background: rett ? 'transparent' : undefined }} />
    {rett && <div className="tour-spot" style={{ left: rett.x, top: rett.y, width: rett.w, height: rett.h }} />}
    <div ref={cursor} className={`tour-cursor${premendo ? ' press' : ''}`} aria-hidden="true"><svg viewBox="0 0 30 36" width="30" height="36"><path d="M3 2 26 18l-10 2-5 11Z" /></svg><span>IURIS</span></div>
    <div className="tour-status"><span className="tour-status-dot" />Visita guidata<span className="tour-status-sep">·</span><span>Archivio di prova</span></div>
    {!pronto && <div className="tour-working" role="status"><IurisMascot variant="working" /><span>Ti accompagno in {passo.sezione}…</span><button onClick={() => onClose()} aria-label="Esci dalla demo"><Icon n="x" size={17} /></button></div>}
    <div ref={bubble} className={`tour-bubble${pronto ? ' ready' : ''}`} style={{ '--bubble-x': `${pos.x}px`, '--bubble-y': `${pos.y}px` } as CSSProperties}>
      <div className="tour-bubble-head"><IurisMascot variant="guide" active={pronto} greet /><div><span className="eyebrow">La I ti accompagna</span><div className="tour-step">{passo.sezione} · {index + 1} di {passi.length}</div></div><button className="tour-close" onClick={() => onClose()} aria-label="Esci dalla demo"><Icon n="x" size={18} /></button></div>
      <h2 ref={titolo} tabIndex={-1} className="title-m">{errore ? 'Aspettiamo questa pagina.' : passo.titolo}</h2>
      <p className="tour-copy" aria-live="polite">{errore ? `${errore} Puoi riprovare o passare alla tappa successiva.` : passo.testo}</p>
      {errore && <button className="tour-retry" onClick={() => setTentativo(tentativo + 1)}>Riprova questa tappa</button>}
      <div className="tour-controls">
        <button disabled={!index || !pronto} onClick={() => setIndex(index - 1)} aria-label="Tappa precedente"><Icon n="indietro" size={17} /></button>
        <select className="tour-chapters" value={passi.findIndex((p) => p.sezione === passo.sezione)} aria-label="Vai a una sezione della demo" title="Salta a una sezione" onChange={(e) => setIndex(Number(e.target.value))}>
          {sezioni.map((p) => <option key={p.id} value={passi.indexOf(p)}>{p.sezione}</option>)}
        </select>
        {fine ? <button className="tour-next" onClick={() => onClose('/backup')} aria-label="Apri il mio backup">Il mio backup <Icon n="freccia" size={16} /></button> : <button className="tour-next" disabled={!pronto} onClick={avanti}>{errore ? 'Salta' : 'Avanti'}<Icon n="freccia" size={16} /></button>}
      </div>
    </div>
  </div>, document.body);
}
