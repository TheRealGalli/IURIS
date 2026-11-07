import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { href } from '../lib/router';
import { graphLabelLines, graphTextWidth } from '../lib/graph-geometry.mjs';
import { Icon } from './ui';
import type { ColoreSegno } from '../lib/originali';
import './MappaPersonale.css';

export interface PassaggioMappa {
  id: string;
  documento: string;
  sezione: string;
  blocco: string;
  titolo: string;
  testo: string;
  tipo: 'evidenziato' | 'sottolineato';
  colore: ColoreSegno;
  concetti: { id: string; nome: string }[];
  origine?: 'pdf' | 'testo';
  /** Posizione nel testo (documento, sezione, pagina, blocco, offset): la mappa segue l'ordine di lettura. */
  ordine?: readonly number[];
  creata?: string;
}

interface Props {
  passaggi: PassaggioMappa[];
  onApri: (passaggio: PassaggioMappa) => void;
  onConcetto?: (id: string) => void;
  hrefLettura?: string;
  compatta?: boolean;
}

const PER_PAGINA = 20;
const MAX_CONCETTI = 36;
const LARGHEZZA = 1030;
const PASSAGGIO_X = 310, PASSAGGIO_W = 370, PASSAGGIO_H = 112, DISTANZA = 144;
const CONCETTO_X = 770, CONCETTO_W = 232, CONCETTO_H = 60;
const chiaveSezione = (p: PassaggioMappa) => `${encodeURIComponent(p.documento)}/${encodeURIComponent(p.sezione)}`;
export const chiavePassaggioMappa = (p: PassaggioMappa) => `${chiaveSezione(p)}/${encodeURIComponent(p.id)}/${encodeURIComponent(p.blocco)}`;
function confrontaOrdine(a: readonly number[] = [], b: readonly number[] = []): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i] ?? -1, y = b[i] ?? -1; if (x !== y) return x - y; }
  return 0;
}
/** Copia ordinata come nel testo; senza posizione, resta l'ordine ricevuto. */
export function ordinaPassaggiMappa(passaggi: readonly PassaggioMappa[]): PassaggioMappa[] {
  return passaggi.map((p, i) => ({ p, i })).sort((a, b) => confrontaOrdine(a.p.ordine, b.p.ordine) || (a.p.creata ?? '').localeCompare(b.p.creata ?? '') || a.i - b.i).map((x) => x.p);
}
const normalizza = (testo: string) => testo.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function righe(testo: string, larghezza: number, font: number, massimo: number): string[] {
  const tutte = graphLabelLines(testo.replace(/\s+/g, ' ').trim(), larghezza, font);
  if (tutte.length <= massimo) return tutte;
  const visibili = tutte.slice(0, massimo);
  let ultima = visibili[massimo - 1];
  while (ultima && graphTextWidth(`${ultima}…`, font) > larghezza) ultima = Array.from(ultima).slice(0, -1).join('');
  visibili[massimo - 1] = `${ultima}…`;
  return visibili;
}

interface NodoPassaggio { key: string; passaggio: PassaggioMappa; x: number; y: number; righe: string[]; concetti: Set<string> }
interface NodoSezione { id: string; titolo: string; x: number; y: number; righe: string[]; passaggi: Set<string> }
interface NodoConcetto { id: string; nome: string; x: number; y: number; righe: string[]; passaggi: Set<string> }

/** Geometria deterministica: nessuna simulazione e nessun calcolo durante il movimento del cursore. */
export function layoutMappaPersonale(ricevuti: PassaggioMappa[]) {
  const passaggi = ordinaPassaggiMappa(ricevuti);
  const raccolti = new Map<string, PassaggioMappa[]>();
  for (const p of passaggi) { const id = chiaveSezione(p), gruppo = raccolti.get(id) ?? []; gruppo.push(p); raccolti.set(id, gruppo); }
  const sezioni = new Map<string, { titolo: string; nodi: NodoPassaggio[] }>();
  const nodi: NodoPassaggio[] = [...raccolti.values()].flat().map((p, i) => {
    const n = { key: chiavePassaggioMappa(p), passaggio: p, x: PASSAGGIO_X, y: 78 + i * DISTANZA,
      righe: righe(p.testo, PASSAGGIO_W - 32, 13, 3), concetti: new Set(p.concetti.map((c) => c.id)) };
    const id = chiaveSezione(p), gruppo = sezioni.get(id) ?? { titolo: p.titolo, nodi: [] };
    gruppo.nodi.push(n); sezioni.set(id, gruppo); return n;
  });
  const gruppi: NodoSezione[] = [...sezioni].map(([id, g]) => ({ id, titolo: g.titolo, x: 24,
    y: (g.nodi[0].y + g.nodi[g.nodi.length - 1].y + PASSAGGIO_H) / 2 - 45,
    righe: righe(g.titolo, 216, 14, 3), passaggi: new Set(g.nodi.map((n) => n.key)) }));
  const concetti = new Map<string, { nome: string; sommaY: number; passaggi: Set<string> }>();
  for (const n of nodi) for (const c of n.passaggio.concetti) {
    const gruppo = concetti.get(c.id) ?? { nome: c.nome, sommaY: 0, passaggi: new Set() };
    if (gruppo.passaggi.has(n.key)) continue;
    gruppo.sommaY += n.y + PASSAGGIO_H / 2; gruppo.passaggi.add(n.key); concetti.set(c.id, gruppo);
  }
  let precedente = 38;
  const temi: NodoConcetto[] = [...concetti].map(([id, c]) => ({ id, ...c, desiderata: c.sommaY / c.passaggi.size }))
    // Con molti concetti restano i più ricorrenti, poi disposti nell'ordine del testo.
    .sort((a, b) => b.passaggi.size - a.passaggi.size || a.desiderata - b.desiderata || a.id.localeCompare(b.id)).slice(0, MAX_CONCETTI)
    .sort((a, b) => a.desiderata - b.desiderata || a.id.localeCompare(b.id))
    .map((c) => {
      const centro = Math.max(c.desiderata, precedente + CONCETTO_H + 18); precedente = centro;
      return { id: c.id, nome: c.nome, x: CONCETTO_X, y: centro - CONCETTO_H / 2,
        righe: righe(c.nome, CONCETTO_W - 28, 13, 2), passaggi: c.passaggi };
    });
  const altezza = Math.max(280, ...nodi.map((n) => n.y + PASSAGGIO_H + 34), ...temi.map((n) => n.y + CONCETTO_H + 34));
  return { passaggi: nodi, sezioni: gruppi, concetti: temi, totaleConcetti: concetti.size, larghezza: LARGHEZZA, altezza };
}

function MappaPersonale({ passaggi: ricevuti, onApri, onConcetto, hrefLettura, compatta = false }: Props) {
  const [cerca, setCerca] = useState(''), [sezione, setSezione] = useState(''), [pagina, setPagina] = useState(0);
  const [modo, setModo] = useState<'mappa' | 'elenco'>(() => compatta || (typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches) ? 'elenco' : 'mappa');
  const [selezionato, setSelezionato] = useState<string | null>(null), [concetto, setConcetto] = useState<string | null>(null);
  const [percentuale, setPercentuale] = useState(100);
  const svgRef = useRef<SVGSVGElement>(null), gruppoRef = useRef<SVGGElement>(null), chiudiRef = useRef<HTMLButtonElement>(null);
  const vista = useRef({ x: 24, y: 18, k: 1 });
  const trascinamento = useRef<{ id: number; x: number; y: number; origineX: number; origineY: number } | null>(null);
  const passaggi = useMemo(() => ordinaPassaggiMappa(ricevuti), [ricevuti]);
  const opzioni = useMemo(() => [...new Map(passaggi.map((p) => [chiaveSezione(p), p.titolo])).entries()], [passaggi]);
  const filtrati = useMemo(() => {
    const testo = normalizza(cerca.trim());
    return passaggi.filter((p) => (!sezione || chiaveSezione(p) === sezione) && (!testo || normalizza(`${p.titolo} ${p.testo} ${p.concetti.map((c) => c.nome).join(' ')}`).includes(testo)));
  }, [passaggi, sezione, cerca]);
  const totalePagine = Math.max(1, Math.ceil(filtrati.length / PER_PAGINA)), paginaAttuale = Math.min(pagina, totalePagine - 1);
  const visibili = useMemo(() => filtrati.slice(paginaAttuale * PER_PAGINA, (paginaAttuale + 1) * PER_PAGINA), [filtrati, paginaAttuale]);
  const layout = useMemo(() => layoutMappaPersonale(visibili), [visibili]);
  const passaggioScelto = visibili.find((p) => chiavePassaggioMappa(p) === selezionato) ?? null;
  const concettoScelto = layout.concetti.find((c) => c.id === concetto) ?? null;
  const dettaglioAperto = !!passaggioScelto || !!concettoScelto;

  useEffect(() => { if (pagina >= totalePagine) setPagina(totalePagine - 1); }, [pagina, totalePagine]);
  useEffect(() => { if (sezione && !opzioni.some(([id]) => id === sezione)) setSezione(''); }, [opzioni, sezione]);
  useEffect(() => { if (selezionato && !passaggioScelto) setSelezionato(null); if (concetto && !concettoScelto) setConcetto(null); }, [selezionato, passaggioScelto, concetto, concettoScelto]);
  useEffect(() => {
    if (!dettaglioAperto) return;
    const prima = document.activeElement;
    chiudiRef.current?.focus({ preventScroll: true });
    return () => { if (prima?.isConnected && (prima instanceof HTMLElement || prima instanceof SVGElement)) prima.focus({ preventScroll: true }); };
  }, [dettaglioAperto]);

  const disegna = useCallback((nuova: { x: number; y: number; k: number }) => {
    const svg = svgRef.current; if (!svg) return;
    const k = Math.max(.12, Math.min(2.5, nuova.k)), spazio = 32;
    const limiteX = svg.clientWidth - layout.larghezza * k - spazio, limiteY = svg.clientHeight - layout.altezza * k - spazio;
    const x = Math.max(Math.min(spazio, limiteX), Math.min(Math.max(spazio, limiteX), nuova.x));
    const y = Math.max(Math.min(spazio, limiteY), Math.min(Math.max(spazio, limiteY), nuova.y));
    vista.current = { x, y, k }; gruppoRef.current?.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
  }, [layout.larghezza, layout.altezza]);
  const adatta = useCallback((leggibile = false) => {
    const svg = svgRef.current; if (!svg) return;
    const k = Math.min(leggibile ? 1 : 1.2, (svg.clientWidth - 48) / layout.larghezza, leggibile ? Infinity : (svg.clientHeight - 48) / layout.altezza);
    disegna({ x: (svg.clientWidth - layout.larghezza * k) / 2, y: leggibile ? 24 : (svg.clientHeight - layout.altezza * k) / 2, k });
    setPercentuale(Math.round(vista.current.k * 100));
  }, [layout.larghezza, layout.altezza, disegna]);
  const zoom = useCallback((fattore: number, x?: number, y?: number) => {
    const svg = svgRef.current; if (!svg) return;
    const precedente = vista.current, k = Math.max(.12, Math.min(2.5, precedente.k * fattore));
    const centroX = x ?? svg.clientWidth / 2, centroY = y ?? svg.clientHeight / 2;
    disegna({ x: centroX - (centroX - precedente.x) * k / precedente.k, y: centroY - (centroY - precedente.y) * k / precedente.k, k });
    setPercentuale(Math.round(k * 100));
  }, [disegna]);
  const adattaRef = useRef(adatta); adattaRef.current = adatta;
  useEffect(() => { disegna(vista.current); }, [disegna]);
  useEffect(() => { if (modo === 'mappa') adatta(true); }, [modo, sezione, cerca, paginaAttuale]);
  useEffect(() => {
    const svg = svgRef.current; if (!svg || modo !== 'mappa') return;
    let w = -1, h = -1;
    const ro = new ResizeObserver(() => {
      if (Math.abs(svg.clientWidth - w) < 1 && Math.abs(svg.clientHeight - h) < 1) return;
      w = svg.clientWidth; h = svg.clientHeight; adattaRef.current(true);
    });
    ro.observe(svg); return () => ro.disconnect();
  }, [modo, !!visibili.length]);
  useEffect(() => {
    const svg = svgRef.current; if (!svg || modo !== 'mappa') return;
    const ruota = (e: WheelEvent) => {
      e.preventDefault(); const r = svg.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top);
    };
    svg.addEventListener('wheel', ruota, { passive: false });
    return () => svg.removeEventListener('wheel', ruota);
  }, [modo, zoom, !!visibili.length]);

  const scegliPassaggio = (id: string) => { setSelezionato(id); setConcetto(null); };
  const scegliConcetto = (id: string) => { setConcetto(id); setSelezionato(null); };
  const chiudi = () => { setSelezionato(null); setConcetto(null); };
  const attivaNodo = (target: EventTarget) => {
    const el = target instanceof Element ? target : null;
    const p = el?.closest<SVGGElement>('[data-passaggio]');
    if (p?.dataset.passaggio) { scegliPassaggio(p.dataset.passaggio); return true; }
    const c = el?.closest<SVGGElement>('[data-concetto]');
    if (c?.dataset.concetto) { scegliConcetto(c.dataset.concetto); return true; }
    return false;
  };
  const muovi = (e: ReactPointerEvent<SVGSVGElement>) => {
    const da = trascinamento.current; if (!da || da.id !== e.pointerId) return;
    disegna({ ...vista.current, x: da.origineX + e.clientX - da.x, y: da.origineY + e.clientY - da.y });
  };
  const tema = (id: string) => onConcetto
    ? <button className="chip" key={id} onClick={() => onConcetto(id)}>{passaggioScelto?.concetti.find((c) => c.id === id)?.nome ?? layout.concetti.find((c) => c.id === id)?.nome ?? id}</button>
    : <a className="chip" key={id} href={href(`/concetto/${encodeURIComponent(id)}`)}>{passaggioScelto?.concetti.find((c) => c.id === id)?.nome ?? layout.concetti.find((c) => c.id === id)?.nome ?? id}</a>;

  if (!passaggi.length) return <section className={`mappa-personale mp-vuota${compatta ? ' mp-compatta' : ''}`} aria-label="Mappa personale">
    <Icon n="mappa" size={32} /><h2 className="title-m">La mappa nasce dai passaggi segnati</h2>
    <p className="muted small">Evidenzia o sottolinea nel testo di studio: i passaggi e i concetti collegati compariranno qui, con un rimando alla lettura.</p>
    {hrefLettura && <a className="btn btn-sm" href={hrefLettura}><Icon n="libro" size={16} />Apri i testi</a>}
  </section>;

  return <section className={`mappa-personale${compatta ? ' mp-compatta' : ''}`} aria-label="Mappa personale" onKeyDown={(e) => { if (e.key === 'Escape' && dettaglioAperto) { e.stopPropagation(); chiudi(); } }}>
    <div className="mp-barra">
      <label className="mp-ricerca"><Icon n="cerca" size={15} /><input className="input" aria-label="Cerca nei passaggi personali" placeholder="Cerca nei passaggi…" value={cerca} onChange={(e) => { setCerca(e.target.value); setPagina(0); chiudi(); }} /></label>
      <div className="mp-vista" aria-label="Vista della mappa personale"><button className={`btn btn-sm ${modo === 'mappa' ? 'mp-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'mappa'} onClick={() => setModo('mappa')}><Icon n="mappa" size={15} />Mappa</button><button className={`btn btn-sm ${modo === 'elenco' ? 'mp-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'elenco'} onClick={() => setModo('elenco')}>Elenco</button></div>
      {opzioni.length > 1 && <select className="select" aria-label="Filtra la mappa personale per sezione" value={sezione} onChange={(e) => { setSezione(e.target.value); setPagina(0); chiudi(); }}><option value="">Tutte le sezioni</option>{opzioni.map(([id, titolo]) => <option key={id} value={id}>{titolo}</option>)}</select>}
      {modo === 'mappa' && <div className="mp-zoom" aria-label="Zoom della mappa personale"><button className="btn btn-sm" aria-label="Riduci zoom della mappa personale" onClick={() => zoom(1 / 1.25)}>−</button><span>{percentuale}%</span><button className="btn btn-sm" aria-label="Aumenta zoom della mappa personale" onClick={() => zoom(1.25)}>+</button><button className="btn btn-sm" aria-label="Adatta la mappa personale" title="Vista d’insieme" onClick={() => adatta()}><Icon n="espandi" size={15} /></button><button className="btn btn-sm btn-ghost" onClick={() => adatta(true)}>Leggi i nomi</button></div>}
    </div>
    <p className="mp-spiegazione small muted">I collegamenti indicano i concetti presenti nel contesto dei passaggi segnati. Seleziona un passaggio per leggerlo e tornare al testo.</p>
    <div className="mp-corpo">
      {!visibili.length ? <div className="empty small" role="status">Nessun passaggio con questi filtri.</div>
        : modo === 'elenco' ? <div className="mp-elenco">{visibili.map((p) => <button key={chiavePassaggioMappa(p)} className={`mp-scheda ${p.colore}`} onClick={() => scegliPassaggio(chiavePassaggioMappa(p))} aria-pressed={selezionato === chiavePassaggioMappa(p)}><span className="tiny faint">{p.titolo}</span><span className={`mp-estratto ${p.tipo}`}>{p.testo}</span><span className="tiny muted">{p.concetti.length} {p.concetti.length === 1 ? 'concetto nel contesto' : 'concetti nel contesto'}</span></button>)}</div>
        : <svg ref={svgRef} className="mp-svg" role="group" aria-label="Passaggi personali e concetti collegati. Trascina lo sfondo per spostare la vista." tabIndex={0}
          onClick={(e) => { if (!attivaNodo(e.target) && e.target === e.currentTarget) chiudi(); }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && attivaNodo(e.target)) { e.preventDefault(); return; }
            if (e.target !== e.currentTarget) return;
            const movimenti: Record<string, [number, number]> = { ArrowLeft: [50, 0], ArrowRight: [-50, 0], ArrowUp: [0, 50], ArrowDown: [0, -50] };
            if (movimenti[e.key]) { e.preventDefault(); const [x, y] = movimenti[e.key]; disegna({ ...vista.current, x: vista.current.x + x, y: vista.current.y + y }); }
          }}
          onPointerDown={(e) => {
            if (e.button !== 0 || (e.target as Element).closest('[data-passaggio],[data-concetto]')) return;
            trascinamento.current = { id: e.pointerId, x: e.clientX, y: e.clientY, origineX: vista.current.x, origineY: vista.current.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }} onPointerMove={muovi} onPointerUp={(e) => { if (trascinamento.current?.id === e.pointerId) { trascinamento.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } }} onPointerCancel={() => { trascinamento.current = null; }}>
          <g ref={gruppoRef}>
            <text className="mp-colonna" x={24} y={28}>SEZIONI</text><text className="mp-colonna" x={PASSAGGIO_X} y={28}>PASSAGGI SEGNATI</text><text className="mp-colonna" x={CONCETTO_X} y={28}>CONCETTI NEL CONTESTO</text>
            <g className="mp-collegamenti" aria-hidden="true">
              {layout.sezioni.flatMap((s) => layout.passaggi.filter((n) => s.passaggi.has(n.key)).map((n) => <path key={`${s.id}-${n.key}`} d={`M264,${s.y + 45}C285,${s.y + 45} 289,${n.y + PASSAGGIO_H / 2} ${PASSAGGIO_X},${n.y + PASSAGGIO_H / 2}`} className={selezionato === n.key ? 'mp-linea attiva' : 'mp-linea'} />))}
              {layout.concetti.flatMap((c) => layout.passaggi.filter((p) => c.passaggi.has(p.key)).map((p) => <path key={`${c.id}-${p.key}`} d={`M${PASSAGGIO_X + PASSAGGIO_W},${p.y + PASSAGGIO_H / 2}C725,${p.y + PASSAGGIO_H / 2} 725,${c.y + CONCETTO_H / 2} ${CONCETTO_X},${c.y + CONCETTO_H / 2}`} className={selezionato === p.key || concetto === c.id ? 'mp-linea attiva' : 'mp-linea'} />))}
            </g>
            {layout.sezioni.map((s) => <g key={s.id} className="mp-sezione" transform={`translate(${s.x},${s.y})`}><rect width={240} height={90} rx={12} /><text x={12} y={28}>{s.righe.map((r, i) => <tspan key={i} x={12} dy={i ? 19 : 0}>{r}</tspan>)}</text></g>)}
            {layout.passaggi.map((n) => <g key={n.key} className={`mp-passaggio ${n.passaggio.colore}${selezionato === n.key ? ' attivo' : ''}${concettoScelto && !concettoScelto.passaggi.has(n.key) ? ' mp-attenuato' : ''}`} transform={`translate(${n.x},${n.y})`} data-passaggio={n.key} role="button" tabIndex={0} aria-label={`${n.passaggio.tipo === 'sottolineato' ? 'Sottolineatura' : 'Evidenziazione'}: ${n.passaggio.testo.slice(0, 140)}`} aria-pressed={selezionato === n.key}>
              <title>{n.passaggio.testo}</title><rect width={PASSAGGIO_W} height={PASSAGGIO_H} rx={12} /><path className="mp-accento" d={`M4 14v${PASSAGGIO_H - 28}`} /><text className="mp-tipo" x={16} y={24}>{n.passaggio.tipo === 'sottolineato' ? 'SOTTOLINEATO' : 'EVIDENZIATO'}</text><text className={n.passaggio.tipo === 'sottolineato' ? 'mp-sottolineato' : ''} x={16} y={47}>{n.righe.map((r, i) => <tspan key={i} x={16} dy={i ? 19 : 0}>{r}</tspan>)}</text>
            </g>)}
            {layout.concetti.map((c) => <g key={c.id} className={`mp-concetto${concetto === c.id ? ' attivo' : ''}${passaggioScelto && !c.passaggi.has(chiavePassaggioMappa(passaggioScelto)) ? ' mp-attenuato' : ''}`} transform={`translate(${c.x},${c.y})`} data-concetto={c.id} role="button" tabIndex={0} aria-label={`${c.nome}, ${c.passaggi.size} passaggi collegati`} aria-pressed={concetto === c.id}><title>{c.nome}</title><rect width={CONCETTO_W} height={CONCETTO_H} rx={12} /><text x={14} y={c.righe.length > 1 ? 25 : 35}>{c.righe.map((r, i) => <tspan key={i} x={14} dy={i ? 18 : 0}>{r}</tspan>)}</text></g>)}
          </g>
        </svg>}
      {dettaglioAperto && <aside className="mp-dettaglio" aria-label={passaggioScelto ? 'Passaggio selezionato' : 'Concetto nella mappa personale'}>
        <div className="row-between"><span className="eyebrow">{passaggioScelto ? 'Passaggio segnato' : 'Concetto'}</span><button ref={chiudiRef} className="btn btn-sm btn-ghost" aria-label="Chiudi dettaglio della mappa personale" onClick={chiudi}><Icon n="x" size={16} /></button></div>
        {passaggioScelto ? <>
          <h2 className="title-s">{passaggioScelto.titolo}</h2>
          <blockquote className={`mp-brano ${passaggioScelto.colore}`}>{passaggioScelto.testo}</blockquote>
          <p className="tiny faint">{passaggioScelto.tipo === 'sottolineato' ? 'Sottolineato' : 'Evidenziato'} · {passaggioScelto.colore}{passaggioScelto.origine === 'pdf' ? ' · Recuperato dal PDF' : ''}</p>
          <button className="btn btn-primary btn-sm" onClick={() => onApri(passaggioScelto)}><Icon n="libro" size={15} />Torna al testo</button>
          {passaggioScelto.concetti.length > 0 && <><h3 className="eyebrow">Concetti nel contesto</h3><div className="row mp-temi">{[...new Set(passaggioScelto.concetti.map((c) => c.id))].map(tema)}</div></>}
        </> : concettoScelto && <>
          <h2 className="title-m">{concettoScelto.nome}</h2><p className="muted small">Presente nel contesto di {concettoScelto.passaggi.size} {concettoScelto.passaggi.size === 1 ? 'passaggio segnato' : 'passaggi segnati'} in questa vista.</p>
          {onConcetto ? <button className="btn btn-sm" onClick={() => onConcetto(concettoScelto.id)}>Apri nel glossario<Icon n="freccia" size={14} /></button> : <a className="btn btn-sm" href={href(`/concetto/${encodeURIComponent(concettoScelto.id)}`)}>Apri nel glossario<Icon n="freccia" size={14} /></a>}
          <div className="mp-passaggi-concetto">{visibili.filter((p) => concettoScelto.passaggi.has(chiavePassaggioMappa(p))).map((p) => <button key={chiavePassaggioMappa(p)} className="mp-mini-passaggio" onClick={() => scegliPassaggio(chiavePassaggioMappa(p))}>{p.testo}</button>)}</div>
        </>}
      </aside>}
    </div>
    <footer className="mp-footer">
      <span className="tiny faint" role="status">{filtrati.length} {filtrati.length === 1 ? 'passaggio' : 'passaggi'}{filtrati.length !== passaggi.length ? ` su ${passaggi.length}` : ''} · {layout.totaleConcetti} {layout.totaleConcetti === 1 ? 'concetto in questa vista' : 'concetti in questa vista'}</span>
      {totalePagine > 1 && <div className="row mp-pagine"><button className="btn btn-sm btn-ghost" disabled={paginaAttuale === 0} aria-label="Passaggi precedenti" onClick={() => { setPagina(paginaAttuale - 1); chiudi(); }}><Icon n="indietro" size={15} /></button><span className="tiny">{paginaAttuale + 1} / {totalePagine}</span><button className="btn btn-sm btn-ghost" disabled={paginaAttuale === totalePagine - 1} aria-label="Passaggi successivi" onClick={() => { setPagina(paginaAttuale + 1); chiudi(); }}><Icon n="freccia" size={15} /></button></div>}
      {layout.totaleConcetti > MAX_CONCETTI && <span className="tiny faint mp-limite">La mappa mostra {MAX_CONCETTI} concetti alla volta. Tutti i concetti del passaggio restano disponibili nel suo dettaglio.</span>}
    </footer>
  </section>;
}

export default memo(MappaPersonale);
