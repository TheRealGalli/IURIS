import { useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { norm, useCorso } from '../lib/data';
import { href, vai } from '../lib/router';
import { livello, padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { TIPI_CONCETTO, TIPO_SINGOLARE, VERBO_RELAZIONE, type NodoMappa, type TipoConcetto } from '../lib/types';
import { Icon, LivelloDot } from '../components/ui';
import MapTools from '../components/MapTools';
import MobileSheet, { useCompact } from '../components/MobileSheet';
import { inDemo } from '../lib/archivio';
import { useZoom } from '../lib/zoom';
import { graphLabelLines, graphNodeRadius, graphTextWidth, GRAPH_LABEL_LINE } from '../lib/graph-geometry.mjs';
import { placeGraphLabels } from '../lib/graph-labels.mjs';
import MappaPersonaleView from './MappaPersonale';
import { domandeNodiMappa, livelloNodo } from '../lib/mappa-livelli';

export default function Mappa({ query }: { query: URLSearchParams }) {
  const idx = useCorso();
  const compact = useCompact();
  const grafo = query.get('grafo') === '1';
  const personale = query.get('personale') === '1';
  const uid = query.get('u') ?? idx.corso.unita[0]?.id;
  const sel = query.get('c');
  const [ultimaUnita, setUltimaUnita] = useState(uid);
  useEffect(() => { if (query.get('u')) setUltimaUnita(uid); }, [uid]);
  const unitaMobile = query.get('u') ?? ultimaUnita;

  return (
    <div className={`page fade-in map-page${personale ? " map-page-personale" : ""}`} style={{ maxWidth: 1400 }}>
      <div className="row-between map-page-header" style={{ marginBottom: 14 }}>
        <div className="map-page-title">
          <div className="eyebrow">Mappa</div>
          <h1 className="title-l" style={{ marginTop: 4 }}>{personale ? 'Mappa personale' : grafo ? 'La costellazione dei concetti' : 'Mappa mentale'}</h1>
        </div>
        <div className="row map-switch" style={{ gap: 6 }}>
          <a className={`chip ${!grafo && !personale ? 'on' : ''}`} href={href(`/mappa?u=${compact ? unitaMobile : uid}`)} style={{ textDecoration: 'none', padding: '6px 14px' }}>Per unità</a>
          <a className={`chip ${grafo && !personale ? 'on' : ''}`} href={href('/mappa?grafo=1')} style={{ textDecoration: 'none', padding: '6px 14px' }}><span className="map-tab-long">Tutti i collegamenti</span><span className="map-tab-short">Collegamenti</span></a>
          <a className={`chip ${personale ? 'on' : ''}`} href={href('/mappa?personale=1')} style={{ textDecoration: 'none', padding: '6px 14px' }}>Personale</a>
        </div>
      </div>
      {personale ? <MappaPersonaleView /> : grafo ? <Grafo focus={sel} /> : <MindMap uid={compact ? unitaMobile : uid} />}
    </div>
  );
}

/* ───────────────────────── pannello concetto ───────────────────────── */

function PannelloConcetto({ id, onClose, onFocus, foglio = false }: { id: string; onClose: () => void; onFocus?: (id: string) => void; foglio?: boolean }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const c = idx.concettoById.get(id);
  if (!c) return null;
  const m = padronanza(p, idx.domandePerConcetto.get(id));
  const rel = idx.relazioniPerConcetto.get(id) ?? [];
  return (
    <div className={foglio ? 'map-panel-sheet' : 'map-panel fade-in'}>
      {foglio ? <span className="eyebrow">{TIPO_SINGOLARE[c.tipo]}</span> : <div className="row-between">
        <span className="eyebrow">{TIPO_SINGOLARE[c.tipo]}</span>
        <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Chiudi"><Icon n="x" size={16} /></button>
      </div>}
      <h3 className="title-m" style={{ margin: '2px 0 4px' }}>{c.nome}</h3>
      {c.latino && c.latino !== c.nome && <div className="faint small" style={{ fontStyle: 'italic' }}>{c.latino}</div>}
      <p className="muted small">{c.breve}</p>
      <div className="row small" style={{ gap: 6, marginBottom: 10 }}>
        <LivelloDot valore={m.media} viste={m.viste} />
        {m.totali ? `${Math.round((m.valore ?? 0) * 100)}% · ${m.viste}/${m.totali} domande viste` : 'Nessuna domanda collegata'}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <a className="btn btn-sm" href={href(`/concetto/${c.id}`)}>Scheda completa</a>
        {m.totali > 0 && <a className="btn btn-sm" href={href(`/allena?c=${c.id}`)}>Quiz</a>}
      </div>
      {rel.length > 0 && (
        <>
          <hr className="sep" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>Collegamenti</div>
          <div className="rel-list">
            {rel.slice(0, 16).map((r, i) => {
              const altro = r.da === id ? r.a : r.da;
              const ca = idx.concettoById.get(altro);
              if (!ca) return null;
              // frase completa «soggetto – verbo → oggetto», con la voce aperta in grassetto
              const nome = (x: string) => (x === id
                ? (foglio && r.da === id ? null : <b className="rel-io">{idx.concettoById.get(id)?.nome}</b>)
                : <button className="chip" onClick={() => onFocus?.(altro)}>{ca.nome}</button>);
              return (
                <div key={i} className="rel small">
                  {nome(r.da)}
                  <span className="lab">{r.etichetta ?? VERBO_RELAZIONE[r.tipo] ?? r.tipo.replace(/-/g, ' ')}</span>
                  <span className="faint" aria-hidden="true">→</span>
                  {nome(r.a)}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Concetto scelto: una piccola scheda in basso a sinistra; «Dettagli» apre la scheda completa. */
function SchedaConcetto({ id, colore, collegamenti, onDettagli, onClose }: { id: string; colore?: string; collegamenti?: number; onDettagli: () => void; onClose: () => void }) {
  const idx = useCorso();
  const c = idx.concettoById.get(id);
  if (!c) return null;
  return (
    <div className="map-node-card" role="status">
      <button className="map-node-card-main" onClick={onDettagli} aria-label={`Dettagli di ${c.nome}`} aria-haspopup="dialog">
        <span className="dot" style={{ background: colore ?? 'var(--accent)' }} aria-hidden="true" />
        <span className="map-node-card-text">
          <small>{TIPO_SINGOLARE[c.tipo]}{collegamenti ? ` · ${collegamenti} ${collegamenti === 1 ? 'collegamento' : 'collegamenti'}` : ''}</small>
          <b>{c.nome}</b>
        </span>
        <span className="map-node-card-more">Dettagli<Icon n="freccia" size={13} /></span>
      </button>
      <button className="map-node-card-close" onClick={onClose} aria-label="Torna alla mappa" title="Torna alla mappa"><Icon n="x" size={16} /></button>
    </div>
  );
}

/** Dettagli del concetto: pannello laterale sul computer, foglio dal basso su telefono e iPad. */
function DettagliConcetto({ id, aperto, onClose, onFocus }: { id: string; aperto: boolean; onClose: () => void; onFocus: (id: string) => void }) {
  const compact = useCompact();
  const idx = useCorso();
  if (compact) return <MobileSheet open={aperto} onClose={onClose} title={idx.concettoById.get(id)?.nome ?? 'Dettagli'} className="map-detail-sheet" modal={!inDemo()}>
    <PannelloConcetto foglio id={id} onClose={onClose} onFocus={(c) => { onClose(); onFocus(c); }} />
  </MobileSheet>;
  return aperto ? <PannelloConcetto id={id} onClose={onClose} onFocus={onFocus} /> : null;
}

/** Su telefono e iPad le scelte stanno nel foglio degli strumenti, con un'etichetta. */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return useCompact() ? <label className="mobile-field map-field">{label}{children}</label> : <>{children}</>;
}

/** Riquadro della mappa: si attiva al primo tocco (anello grigio), come uno schermo nello schermo. */
const riquadro = {
  tabIndex: 0,
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    if (!e.currentTarget.contains(document.activeElement) && !t.closest('input, select, button, a, textarea, [tabindex]:not(.map-shell)')) e.currentTarget.focus({ preventScroll: true });
  },
};

/** Le mappe SVG scrivono la trasformazione sul gruppo che contiene il disegno. */
function useZoomSvg(svgRef: React.RefObject<SVGSVGElement>, gRef: React.RefObject<SVGGElement>, onK?: (k: number) => void, minZoom = 0.15) {
  return useZoom(svgRef, (t) => { gRef.current?.setAttribute('transform', t.toString()); onK?.(t.k); }, minZoom);
}

/* ───────────────────────── mappa mentale per unità ───────────────────────── */

interface NodoK extends NodoMappa { _k: string; figli?: NodoK[] }
const CH = 7.1; // larghezza media di un carattere a 13px

function chiavi(n: NodoMappa, k = '0'): NodoK {
  return { ...n, _k: k, figli: n.figli?.map((f, i) => chiavi(f, `${k}.${i}`)) };
}

function MindMap({ uid }: { uid: string }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const u = idx.unitaById.get(uid) ?? idx.corso.unita[0];
  const radice = useMemo(() => chiavi(u.mappa), [u.id]);
  const totNodi = useMemo(() => { let n = 0; const w = (x: NodoMappa) => { n++; x.figli?.forEach(w); }; w(u.mappa); return n; }, [u.id]);
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [dettaglio, setDettaglio] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { fit } = useZoomSvg(svgRef, gRef);
  const compact = useCompact();

  useEffect(() => {
    // unità grandi: si parte con i rami di 3° livello chiusi
    const s = new Set<string>();
    const w = (n: NodoK, d: number) => { if (d >= (totNodi > 24 ? 2 : 9) && n.figli?.length) s.add(n._k); n.figli?.forEach((f) => w(f, d + 1)); };
    w(radice, 0);
    setChiusi(s); setSel(null); setDettaglio(false);
  }, [u.id]);

  const layout = useMemo(() => {
    const h = hierarchy<NodoK>(radice, (n) => (chiusi.has(n._k) ? undefined : n.figli));
    const dims = (n: NodoK) => {
      const w = Math.min(320, Math.max(n.testo.length, Math.min(n.nota?.length ?? 0, 44) * 0.85) * CH + 28);
      return { w, h: n.nota ? 46 : 32 };
    };
    const colW: number[] = [];
    h.each((d) => { colW[d.depth] = Math.max(colW[d.depth] ?? 0, dims(d.data).w); });
    const xs = colW.reduce<number[]>((acc, w, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + colW[i - 1] + 56); return acc; }, []);
    const t = tree<NodoK>().nodeSize([54, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.25));
    const root = t(h) as HierarchyPointNode<NodoK>;
    const nodi = root.descendants().map((d) => ({ d, x: xs[d.depth], y: d.x, ...dims(d.data) }));
    let minY = Infinity, maxY = -Infinity, maxX = 0;
    for (const n of nodi) { minY = Math.min(minY, n.y - n.h / 2); maxY = Math.max(maxY, n.y + n.h / 2); maxX = Math.max(maxX, n.x + n.w); }
    return { nodi, links: root.links(), bbox: { x: 0, y: minY, w: maxX, h: maxY - minY }, byKey: new Map(nodi.map((n) => [n.d.data._k, n])) };
  }, [radice, chiusi]);

  const latestLayout = useRef(layout); latestLayout.current = layout;

  // si adatta allo schermo solo al cambio di unità (aprire un ramo non sposta la vista)
  useEffect(() => { const t = setTimeout(() => fit(compact ? latestLayout.current.bbox : layout.bbox, 30, 1.1, compact ? .9 : .62), 60); return () => clearTimeout(t); }, [u.id, compact]);

  // Ogni nodo riflette il proprio concetto e i suoi figli, con la stessa logica delle statistiche.
  const domandeNodi = useMemo(() => domandeNodiMappa(radice, idx.domandePerConcetto), [radice, idx]);

  const espandiTutto = () => setChiusi(new Set());
  const chiudiTutto = () => { const s = new Set<string>(); const w = (n: NodoK, d: number) => { if (d >= 1 && n.figli?.length) s.add(n._k); n.figli?.forEach((f) => w(f, d + 1)); }; w(radice, 0); setChiusi(s); };

  const legend = <>
        <span className="row" style={{ gap: 5 }}><span className="dot lv-forte" /> lo sai</span>
        <span className="row" style={{ gap: 5 }}><span className="dot lv-medio" /> così così</span>
        <span className="row" style={{ gap: 5 }}><span className="dot lv-debole" /> da ripassare</span>
        <span className="row faint" style={{ gap: 5 }}><span className="dot lv-ignoto" /> mai verificato</span></>;
  return (
    <div className="map-shell" {...riquadro}>
      <MapTools legend={legend}>
        <Campo label="Unità"><select className="select" aria-label="Scegli l’unità della mappa" value={u.id} onChange={(e) => vai(`/mappa?u=${e.target.value}`)} style={{ maxWidth: compact ? undefined : 360 }}>
          {idx.corso.unita.map((x) => <option key={x.id} value={x.id}>{x.ordine}. {x.titolo}</option>)}
        </select></Campo>
        <button data-tour="apri-mappa" className="btn btn-sm" onClick={espandiTutto}>Apri tutto</button>
        <button className="btn btn-sm" onClick={chiudiTutto}>Chiudi tutto</button>
        <button className="btn btn-sm" onClick={() => fit(layout.bbox, 30, 1.1, 0.3)} aria-label="Adatta"><Icon n="espandi" size={15} /></button>
      </MapTools>
      <svg ref={svgRef}>
        <g ref={gRef}>
          {layout.links.map((l, i) => {
            const s = layout.byKey.get(l.source.data._k)!, t = layout.byKey.get(l.target.data._k)!;
            const x1 = s.x + s.w, y1 = s.y, x2 = t.x, y2 = t.y, mx = (x1 + x2) / 2;
            return <path key={i} className="mm-link" d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} />;
          })}
          {layout.nodi.map(({ d, x, y, w, h }) => {
            const n = d.data;
            const root = d.depth === 0;
            const stato = livelloNodo(p, domandeNodi.get(n)), lv = stato.livello, misurabile = stato.totali > 0;
            const haFigli = !!n.figli?.length;
            const chiuso = chiusi.has(n._k);
            const fill = root ? 'var(--ink)' : misurabile ? `var(--${lv === 'ignoto' ? 'surface' : lv === 'forte' ? 'ok-soft' : lv === 'medio' ? 'mid-soft' : 'bad-soft'})` : 'var(--surface-2)';
            const stroke = root ? 'var(--ink)' : misurabile ? (lv === 'ignoto' ? 'var(--line-2)' : `var(--${lv === 'forte' ? 'ok' : lv === 'medio' ? 'mid' : 'bad'})`) : 'var(--line)';
            return (
              <g key={n._k} className="mm-node" transform={`translate(${x},${y - h / 2})`}
                onClick={() => {
                  if (haFigli) setChiusi((c) => { const s = new Set(c); if (s.has(n._k)) s.delete(n._k); else s.add(n._k); return s; });
                  if (n.concetto && idx.concettoById.has(n.concetto)) { setSel(n.concetto); if (compact) setDettaglio(false); }
                }}>
                <title>{root ? n.testo : misurabile ? `${n.testo}: ${stato.viste} di ${stato.totali} domande collegate già viste` : `${n.testo}: nessuna domanda collegata`}</title>
                <rect width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeDasharray={n.concetto ? undefined : '0'} />
                <text x={14} y={n.nota ? 19 : h / 2 + 4.5} style={{ fill: root ? 'var(--bg)' : undefined, fontWeight: d.depth <= 1 ? 650 : 500 }}>
                  {n.testo.length > 44 ? n.testo.slice(0, 43) + '…' : n.testo}
                </text>
                {n.nota && <text className="nota" x={14} y={36} style={{ fill: root ? 'var(--bg)' : undefined }}>{n.nota.length > 50 ? n.nota.slice(0, 49) + '…' : n.nota}</text>}
                {haFigli && (
                  <g transform={`translate(${w},${h / 2})`}>
                    <circle r={9} fill="var(--surface)" stroke="var(--line-2)" />
                    <text x={0} y={4} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--ink-2)' }}>{chiuso ? n.figli!.length : '−'}</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-legend">{legend}</div>
      {sel && (compact
        ? <>{!dettaglio && <SchedaConcetto id={sel} onDettagli={() => setDettaglio(true)} onClose={() => setSel(null)} />}
            <DettagliConcetto id={sel} aperto={dettaglio} onClose={() => setDettaglio(false)} onFocus={(c) => vai(`/mappa?grafo=1&c=${c}`)} /></>
        : <PannelloConcetto id={sel} onClose={() => setSel(null)} onFocus={(c) => vai(`/mappa?grafo=1&c=${c}`)} />)}
    </div>
  );
}

/* ───────────────────────── grafo globale ───────────────────────── */

interface GN { id: string; nome: string; tipo: TipoConcetto; grado: number; unita: string[]; x: number; y: number; lines: string[]; labelWidth: number }
interface GL { source: GN; target: GN; etichetta?: string }
interface GLayer { ls: GL[]; ns: GN[]; labels: ReturnType<typeof placeGraphLabels> }

const COLORI_TIPO: Partial<Record<TipoConcetto, string>> = {
  persona: '#b8862f', magistratura: '#9a3b2e', organo: '#7d4a8a', gruppo: '#5d7f3a', norma: '#2f6f8f',
  fonte: '#3f7f6f', opera: '#8a6a3a', istituto: '#a0522d', procedura: '#6a5acd', periodo: '#777777', concetto: '#4a4a8a',
};

function Grafo({ focus }: { focus: string | null }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [unita, setUnita] = useState<string>('');
  const [tipo, setTipo] = useState<string>('');
  const [cerca, setCerca] = useState('');
  const [sel, setSel] = useState<string | null>(focus);
  const [dettaglio, setDettaglio] = useState(false);
  const compact = useCompact();
  // Appena c'è una risposta la rete si accende; i colori per tipo restano a un clic.
  const [colora, setColora] = useState<'padronanza' | 'tipo'>(() => (Object.keys(p.carte).length > 0 ? 'padronanza' : 'tipo'));
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  // lo zoom non ridisegna nulla: cambia solo un attributo dell'svg, e il CSS mostra più o meno nomi
  const livZoom = useRef(1);
  const { fit, centra, zoomBy, limitaInsieme } = useZoomSvg(svgRef, gRef, (kk) => {
    const lv = kk >= 0.65 ? 2 : kk >= 0.3 ? 1 : 0;
    if (lv !== livZoom.current) { livZoom.current = lv; svgRef.current?.setAttribute('data-zoom', String(lv)); }
  }, 0.025);

  const { nodi, links, byId, incidenti } = useMemo(() => {
    const grado = new Map<string, number>();
    for (const r of idx.corso.relazioni) { grado.set(r.da, (grado.get(r.da) ?? 0) + 1); grado.set(r.a, (grado.get(r.a) ?? 0) + 1); }
    // Anche i filtri usano le posizioni precalcolate, senza simulazioni nel browser.
    // Il reticolo è una riserva per eventuali contenuti privi di coordinate.
    const colonne = Math.max(1, Math.ceil(Math.sqrt(idx.corso.concetti.length) * 1.3));
    const nodi: GN[] = idx.corso.concetti.map((c, i) => {
      const [x, y] = idx.corso.grafo?.[c.id] ?? [(i % colonne) * 280, Math.floor(i / colonne) * 180];
      const lines = graphLabelLines(c.nome);
      return { id: c.id, nome: c.nome, tipo: c.tipo, grado: grado.get(c.id) ?? 0, unita: c.unita, x, y, lines,
        labelWidth: Math.max(...lines.map((line) => graphTextWidth(line))) };
    }).filter((c) => (!unita || c.unita.includes(unita)) && (!tipo || c.tipo === tipo));
    const byId = new Map(nodi.map((n) => [n.id, n]));
    const links: GL[] = idx.corso.relazioni
      .filter((r) => byId.has(r.da) && byId.has(r.a))
      .map((r) => ({ source: byId.get(r.da)!, target: byId.get(r.a)!, etichetta: r.etichetta }));
    const incidenti = new Map<string, GL[]>();
    for (const l of links) {
      for (const id of new Set([l.source.id, l.target.id])) {
        const lista = incidenti.get(id) ?? [];
        lista.push(l); incidenti.set(id, lista);
      }
    }
    return { nodi, links, byId, incidenti };
  }, [idx, unita, tipo]);

  const bbox = useMemo(() => {
    if (!nodi.length) return { x: 0, y: 0, w: 1, h: 1 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodi) {
      x0 = Math.min(x0, n.x - Math.max(n.labelWidth / 2, graphNodeRadius(n.grado)));
      y0 = Math.min(y0, n.y - graphNodeRadius(n.grado));
      x1 = Math.max(x1, n.x + Math.max(n.labelWidth / 2, graphNodeRadius(n.grado)));
      y1 = Math.max(y1, n.y + graphNodeRadius(n.grado) + 12 + n.lines.length * GRAPH_LABEL_LINE);
    }
    return { x: x0 - 40, y: y0 - 40, w: x1 - x0 + 80, h: y1 - y0 + 80 };
  }, [nodi]);

  const vistaLeggibile = () => {
    const f = sel ? byId.get(sel) : null;
    const cx = bbox.x + bbox.w / 2, cy = bbox.y + bbox.h / 2;
    const centro = f ?? [...nodi].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
    if (centro) centra(centro.x, centro.y, 1);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const aggiorna = () => limitaInsieme(bbox);
    aggiorna();
    const observer = new ResizeObserver(aggiorna);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [bbox]);

  useEffect(() => {
    if (sel && !byId.has(sel)) { setSel(null); setDettaglio(false); }
    const t = setTimeout(vistaLeggibile, 40);
    return () => clearTimeout(t);
  }, [nodi]);
  useEffect(() => { setSel(focus); setDettaglio(false); const f = focus ? byId.get(focus) : null; if (f) centra(f.x, f.y, 1); }, [focus]);

  const attivo = sel && byId.has(sel) ? sel : null;
  const seleziona = (id: string) => { if (byId.has(id)) { setSel(id); setDettaglio(false); } };
  const esci = () => { setSel(null); setDettaglio(false); };

  // Il posizionamento delle frasi non dipende da colori, ricerca o zoom.
  // Gli strati già visitati si riutilizzano; la cache è limitata alla vista corrente.
  const cerchi = useMemo(() => nodi.map((n) => {
    const r = graphNodeRadius(n.grado) + 6;
    return { x: n.x - r, y: n.y - r, width: r * 2, height: r * 2 };
  }), [nodi]);
  const strati = useMemo(() => new Map<string, GLayer>(), [nodi, links]);
  const strato = useMemo(() => {
    if (!attivo) return null;
    const pronto = strati.get(attivo);
    if (pronto) return pronto;
    const ls = incidenti.get(attivo) ?? [];
    const ids = new Set([attivo, ...ls.flatMap((l) => [l.source.id, l.target.id])]);
    const ns = [...ids].map((id) => byId.get(id)!);
    const obstacles = [...cerchi, ...ns.map((n) => ({ x: n.x - n.labelWidth / 2 - 8, y: n.y + graphNodeRadius(n.grado), width: n.labelWidth + 16, height: 16 + n.lines.length * GRAPH_LABEL_LINE }))];
    const labels = placeGraphLabels(ls.flatMap((l, i) => l.etichetta ? [{ id: i, text: l.etichetta, source: l.source, target: l.target }] : []), obstacles);
    const nuovo = { ls, ns, labels };
    if (strati.size >= 32) strati.delete(strati.keys().next().value!);
    strati.set(attivo, nuovo);
    return nuovo;
  }, [attivo, strati, incidenti, byId, cerchi]);

  const progressoColori = colora === 'padronanza' ? p : null;
  const livelli = useMemo(() => new Map(nodi.map((n) => {
    if (!progressoColori) return [n.id, 'ignoto'];
    const m = padronanza(progressoColori, idx.domandePerConcetto.get(n.id));
    return [n.id, m.totali ? livello(m.media, m.viste) : 'ignoto'];
  })), [nodi, progressoColori, idx]);

  const risultati = useMemo(() => {
    const q = norm(cerca);
    if (q.length < 2) return [];
    return nodi.filter((n) => norm(n.nome).includes(q)).slice(0, 8);
  }, [cerca, nodi]);

  const colLv: Record<string, string> = { forte: 'var(--ok)', medio: 'var(--mid)', debole: 'var(--bad)', ignoto: 'var(--none)' };
  const raggio = (n: GN) => graphNodeRadius(n.grado);
  const colore = (n: GN) => (colora === 'tipo' ? (COLORI_TIPO[n.tipo] ?? '#888') : colLv[livelli.get(n.id) ?? 'ignoto']);

  // La selezione non ricrea gli elementi della mappa di base.
  const lineeBase = useMemo(() => links.map((l, i) => <line key={i} className="g-link" x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y} />), [links]);
  const nodiBase = useMemo(() => (
    <>
      {nodi.map((n) => (
        <g key={n.id} className="g-node" transform={`translate(${n.x},${n.y})`}
          role="button" tabIndex={0} aria-label={n.nome} data-concept={n.id}>
          <title>{n.nome}</title>
          <circle r={raggio(n)} fill={colore(n)} stroke="var(--surface)" strokeWidth={1.5} />
          <text className={`lbl l${n.grado >= 6 ? 0 : n.grado >= 3 ? 1 : 2}`} textAnchor="middle">
            {n.lines.map((line, i) => <tspan key={i} x={0} y={raggio(n) + 12 + i * GRAPH_LABEL_LINE}>{line}</tspan>)}
          </text>
        </g>
      ))}
    </>
  ), [nodi, colora, livelli]);

  // Strato selezionato: resta fermo anche quando il cursore incontra altri concetti.
  const sopra = useMemo(() => {
    if (!attivo || !strato) return null;
    const { ls, ns, labels } = strato;
    return (
      <g className="g-over">
        {ls.map((l, i) => {
          const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
          const distance = Math.hypot(dx, dy) || 1;
          const end = raggio(l.target) + 5;
          return <line key={i} className="g-link hi" x1={l.source.x} y1={l.source.y}
            x2={l.target.x - dx / distance * end} y2={l.target.y - dy / distance * end} markerEnd="url(#graph-arrow)" />;
        })}
        {labels.map((label) => <line key={`leader${label.id}`} className="g-label-leader" x1={label.anchor.x} y1={label.anchor.y} x2={label.x} y2={label.y} />)}
        {labels.map((label) => <g key={`e${label.id}`} className="g-relation-label">
          <rect x={label.x - label.width / 2} y={label.y - label.height / 2} width={label.width} height={label.height} rx={5} />
          <text textAnchor="middle">{label.lines.map((line, i) => <tspan key={i} x={label.x} y={label.y - label.height / 2 + 17 + i * 14}>{line}</tspan>)}</text>
        </g>)}
        {ns.map((n) => (
          <g key={n.id} className="g-node" data-concept={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={raggio(n)} fill={colore(n)} stroke={n.id === sel ? 'var(--ink)' : 'var(--surface)'} strokeWidth={n.id === sel ? 3 : 1.5} />
            <text textAnchor="middle" style={{ fontWeight: n.id === attivo ? 700 : 500 }}>
              {n.lines.map((line, i) => <tspan key={i} x={0} y={raggio(n) + 12 + i * GRAPH_LABEL_LINE}>{line}</tspan>)}
            </text>
          </g>
        ))}
      </g>
    );
  }, [attivo, strato, colora, livelli]);
  const tipiPresenti = [...new Set(idx.corso.concetti.map((c) => c.tipo))];

  const legend = <>
          <span className="faint">{nodi.length} concetti · {links.length} collegamenti</span>
          {colora === 'padronanza' ? (
            <>
              <span className="row" style={{ gap: 5 }}><span className="dot lv-forte" /> lo sai</span>
              <span className="row" style={{ gap: 5 }}><span className="dot lv-medio" /> così così</span>
              <span className="row" style={{ gap: 5 }}><span className="dot lv-debole" /> da ripassare</span>
            </>
          ) : tipiPresenti.slice(0, 7).map((t) => <span key={t} className="row" style={{ gap: 5 }}><span className="dot" style={{ background: COLORI_TIPO[t] }} /> {TIPI_CONCETTO[t]}</span>)}</>;
  return (
    <div className="map-shell graph-shell" {...riquadro} data-mode={attivo ? 'collegamenti' : 'mappa'} onKeyDown={(e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (cerca) setCerca(''); else esci(); }
    }}>
      <MapTools legend={legend}>
        <div style={{ position: 'relative' }}>
          <input className="input" aria-label="Cerca un concetto" placeholder="Trova un concetto…" value={cerca} onChange={(e) => setCerca(e.target.value)} style={{ width: 210 }} />
          {risultati.length > 0 && (
            <div className="card" style={{ position: 'absolute', top: 44, left: 0, width: 260, padding: 6, zIndex: 5 }}>
              {risultati.map((n) => (
                <button key={n.id} className="palette-item" onClick={() => { seleziona(n.id); centra(n.x, n.y, 1); setCerca(''); }}>{n.nome}</button>
              ))}
            </div>
          )}
        </div>
        <Campo label="Unità"><select className="select" aria-label="Filtra per unità" value={unita} onChange={(e) => setUnita(e.target.value)}>
          <option value="">Tutte le unità</option>
          {idx.corso.unita.map((u) => <option key={u.id} value={u.id}>{u.ordine}. {compact ? u.titolo : u.titolo.slice(0, 40)}</option>)}
        </select></Campo>
        <Campo label="Tipo di concetto"><select className="select" aria-label="Filtra per tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tutti i tipi</option>
          {tipiPresenti.map((t) => <option key={t} value={t}>{TIPI_CONCETTO[t]}</option>)}
        </select></Campo>
        <button className="btn btn-sm" onClick={() => setColora((c) => (c === 'tipo' ? 'padronanza' : 'tipo'))}>Colori: {colora === 'tipo' ? 'per tipo' : 'per padronanza'}</button>
        <button className="btn btn-sm" onClick={() => fit(bbox, 40, 1)} aria-label="Adatta" title="Vista d'insieme"><Icon n="espandi" size={15} />{compact && 'Vista d’insieme'}</button>
        <div className="graph-navigation" aria-label="Zoom della mappa">
          <button className="btn btn-sm" onClick={() => zoomBy(1 / 1.35)} aria-label="Riduci zoom">−</button>
          <button className="btn btn-sm" onClick={() => zoomBy(1.35)} aria-label="Aumenta zoom">+</button>
          <button className="btn btn-sm" onClick={vistaLeggibile}>Leggi i nomi</button>
        </div>
      </MapTools>
      {nodi.length === 0 && <div className="graph-empty" role="status">Nessun concetto con questi filtri.</div>}
      <svg ref={svgRef} data-zoom="1" onClick={(e) => {
        const nodo = (e.target as Element).closest<SVGGElement>('[data-concept]');
        if (nodo?.dataset.concept) seleziona(nodo.dataset.concept);
        else if (e.target === svgRef.current) esci();
      }} onKeyDown={(e) => {
        const nodo = (e.target as Element).closest<SVGGElement>('[data-concept]');
        if (nodo?.dataset.concept && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); seleziona(nodo.dataset.concept); }
      }}>
        <defs>
          <marker id="graph-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M0 0L8 4L0 8Z" fill="var(--accent)" />
          </marker>
        </defs>
        <g ref={gRef}>
          <g className={attivo ? 'g-base dim' : 'g-base'}>
            <g className="g-base-links">{lineeBase}</g>
            <g className="g-base-nodes">{nodiBase}</g>
          </g>
          {sopra}
        </g>
      </svg>
      <div className="graph-footer">
        {attivo
          ? !(compact && dettaglio) && <SchedaConcetto id={attivo} colore={colore(byId.get(attivo)!)} collegamenti={strato?.ls.length} onDettagli={() => setDettaglio(true)} onClose={esci} />
          : <div className="graph-mode-bar"><span className="muted">Clicca un punto per esplorare i suoi collegamenti.</span></div>}
        <div className="map-legend">{legend}</div>
      </div>
      {attivo && <DettagliConcetto id={attivo} aperto={dettaglio} onClose={() => setDettaglio(false)} onFocus={(c) => {
        if (!byId.has(c)) { setUnita(''); setTipo(''); }
        setSel(c); setDettaglio(false);
        const f = byId.get(c); if (f) centra(f.x, f.y, 1);
      }} />}
    </div>
  );
}
