import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { ArcoConcetto, FuocoGeo, NodoGeo, SemanticaGeo } from '../lib/mappa-geometrica';
import { accensione, altezzaVista, corsieArchi, inLocale, inquadra, primoSegno, tracciaArco } from '../lib/mappa-geometrica';
import { useZoom } from '../lib/zoom';
import type { SezioneGeo } from '../lib/letture-hooks';
import { linkTesto } from '../lib/letture-client';
import { Icon } from './ui';
import './MappaGeometrica.css';

interface Props {
  sezioni: SezioneGeo[];
  /** Nel pannello degli Originali: parte dalla lezione che si sta leggendo. */
  compatta?: boolean;
  sezioneIniziale?: string;
  onApri: (href: string) => void;
  totale?: number;
  nonCollegati?: number;
}

const accorcia = (t: string, n: number) => t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
/** Colonne dell'albero aperto: servono a dividere la larghezza disponibile fra i livelli. */
const livelli = (nodi: NodoGeo[], chiusi: Set<string>): number => nodi.reduce((m, x) => Math.max(m, 1 + (chiusi.has(x.id) ? 0 : livelli(x.figli, chiusi))), 0);
const contaNodi = (nodi: NodoGeo[]): number => nodi.reduce((n, x) => n + (x.segnato ? 1 : 0) + contaNodi(x.figli), 0);

interface Senso { sem: SemanticaGeo; setFuoco: (f: FuocoGeo) => void }
const TINTE = ['#2a8f8f', '#5b5fc7', '#9a6a3a', '#8e4f8e', '#5f7380', '#6f7f2f', '#b0503a', '#3a7bb0'];
const tinta = (sem: SemanticaGeo, id: string) => TINTE[Math.max(0, sem.concetti.indexOf(id)) % TINTE.length];

const Nodo = memo(function Nodo({ n, sezione, modo, chiusi, alterna, apri, senso }: { n: NodoGeo; sezione: SezioneGeo; modo: 'albero' | 'schema'; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void; senso?: Senso }) {
  const segno = primoSegno(n), u = n.unita;
  const href = linkTesto(sezione.documento, sezione.sezione, u.blocco, segno);
  const chiuso = chiusi.has(n.id), haFigli = n.figli.length > 0;
  const etichetta = n.segnato ? n.pezzi.map((p) => p.testo).join('') : u.testo;
  const chips = senso?.sem.perNodo.get(n.id) ?? [];
  const fuori = chips.length ? () => senso!.setFuoco(null) : undefined;
  const scheda = <div className="mg-nodo-riga" onMouseEnter={chips.length ? () => senso!.setFuoco({ nodo: n.id }) : undefined} onMouseLeave={fuori}>
    <a data-nodo={n.id} className={`mg-nodo mg-${u.tipo}${u.tipo === 'titolo' ? ` mg-h${u.livello}` : ''}${n.segnato ? ' mg-segnato' : ' mg-antenato'}`}
      href={href} onClick={(e) => apri(e, href)}
      aria-label={`${n.segnato ? 'Parte segnata' : 'Contiene parti segnate'}: ${accorcia(etichetta, 160)}. Apri nel testo`}>
      {u.numero && <span className="mg-numero">{u.numero}</span>}
      <span className="mg-testo">{n.segnato
        ? n.pezzi.map((p, i) => p.segnato
          ? <span key={i} className={`mg-segno${p.colore ? ` ev-${p.colore}` : ''}${p.linea ? ` li-${p.linea}` : ''}`}>{p.testo}</span>
          : <span key={i} className="mg-attorno">{p.testo}</span>)
        : accorcia(u.testo, u.tipo === 'titolo' ? 90 : 110)}</span>
      {chips.length > 0 && <span className="mg-chips">{chips.slice(0, 3).map((c) => <span key={c} data-concetto={c} className="mg-chip" style={{ '--mg-tinta': tinta(senso!.sem, c) } as CSSProperties}
        onMouseEnter={() => senso!.setFuoco({ nodo: n.id, concetto: c })} onMouseLeave={() => senso!.setFuoco({ nodo: n.id })}>{senso!.sem.nomi[c] ?? c}</span>)}</span>}
    </a>
    {haFigli && <button className="mg-piega" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${n.figli.length} sotto-parti` : 'Nascondi le sotto-parti'} onClick={() => alterna(n.id)}>{chiuso ? n.figli.length : '−'}</button>}
  </div>;
  if (modo === 'schema') return <li>{scheda}{haFigli && !chiuso && <ul>{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</ul>}</li>;
  return <div className="mg-ramo">{scheda}{haFigli && !chiuso && <div className="mg-figli">{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</div>}</div>;
});

const PASSO_CORSIA = 24, MARGINE_BASE = 34;
const margineArchi = (corsie: number) => corsie ? Math.min(320, MARGINE_BASE + corsie * PASSO_CORSIA + 12) : 0;

/**
 * Archi fra nodi lontani: porta propria sul nodo, corsia propria nel margine, curve morbide agli angoli.
 * Il contenitore si prende dallo stesso svg (non da un ref del genitore, che al primo montaggio non è ancora pronto)
 * e le misure si riportano alla scala del disegno: lo zoom non obbliga a ricalcolare nulla.
 */
function Archi({ archi, sem, ordine, fuoco, setFuoco, firma }: { archi: ArcoConcetto[]; sem: SemanticaGeo; ordine: Map<string, number>; fuoco: FuocoGeo; setFuoco: (f: FuocoGeo) => void; firma: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vie, setVie] = useState<{ i: number; d: string; lx: number; ly: number }[]>([]);
  const [misura, setMisura] = useState({ w: 0, h: 0 });
  const { percorsi } = useMemo(() => corsieArchi(archi, ordine), [archi, ordine]);
  useLayoutEffect(() => {
    const el = svgRef.current?.parentElement; if (!el) return;
    let attesa = 0;
    const calcola = () => {
      const base = el.getBoundingClientRect();
      const k = el.offsetWidth ? base.width / el.offsetWidth : 1;
      const loc = (x: Element | null | undefined) => x ? inLocale(x.getBoundingClientRect(), base, k || 1) : undefined;
      const nodi = [...el.querySelectorAll('[data-nodo]')];
      const destra = Math.max(0, ...nodi.map((x) => loc(x)!.r));
      const r = (id: string) => loc(el.querySelector(`[data-nodo="${CSS.escape(id)}"]`));
      const porta = (R: { t: number; b: number; r: number }, [i, n]: [number, number]) => {
        // Porte distribuite sul bordo destro, lontane dagli angoli arrotondati.
        const h = R.b - R.t, alto = R.t + Math.min(10, h * 0.2), basso = R.b - Math.min(10, h * 0.2);
        return [R.r, n <= 1 ? (R.t + R.b) / 2 : alto + (basso - alto) * i / (n - 1)] as const;
      };
      const out: typeof vie = [];
      archi.forEach((a, i) => {
        const A = r(a.da), B = r(a.a); if (!A || !B) return;
        const p = percorsi[i], [x1, y1] = porta(A, p.portaDa), [x2, y2] = porta(B, p.portaA);
        const xl = destra + MARGINE_BASE - 14 + p.corsia * PASSO_CORSIA;
        out.push({ i, d: tracciaArco(x1, y1, x2, y2, xl), lx: xl - 8, ly: (y1 + y2) / 2 });
      });
      setVie(out); setMisura({ w: el.scrollWidth, h: el.scrollHeight });
    };
    calcola();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(attesa); attesa = requestAnimationFrame(calcola); });
    ro.observe(el); for (const x of el.children) if (x !== svgRef.current) ro.observe(x);
    return () => { ro.disconnect(); cancelAnimationFrame(attesa); };
  }, [archi, percorsi, firma]);
  const luce = useMemo(() => accensione(archi, fuoco), [archi, fuoco]);
  // Evidenza dei nodi senza ridisegnare l'albero: solo classi sugli elementi già presenti, tolte all'uscita.
  useEffect(() => {
    const el = svgRef.current?.parentElement; if (!el) return;
    const segna = (on: boolean) => {
      el.classList.toggle('mg-in-fuoco', on && !!luce);
      for (const x of el.querySelectorAll<HTMLElement>('[data-nodo]')) {
        const id = x.dataset.nodo!;
        x.classList.toggle('mg-n-centro', on && !!luce && luce.centro === id);
        x.classList.toggle('mg-n-collegato', on && !!luce && luce.collegati.has(id));
      }
      for (const x of el.querySelectorAll<HTMLElement>('[data-concetto]')) x.classList.toggle('mg-c-acceso', on && !!luce && luce.concetti.has(x.dataset.concetto!));
    };
    segna(true);
    return () => segna(false);
  }, [luce]);
  // Etichette dei soli archi accesi, spinte in basso se si sovrappongono.
  const etichette = luce ? vie.filter((v) => luce.archi.has(v.i)).sort((a, b) => a.ly - b.ly) : [];
  let ultimo = -Infinity;
  const posate = etichette.map((v) => { const y = Math.max(v.ly, ultimo + 34); ultimo = y; return { ...v, ly: y }; });
  return <><svg ref={svgRef} className={`mg-archi${luce ? ' mg-archi-fuoco' : ''}`} width={misura.w} height={misura.h} data-vie={vie.length} aria-hidden="true">
    <defs>{sem.concetti.map((c) => <marker key={c} id={`mg-punta-${c}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill={tinta(sem, c)} /></marker>)}</defs>
    {vie.map(({ i, d }) => {
      const a = archi[i], c = a.tipo === 'relazione' ? a.altro! : a.concetto, on = !luce || luce.archi.has(i);
      return <g key={i} className={`mg-arco mg-arco-${a.tipo}${on ? '' : ' mg-spento'}${luce && on ? ' mg-acceso' : ''}`} style={{ '--mg-tinta': tinta(sem, c) } as CSSProperties}>
        <path d={d} markerEnd={a.tipo === 'relazione' ? `url(#mg-punta-${c})` : undefined} />
        <path className="mg-arco-presa" d={d} onMouseEnter={() => setFuoco({ arco: i })} onMouseLeave={() => setFuoco(null)} />
      </g>;
    })}
  </svg>
  {posate.map(({ i, lx, ly }) => {
    const a = archi[i], c = a.tipo === 'relazione' ? a.altro! : a.concetto;
    const testo = a.tipo === 'relazione' ? <><b>{sem.nomi[a.concetto]}</b> {a.etichetta ?? 'collegato a'} <b>{sem.nomi[a.altro!]}</b></> : <>stesso concetto: <b>{sem.nomi[a.concetto]}</b></>;
    return <span key={i} className="mg-arco-etichetta" style={{ left: lx, top: ly, '--mg-tinta': tinta(sem, c) } as CSSProperties}>{testo}</span>;
  })}</>;
}

/**
 * Finestra con zoom e trascinamento (lo stesso d3-zoom delle altre mappe) al posto dello scorrimento orizzontale.
 * Si riadatta in larghezza quando cambia la lezione, la forma o lo strato dei concetti; ripiegare un ramo non sposta la vista.
 */
function Vista({ chiave, compatta, children }: { chiave: string; compatta: boolean; children: ReactNode }) {
  const fin = useRef<HTMLDivElement>(null), tela = useRef<HTMLDivElement>(null);
  const tr = useRef({ x: 0, y: 0, k: 1 }), dim = useRef({ w: 0, h: 0 });
  const [lar, setLar] = useState(0), [alto, setAlto] = useState(0);
  const inquadrata = useRef('');
  const z = useZoom(fin, (t) => {
    tr.current = { x: t.x, y: t.y, k: t.k };
    if (tela.current) tela.current.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
    fin.current?.setAttribute('data-zoom', String(Math.round(t.k * 100)));
  }, 0.2, { rotella: false });
  const massimo = () => Math.round(window.innerHeight * (compatta ? 0.62 : 0.72));
  const misura = () => { const t = tela.current; if (t) dim.current = { w: t.scrollWidth, h: t.scrollHeight }; return dim.current; };
  const adatta = (modo: 'tutto' | 'larghezza', durata = 0) => {
    const f = fin.current; if (!f) return;
    const q = inquadra(misura(), { w: f.clientWidth, h: f.clientHeight }, modo);
    z.imposta(q.x, q.y, q.k, durata);
  };
  useLayoutEffect(() => {
    const f = fin.current; if (!f) return;
    const ro = new ResizeObserver(() => setLar(f.clientWidth)); ro.observe(f); setLar(f.clientWidth);
    return () => ro.disconnect();
  }, []);
  // Altezza della finestra e inquadratura iniziale; poi segue solo le misure (aprire o chiudere un ramo).
  useLayoutEffect(() => {
    const t = tela.current; if (!t || !lar) return;
    const c = misura(), h = altezzaVista(c, lar, massimo());
    setAlto(h);
    // Cambiare la larghezza della finestra non toglie lo zoom scelto: si reinquadra solo per una nuova lezione, forma o strato.
    if (inquadrata.current !== chiave) { inquadrata.current = chiave; const q = inquadra(c, { w: lar, h }, 'larghezza'); z.imposta(q.x, q.y, q.k); }
    let attesa = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(attesa); attesa = requestAnimationFrame(() => { const m = misura(); setAlto(altezzaVista(m, fin.current?.clientWidth ?? lar, massimo())); }); });
    ro.observe(t); for (const x of t.children) ro.observe(x); const d = t.querySelector('.mg-albero-dentro'); if (d) ro.observe(d);
    return () => { ro.disconnect(); cancelAnimationFrame(attesa); };
  }, [chiave, lar]);
  // Rotella senza Ctrl: scorre dentro la mappa finché c'è altro da vedere, poi lascia scorrere la pagina.
  useEffect(() => {
    const f = fin.current; if (!f) return;
    const ruota = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const u = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? f.clientHeight : 1;
      const t = tr.current, W = dim.current.w * t.k, H = dim.current.h * t.k, fw = f.clientWidth, fh = f.clientHeight;
      const tra = (v: number, lo: number, hi: number) => Math.min(Math.max(v, Math.min(lo, hi)), Math.max(lo, hi));
      const ny = H + 24 > fh ? tra(t.y - e.deltaY * u, fh - H - 12, 0) : t.y;
      const nx = W + 24 > fw ? tra(t.x - e.deltaX * u, fw - W - 12, 12) : t.x;
      if (Math.abs(ny - t.y) < .5 && Math.abs(nx - t.x) < .5) return;
      e.preventDefault(); z.imposta(nx, ny, t.k);
    };
    f.addEventListener('wheel', ruota, { passive: false });
    return () => f.removeEventListener('wheel', ruota);
  }, []);
  // Doppio clic sullo sfondo: tutta la mappa in una volta (sui nodi il clic apre il testo).
  const tutto = (e: MouseEvent) => { if (!(e.target as Element).closest('.mg-nodo, .mg-piega')) adatta('tutto', 350); };
  return <div ref={fin} className="mg-finestra" style={alto ? { height: alto } : undefined} tabIndex={0} role="group"
    aria-label="Mappa interattiva: trascina per spostarti, pizzica o usa Ctrl/⌘ e la rotella per lo zoom, doppio clic per vederla tutta"
    onPointerDown={(e) => { if (document.activeElement !== e.currentTarget && !(e.target as Element).closest('a, button')) e.currentTarget.focus({ preventScroll: true }); }} onDoubleClick={tutto}>
    <div ref={tela} className="mg-tela" style={lar ? { width: lar } : undefined}>{children}</div>
  </div>;
}

const ordineNodi = (radici: NodoGeo[]) => { const m = new Map<string, number>(); const v = (n: NodoGeo) => { m.set(n.id, m.size); n.figli.forEach(v); }; radici.forEach(v); return m; };
const visibile = (nodi: NodoGeo[], id: string, chiusi: Set<string>): boolean => nodi.some((n) => n.id === id || (!chiusi.has(n.id) && visibile(n.figli, id, chiusi)));

/** Albero o schema con lo strato dei concetti: stessi archi, stesso comportamento al passaggio del mouse. */
function Disegno({ s, modo, chiusi, alterna, apri, significato }: { s: SezioneGeo; modo: 'albero' | 'schema'; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void; significato: boolean }) {
  const [fuoco, setFuoco] = useState<FuocoGeo>(null);
  const archi = useMemo(() => significato ? s.semantica.archi.filter((a) => visibile(s.radici, a.da, chiusi) && visibile(s.radici, a.a, chiusi)) : [], [s, chiusi, significato]);
  const ordine = useMemo(() => ordineNodi(s.radici), [s]);
  const corsie = useMemo(() => corsieArchi(archi, ordine).corsie, [archi, ordine]);
  const senso = useMemo(() => significato && s.semantica.archi.length ? { sem: s.semantica, setFuoco } : undefined, [significato, s]);
  useEffect(() => setFuoco(null), [archi]);
  const margine = margineArchi(corsie);
  const nodi = s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />);
  const strato = archi.length > 0 && <Archi archi={archi} sem={s.semantica} ordine={ordine} fuoco={fuoco} setFuoco={setFuoco} firma={`${modo}|${[...chiusi].join(',')}`} />;
  const stile = { '--mg-livelli': livelli(s.radici, chiusi), '--mg-margine': `${margine}px` } as CSSProperties;
  if (modo === 'schema') return <div className={`mg-schema-dentro${archi.length ? ' mg-con-archi' : ''}`} style={stile}><ul className="mg-schema">{nodi}</ul>{strato}</div>;
  return <div className="mg-albero" style={stile}>
    <div className={`mg-albero-dentro${archi.length ? ' mg-con-archi' : ''}`}>{nodi}{strato}</div>
  </div>;
}

function MappaGeometrica({ sezioni, compatta = false, sezioneIniziale, onApri, totale, nonCollegati = 0 }: Props) {
  const iniziale = sezioneIniziale && sezioni.some((s) => s.chiave === sezioneIniziale) ? sezioneIniziale : '';
  const prima = iniziale || sezioni[0]?.chiave || '';
  const [scelta, setScelta] = useState(prima);
  const [modo, setModo] = useState<'albero' | 'schema'>(compatta ? 'schema' : 'albero');
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const [significato, setSignificato] = useState(true);
  // Una lezione alla volta: se quella scelta non c'è (ancora), si parte da quella aperta nel lettore o dalla prima.
  useEffect(() => { if (!sezioni.some((s) => s.chiave === scelta) && prima) setScelta(prima); }, [sezioni, scelta, prima]);
  const visibili = useMemo(() => sezioni.filter((s) => s.chiave === scelta), [sezioni, scelta]);
  const documenti = useMemo(() => [...new Map(sezioni.map((s) => [s.documento, s.docTitolo]))], [sezioni]);
  const alterna = (id: string) => setChiusi((c) => { const s = new Set(c); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const apri = (e: MouseEvent, href: string) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onApri(href); };
  const parti = sezioni.reduce((n, s) => n + s.segnati, 0);

  if (!sezioni.length) return <section className="mappa-geo"><div className="mg-vuota"><Icon n="mappa" size={26} /><p className="muted small">Evidenzia o sottolinea un passaggio negli Originali: qui comparirà nella forma del testo, con i titoli e gli elenchi che lo contengono.</p></div></section>;
  return <section className={`mappa-geo${compatta ? ' mg-compatta' : ''}`} aria-label="Mappa personale nella struttura del testo">
    <div className="mg-barra">
      <select className="select" aria-label="Scegli la lezione" value={scelta} onChange={(e) => { setScelta(e.target.value); setChiusi(new Set()); }}>
        {documenti.map(([doc, titolo]) => <optgroup key={doc} label={titolo}>{sezioni.filter((s) => s.documento === doc).map((s) => <option key={s.chiave} value={s.chiave}>{accorcia(s.titolo, 70)} · {s.segnati}</option>)}</optgroup>)}
      </select>
      <div className="mg-vista" aria-label="Forma della mappa">
        <button className={`btn btn-sm ${modo === 'albero' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'albero'} onClick={() => setModo('albero')}>Albero</button>
        <button className={`btn btn-sm ${modo === 'schema' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'schema'} onClick={() => setModo('schema')}>Schema</button>
      </div>
      <button className={`btn btn-sm ${significato ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={significato} onClick={() => setSignificato((x) => !x)} title="Collega i nodi che parlano dello stesso concetto o di concetti legati nel glossario">Concetti collegati</button>
      <div className="mg-azioni">
        <button className="btn btn-sm btn-ghost" disabled={!chiusi.size} onClick={() => setChiusi(new Set())} title="Riapre i rami ripiegati">Apri tutto</button>
      </div>
    </div>
    <div className="mg-corpo">
      {visibili.map((s) => <article key={s.chiave} className="mg-lezione" data-archi={s.semantica.archi.length} data-scartati={s.semantica.scartati.relazioni + s.semantica.scartati.ripetizioni}>
        <div className="mg-lezione-testa">
          <span className="mg-lezione-titolo">{s.titolo}</span>
          <span className="tiny faint">{documenti.length > 1 ? `${accorcia(s.docTitolo, 34)} · ` : ''}pp. {s.da}{s.a !== s.da ? `–${s.a}` : ''} · {s.segnati} {s.segnati === 1 ? 'parte segnata' : 'parti segnate'}</span>
        </div>
        <Vista chiave={`${modo}|${significato ? 1 : 0}`} compatta={compatta}><Disegno s={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} significato={significato} /></Vista>
      </article>)}
    </div>
    <footer className="mg-footer tiny faint" role="status">
      {parti} {parti === 1 ? 'parte segnata' : 'parti segnate'} in {sezioni.length} {sezioni.length === 1 ? 'lezione' : 'lezioni'}{totale !== undefined ? ` · ${totale} segni` : ''}
      {nonCollegati > 0 && ` · ${nonCollegati} ${nonCollegati === 1 ? 'segno resta' : 'segni restano'} solo nell’elenco (dal PDF o da verificare)`}
      {visibili[0] && ` · ${contaNodi(visibili[0].radici)} in questa lezione`}
    </footer>
  </section>;
}

export default memo(MappaGeometrica);
