import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Indice } from '../lib/data';
import { inDemo } from '../lib/archivio';
import { href, vai } from '../lib/router';
import { aggiungiSegnoTestoOriginale, riepilogoBackup, scriviPref } from '../lib/store';
import { originaliMateria } from '../lib/originali';
import { DOCUMENTI_LETTURA, caricaSezioneLettura, preparaBlocchi } from '../lib/letture-client';
import { attiCorrenti } from '../lib/materie-corso';
import { registraRisposta, type Voto } from '../lib/srs';
import { MENU_TOUCH, SELEZIONE, passiTour, type PassoTour, type StatoVisita } from '../lib/tour-passi';
import { Icon } from './ui';
import IurisMascot from './IurisMascot';
import { useCompact, useTelefono } from './MobileSheet';
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
const visibile = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find((n) => n.getBoundingClientRect().width > 0 && !n.matches(':disabled'));
async function trova(selector: string, signal: AbortSignal) {
  for (let i = 0; i < 100; i++) {
    signal.throwIfAborted();
    const el = visibile(selector);
    if (el) return el;
    await attesa(80, signal);
  }
  throw new Error('Questa parte della pagina non è ancora disponibile.');
}
/** Rettangolo della selezione del testo (la tappa «Prima scegli il passaggio» illumina solo quella). */
function rettSelezione(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0).getBoundingClientRect();
  return r.width && r.height ? r : null;
}
function rettDi(selector: string): DOMRect | null {
  if (selector === SELEZIONE) return rettSelezione();
  const r = visibile(selector)?.getBoundingClientRect();
  return r && r.width && r.height ? r : null;
}

/**
 * La visita sopravvive al cambio di materia: per mostrare gli articoli della Costituzione può passare per un momento
 * in un'altra materia, e l'app ricarica il corso (e questo componente). Qui resta dove eravamo.
 */
interface Ripresa { passi: PassoTour[]; index: number; verso: 1 | -1; materia: string; fatte: string[]; stato: StatoVisita; cambio?: string }
let ripresa: Ripresa | null = null;

export default function Tour({ idx, onClose }: { idx: Indice; onClose: (to?: string) => void }) {
  // Su telefono e iPad la visita usa testi più brevi, scritti per i comandi touch, e tappe «ponte» tra le sezioni.
  const touch = useCompact(), telefono = useTelefono();
  const [base] = useState<Ripresa>(() => {
    if (ripresa && inDemo()) return ripresa;
    return (ripresa = { passi: passiTour(idx, { touch, telefono, atti: attiCorrenti() }), index: 0, verso: 1, materia: idx.corso.materia.slug, fatte: [], stato: {} });
  });
  const passi = base.passi;
  const [index, setIndexStato] = useState(base.index);
  const vaiA = (n: number) => { const i = clamp(n, 0, passi.length - 1); base.verso = i < base.index ? -1 : 1; base.index = i; setIndexStato(i); };
  const [errore, setErrore] = useState(''), [tentativo, setTentativo] = useState(0);
  // «Pronto» vale per una sola tappa: appena cambia la tappa il riquadro non è più pronto, già dal primo disegno
  // (prima restava pronto per un attimo con il testo nuovo e i comandi attivi).
  const chiaveTappa = `${index}:${tentativo}`;
  const [prontaTappa, setProntaTappa] = useState(''), pronto = prontaTappa === chiaveTappa;
  const setPronto = (si: boolean) => setProntaTappa(si ? chiaveTappa : '');
  const [rett, setRett] = useState<Rect | null>(null), [pos, setPos] = useState({ x: 16, y: 100 });
  const [premendo, setPremendo] = useState(false);
  const root = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null), cursor = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);
  const target = useRef(''), anche = useRef('');
  const fine = index === passi.length - 1, passo = passi[index];
  const avanti = () => vaiA(index + 1);
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chiudi = (to?: string) => { ripresa = null; onClose(to); };
  const chiudiRef = useRef(chiudi);
  chiudiRef.current = chiudi;
  // Numerazione: le tappe ponte non contano, dicono solo dove si va.
  const contate = passi.filter((p) => !p.ponte);
  const numero = passi.slice(0, index + 1).filter((p) => !p.ponte).length;
  const materiaNome = idx.corso.materia.breve ?? idx.corso.materia.nome;

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
    const azioniFatte = new Set(base.fatte);
    target.current = ''; anche.current = ''; setPronto(false); setErrore(''); setRett(null); setPremendo(false);
    const stretto = () => innerWidth < 700;
    const mira = (r: DOMRect) => {
      if (cursor.current) cursor.current.style.transform = `translate(${clamp(r.left + Math.min(r.width / 2, 100), 12, innerWidth - 36)}px, ${clamp(r.top + Math.min(r.height / 2, 55), 50, innerHeight - 50)}px)`;
    };
    /** Porta l'elemento in vista solo se serve: sul telefono sopra il riquadro della guida, che sta in basso. */
    const sposta = async (el: HTMLElement) => {
      const r0 = el.getBoundingClientRect();
      const fisso = getComputedStyle(el).position === 'fixed' || !!el.closest('.mobile-tabs, .mobile-sheet');
      const basso = stretto() ? innerHeight - (bubble.current?.offsetHeight || 260) - 24 : innerHeight - 16;
      if (!fisso && !(r0.top >= 64 && r0.bottom <= basso)) {
        const margine = el.style.scrollMarginTop;
        el.style.scrollMarginTop = stretto() ? '72px' : '100px';
        el.scrollIntoView({ block: stretto() || r0.height > innerHeight * .6 ? 'start' : 'center', inline: 'nearest', behavior: ridotto ? 'instant' : 'smooth' });
        try { await attesa(ridotto ? 40 : 500, signal); }
        finally { el.style.scrollMarginTop = margine; }
      }
      mira(el.getBoundingClientRect());
      await attesa(ridotto ? 30 : 600, signal);
    };
    const premi = async (el: HTMLElement, davvero = true) => {
      await sposta(el); signal.throwIfAborted();
      setPremendo(true); await attesa(ridotto ? 20 : 160, signal);
      if (davvero && inDemo()) el.click();
      setPremendo(false); await attesa(ridotto ? 60 : 420, signal);
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
      await premi(await trova(selector, signal));
    };
    const seleziona = async (n: number, seManca = false) => {
      await trova('[data-lettura-block] p', signal);
      if (seManca) {
        const sel = window.getSelection(), qui = document.querySelector('[data-tour-selection]');
        if (sel && !sel.isCollapsed && qui && sel.anchorNode && qui.contains(sel.anchorNode)) return;
      }
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
      // La selezione cresce a scatti, come trascinando: si vede prima la scelta, poi (alla tappa dopo) il segno.
      const totale = Math.min(120, p.textContent?.length ?? 0), sel = window.getSelection();
      for (const quota of ridotto ? [1] : [.25, .5, .75, 1]) {
        let restano = Math.max(1, Math.round(totale * quota)), end = nodes[0], offset = 0;
        for (const node of nodes) { end = node; offset = Math.min(restano, node.length); restano -= offset; if (!restano) break; }
        const range = document.createRange(); range.setStart(nodes[0], 0); range.setEnd(end, offset);
        sel?.removeAllRanges(); sel?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        const r = range.getBoundingClientRect();
        if (cursor.current) cursor.current.style.transform = `translate(${clamp(r.right, 12, innerWidth - 36)}px, ${clamp(r.bottom, 50, innerHeight - 50)}px)`;
        await attesa(ridotto ? 60 : 220, signal);
      }
      await attesa(ridotto ? 60 : 500, signal);
    };
    const salta = () => { const n = index + base.verso; if (n >= 0 && n < passi.length) vaiA(n); else if (index < passi.length - 1) vaiA(index + 1); };
    const mostra = async () => {
      // Una tappa che vive in un'altra materia (gli articoli della Costituzione): si cambia materia nell'archivio di
      // prova e la visita riprende da qui quando il corso è caricato. Se l'app non può aprirla, la tappa si salta.
      if (!passo.ponte) {
        const voluta = (typeof passo.materia === 'function' ? passo.materia(base.stato) : passo.materia) ?? base.materia;
        if (voluta !== idx.corso.materia.slug) {
          const chiave = `${index}:${voluta}`;
          if (base.cambio === chiave) { base.cambio = undefined; salta(); return; }
          base.cambio = chiave;
          if (passo.premiPrima) { const el = visibile(passo.premiPrima); if (el) await premi(el, false); }
          scriviPref({ materia: voluta });
          return;
        }
        base.cambio = undefined;
      }
      const rotta = passo.ponte ? location.hash.replace(/^#/, '') : typeof passo.route === 'function' ? passo.route(idx, base.stato) : passo.route;
      if (rotta === null) { salta(); return; }
      if (location.hash !== href(rotta)) {
        const prima = passi[index - 1];
        const menu = touch ? visibile(MENU_TOUCH) : undefined;
        const daPremere = passo.premiPrima ? visibile(passo.premiPrima) : undefined;
        if (daPremere) await premi(daPremere, false);
        else if (menu && !passo.dallaPagina && prima && prima.sezione !== passo.sezione) {
          // Sul touch si cambia sezione dal Menu in basso: la freccetta lo preme (la tappa ponte lo ha appena indicato).
          await premi(menu, false); await attesa(ridotto ? 30 : 250, signal);
        } else {
          const radice = rotta.split('?')[0].split('/')[1] ?? '';
          const navPath = radice === 'lezione' ? '/percorso' : radice === 'concetto' ? '/glossario' : `/${radice}`;
          const nav = visibile(`.side a[href="${href(navPath)}"], .tabbar a[href="${href(navPath)}"]`);
          if (nav && !passo.dallaPagina) { await sposta(nav); signal.throwIfAborted(); setPremendo(true); await attesa(140, signal); setPremendo(false); }
        }
        signal.throwIfAborted();
        vai(rotta);
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
      // Le azioni che lasciano un segno (selezione, segni, risposte di prova) si fanno una volta sola:
      // tornando indietro si rivede il risultato, senza ripeterle.
      const unaVolta = ['selezione', 'strumento', 'evidenzia', 'sottolinea', 'statistiche'].includes(passo.id);
      const giaFatte = unaVolta && azioniFatte.has(passo.id);
      if (!giaFatte) {
        for (const a of passo.azioni ?? []) {
          signal.throwIfAborted();
          if ('click' in a) { if (!a.soloSe || document.querySelector(a.soloSe)) await clicca(a.click); }
          else if ('seleziona' in a) await seleziona(a.seleziona, a.seManca);
          else if ('pausa' in a) await attesa(ridotto ? 30 : a.pausa, signal);
          else if ('passaMouse' in a) {
            const el = await trova(a.passaMouse, signal); await sposta(el);
            el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
            await attesa(ridotto ? 400 : 900, signal);
          } else if ('esempioStatistiche' in a && inDemo()) {
            const usate = new Set<string>();
            [...idx.domandePerConcetto.values()].slice(0, 12).forEach((qs, i) => qs.slice(0, 5).forEach((q) => {
              if (!usate.has(q.id)) { registraRisposta(idx.corso.materia.slug, q.id, (i % 4 + 1) as Voto); usate.add(q.id); }
            }));
          }
        }
        if (!base.fatte.includes(passo.id)) base.fatte.push(passo.id);
      }
      let sel = (giaFatte && passo.targetDopo) || passo.target;
      // Sul touch, a pagina pronta, un bersaglio più piccolo se c'è (il riquadro della guida occupa mezzo schermo).
      if (sel !== SELEZIONE && touch && passo.targetTouch && !giaFatte) { await trova(`${sel}, ${passo.targetTouch}`, signal); if (visibile(passo.targetTouch)) sel = passo.targetTouch; }
      if (sel === SELEZIONE) {
        for (let i = 0; i < 60 && !rettSelezione(); i++) await attesa(80, signal);
        if (!rettSelezione()) throw new Error('La selezione non è ancora pronta.');
      } else {
        const el = await trova(sel, signal);
        // La scheda dell'articolo si chiude scorrendo: con la scheda aperta niente scorrimento.
        if (!(passo.anche && visibile(passo.anche))) await sposta(el); else mira(el.getBoundingClientRect());
        if (passo.id === 'citazione') base.stato.articolo = { art: el.dataset.art ?? '', materia: el.dataset.materia ?? idx.corso.materia.slug, fuori: !!el.dataset.fuori || !el.dataset.art };
      }
      signal.throwIfAborted(); target.current = sel; anche.current = passo.anche ?? ''; setPronto(true);
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
      const r1 = target.current ? rettDi(target.current) : null;
      const r2 = r1 && anche.current ? rettDi(anche.current) : null;
      const r = r1 && r2 ? new DOMRect(Math.min(r1.left, r2.left), Math.min(r1.top, r2.top), Math.max(r1.right, r2.right) - Math.min(r1.left, r2.left), Math.max(r1.bottom, r2.bottom) - Math.min(r1.top, r2.top)) : r1;
      if (r) {
        const x = clamp(r.left - 6, 6, innerWidth - 18), y = clamp(r.top - 6, 6, innerHeight - 18);
        const next = { x, y, w: Math.max(12, Math.min(r.right + 6, innerWidth - 6) - x), h: Math.max(12, Math.min(r.bottom + 6, innerHeight - 6) - y) };
        setRett((old) => old && Object.keys(next).every((k) => Math.abs(old[k as keyof Rect] - next[k as keyof Rect]) < 1) ? old : next);
        const bw = bubble.current?.offsetWidth ?? 370, bh = bubble.current?.offsetHeight ?? 300;
        let bx = innerWidth - bw - 24, by = innerHeight - bh - 24;
        if (innerWidth >= 700) {
          if (innerWidth - r.right > bw + 32) { bx = r.right + 22; by = r.top; }
          else if (r.left > bw + 32) { bx = r.left - bw - 22; by = r.top; }
          else if (innerHeight - r.bottom > bh + 30) { bx = r.left; by = r.bottom + 20; }
          else if (r.top > bh + 30) { bx = r.left; by = r.top - bh - 20; }
          else {
            // nessun lato libero (iPad in verticale, elementi larghi): in alto o in basso, dove copre meno
            const sopra = Math.max(0, Math.min(r.bottom, bh + 24) - Math.max(r.top, 12)), sotto = Math.max(0, Math.min(r.bottom, innerHeight - 12) - Math.max(r.top, innerHeight - bh - 24));
            bx = 12; by = sotto <= sopra ? innerHeight - bh - 24 : 12;
          }
        } else {
          // Telefono: il riquadro sta in basso o in alto, dove copre meno l'elemento spiegato.
          const el = target.current && target.current !== SELEZIONE ? document.querySelector(target.current) : null;
          const sheet = el?.closest('.mobile-sheet')?.getBoundingClientRect();
          const giu = innerHeight - bh - 12, su = 12;
          const coperto = (top: number) => Math.max(0, Math.min(r.bottom, top + bh) - Math.max(r.top, top));
          bx = 12; by = coperto(giu) <= coperto(su) ? giu : su;
          if (sheet) by = Math.max(12, sheet.top - bh - 12);
        }
        const p = { x: clamp(bx, 12, innerWidth - bw - 12), y: clamp(by, 12, innerHeight - bh - 12) };
        setPos((old) => Math.abs(old.x - p.x) < 1 && Math.abs(old.y - p.y) < 1 ? old : p);
      }
      frame = requestAnimationFrame(misura);
    };
    frame = requestAnimationFrame(misura);
    return () => cancelAnimationFrame(frame);
  }, []);

  const keyboard = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
    if (e.key === 'Tab') {
      const controls = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])].filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === titolo.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    if (e.key === 'ArrowRight' && pronto && !fine) { e.preventDefault(); avanti(); }
    if (e.key === 'ArrowLeft' && index) { e.preventDefault(); vaiA(index - 1); }
  };
  const conMateria = (s: string) => s.replace('{materia}', materiaNome);
  const titoloPasso = conMateria((touch && passo.titoloTouch) || passo.titolo);
  const testoPasso = conMateria((touch && passo.touch) || passo.testo);
  return createPortal(<div className={`tour-layer${passo.ponte ? ' tour-ponte' : ''}`} ref={root} role="dialog" aria-modal="true" aria-label="Visita guidata di IURIS" onKeyDown={keyboard}>
    <div className="tour-shade" style={{ background: rett ? 'transparent' : undefined }} />
    {rett && <div className="tour-spot" style={{ left: rett.x, top: rett.y, width: rett.w, height: rett.h }} />}
    <div ref={cursor} className={`tour-cursor${premendo ? ' press' : ''}`} aria-hidden="true"><svg viewBox="0 0 30 36" width="30" height="36"><path d="M3 2 26 18l-10 2-5 11Z" /></svg><span>IURIS</span></div>
    <div className="tour-status"><span className="tour-status-dot" />Visita guidata<span className="tour-status-sep">·</span><span>Archivio di prova</span></div>
    {!pronto && <div className="tour-working" role="status"><IurisMascot variant="working" /><span>Ti accompagno in {passo.sezione}…</span><button onClick={() => chiudi()} aria-label="Esci dalla demo"><Icon n="x" size={17} /></button></div>}
    <div ref={bubble} className={`tour-bubble${pronto ? ' ready' : ''}`} style={{ '--bubble-x': `${pos.x}px`, '--bubble-y': `${pos.y}px` } as CSSProperties}>
      <div className="tour-bubble-head"><IurisMascot variant="guide" active={pronto} greet /><div><span className="eyebrow tour-eyebrow-long">La I ti accompagna</span><span className="eyebrow tour-eyebrow-touch">Visita guidata · prova</span><div className="tour-step">{passo.ponte ? `Verso ${passo.sezione}` : `${passo.sezione} · ${numero} di ${contate.length}`}</div></div><button className="tour-close" onClick={() => chiudi()} aria-label="Esci dalla demo"><Icon n="x" size={18} /></button></div>
      <h2 ref={titolo} tabIndex={-1} className="title-m">{errore ? 'Aspettiamo questa pagina.' : titoloPasso}</h2>
      <p className="tour-copy" aria-live="polite">{errore ? `${errore} Puoi riprovare o passare alla tappa successiva.` : testoPasso}</p>
      {errore && <button className="tour-retry" onClick={() => setTentativo(tentativo + 1)}>Riprova questa tappa</button>}
      <div className="tour-controls">
        <button disabled={!index || !pronto} onClick={() => vaiA(index - 1)} aria-label="Tappa precedente"><Icon n="indietro" size={17} /></button>
        {fine ? <button className="tour-next" onClick={() => chiudi('/backup')} aria-label="Apri il mio backup">Il mio backup <Icon n="freccia" size={16} /></button> : <button className="tour-next" disabled={!pronto} onClick={avanti}>{errore ? 'Salta' : 'Avanti'}<Icon n="freccia" size={16} /></button>}
      </div>
    </div>
  </div>, document.body);
}
