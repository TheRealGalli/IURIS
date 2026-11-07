import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react';
import type { ArcoConcetto, FuocoGeo, NodoGeo, SemanticaGeo } from '../lib/mappa-geometrica';
import { accensione, corsieArchi, primoSegno } from '../lib/mappa-geometrica';
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
      href={href} onClick={(e) => apri(e, href)} title={u.testo}
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

const PASSO_CORSIA = 18, MARGINE_BASE = 34;
const margineArchi = (corsie: number) => corsie ? Math.min(320, MARGINE_BASE + corsie * PASSO_CORSIA + 12) : 0;

/** Archi fra nodi lontani: porta propria sul nodo, corsia propria nel margine, curve morbide agli angoli. */
function Archi({ dentro, archi, sem, ordine, fuoco, setFuoco, firma }: { dentro: RefObject<HTMLDivElement | null>; archi: ArcoConcetto[]; sem: SemanticaGeo; ordine: Map<string, number>; fuoco: FuocoGeo; setFuoco: (f: FuocoGeo) => void; firma: string }) {
  const [vie, setVie] = useState<{ i: number; d: string; lx: number; ly: number }[]>([]);
  const [misura, setMisura] = useState({ w: 0, h: 0 });
  const { percorsi } = useMemo(() => corsieArchi(archi, ordine), [archi, ordine]);
  useLayoutEffect(() => {
    const el = dentro.current; if (!el) return;
    let attesa = 0;
    const calcola = () => {
      const base = el.getBoundingClientRect();
      const r = (id: string) => el.querySelector(`[data-nodo="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      const destra = Math.max(...[...el.querySelectorAll('[data-nodo]')].map((x) => x.getBoundingClientRect().right)) - base.left;
      const porta = (R: DOMRect, [k, n]: [number, number]) => {
        // Porte distribuite sul bordo destro, lontane dagli angoli arrotondati.
        const alto = R.top + Math.min(10, R.height * 0.2), basso = R.bottom - Math.min(10, R.height * 0.2);
        return [R.right - base.left, (n <= 1 ? (R.top + R.bottom) / 2 : alto + (basso - alto) * k / (n - 1)) - base.top] as const;
      };
      const out: typeof vie = [];
      // Corsie più larghe quando c'è spazio libero a destra; mai meno del passo minimo.
      const corsie = Math.max(1, ...percorsi.map((p) => p.corsia + 1));
      const fine = (el.parentElement ?? el).getBoundingClientRect().right - 16, libero = fine - (base.left + destra) - MARGINE_BASE;
      const passo = Math.max(PASSO_CORSIA, Math.min(32, libero / (corsie + 0.5)));
      archi.forEach((a, i) => {
        const A = r(a.da), B = r(a.a); if (!A || !B) return;
        const p = percorsi[i], [x1, y1] = porta(A, p.portaDa), [x2, y2] = porta(B, p.portaA);
        const xl = destra + MARGINE_BASE - 14 + p.corsia * passo, su = y2 < y1 ? -1 : 1, rr = Math.min(12, Math.abs(y2 - y1) / 2);
        out.push({ i, d: `M${x1},${y1} H${xl - rr} Q${xl},${y1} ${xl},${y1 + su * rr} V${y2 - su * rr} Q${xl},${y2} ${xl - rr},${y2} H${x2 + 1}`, lx: xl - 8, ly: (y1 + y2) / 2 });
      });
      setVie(out); setMisura({ w: el.scrollWidth, h: el.scrollHeight });
    };
    calcola();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(attesa); attesa = requestAnimationFrame(calcola); }); ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(attesa); };
  }, [archi, percorsi, firma]);
  const luce = useMemo(() => accensione(archi, fuoco), [archi, fuoco]);
  // Evidenza dei nodi senza ridisegnare l'albero: solo classi sugli elementi già presenti.
  useEffect(() => {
    const el = dentro.current; if (!el) return;
    el.classList.toggle('mg-in-fuoco', !!luce);
    for (const x of el.querySelectorAll<HTMLElement>('[data-nodo]')) {
      const id = x.dataset.nodo!;
      x.classList.toggle('mg-n-centro', !!luce && luce.centro === id);
      x.classList.toggle('mg-n-collegato', !!luce && luce.collegati.has(id));
    }
    for (const x of el.querySelectorAll<HTMLElement>('[data-concetto]')) x.classList.toggle('mg-c-acceso', !!luce && luce.concetti.has(x.dataset.concetto!));
  }, [luce]);
  // Etichette dei soli archi accesi, spinte in basso se si sovrappongono.
  const etichette = luce ? vie.filter((v) => luce.archi.has(v.i)).sort((a, b) => a.ly - b.ly) : [];
  let ultimo = -Infinity;
  const posate = etichette.map((v) => { const y = Math.max(v.ly, ultimo + 34); ultimo = y; return { ...v, ly: y }; });
  return <><svg className={`mg-archi${luce ? ' mg-archi-fuoco' : ''}`} width={misura.w} height={misura.h} aria-hidden="true">
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

const ordineNodi = (radici: NodoGeo[]) => { const m = new Map<string, number>(); const v = (n: NodoGeo) => { m.set(n.id, m.size); n.figli.forEach(v); }; radici.forEach(v); return m; };
const visibile = (nodi: NodoGeo[], id: string, chiusi: Set<string>): boolean => nodi.some((n) => n.id === id || (!chiusi.has(n.id) && visibile(n.figli, id, chiusi)));

/** Albero o schema con lo strato dei concetti: stessi archi, stesso comportamento al passaggio del mouse. */
function Disegno({ s, modo, chiusi, alterna, apri, significato }: { s: SezioneGeo; modo: 'albero' | 'schema'; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void; significato: boolean }) {
  const dentro = useRef<HTMLDivElement>(null);
  const [fuoco, setFuoco] = useState<FuocoGeo>(null);
  const archi = useMemo(() => significato ? s.semantica.archi.filter((a) => visibile(s.radici, a.da, chiusi) && visibile(s.radici, a.a, chiusi)) : [], [s, chiusi, significato]);
  const ordine = useMemo(() => ordineNodi(s.radici), [s]);
  const corsie = useMemo(() => corsieArchi(archi, ordine).corsie, [archi, ordine]);
  const senso = useMemo(() => significato && s.semantica.archi.length ? { sem: s.semantica, setFuoco } : undefined, [significato, s]);
  useEffect(() => setFuoco(null), [archi]);
  const margine = margineArchi(corsie);
  const nodi = s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />);
  const strato = archi.length > 0 && <Archi dentro={dentro} archi={archi} sem={s.semantica} ordine={ordine} fuoco={fuoco} setFuoco={setFuoco} firma={`${modo}|${[...chiusi].join(',')}`} />;
  const stile = { '--mg-livelli': livelli(s.radici, chiusi), '--mg-margine': `${margine}px` } as CSSProperties;
  if (modo === 'schema') return <div ref={dentro} className={`mg-schema-dentro${archi.length ? ' mg-con-archi' : ''}`} style={stile}><ul className="mg-schema">{nodi}</ul>{strato}</div>;
  return <div className="mg-albero" style={stile}>
    <div ref={dentro} className={`mg-albero-dentro${archi.length ? ' mg-con-archi' : ''}`}>{nodi}{strato}</div>
  </div>;
}

function MappaGeometrica({ sezioni, compatta = false, sezioneIniziale, onApri, totale, nonCollegati = 0 }: Props) {
  const iniziale = sezioneIniziale && sezioni.some((s) => s.chiave === sezioneIniziale) ? sezioneIniziale : '';
  const [scelta, setScelta] = useState(compatta ? iniziale : '');
  const [modo, setModo] = useState<'albero' | 'schema'>(compatta ? 'schema' : 'albero');
  const [aperte, setAperte] = useState<Set<string>>(() => new Set(sezioni.slice(0, 1).map((s) => s.chiave)));
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const [significato, setSignificato] = useState(true);
  useEffect(() => { if (compatta && iniziale && !scelta) setScelta(iniziale); }, [compatta, iniziale]);
  useEffect(() => { if (scelta && !sezioni.some((s) => s.chiave === scelta)) setScelta(''); }, [sezioni, scelta]);
  useEffect(() => { setAperte((a) => a.size ? a : new Set(sezioni.slice(0, 1).map((s) => s.chiave))); }, [sezioni.length > 0]);
  const visibili = useMemo(() => scelta ? sezioni.filter((s) => s.chiave === scelta) : sezioni, [sezioni, scelta]);
  const documenti = useMemo(() => [...new Map(sezioni.map((s) => [s.documento, s.docTitolo]))], [sezioni]);
  const alterna = (id: string) => setChiusi((c) => { const s = new Set(c); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const apri = (e: MouseEvent, href: string) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onApri(href); };
  const parti = sezioni.reduce((n, s) => n + s.segnati, 0);

  if (!sezioni.length) return <section className="mappa-geo"><div className="mg-vuota"><Icon n="mappa" size={26} /><p className="muted small">Evidenzia o sottolinea un passaggio negli Originali: qui comparirà nella forma del testo, con i titoli e gli elenchi che lo contengono.</p></div></section>;
  return <section className={`mappa-geo${compatta ? ' mg-compatta' : ''}`} aria-label="Mappa personale nella struttura del testo">
    <div className="mg-barra">
      <select className="select" aria-label="Scegli la lezione" value={scelta} onChange={(e) => { setScelta(e.target.value); if (e.target.value) setAperte((a) => new Set([...a, e.target.value])); }}>
        <option value="">Tutte le lezioni ({sezioni.length})</option>
        {documenti.map(([doc, titolo]) => <optgroup key={doc} label={titolo}>{sezioni.filter((s) => s.documento === doc).map((s) => <option key={s.chiave} value={s.chiave}>{accorcia(s.titolo, 70)} · {s.segnati}</option>)}</optgroup>)}
      </select>
      <div className="mg-vista" aria-label="Forma della mappa">
        <button className={`btn btn-sm ${modo === 'albero' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'albero'} onClick={() => setModo('albero')}>Albero</button>
        <button className={`btn btn-sm ${modo === 'schema' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'schema'} onClick={() => setModo('schema')}>Schema</button>
      </div>
      <button className={`btn btn-sm ${significato ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={significato} onClick={() => setSignificato((x) => !x)} title="Collega i nodi che parlano dello stesso concetto o di concetti legati nel glossario">Concetti collegati</button>
      <div className="mg-azioni">
        <button className="btn btn-sm btn-ghost" onClick={() => { setAperte(new Set(sezioni.map((s) => s.chiave))); setChiusi(new Set()); }}>Apri tutto</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setAperte(new Set())}>Chiudi tutto</button>
      </div>
    </div>
    <p className="mg-spiegazione small muted">La mappa ha la forma del testo: titoli, paragrafi ed elenchi nell’ordine in cui sono scritti. Compaiono solo le parti che hai segnato; in grigio i titoli e i paragrafi che le contengono. Evidenziature e sottolineature restano come nel testo.{significato && ' Le etichette colorate sono concetti del glossario: gli archi uniscono i punti che ne parlano o i concetti legati fra loro. Passa sopra un nodo, un’etichetta o una linea per seguirla.'}</p>
    <div className="mg-corpo">
      {visibili.map((s) => {
        const aperta = aperte.has(s.chiave) || !!scelta;
        return <article key={s.chiave} className="mg-lezione" data-archi={s.semantica.archi.length} data-scartati={s.semantica.scartati.relazioni + s.semantica.scartati.ripetizioni}>
          <button className="mg-lezione-testa" aria-expanded={aperta} onClick={() => setAperte((a) => { const x = new Set(a); if (x.has(s.chiave)) x.delete(s.chiave); else x.add(s.chiave); return x; })}>
            <Icon n={aperta ? 'giu' : 'freccia'} size={14} />
            <span className="mg-lezione-titolo">{s.titolo}</span>
            <span className="tiny faint">{documenti.length > 1 ? `${accorcia(s.docTitolo, 34)} · ` : ''}pp. {s.da}{s.a !== s.da ? `–${s.a}` : ''} · {s.segnati} {s.segnati === 1 ? 'parte segnata' : 'parti segnate'}</span>
          </button>
          {aperta && <Disegno s={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} significato={significato} />}
        </article>;
      })}
    </div>
    <footer className="mg-footer tiny faint" role="status">
      {parti} {parti === 1 ? 'parte segnata' : 'parti segnate'} in {sezioni.length} {sezioni.length === 1 ? 'lezione' : 'lezioni'}{totale !== undefined ? ` · ${totale} segni` : ''}
      {nonCollegati > 0 && ` · ${nonCollegati} ${nonCollegati === 1 ? 'segno resta' : 'segni restano'} solo nell’elenco (dal PDF o da verificare)`}
      {scelta && visibili[0] && ` · ${contaNodi(visibili[0].radici)} in questa lezione`}
    </footer>
  </section>;
}

export default memo(MappaGeometrica);
