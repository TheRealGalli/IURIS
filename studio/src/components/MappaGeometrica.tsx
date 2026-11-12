import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type MutableRefObject, type ReactNode } from 'react';
import type { ArcoConcetto, FuocoGeo, NodoGeo, PezzoFascia, Rett, SemanticaGeo } from '../lib/mappa-geometrica';
import { accensione, altezzaVista, aspettoSegno, curvaFra, fasceGeometriche, inLocale, inquadra, posaEtichetta, primoSegno, scalaTitoli } from '../lib/mappa-geometrica';
import { useZoom } from '../lib/zoom';
import type { SezioneGeo } from '../lib/letture-hooks';
import { linkTesto } from '../lib/letture-client';
import { Icon } from './ui';
import { ultimoTocco } from '../lib/util';
import './MappaGeometrica.css';
import MobileSheet, { useCompact } from './MobileSheet';
import { inDemo } from '../lib/archivio';

interface Props {
  sezioni: SezioneGeo[];
  /** Nel pannello degli Originali: parte dalla lezione che si sta leggendo. */
  compatta?: boolean;
  sezioneIniziale?: string;
  onApri: (href: string) => void;
  totale?: number;
  nonCollegati?: number;
  /** Pagina Mappa personale sul computer: finestra a tutta altezza come le altre mappe, comandi dentro la mappa. */
  pagina?: boolean;
}
/** Spazio in alto lasciato ai comandi dentro la finestra. */
const SPAZIO_COMANDI = 60;
type Modo = 'fasce' | 'schema';

const accorcia = (t: string, n: number) => t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
const contaNodi = (nodi: NodoGeo[]): number => nodi.reduce((n, x) => n + (x.segnato ? 1 : 0) + contaNodi(x.figli), 0);

const TINTE = ['#2a8f8f', '#5b5fc7', '#9a6a3a', '#8e4f8e', '#5f7380', '#6f7f2f', '#b0503a', '#3a7bb0'];
const tinta = (sem: SemanticaGeo, id: string) => TINTE[Math.max(0, sem.concetti.indexOf(id)) % TINTE.length];
/** Colore di un collegamento: quello del concetto d'arrivo (relazione) o del concetto ripetuto. */
const tintaArco = (sem: SemanticaGeo, a: ArcoConcetto) => tinta(sem, a.tipo === 'relazione' ? a.altro! : a.concetto);
const TIPO_SEGNO = { evidenziato: 'Evidenziato', sottolineato: 'Sottolineato', entrambi: 'Evidenziato e sottolineato' } as const;

/** Quanti collegamenti toccano ogni nodo e, per nodo, ogni concetto: gli indicatori discreti sulle schede. */
function conteggi(archi: ArcoConcetto[]) {
  const nodo = new Map<string, number>(), concetto = new Map<string, number>();
  const piu = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const a of archi) {
    piu(nodo, a.da); piu(nodo, a.a);
    piu(concetto, `${a.da}|${a.concetto}`); piu(concetto, `${a.a}|${a.tipo === 'relazione' ? a.altro! : a.concetto}`);
  }
  return { nodo, concetto };
}
interface Senso { sem: SemanticaGeo; conti: ReturnType<typeof conteggi> }
type Apri = (e: MouseEvent, href: string, id: string) => void;

const Pezzi = ({ n }: { n: NodoGeo }) => <>{n.pezzi.map((p, i) => p.segnato
  ? <span key={i} className={`mg-segno${p.colore ? ` ev-${p.colore}` : ''}${p.linea ? ` li-${p.linea}` : ''}`}>{p.testo}</span>
  : <span key={i} className="mg-attorno">{p.testo}</span>)}</>;

function Chips({ n, senso }: { n: NodoGeo; senso?: Senso }) {
  const chips = senso?.sem.menzioni.get(n.id) ?? [];
  if (!chips.length) return null;
  return <span className="mg-chips">{chips.map((c) => {
    const quanti = senso!.conti.concetto.get(`${n.id}|${c}`) ?? 0;
    return <span key={c} data-concetto={c} className={`mg-chip${quanti ? ' mg-chip-legato' : ''}`} style={quanti ? { '--mg-tinta': tinta(senso!.sem, c) } as CSSProperties : undefined}
      title={quanti ? `${senso!.sem.nomi[c] ?? c}: ${quanti} ${quanti === 1 ? 'collegamento' : 'collegamenti'} in questa lezione` : undefined}>
      {senso!.sem.nomi[c] ?? c}{quanti > 0 && <span className="mg-chip-n" aria-label={`${quanti} collegamenti`}>{quanti}</span>}
    </span>;
  })}</span>;
}

/** Scheda compatta di una parte segnata: inizio del passaggio, colore e tipo, concetti; tutto al passaggio o al primo tocco. */
const Scheda = memo(function Scheda({ n, sezione, apri, senso, intro }: { n: NodoGeo; sezione: SezioneGeo; apri: Apri; senso?: Senso; intro?: number }) {
  const u = n.unita, href = linkTesto(sezione.documento, sezione.sezione, u.blocco, primoSegno(n));
  const { colore, tipo } = aspettoSegno(n);
  const legami = senso?.conti.nodo.get(n.id) ?? 0;
  const testo = n.pezzi.map((p) => p.testo).join('');
  return <a data-nodo={n.id} data-legami={legami} className={`mg-scheda mg-segnato mg-${u.tipo}${intro !== undefined ? ' mg-intro' : ''}`} href={href} onClick={(e) => apri(e, href, n.id)}
    aria-label={`${TIPO_SEGNO[tipo]}, pagina ${u.pagina}: ${accorcia(testo, 160)}${legami ? ` (${legami} ${legami === 1 ? 'collegamento' : 'collegamenti'})` : ''}. Apri nel testo`}>
    <span className="mg-scheda-dentro">
      <span className="mg-scheda-testa">
        <span className={`mg-campione mg-campione-${tipo}${colore ? ` c-${colore}` : ''}`} aria-hidden="true" />
        <span className="mg-tipo">{TIPO_SEGNO[tipo]}</span>
        {intro !== undefined && intro > 0 && <span className="mg-intro-voci" title="Introduce un elenco">elenco · {intro}</span>}
        <span className="mg-scheda-pagina">p. {u.pagina}</span>
      </span>
      <span className="mg-scheda-testo">{u.numero && <b className="mg-numero">{u.numero} </b>}<Pezzi n={n} /></span>
      <Chips n={n} senso={senso} />
    </span>
  </a>;
});

/** Titolo di una fascia (## e sopra) o di un gruppo (### e sotto), o frase che introduce un elenco non segnata. */
function Intestazione({ p, sezione, apri, chiuso, alterna, senso }: { p: Extract<PezzoFascia, { nodo: NodoGeo }>; sezione: SezioneGeo; apri: Apri; chiuso: boolean; alterna: (id: string) => void; senso?: Senso }) {
  const n = p.nodo, u = n.unita, href = linkTesto(sezione.documento, sezione.sezione, u.blocco, primoSegno(n));
  const classe = p.tipo === 'elenco' ? 'mg-sotto-titolo' : u.livello <= 2 ? 'mg-fascia-titolo' : 'mg-gruppo-titolo';
  const legami = senso?.conti.nodo.get(n.id) ?? 0;
  return <div className={`mg-intestazione ${classe}${n.segnato ? ' mg-segnato' : ''}`}>
    <button className="mg-piega" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${p.schede} parti segnate` : 'Nascondi le parti segnate'} onClick={() => alterna(n.id)}>{chiuso ? '+' : '−'}</button>
    <a data-nodo={n.id} data-legami={legami} className="mg-titolo-link" href={href} onClick={(e) => apri(e, href, n.id)} aria-label={`${accorcia(u.testo, 120)}: ${p.schede} ${p.schede === 1 ? 'parte segnata' : 'parti segnate'}. Apri nel testo`}>
      <span className="mg-titolo-testo">{n.segnato ? <Pezzi n={n} /> : accorcia(u.testo, p.tipo === 'elenco' ? 140 : 160)}</span>
    </a>
    <span className="mg-titolo-info" aria-hidden="true">{p.schede}{legami > 0 && <span className="mg-titolo-legami"> · {legami} <Icon n="legami" size={11} /></span>}</span>
  </div>;
}

function Fasce({ pezzi, sezione, apri, chiusi, alterna, senso, livello }: { pezzi: PezzoFascia[]; sezione: SezioneGeo; apri: Apri; chiusi: Set<string>; alterna: (id: string) => void; senso?: Senso; livello: number }) {
  return <>{pezzi.map((p) => {
    if (p.tipo === 'schede') return <div key={p.nodi[0].id} className="mg-schede">{p.nodi.map((n) => <Scheda key={n.id} n={n} sezione={sezione} apri={apri} senso={senso} />)}</div>;
    const chiuso = chiusi.has(p.nodo.id);
    const figli = !chiuso && p.figli.length > 0 && <Fasce pezzi={p.figli} sezione={sezione} apri={apri} chiusi={chiusi} alterna={alterna} senso={senso} livello={livello + 1} />;
    if (p.tipo === 'elenco') {
      if (!p.nodo.segnato) return <div key={p.nodo.id} className="mg-elenco">
        <Intestazione p={p} sezione={sezione} apri={apri} chiuso={chiuso} alterna={alterna} senso={senso} />
        {figli && <div className="mg-sotto">{figli}</div>}
      </div>;
      // Capoverso segnato che introduce un elenco: prima scheda della riga, le voci accanto («i cinque significati» su una riga).
      const [primo, ...resto] = p.figli, voci = !chiuso && primo?.tipo === 'schede' ? primo.nodi : [];
      const dopo = !chiuso && (primo?.tipo === 'schede' ? resto : p.figli);
      return <div key={p.nodo.id} className="mg-elenco">
        <div className="mg-schede mg-schede-intro">
          <Scheda n={p.nodo} sezione={sezione} apri={apri} senso={senso} intro={p.schede} />
          {voci.map((n) => <Scheda key={n.id} n={n} sezione={sezione} apri={apri} senso={senso} />)}
          <button className="mg-piega mg-piega-intro" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${p.schede} voci` : 'Nascondi le voci'} onClick={() => alterna(p.nodo.id)}>{chiuso ? '+' : '−'}</button>
        </div>
        {dopo && dopo.length > 0 && <div className="mg-sotto"><Fasce pezzi={dopo} sezione={sezione} apri={apri} chiusi={chiusi} alterna={alterna} senso={senso} livello={livello + 1} /></div>}
      </div>;
    }
    const fascia = p.nodo.unita.livello <= 2;
    return <section key={p.nodo.id} className={fascia ? 'mg-fascia' : 'mg-gruppo'} data-livello={livello}>
      <Intestazione p={p} sezione={sezione} apri={apri} chiuso={chiuso} alterna={alterna} senso={senso} />
      {figli}
    </section>;
  })}</>;
}

/** Schema rientrato: tutto il testo segnato, una riga per parte, per leggere di seguito. */
const NodoSchema = memo(function NodoSchema({ n, sezione, chiusi, alterna, apri, senso }: { n: NodoGeo; sezione: SezioneGeo; chiusi: Set<string>; alterna: (id: string) => void; apri: Apri; senso?: Senso }) {
  const segno = primoSegno(n), u = n.unita;
  const href = linkTesto(sezione.documento, sezione.sezione, u.blocco, segno);
  const chiuso = chiusi.has(n.id), haFigli = n.figli.length > 0;
  const etichetta = n.segnato ? n.pezzi.map((p) => p.testo).join('') : u.testo;
  return <li><div className="mg-nodo-riga">
    <a data-nodo={n.id} data-legami={senso?.conti.nodo.get(n.id) ?? 0} className={`mg-nodo mg-${u.tipo}${u.tipo === 'titolo' ? ` mg-h${u.livello}` : ''}${n.segnato ? ' mg-segnato' : ' mg-antenato'}`}
      href={href} onClick={(e) => apri(e, href, n.id)}
      aria-label={`${n.segnato ? 'Parte segnata' : 'Contiene parti segnate'}: ${accorcia(etichetta, 160)}. Apri nel testo`}>
      {u.numero && <span className="mg-numero">{u.numero}</span>}
      <span className="mg-testo">{n.segnato ? <Pezzi n={n} /> : accorcia(u.testo, u.tipo === 'titolo' ? 90 : 110)}</span>
      <Chips n={n} senso={senso} />
    </a>
    {haFigli && <button className="mg-piega" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${n.figli.length} sotto-parti` : 'Nascondi le sotto-parti'} onClick={() => alterna(n.id)}>{chiuso ? n.figli.length : '−'}</button>}
  </div>{haFigli && !chiuso && <ul>{n.figli.map((f) => <NodoSchema key={f.id} n={f} sezione={sezione} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</ul>}</li>;
});

interface Geometria { rect: Map<string, Rett>; w: number; h: number }
const LARGHEZZA_NUMERO = 22, ALTEZZA_ETICHETTA = 22;
/** Larghezza stimata dell'etichetta (11 px, senza misurare il testo: niente lavoro a ogni passaggio). */
const larghezzaEtichetta = (t: string) => Math.min(220, Math.round(t.length * 6.2) + 34);
const testoEtichetta = (a: ArcoConcetto, sem: SemanticaGeo) => accorcia(a.tipo === 'relazione' ? a.etichetta ?? 'collegato a' : `torna: ${sem.nomi[a.concetto] ?? a.concetto}`, 30);

/**
 * Collegamenti accesi: frecce curve fra le schede, solo quelle accese (o tutte, a richiesta), con un numero e
 * un'etichetta posati negli spazi liberi. Le posizioni delle schede si misurano una volta per layout (non a ogni passaggio).
 */
function Strato({ archi, sem, visibili, luce, evidenza, geo }: { archi: ArcoConcetto[]; sem: SemanticaGeo; visibili: number[]; luce: ReturnType<typeof accensione>; evidenza: number | null; geo: Geometria | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [posate, setPosate] = useState<{ i: number; d: string; q: Rett | null; pieno: boolean }[]>([]);
  useLayoutEffect(() => {
    if (!geo || !visibili.length) { setPosate([]); return; }
    const el = svgRef.current?.parentElement;
    // La scheda aperta (passaggio o tocco) copre le vicine: le etichette la evitano.
    const ostacoli = [...geo.rect.values()];
    const aperta = el?.querySelector('.mg-scheda.mg-aperta .mg-scheda-dentro, .mg-scheda:hover .mg-scheda-dentro');
    if (aperta && el) { const base = el.getBoundingClientRect(), k = el.offsetWidth ? base.width / el.offsetWidth : 1; ostacoli.push(inLocale(aperta.getBoundingClientRect(), base, k || 1)); }
    const limiti = { l: 2, t: 2, r: geo.w - 2, b: geo.h + 40 };
    const fatte: Rett[] = [], out: typeof posate = [];
    // Prima le accese, poi le altre: le accese prendono i posti migliori.
    const ordine = [...visibili].sort((x, y) => Number(!luce?.archi.has(x)) - Number(!luce?.archi.has(y)) || x - y);
    for (const i of ordine) {
      const a = archi[i], A = geo.rect.get(a.da), B = geo.rect.get(a.a);
      if (!A || !B) continue;
      const c = curvaFra(A, B);
      // Oltre alla curva: gli spazi sopra e sotto le due schede (fra le righe), anche un po' di lato.
      const h = ALTEZZA_ETICHETTA / 2 + 4, extra: [number, number][] = [];
      for (const dx of [0, -0.3, 0.3, -0.6, 0.6]) for (const [R, y] of [[B, B.t - h], [A, A.b + h], [A, A.t - h], [B, B.b + h]] as const) extra.push([(R.l + R.r) / 2 + dx * (R.r - R.l), y]);
      let q = posaEtichetta(c.punto, larghezzaEtichetta(testoEtichetta(a, sem)), ALTEZZA_ETICHETTA, ostacoli, fatte, extra, limiti), pieno = true;
      if (!q) { q = posaEtichetta(c.punto, LARGHEZZA_NUMERO, ALTEZZA_ETICHETTA, ostacoli, fatte, extra, limiti); pieno = false; }
      if (q) fatte.push(q);
      out.push({ i, d: c.d, q, pieno });
    }
    setPosate(out);
  }, [geo, visibili, luce, archi, sem]);
  const usate = [...new Set(posate.map((p) => tintaArco(sem, archi[p.i])))];
  return <>
    <svg ref={svgRef} className={`mg-archi${luce ? ' mg-archi-fuoco' : ''}${evidenza !== null ? ' mg-archi-evidenza' : ''}`} width={geo?.w ?? 0} height={geo?.h ?? 0} data-vie={posate.length} aria-hidden="true">
      {posate.length > 0 && <defs>{usate.map((t) => <marker key={t} id={`mg-punta-${t.slice(1)}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill={t} /></marker>)}</defs>}
      {posate.map(({ i, d }) => {
        const a = archi[i], t = tintaArco(sem, a), on = !luce || luce.archi.has(i);
        return <g key={i} data-arco={i} className={`mg-arco mg-arco-${a.tipo}${on ? '' : ' mg-spento'}${luce && on ? ' mg-acceso' : ''}${evidenza === i ? ' mg-evidenza' : ''}`} style={{ '--mg-tinta': t } as CSSProperties}>
          <path d={d} markerEnd={a.tipo === 'relazione' ? `url(#mg-punta-${t.slice(1)})` : undefined} />
        </g>;
      })}
    </svg>
    {posate.map(({ i, q, pieno }) => {
      if (!q) return null;
      const a = archi[i], on = !luce || luce.archi.has(i);
      return <span key={i} data-arco={i} className={`${pieno ? 'mg-arco-etichetta' : 'mg-arco-numero'}${on ? '' : ' mg-spento'}${evidenza === i ? ' mg-evidenza' : ''}`}
        style={{ left: q.l, top: q.t, width: q.r - q.l, '--mg-tinta': tintaArco(sem, a) } as CSSProperties}>
        <span className="mg-coll-n">{i + 1}</span>{pieno && <span className="mg-etichetta-testo">{testoEtichetta(a, sem)}</span>}
      </span>;
    })}
  </>;
}

/** Elenco leggibile dei collegamenti accesi (o di tutti): «Concetto A → etichetta → Concetto B», con lo stesso numero e colore della freccia. */
function Collegamenti({ archi, sem, elenco, tutti, setTutti, totale, setEvidenza, mostra, fermo, annulla, dentro, accesi }: {
  accesi?: Set<number>; archi: ArcoConcetto[]; sem: SemanticaGeo; elenco: number[]; tutti: boolean; setTutti: (v: boolean) => void; totale: number;
  setEvidenza: (i: number | null) => void; mostra: (i: number) => void; fermo: boolean; annulla: () => void; dentro: (on: boolean) => void;
}) {
  if (!totale) return null;
  return <aside className={`mg-collegamenti${elenco.length ? ' mg-coll-aperto' : ''}`} aria-label="Collegamenti fra concetti" onMouseEnter={() => dentro(true)} onMouseLeave={() => { setEvidenza(null); dentro(false); }}>
    <div className="mg-coll-testa">
      <span className="mg-coll-titolo"><Icon n="legami" size={14} />{elenco.length && !tutti ? `${elenco.length} di ${totale} collegamenti` : `${totale} ${totale === 1 ? 'collegamento' : 'collegamenti'}`}</span>
      {fermo && <button className="btn btn-sm btn-ghost mg-coll-chiudi" onClick={annulla} aria-label="Spegni i collegamenti"><Icon n="x" size={13} /></button>}
      <button className={`btn btn-sm mg-coll-tutti${tutti ? ' mg-attivo' : ''}`} aria-pressed={tutti} aria-label="Mostra tutti i collegamenti" title="Mostra tutti i collegamenti" onClick={() => setTutti(!tutti)}>{tutti ? 'Nascondi' : 'Mostra tutti'}</button>
    </div>
    {elenco.length > 0
      ? <ol className="mg-coll-lista">{elenco.map((i) => {
        const a = archi[i];
        return <li key={i}><button className={`mg-coll-voce${accesi && !accesi.has(i) ? ' mg-coll-spento' : ''}`} data-arco={i} style={{ '--mg-tinta': tintaArco(sem, a) } as CSSProperties}
          onMouseEnter={() => setEvidenza(i)} onMouseLeave={() => setEvidenza(null)} onFocus={() => setEvidenza(i)} onBlur={() => setEvidenza(null)} onClick={() => mostra(i)}>
          <span className="mg-coll-n">{i + 1}</span>
          {a.tipo === 'relazione'
            ? <span><b>{sem.nomi[a.concetto] ?? a.concetto}</b> <span className="mg-coll-verbo">{a.etichetta ?? 'collegato a'} →</span> <b>{sem.nomi[a.altro!] ?? a.altro}</b></span>
            : <span><b>{sem.nomi[a.concetto] ?? a.concetto}</b> <span className="mg-coll-verbo">torna in un altro punto →</span></span>}
        </button></li>;
      })}</ol>
      : <p className="mg-coll-aiuto">Passa su una scheda o su un concetto con il numero per vedere i suoi collegamenti.</p>}
  </aside>;
}

interface Controllo { mostra: (da: string, a: string) => void }
/**
 * Finestra con zoom e trascinamento (lo stesso d3-zoom delle altre mappe) al posto dello scorrimento orizzontale.
 * Si riadatta in larghezza quando cambia la lezione, la forma o lo strato dei concetti; ripiegare un ramo non sposta la vista.
 * Da lontano i titoli si ingrandiscono (solo una trasformazione, a gradini): la struttura resta leggibile.
 */
function Vista({ chiave, compatta, children, piena = false, comandi, controllo }: { chiave: string; compatta: boolean; children: ReactNode; piena?: boolean; comandi?: (adatta: () => void) => ReactNode; controllo?: MutableRefObject<Controllo | null> }) {
  const fin = useRef<HTMLDivElement>(null), tela = useRef<HTMLDivElement>(null);
  const tr = useRef({ x: 0, y: 0, k: 1 }), dim = useRef({ w: 0, h: 0 }), scala = useRef(1);
  const [lar, setLar] = useState(0), [alto, setAlto] = useState(0);
  const inquadrata = useRef('');
  const z = useZoom(fin, (t) => {
    tr.current = { x: t.x, y: t.y, k: t.k };
    if (tela.current) tela.current.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.k})`;
    const f = fin.current; if (!f) return;
    f.setAttribute('data-zoom', String(Math.round(t.k * 100)));
    const s = scalaTitoli(t.k);
    if (s !== scala.current) {
      scala.current = s;
      f.style.setProperty('--mg-s', String(s));
      if (s > 1) f.setAttribute('data-lontano', ''); else f.removeAttribute('data-lontano');
    }
  }, 0.2, { rotella: false });
  const massimo = () => Math.round(window.innerHeight * (compatta ? 0.62 : 0.72));
  const misura = () => { const t = tela.current; if (t) dim.current = { w: t.scrollWidth, h: t.scrollHeight }; return dim.current; };
  const adatta = (modo: 'tutto' | 'larghezza', durata = 0) => {
    const f = fin.current; if (!f) return;
    const sopra = piena ? SPAZIO_COMANDI : 0;
    const q = inquadra(misura(), { w: f.clientWidth, h: f.clientHeight - sopra }, modo, 12, 0.3);
    z.imposta(q.x, q.y + sopra, q.k, durata);
  };
  if (controllo) controllo.current = {
    // Porta in vista i due capi di un collegamento (senza ingrandire oltre lo zoom attuale).
    mostra: (da, a) => {
      const f = fin.current, t = tela.current; if (!f || !t) return;
      const base = t.getBoundingClientRect(), k = tr.current.k;
      const r = [da, a].map((id) => t.querySelector(`[data-nodo="${CSS.escape(id)}"]`)).filter((x): x is Element => !!x).map((x) => inLocale(x.getBoundingClientRect(), base, k));
      if (!r.length) return;
      const l = Math.min(...r.map((x) => x.l)), tp = Math.min(...r.map((x) => x.t)), rr = Math.max(...r.map((x) => x.r)), b = Math.max(...r.map((x) => x.b));
      const sopra = piena ? SPAZIO_COMANDI : 0, fw = f.clientWidth, fh = f.clientHeight - sopra;
      const nk = Math.max(0.3, Math.min(k, (fw - 40) / Math.max(1, rr - l), (fh - 40) / Math.max(1, b - tp)));
      z.imposta(fw / 2 - (l + rr) / 2 * nk, sopra + fh / 2 - (tp + b) / 2 * nk, nk, 350);
    },
  };
  useLayoutEffect(() => {
    const f = fin.current; if (!f) return;
    const ro = new ResizeObserver(() => setLar(f.clientWidth)); ro.observe(f); setLar(f.clientWidth);
    return () => ro.disconnect();
  }, []);
  // Altezza della finestra e inquadratura iniziale; poi segue solo le misure (aprire o chiudere un ramo).
  useLayoutEffect(() => {
    const t = tela.current; if (!t || !lar) return;
    const c = misura(), h = piena ? (fin.current?.clientHeight ?? 0) : altezzaVista(c, lar, massimo());
    if (!piena) setAlto(h);
    // Cambiare la larghezza della finestra non toglie lo zoom scelto: si reinquadra solo per una nuova lezione, forma o strato.
    if (inquadrata.current !== chiave) { inquadrata.current = chiave; const sopra = piena ? SPAZIO_COMANDI : 0; const q = inquadra(c, { w: lar, h: h - sopra }, 'larghezza'); z.imposta(q.x, q.y + sopra, q.k); }
    if (piena) return;
    let attesa = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(attesa); attesa = requestAnimationFrame(() => { const m = misura(); setAlto(altezzaVista(m, fin.current?.clientWidth ?? lar, massimo())); }); });
    ro.observe(t); for (const x of t.children) ro.observe(x);
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
  // Doppio clic sullo sfondo: tutta la mappa in una volta (sulle schede il clic apre il testo).
  const tutto = (e: MouseEvent) => { if (!(e.target as Element).closest('.mg-nodo, .mg-scheda, .mg-titolo-link, .mg-piega')) adatta('tutto', 350); };
  return <>{comandi?.(() => adatta('tutto', 350))}<div ref={fin} className="mg-finestra" style={alto && !piena ? { height: alto } : undefined} tabIndex={0} role="group"
    aria-label="Mappa interattiva: trascina per spostarti, pizzica o usa Ctrl/⌘ e la rotella per lo zoom, doppio clic per vederla tutta"
    onPointerDown={(e) => { if (document.activeElement !== e.currentTarget && !(e.target as Element).closest('a, button')) e.currentTarget.focus({ preventScroll: true }); }} onDoubleClick={tutto}>
    <div ref={tela} className="mg-tela" style={lar ? { width: lar } : undefined}>{children}</div>
  </div></>;
}

const visibile = (nodi: NodoGeo[], id: string, chiusi: Set<string>): boolean => nodi.some((n) => n.id === id || (!chiusi.has(n.id) && visibile(n.figli, id, chiusi)));
const stessoFuoco = (a: FuocoGeo, b: FuocoGeo) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Una lezione: disegno (fasce o schema), collegamenti accesi al passaggio, elenco dei collegamenti.
 * Il passaggio del mouse cambia solo lo strato delle frecce e alcune classi: le schede non si ridisegnano.
 */
function Lezione({ s, modo, chiusi, alterna, onApri, significato, piena, compatta, chiave, comandi, piede }: {
  s: SezioneGeo; modo: Modo; chiusi: Set<string>; alterna: (id: string) => void; onApri: (href: string) => void; significato: boolean;
  piena: boolean; compatta: boolean; chiave: string; comandi?: (adatta: () => void) => ReactNode; piede?: ReactNode;
}) {
  const sem = s.semantica;
  const [fuoco, setFuoco] = useState<FuocoGeo>(null), [fisso, setFisso] = useState<FuocoGeo>(null);
  const [tutti, setTutti] = useState(false), [evidenza, setEvidenza] = useState<number | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [geo, setGeo] = useState<Geometria | null>(null);
  const radice = useRef<HTMLDivElement>(null), timer = useRef(0), sopraElenco = useRef(false), controllo = useRef<Controllo | null>(null);
  const apertaRef = useRef(aperta); apertaRef.current = aperta;
  const senso = useMemo(() => significato ? { sem, conti: conteggi(sem.archi) } : undefined, [significato, sem]);
  const archi = significato ? sem.archi : [];
  const presenti = useMemo(() => archi.flatMap((a, i) => visibile(s.radici, a.da, chiusi) && visibile(s.radici, a.a, chiusi) ? [i] : []), [archi, s, chiusi]);
  const attivo = fuoco ?? fisso;
  const luce = useMemo(() => accensione(archi, attivo), [archi, attivo]);
  const visibili = useMemo(() => tutti ? presenti : luce ? presenti.filter((i) => luce.archi.has(i)) : [], [tutti, presenti, luce]);
  const pianifica = useCallback((f: FuocoGeo) => {
    clearTimeout(timer.current);
    if (f) setFuoco((x) => stessoFuoco(x, f) ? x : f);
    // Uscendo da una scheda i collegamenti restano un attimo: il tempo di arrivare all'elenco.
    else timer.current = window.setTimeout(() => { if (!sopraElenco.current) setFuoco(null); }, 300);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Primo tocco su una scheda: si apre e accende i suoi collegamenti; il secondo apre il passaggio. Col mouse il clic apre subito.
  const apri = useCallback<Apri>((e, href, id) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const chip = (e.target as Element).closest('[data-concetto]') as HTMLElement | null;
    if (ultimoTocco() && chip?.classList.contains('mg-chip-legato')) {
      const f = { nodo: id, concetto: chip.dataset.concetto! };
      setFisso((x) => stessoFuoco(x, f) ? null : f); setAperta(id); return;
    }
    if (ultimoTocco() && (e.currentTarget as Element).classList.contains('mg-scheda') && apertaRef.current !== id) { setAperta(id); setFisso({ nodo: id }); return; }
    onApri(href);
  }, [onApri]);
  // Misure delle schede: una volta per layout (lezione, forma, rami aperti, larghezza), mai al passaggio del mouse.
  useLayoutEffect(() => {
    const el = radice.current; if (!el) return;
    let attesa = 0;
    const calcola = () => {
      const base = el.getBoundingClientRect(), k = el.offsetWidth ? base.width / el.offsetWidth : 1;
      const rect = new Map<string, Rett>();
      for (const x of el.querySelectorAll<HTMLElement>('[data-nodo]')) {
        const q = inLocale((x.closest('.mg-scheda') ?? x).getBoundingClientRect(), base, k || 1);
        rect.set(x.dataset.nodo!, q);
      }
      setGeo({ rect, w: el.offsetWidth, h: el.offsetHeight });
    };
    calcola();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(attesa); attesa = requestAnimationFrame(calcola); });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(attesa); };
  }, [s, modo, chiusi, significato]);
  // Evidenza dei nodi senza ridisegnare: solo classi sugli elementi già presenti, tolte all'uscita.
  useEffect(() => {
    const el = radice.current; if (!el || !luce) return;
    const toccati: Element[] = [];
    el.classList.add('mg-in-fuoco');
    for (const id of [luce.centro, ...luce.collegati]) {
      const x = id && el.querySelector(`[data-nodo="${CSS.escape(id)}"]`); if (!x) continue;
      x.classList.add(id === luce.centro ? 'mg-n-centro' : 'mg-n-collegato'); toccati.push(x);
    }
    for (const x of el.querySelectorAll<HTMLElement>('[data-concetto]')) if (luce.concetti.has(x.dataset.concetto!)) { x.classList.add('mg-c-acceso'); toccati.push(x); }
    return () => { el.classList.remove('mg-in-fuoco'); for (const x of toccati) x.classList.remove('mg-n-centro', 'mg-n-collegato', 'mg-c-acceso'); };
  }, [luce]);
  useEffect(() => {
    const el = radice.current, x = aperta && el?.querySelector(`.mg-scheda[data-nodo="${CSS.escape(aperta)}"]`);
    if (!x) return;
    x.classList.add('mg-aperta');
    return () => x.classList.remove('mg-aperta');
  }, [aperta]);
  const annulla = useCallback(() => { setFisso(null); setAperta(null); setFuoco(null); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') annulla(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [annulla]);
  // Passaggio del mouse delegato: un solo gestore, si cambia stato solo quando cambia la scheda o il concetto sotto il puntatore.
  const sopra = (e: MouseEvent) => {
    if (ultimoTocco() || !senso) return;
    const t = e.target as Element, nodo = t.closest('[data-nodo]') as HTMLElement | null;
    if (!nodo) { pianifica(null); return; }
    const chip = t.closest('.mg-chip-legato') as HTMLElement | null, id = nodo.dataset.nodo!;
    pianifica(chip ? { nodo: id, concetto: chip.dataset.concetto! } : nodo.dataset.legami !== '0' ? { nodo: id } : null);
  };
  const sfondo = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-nodo], .mg-piega')) { setFisso(null); setAperta(null); } };
  const contenuto = useMemo(() => modo === 'fasce'
    ? <div className="mg-fasce"><Fasce pezzi={fasceGeometriche(s.radici)} sezione={s} apri={apri} chiusi={chiusi} alterna={alterna} senso={senso} livello={0} /></div>
    : <ul className="mg-schema">{s.radici.map((n) => <NodoSchema key={n.id} n={n} sezione={s} chiusi={chiusi} alterna={alterna} apri={apri} senso={senso} />)}</ul>,
  [modo, s, apri, chiusi, alterna, senso]);
  const elenco = tutti ? presenti : luce ? presenti.filter((i) => luce.archi.has(i)) : [];
  const pannello = <Collegamenti accesi={tutti ? luce?.archi : undefined} archi={archi} sem={sem} elenco={elenco} tutti={tutti} setTutti={setTutti} totale={presenti.length} setEvidenza={setEvidenza}
    fermo={!!fisso} annulla={annulla} dentro={(on) => { sopraElenco.current = on; if (on) clearTimeout(timer.current); else pianifica(null); }}
    mostra={(i) => { controllo.current?.mostra(archi[i].da, archi[i].a); if (!fisso) setFisso(attivo ?? { arco: i }); }} />;
  return <article className="mg-lezione" data-archi={presenti.length} data-scartati={sem.scartati.relazioni + sem.scartati.ripetizioni}>
    {piede}
    <Vista piena={piena} comandi={comandi} chiave={chiave} compatta={compatta} controllo={controllo}>
      <div ref={radice} className={`mg-disegno mg-disegno-${modo}`} onMouseOver={sopra} onMouseLeave={() => pianifica(null)} onClick={sfondo}>
        {contenuto}
        {archi.length > 0 && <Strato archi={archi} sem={sem} visibili={visibili} luce={luce} evidenza={evidenza} geo={geo} />}
      </div>
    </Vista>
    {pannello}
  </article>;
}

function MappaGeometrica({ sezioni, compatta = false, sezioneIniziale, onApri, totale, nonCollegati = 0, pagina = false }: Props) {
  const compact = useCompact();
  // Sul computer la pagina Mappa personale è una finestra come Per unità e Collegamenti: comandi a icone dentro la mappa.
  const piena = pagina && !compatta && !compact;
  const [toolsOpen, setToolsOpen] = useState(false);
  // la lezione aperta nel lettore all'apertura del pannello (poi resta quella, anche se il lettore cambia sezione)
  const [inizio] = useState(sezioneIniziale);
  const iniziale = inizio && sezioni.some((s) => s.chiave === inizio) ? inizio : '';
  const prima = iniziale || sezioni[0]?.chiave || '';
  // la lezione scelta dall'elenco; finché non se ne sceglie una (o se sparisce) vale `prima`, che si assesta mentre
  // le lezioni arrivano: la mappa disegna le prime prima di aver calcolato le altre
  const [voluta, setScelta] = useState<string | null>(null);
  const scelta = voluta && sezioni.some((s) => s.chiave === voluta) ? voluta : prima;
  const [modo, setModo] = useState<Modo>('fasce');
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const [significato, setSignificato] = useState(true);
  // Una lezione alla volta: se quella scelta non c'è (ancora), si parte da quella aperta nel lettore o dalla prima.
  const visibili = useMemo(() => sezioni.filter((s) => s.chiave === scelta), [sezioni, scelta]);
  const documenti = useMemo(() => [...new Map(sezioni.map((s) => [s.documento, s.docTitolo]))], [sezioni]);
  const alterna = useCallback((id: string) => setChiusi((c) => { const s = new Set(c); if (s.has(id)) s.delete(id); else s.add(id); return s; }), []);
  const parti = sezioni.reduce((n, s) => n + s.segnati, 0);

  const chooser = <select className="select" aria-label="Scegli la lezione" value={scelta} onChange={(e) => { setScelta(e.target.value); setChiusi(new Set()); }}>
        {documenti.map(([doc, titolo]) => <optgroup key={doc} label={titolo}>{sezioni.filter((s) => s.documento === doc).map((s) => <option key={s.chiave} value={s.chiave}>{accorcia(s.titolo, 70)} · {s.segnati}</option>)}</optgroup>)}
      </select>;
  const toolbar = <div className="mg-barra">
      {chooser}
      <div className="mg-vista" aria-label="Forma della mappa">
        <button className={`btn btn-sm ${modo === 'fasce' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'fasce'} onClick={() => setModo('fasce')}>Schede</button>
        <button className={`btn btn-sm ${modo === 'schema' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'schema'} onClick={() => setModo('schema')}>Schema</button>
      </div>
      <button className={`btn btn-sm ${significato ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={significato} onClick={() => setSignificato((x) => !x)} title="Concetti del glossario nominati dai passaggi e loro collegamenti">Concetti collegati</button>
      <div className="mg-azioni">
        <button className="btn btn-sm btn-ghost" disabled={!chiusi.size} onClick={() => setChiusi(new Set())} title="Riapre le parti ripiegate">Apri tutto</button>
      </div>
    </div>;
  const comandi = (adatta: () => void) => <div className="map-tools mg-strumenti">
      {chooser}
      <div className="mg-vista mg-gruppo-btn" role="group" aria-label="Forma della mappa">
        <button className={`btn btn-sm ${modo === 'fasce' ? 'mg-attivo' : ''}`} aria-pressed={modo === 'fasce'} aria-label="Schede" title="Schede: titoli in verticale, parti segnate in riga" onClick={() => setModo('fasce')}><Icon n="fasce" size={17} /></button>
        <button className={`btn btn-sm ${modo === 'schema' ? 'mg-attivo' : ''}`} aria-pressed={modo === 'schema'} aria-label="Schema" title="Schema: tutto il testo segnato, rientrato" onClick={() => setModo('schema')}><Icon n="schema" size={17} /></button>
      </div>
      <button className={`btn btn-sm ${significato ? 'mg-attivo' : ''}`} aria-pressed={significato} aria-label="Concetti collegati" onClick={() => setSignificato((x) => !x)} title="Concetti collegati: i concetti del glossario nominati dai passaggi e i loro legami"><Icon n="legami" size={17} /></button>
      <button className="btn btn-sm" disabled={!chiusi.size} onClick={() => setChiusi(new Set())} aria-label="Apri tutto" title="Apri tutto: riapre le parti ripiegate"><Icon n="rami" size={17} /></button>
      <button className="btn btn-sm" onClick={adatta} aria-label="Adatta" title="Vista d'insieme (anche con doppio clic sullo sfondo)"><Icon n="espandi" size={15} /></button>
    </div>;
  if (!sezioni.length) return <section className={`mappa-geo${piena ? ' mg-pagina' : ''}`}><div className="mg-vuota"><Icon n="mappa" size={26} /><p className="muted small">Evidenzia o sottolinea un passaggio negli Originali: qui comparirà nella forma del testo, con i titoli e gli elenchi che lo contengono.</p></div></section>;
  const info = (s: SezioneGeo) => `${documenti.length > 1 ? `${accorcia(s.docTitolo, 34)} · ` : ''}pp. ${s.da}${s.a !== s.da ? `–${s.a}` : ''} · ${s.segnati} ${s.segnati === 1 ? 'parte segnata' : 'parti segnate'}`;
  if (piena) return <section className="mappa-geo mg-pagina" aria-label="Mappa personale nella struttura del testo">
    {visibili.map((s) => <Lezione key={s.chiave} s={s} modo={modo} chiusi={chiusi} alterna={alterna} onApri={onApri} significato={significato} piena compatta={false} comandi={comandi}
      chiave={`${s.chiave}|${modo}|${significato ? 1 : 0}`}
      piede={<footer className="map-legend mg-piede tiny" role="status">
        <span>{info(s)}</span>
        <span className="faint">{parti} {parti === 1 ? 'parte segnata' : 'parti segnate'} in {sezioni.length} {sezioni.length === 1 ? 'lezione' : 'lezioni'}{totale !== undefined ? ` · ${totale} segni` : ''}{nonCollegati > 0 ? ` · ${nonCollegati} solo nell’elenco` : ''}</span>
      </footer>} />)}
  </section>;
  return <section className={`mappa-geo${compatta ? ' mg-compatta' : ''}`} aria-label="Mappa personale nella struttura del testo">
    {compact ? <>
      <div className="mobile-geo-toolbar">{chooser}<button className="mobile-icon" aria-label="Visualizza mappa personale" onClick={() => setToolsOpen(true)}><Icon n="filtri" size={20} /></button></div>
      <MobileSheet open={toolsOpen} onClose={() => setToolsOpen(false)} title="Mappa personale" className="mobile-geo-sheet" modal={!inDemo()}>{toolbar}<button className="btn btn-primary mobile-map-done" onClick={() => setToolsOpen(false)}>Torna alla mappa</button></MobileSheet>
    </> : toolbar}
    <div className="mg-corpo">
      {visibili.map((s) => <Lezione key={s.chiave} s={s} modo={modo} chiusi={chiusi} alterna={alterna} onApri={onApri} significato={significato} piena={false} compatta={compatta}
        chiave={`${modo}|${significato ? 1 : 0}`}
        piede={<div className="mg-lezione-testa">
          <span className="mg-lezione-titolo">{s.titolo}</span>
          <span className="tiny faint">{info(s)}</span>
        </div>} />)}
    </div>
    <footer className="mg-footer tiny faint" role="status">
      {parti} {parti === 1 ? 'parte segnata' : 'parti segnate'} in {sezioni.length} {sezioni.length === 1 ? 'lezione' : 'lezioni'}{totale !== undefined ? ` · ${totale} segni` : ''}
      {nonCollegati > 0 && ` · ${nonCollegati} ${nonCollegati === 1 ? 'segno resta' : 'segni restano'} solo nell’elenco (dal PDF o da verificare)`}
      {visibili[0] && ` · ${contaNodi(visibili[0].radici)} in questa lezione`}
    </footer>
  </section>;
}

export default memo(MappaGeometrica);
