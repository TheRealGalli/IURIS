import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from 'react';
import type { ArcoConcetto, NodoGeo, SemanticaGeo } from '../lib/mappa-geometrica';
import { primoSegno } from '../lib/mappa-geometrica';
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

interface Senso { sem: SemanticaGeo; fuoco: Fuoco; setFuoco: (f: Fuoco) => void }
type Fuoco = { nodo?: string; concetto?: string } | null;
const TINTE = ['#2a8f8f', '#5b5fc7', '#9a6a3a', '#8e4f8e', '#5f7380', '#6f7f2f', '#b0503a', '#3a7bb0'];
const tinta = (sem: SemanticaGeo, id: string) => TINTE[Math.max(0, sem.concetti.indexOf(id)) % TINTE.length];

function Nodo({ n, sezione, modo, chiusi, alterna, apri, senso }: { n: NodoGeo; sezione: SezioneGeo; modo: 'albero' | 'schema'; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void; senso?: Senso }) {
  const segno = primoSegno(n), u = n.unita;
  const href = linkTesto(sezione.documento, sezione.sezione, u.blocco, segno);
  const chiuso = chiusi.has(n.id), haFigli = n.figli.length > 0;
  const etichetta = n.segnato ? n.pezzi.map((p) => p.testo).join('') : u.testo;
  const chips = senso?.sem.perNodo.get(n.id) ?? [];
  const scheda = <div className="mg-nodo-riga" onMouseEnter={chips.length ? () => senso!.setFuoco({ nodo: n.id }) : undefined} onMouseLeave={chips.length ? () => senso!.setFuoco(null) : undefined}>
    <a data-nodo={n.id} className={`mg-nodo mg-${u.tipo}${u.tipo === 'titolo' ? ` mg-h${u.livello}` : ''}${n.segnato ? ' mg-segnato' : ' mg-antenato'}`}
      href={href} onClick={(e) => apri(e, href)} title={u.testo}
      aria-label={`${n.segnato ? 'Parte segnata' : 'Contiene parti segnate'}: ${accorcia(etichetta, 160)}. Apri nel testo`}>
      {u.numero && <span className="mg-numero">{u.numero}</span>}
      <span className="mg-testo">{n.segnato
        ? n.pezzi.map((p, i) => p.segnato
          ? <span key={i} className={`mg-segno${p.colore ? ` ev-${p.colore}` : ''}${p.linea ? ` li-${p.linea}` : ''}`}>{p.testo}</span>
          : <span key={i} className="mg-attorno">{p.testo}</span>)
        : accorcia(u.testo, u.tipo === 'titolo' ? 90 : 110)}</span>
      {chips.length > 0 && <span className="mg-chips">{chips.slice(0, 3).map((c) => <span key={c} className="mg-chip" style={{ '--mg-tinta': tinta(senso!.sem, c) } as CSSProperties}
        onMouseEnter={() => senso!.setFuoco({ concetto: c })}>{senso!.sem.nomi[c] ?? c}</span>)}</span>}
    </a>
    {haFigli && <button className="mg-piega" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${n.figli.length} sotto-parti` : 'Nascondi le sotto-parti'} onClick={() => alterna(n.id)}>{chiuso ? n.figli.length : '−'}</button>}
  </div>;
  if (modo === 'schema') return <li>{scheda}{haFigli && !chiuso && <ul>{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</ul>}</li>;
  return <div className="mg-ramo">{scheda}{haFigli && !chiuso && <div className="mg-figli">{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</div>}</div>;
}

/** Archi fra nodi lontani che parlano dello stesso concetto o di concetti legati nel glossario. */
function Archi({ dentro, archi, sem, fuoco, firma }: { dentro: RefObject<HTMLDivElement | null>; archi: ArcoConcetto[]; sem: SemanticaGeo; fuoco: Fuoco; firma: string }) {
  const [vie, setVie] = useState<{ k: string; d: string; lx: number; ly: number; a: ArcoConcetto }[]>([]);
  const [misura, setMisura] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = dentro.current; if (!el) return;
    const calcola = () => {
      const base = el.getBoundingClientRect();
      const r = (id: string) => el.querySelector(`[data-nodo="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      const out: typeof vie = [];
      // Gli archi corrono dietro ai nodi e piegano nel margine a destra dell'albero, una corsia ciascuno.
      const destra = Math.max(...[...el.querySelectorAll('[data-nodo]')].map((x) => x.getBoundingClientRect().right)) - base.left;
      const misurati = archi.flatMap((a) => { const A = r(a.da), B = r(a.a); return A && B ? [{ a, A, B, span: Math.abs(A.top - B.top) }] : []; }).sort((x, y) => x.span - y.span);
      misurati.forEach(({ a, A, B }, i) => {
        const x1 = A.right - base.left, y1 = A.top + A.height / 2 - base.top, x2 = B.right - base.left, y2 = B.top + B.height / 2 - base.top;
        const xm = destra + 18 + i * 11, c1 = x1 + (xm - x1) * 0.9, c2 = x2 + (xm - x2) * 0.9;
        out.push({ k: `${a.da}|${a.a}|${a.concetto}`, d: `M${x1},${y1} C${c1},${y1} ${xm},${y1} ${xm},${(y1 + y2) / 2} S${c2},${y2} ${x2},${y2}`, lx: xm - 8, ly: (y1 + y2) / 2, a });
      });
      setVie(out); setMisura({ w: el.scrollWidth, h: el.scrollHeight });
    };
    calcola();
    const ro = new ResizeObserver(calcola); ro.observe(el);
    return () => ro.disconnect();
  }, [archi, firma]);
  const acceso = (a: ArcoConcetto) => !fuoco || (fuoco.nodo ? a.da === fuoco.nodo || a.a === fuoco.nodo : a.concetto === fuoco.concetto || a.altro === fuoco.concetto);
  const etichette = fuoco ? vie.filter(({ a }) => acceso(a)) : [];
  return <><svg className="mg-archi" width={misura.w} height={misura.h} aria-hidden="true">
    <defs>{sem.concetti.map((c) => <marker key={c} id={`mg-punta-${c}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill={tinta(sem, c)} /></marker>)}</defs>
    {vie.map(({ k, d, a }) => {
      const c = a.tipo === 'relazione' ? a.altro! : a.concetto, on = acceso(a);
      return <g key={k} className={`mg-arco mg-arco-${a.tipo}${on ? '' : ' mg-spento'}${fuoco && on ? ' mg-acceso' : ''}`} style={{ '--mg-tinta': tinta(sem, c) } as CSSProperties}>
        <path d={d} markerEnd={a.tipo === 'relazione' ? `url(#mg-punta-${c})` : undefined} />
      </g>;
    })}
  </svg>
  {etichette.map(({ k, lx, ly, a }) => {
    const c = a.tipo === 'relazione' ? a.altro! : a.concetto;
    const testo = a.tipo === 'relazione' ? <><b>{sem.nomi[a.concetto]}</b> {a.etichetta ?? 'collegato a'} <b>{sem.nomi[a.altro!]}</b></> : <>stesso concetto: <b>{sem.nomi[a.concetto]}</b></>;
    return <span key={k} className="mg-arco-etichetta" style={{ left: lx, top: ly, '--mg-tinta': tinta(sem, c) } as CSSProperties}>{testo}</span>;
  })}</>;
}

function Albero({ s, chiusi, alterna, apri, significato }: { s: SezioneGeo; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void; significato: boolean }) {
  const dentro = useRef<HTMLDivElement>(null);
  const [fuoco, setFuoco] = useState<Fuoco>(null);
  const archi = significato ? s.semantica.archi.filter((a) => visibile(s.radici, a.da, chiusi) && visibile(s.radici, a.a, chiusi)) : [];
  const senso = significato && s.semantica.archi.length ? { sem: s.semantica, fuoco, setFuoco } : undefined;
  return <div className="mg-albero" style={{ '--mg-livelli': livelli(s.radici, chiusi), '--mg-margine': archi.length ? '170px' : '0px' } as CSSProperties}>
    <div ref={dentro} className={`mg-albero-dentro${archi.length ? ' mg-con-archi' : ''}`}>
      {s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo="albero" chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}
      {archi.length > 0 && <Archi dentro={dentro} archi={archi} sem={s.semantica} fuoco={fuoco} firma={[...chiusi].join(',')} />}
    </div>
  </div>;
}
const visibile = (nodi: NodoGeo[], id: string, chiusi: Set<string>): boolean => nodi.some((n) => n.id === id || (!chiusi.has(n.id) && visibile(n.figli, id, chiusi)));

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
    <p className="mg-spiegazione small muted">La mappa ha la forma del testo: titoli, paragrafi ed elenchi nell’ordine in cui sono scritti. Compaiono solo le parti che hai segnato; in grigio i titoli e i paragrafi che le contengono. Evidenziature e sottolineature restano come nel testo.{significato && ' Le etichette colorate sono concetti del glossario: gli archi uniscono i punti che ne parlano o i concetti legati fra loro (passa sopra un nodo per seguirli).'}</p>
    <div className="mg-corpo">
      {visibili.map((s) => {
        const aperta = aperte.has(s.chiave) || !!scelta;
        return <article key={s.chiave} className="mg-lezione">
          <button className="mg-lezione-testa" aria-expanded={aperta} onClick={() => setAperte((a) => { const x = new Set(a); if (x.has(s.chiave)) x.delete(s.chiave); else x.add(s.chiave); return x; })}>
            <Icon n={aperta ? 'giu' : 'freccia'} size={14} />
            <span className="mg-lezione-titolo">{s.titolo}</span>
            <span className="tiny faint">{documenti.length > 1 ? `${accorcia(s.docTitolo, 34)} · ` : ''}pp. {s.da}{s.a !== s.da ? `–${s.a}` : ''} · {s.segnati} {s.segnati === 1 ? 'parte segnata' : 'parti segnate'}</span>
          </button>
          {aperta && (modo === 'albero'
            ? <Albero s={s} chiusi={chiusi} alterna={alterna} apri={apri} significato={significato} />
            : <ul className="mg-schema">{s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri}
              senso={significato && s.semantica.archi.length ? { sem: s.semantica, fuoco: null, setFuoco: () => {} } : undefined} />)}</ul>)}
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
