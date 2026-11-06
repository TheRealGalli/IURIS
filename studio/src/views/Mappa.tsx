import { useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import 'd3-transition';
import { norm, useCorso } from '../lib/data';
import { href, vai } from '../lib/router';
import { livello, padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { TIPI_CONCETTO, TIPO_SINGOLARE, VERBO_RELAZIONE, type NodoMappa, type TipoConcetto } from '../lib/types';
import { Icon, LivelloDot } from '../components/ui';
import { graphLabelLines, graphNodeRadius, graphTextWidth, GRAPH_LABEL_LINE } from '../lib/graph-geometry.mjs';
import { placeGraphLabels } from '../lib/graph-labels.mjs';

export default function Mappa({ query }: { query: URLSearchParams }) {
  const idx = useCorso();
  const grafo = query.get('grafo') === '1';
  const uid = query.get('u') ?? idx.corso.unita[0]?.id;
  const sel = query.get('c');

  return (
    <div className="page fade-in" style={{ maxWidth: 1400 }}>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <div className="eyebrow">Mappa</div>
          <h1 className="title-l" style={{ marginTop: 4 }}>{grafo ? 'La costellazione dei concetti' : 'Mappa mentale'}</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <a className={`chip ${!grafo ? 'on' : ''}`} href={href(`/mappa?u=${uid}`)} style={{ textDecoration: 'none', padding: '6px 14px' }}>Per unità</a>
          <a className={`chip ${grafo ? 'on' : ''}`} href={href('/mappa?grafo=1')} style={{ textDecoration: 'none', padding: '6px 14px' }}>Tutti i collegamenti</a>
        </div>
      </div>
      {grafo ? <Grafo focus={sel} /> : <MindMap uid={uid} />}
    </div>
  );
}

/* ───────────────────────── pannello concetto ───────────────────────── */

function PannelloConcetto({ id, onClose, onFocus }: { id: string; onClose: () => void; onFocus?: (id: string) => void }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const c = idx.concettoById.get(id);
  if (!c) return null;
  const m = padronanza(p, idx.domandePerConcetto.get(id));
  const rel = idx.relazioniPerConcetto.get(id) ?? [];
  return (
    <div className="map-panel fade-in">
      <div className="row-between">
        <span className="eyebrow">{TIPO_SINGOLARE[c.tipo]}</span>
        <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Chiudi"><Icon n="x" size={16} /></button>
      </div>
      <h3 className="title-m" style={{ margin: '2px 0 4px' }}>{c.nome}</h3>
      {c.latino && c.latino !== c.nome && <div className="faint small" style={{ fontStyle: 'italic' }}>{c.latino}</div>}
      <p className="muted small">{c.breve}</p>
      <div className="row small" style={{ gap: 6, marginBottom: 10 }}>
        <LivelloDot valore={m.valore} viste={m.viste} />
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
                ? <b className="rel-io">{idx.concettoById.get(id)?.nome}</b>
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

function useZoom(svgRef: React.RefObject<SVGSVGElement>, gRef: React.RefObject<SVGGElement>, onK?: (k: number) => void, minZoom = 0.15) {
  const zRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const surface = select(svgRef.current);
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([minZoom, 4]).on('zoom', (e) => {
      gRef.current?.setAttribute('transform', e.transform.toString());
      onK?.(e.transform.k);
    });
    surface.call(z).on('dblclick.zoom', null);
    zRef.current = z;
    return () => {
      // Anche cambiando pagina durante un'animazione, non restano timer o gesti sul vecchio SVG.
      surface.interrupt().on('.zoom', null);
      z.on('zoom', null);
      zRef.current = undefined;
    };
  }, []);
  const fit = (bbox: { x: number; y: number; w: number; h: number }, pad = 40, maxK = 1.2, minK = minZoom) => {
    const svg = svgRef.current;
    if (!svg || !zRef.current) return;
    const { width, height } = svg.getBoundingClientRect();
    const k = Math.max(minK, Math.min(maxK, (width - pad * 2) / Math.max(1, bbox.w), (height - pad * 2) / Math.max(1, bbox.h)));
    // se non entra tutto, si parte dall'inizio (sinistra) invece che dal centro
    const tx = bbox.w * k > width - pad * 2 ? pad - bbox.x * k : width / 2 - (bbox.x + bbox.w / 2) * k;
    const t = zoomIdentity.translate(tx, height / 2 - (bbox.y + bbox.h / 2) * k).scale(k);
    select(svg).transition().duration(450).call(zRef.current.transform, t);
  };
  const centra = (x: number, y: number, k = 1.4) => {
    const svg = svgRef.current;
    if (!svg || !zRef.current) return;
    const { width, height } = svg.getBoundingClientRect();
    select(svg).transition().duration(500).call(zRef.current.transform, zoomIdentity.translate(width / 2 - x * k, height / 2 - y * k).scale(k));
  };
  const zoomBy = (factor: number) => {
    if (svgRef.current && zRef.current) select(svgRef.current).transition().duration(180).call(zRef.current.scaleBy, factor);
  };
  const limitaInsieme = (bbox: { w: number; h: number }) => {
    const svg = svgRef.current;
    if (!svg || !zRef.current) return;
    const { width, height } = svg.getBoundingClientRect();
    const minimo = Math.min(1, (width - 80) / Math.max(1, bbox.w), (height - 80) / Math.max(1, bbox.h));
    zRef.current.scaleExtent([Math.max(.005, minimo * .9), 4]);
  };
  return { fit, centra, zoomBy, limitaInsieme };
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
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const { fit } = useZoom(svgRef, gRef);

  useEffect(() => {
    // unità grandi: si parte con i rami di 3° livello chiusi
    const s = new Set<string>();
    const w = (n: NodoK, d: number) => { if (d >= (totNodi > 24 ? 2 : 9) && n.figli?.length) s.add(n._k); n.figli?.forEach((f) => w(f, d + 1)); };
    w(radice, 0);
    setChiusi(s); setSel(null);
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

  // si adatta allo schermo solo al cambio di unità (aprire un ramo non sposta la vista)
  useEffect(() => { const t = setTimeout(() => fit(layout.bbox, 30, 1.1, 0.62), 60); return () => clearTimeout(t); }, [u.id]);

  const colore = (c?: string) => {
    if (!c) return 'ignoto';
    const m = padronanza(p, idx.domandePerConcetto.get(c));
    return m.totali ? livello(m.valore, m.viste) : 'ignoto';
  };

  const espandiTutto = () => setChiusi(new Set());
  const chiudiTutto = () => { const s = new Set<string>(); const w = (n: NodoK, d: number) => { if (d >= 1 && n.figli?.length) s.add(n._k); n.figli?.forEach((f) => w(f, d + 1)); }; w(radice, 0); setChiusi(s); };

  return (
    <div className="map-shell">
      <div className="map-tools">
        <select className="select" value={u.id} onChange={(e) => vai(`/mappa?u=${e.target.value}`)} style={{ maxWidth: 360 }}>
          {idx.corso.unita.map((x) => <option key={x.id} value={x.id}>{x.ordine}. {x.titolo}</option>)}
        </select>
        <button className="btn btn-sm" onClick={espandiTutto}>Apri tutto</button>
        <button className="btn btn-sm" onClick={chiudiTutto}>Chiudi tutto</button>
        <button className="btn btn-sm" onClick={() => fit(layout.bbox, 30, 1.1, 0.3)} aria-label="Adatta"><Icon n="espandi" size={15} /></button>
      </div>
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
            const lv = colore(n.concetto);
            const haFigli = !!n.figli?.length;
            const chiuso = chiusi.has(n._k);
            const fill = root ? 'var(--ink)' : n.concetto ? `var(--${lv === 'ignoto' ? 'surface' : lv === 'forte' ? 'ok-soft' : lv === 'medio' ? 'mid-soft' : 'bad-soft'})` : 'var(--surface-2)';
            const stroke = root ? 'var(--ink)' : n.concetto ? (lv === 'ignoto' ? 'var(--line-2)' : `var(--${lv === 'forte' ? 'ok' : lv === 'medio' ? 'mid' : 'bad'})`) : 'var(--line)';
            return (
              <g key={n._k} className="mm-node" transform={`translate(${x},${y - h / 2})`}
                onClick={() => {
                  if (haFigli) setChiusi((c) => { const s = new Set(c); if (s.has(n._k)) s.delete(n._k); else s.add(n._k); return s; });
                  if (n.concetto && idx.concettoById.has(n.concetto)) setSel(n.concetto);
                }}>
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
      <div className="map-legend">
        <span className="row" style={{ gap: 5 }}><span className="dot lv-forte" /> lo sai</span>
        <span className="row" style={{ gap: 5 }}><span className="dot lv-medio" /> così così</span>
        <span className="row" style={{ gap: 5 }}><span className="dot lv-debole" /> da ripassare</span>
        <span className="row faint" style={{ gap: 5 }}><span className="dot lv-ignoto" /> mai verificato</span>
      </div>
      {sel && <PannelloConcetto id={sel} onClose={() => setSel(null)} onFocus={(c) => vai(`/mappa?grafo=1&c=${c}`)} />}
    </div>
  );
}

/* ───────────────────────── grafo globale ───────────────────────── */

interface GN { id: string; nome: string; tipo: TipoConcetto; grado: number; unita: string[]; x: number; y: number; lines: string[]; labelWidth: number }
interface GL { source: GN; target: GN; etichetta?: string }

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
  const [hover, setHover] = useState<string | null>(null);
  const [colora, setColora] = useState<'padronanza' | 'tipo'>(() => (Object.keys(p.carte).length >= 20 ? 'padronanza' : 'tipo'));
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  // lo zoom non ridisegna nulla: cambia solo un attributo dell'svg, e il CSS mostra più o meno nomi
  const livZoom = useRef(1);
  const { fit, centra, zoomBy, limitaInsieme } = useZoom(svgRef, gRef, (kk) => {
    const lv = kk >= 0.65 ? 2 : kk >= 0.3 ? 1 : 0;
    if (lv !== livZoom.current) { livZoom.current = lv; svgRef.current?.setAttribute('data-zoom', String(lv)); }
  }, 0.025);

  const { nodi, links, byId } = useMemo(() => {
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
    return { nodi, links, byId };
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
    setHover(null);
    if (sel && !byId.has(sel)) setSel(null);
    const t = setTimeout(vistaLeggibile, 40);
    return () => clearTimeout(t);
  }, [nodi]);
  useEffect(() => { setSel(focus); const f = focus ? byId.get(focus) : null; if (f) centra(f.x, f.y, 1); }, [focus]);

  const attivo = hover ?? sel;
  const vicini = useMemo(() => {
    if (!attivo) return null;
    const s = new Set([attivo]);
    for (const l of links) { if (l.source.id === attivo) s.add(l.target.id); if (l.target.id === attivo) s.add(l.source.id); }
    return s;
  }, [attivo, links]);

  const livelli = useMemo(() => new Map(nodi.map((n) => {
    const m = padronanza(p, idx.domandePerConcetto.get(n.id));
    return [n.id, m.totali ? livello(m.valore, m.viste) : 'ignoto'];
  })), [nodi, p]);

  const risultati = useMemo(() => {
    const q = norm(cerca);
    if (q.length < 2) return [];
    return nodi.filter((n) => norm(n.nome).includes(q)).slice(0, 8);
  }, [cerca, nodi]);

  const colLv: Record<string, string> = { forte: 'var(--ok)', medio: 'var(--mid)', debole: 'var(--bad)', ignoto: 'var(--none)' };
  const raggio = (n: GN) => graphNodeRadius(n.grado);
  const colore = (n: GN) => (colora === 'tipo' ? (COLORI_TIPO[n.tipo] ?? '#888') : colLv[livelli.get(n.id) ?? 'ignoto']);

  // strato di base: tutti i nodi e i collegamenti, ridisegnato solo quando cambiano dati, colori o selezione
  const base = useMemo(() => (
    <>
      {links.map((l, i) => <line key={i} className="g-link" x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y} />)}
      {nodi.map((n) => (
        <g key={n.id} className="g-node" transform={`translate(${n.x},${n.y})`}
          role="button" tabIndex={0} aria-label={n.nome}
          onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(n.id); } }}
          onClick={(e) => { e.stopPropagation(); setSel(n.id); }}>
          <title>{n.nome}</title>
          <circle r={raggio(n)} fill={colore(n)} stroke={n.id === sel ? 'var(--ink)' : 'var(--surface)'} strokeWidth={n.id === sel ? 3 : 1.5} />
          <text className={`lbl l${n.grado >= 6 ? 0 : n.grado >= 3 ? 1 : 2}`} textAnchor="middle">
            {n.lines.map((line, i) => <tspan key={i} x={0} y={raggio(n) + 12 + i * GRAPH_LABEL_LINE}>{line}</tspan>)}
          </text>
        </g>
      ))}
    </>
  ), [nodi, links, colora, livelli, sel]);

  // strato sopra: solo il concetto attivo e i suoi vicini, ridisegnato al passaggio del mouse (pochi elementi)
  const sopra = useMemo(() => {
    if (!attivo || !vicini) return null;
    const ls = links.filter((l) => l.source.id === attivo || l.target.id === attivo);
    const ns = nodi.filter((n) => vicini.has(n.id));
    const obstacles = nodi.map((n) => ({ x: n.x - raggio(n) - 6, y: n.y - raggio(n) - 6, width: (raggio(n) + 6) * 2, height: (raggio(n) + 6) * 2 }));
    obstacles.push(...ns.map((n) => ({ x: n.x - n.labelWidth / 2 - 8, y: n.y + raggio(n), width: n.labelWidth + 16, height: 16 + n.lines.length * GRAPH_LABEL_LINE })));
    const labels = placeGraphLabels(ls.flatMap((l, i) => l.etichetta ? [{ id: i, text: l.etichetta, source: l.source, target: l.target }] : []), obstacles);
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
          <g key={n.id} className="g-node" transform={`translate(${n.x},${n.y})`}>
            <circle r={raggio(n)} fill={colore(n)} stroke={n.id === sel ? 'var(--ink)' : 'var(--surface)'} strokeWidth={n.id === sel ? 3 : 1.5} />
            <text textAnchor="middle" style={{ fontWeight: n.id === attivo ? 700 : 500 }}>
              {n.lines.map((line, i) => <tspan key={i} x={0} y={raggio(n) + 12 + i * GRAPH_LABEL_LINE}>{line}</tspan>)}
            </text>
          </g>
        ))}
      </g>
    );
  }, [attivo, vicini, links, nodi, colora, livelli, sel]);
  const tipiPresenti = [...new Set(idx.corso.concetti.map((c) => c.tipo))];

  return (
    <div className="map-shell graph-shell">
      <div className="map-tools">
        <div style={{ position: 'relative' }}>
          <input className="input" placeholder="Trova un concetto…" value={cerca} onChange={(e) => setCerca(e.target.value)} style={{ width: 210 }} />
          {risultati.length > 0 && (
            <div className="card" style={{ position: 'absolute', top: 44, left: 0, width: 260, padding: 6, zIndex: 5 }}>
              {risultati.map((n) => (
                <button key={n.id} className="palette-item" onClick={() => { setSel(n.id); centra(n.x, n.y, 1); setCerca(''); }}>{n.nome}</button>
              ))}
            </div>
          )}
        </div>
        <select className="select" aria-label="Filtra per unità" value={unita} onChange={(e) => setUnita(e.target.value)}>
          <option value="">Tutte le unità</option>
          {idx.corso.unita.map((u) => <option key={u.id} value={u.id}>{u.ordine}. {u.titolo.slice(0, 40)}</option>)}
        </select>
        <select className="select" aria-label="Filtra per tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Tutti i tipi</option>
          {tipiPresenti.map((t) => <option key={t} value={t}>{TIPI_CONCETTO[t]}</option>)}
        </select>
        <button className="btn btn-sm" onClick={() => setColora((c) => (c === 'tipo' ? 'padronanza' : 'tipo'))}>Colori: {colora === 'tipo' ? 'per tipo' : 'per padronanza'}</button>
        <button className="btn btn-sm" onClick={() => fit(bbox, 40, 1)} aria-label="Adatta" title="Vista d'insieme"><Icon n="espandi" size={15} /></button>
        <div className="graph-navigation" aria-label="Zoom della mappa">
          <button className="btn btn-sm" onClick={() => zoomBy(1 / 1.35)} aria-label="Riduci zoom">−</button>
          <button className="btn btn-sm" onClick={() => zoomBy(1.35)} aria-label="Aumenta zoom">+</button>
          <button className="btn btn-sm" onClick={vistaLeggibile}>Leggi i nomi</button>
        </div>
      </div>
      {nodi.length === 0 && <div className="graph-empty" role="status">Nessun concetto con questi filtri.</div>}
      <svg ref={svgRef} data-zoom="1" onClick={(e) => { if (e.target === svgRef.current) setSel(null); }}>
        <defs>
          <marker id="graph-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M0 0L8 4L0 8Z" fill="var(--accent)" />
          </marker>
        </defs>
        <g ref={gRef}>
          <g className={attivo ? 'g-base dim' : 'g-base'}>{base}</g>
          {sopra}
        </g>
      </svg>
      <div className="map-legend">
        <span className="faint">{nodi.length} concetti · {links.length} collegamenti</span>
        {colora === 'padronanza' ? (
          <>
            <span className="row" style={{ gap: 5 }}><span className="dot lv-forte" /> lo sai</span>
            <span className="row" style={{ gap: 5 }}><span className="dot lv-medio" /> così così</span>
            <span className="row" style={{ gap: 5 }}><span className="dot lv-debole" /> da ripassare</span>
          </>
        ) : tipiPresenti.slice(0, 7).map((t) => <span key={t} className="row" style={{ gap: 5 }}><span className="dot" style={{ background: COLORI_TIPO[t] }} /> {TIPI_CONCETTO[t]}</span>)}
      </div>
      {sel && <PannelloConcetto id={sel} onClose={() => { setSel(null); setHover(null); }} onFocus={(c) => { setSel(c); const f = byId.get(c); if (f) centra(f.x, f.y, 1); }} />}
    </div>
  );
}
