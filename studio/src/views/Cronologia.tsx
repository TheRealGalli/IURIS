import MobileSheet, { useCompact } from '../components/MobileSheet';
import { inDemo } from '../lib/archivio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import type { Evento } from '../lib/types';
import { fmtAnno, rifPagine, soloMouse } from '../lib/util';
import { Icon } from '../components/ui';
import { disponiEtichette, frequenzaVoci, MAX_VUOTO, puntiScala } from '../lib/cronologia-striscia.mjs';

const TIPI: Record<string, string> = {
  legge: 'Leggi', istituzione: 'Istituzioni', giurisprudenza: 'Giuristi', politica: 'Politica',
  codificazione: 'Codici', opera: 'Opere', altro: 'Altro',
};
// una tinta ben diversa per ogni tipo (definite in styles.css, chiare e scure)
const COLORE_TIPO: Record<string, string> = {
  legge: 'var(--t-legge)', istituzione: 'var(--t-istituzione)', giurisprudenza: 'var(--t-giuristi)', politica: 'var(--t-politica)',
  codificazione: 'var(--t-codice)', opera: 'var(--t-opera)', altro: 'var(--t-altro)',
};
const coloreEv = (e: Evento) => COLORE_TIPO[e.tipo] ?? 'var(--t-altro)';
/** Il colore di un gruppo di eventi correlati: uno solo, oppure spicchi (pallino) o fasce (barra dell'etichetta) */
function tinte(ev: Evento[], forma: 'spicchi' | 'fasce') {
  const c = ev.map(coloreEv);
  if (new Set(c).size === 1) return c[0];
  const passo = 100 / c.length;
  const pezzi = c.map((col, i) => `${col} ${i * passo}% ${(i + 1) * passo}%`).join(', ');
  return forma === 'spicchi' ? `conic-gradient(${pezzi})` : `linear-gradient(to bottom, ${pezzi})`;
}
const COLORI_PERIODO = ['var(--gold-soft)', 'var(--accent-soft)', 'var(--ok-soft)', 'var(--mid-soft)', 'var(--bad-soft)', 'var(--bg-2)'];

// geometria della striscia (px)
const K = 4;                       // pixel per anno
const BORDO = 40;                  // margine a sinistra e a destra (la prima data resta intera)
const ASSE = 30;                   // y dell'asse, sotto le fasce dei periodi
const CORSIA0 = 60;                // y della prima riga di etichette
const CORSIA_H = 42;
const MAX_CORSIE = 6;
const ETICHETTA_W = 168;

/** Funzioni anno → px e px → anno, interpolando fra i punti della scala */
function costruisciScala(A: number[], X: number[], vuoti: number[], etichettaW = ETICHETTA_W, destra = 0) {
  const x = (a: number) => {
    if (A.length < 2 || a <= A[0]) return BORDO;
    for (let i = 1; i < A.length; i++) {
      if (a <= A[i]) return BORDO + X[i - 1] + ((a - A[i - 1]) / (A[i] - A[i - 1])) * (X[i] - X[i - 1]);
    }
    return BORDO + X[X.length - 1];
  };
  const anno = (px: number) => {
    const p = px - BORDO;
    for (let i = 1; i < A.length; i++) {
      if (p <= X[i]) return A[i - 1] + ((p - X[i - 1]) / Math.max(1, X[i] - X[i - 1])) * (A[i] - A[i - 1]);
    }
    return A[A.length - 1] ?? 0;
  };
  return {
    x, anno, inizio: A[0] ?? 0, fine: A[A.length - 1] ?? 0,
    larghezza: Math.max(X[X.length - 1] ?? 0, destra) + 2 * BORDO + etichettaW,
    vuoti: vuoti.map((i) => BORDO + (X[i - 1] + X[i]) / 2),
  };
}

export default function Cronologia({ query }: { query: URLSearchParams }) {
  const compact = useCompact();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Su iPad la linea del tempo è aperta subito; sul telefono resta a un tocco.
  const [lineaAperta, setLineaAperta] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 700);
  // Su touch etichette più strette e al massimo tre righe: la striscia è più bassa e si scorre in orizzontale.
  const maxCorsie = compact ? 3 : MAX_CORSIE, etichettaW = compact ? 148 : ETICHETTA_W;
  const idx = useCorso();
  const [filtro, setFiltro] = useState<string[]>([]);
  const [unita, setUnita] = useState('');
  const evid = query.get('e');
  const [sel, setSel] = useState<string[]>(evid ? [evid] : []);
  const [luce, setLuce] = useState<string | null>(null); // gruppo sotto il mouse: si illuminano etichetta, linea e pallino
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; mosso: boolean } | null>(null);

  const periodi = useMemo(() => idx.corso.eventi.filter((e) => e.tipo === 'periodo' && e.annoFine != null)
    .sort((a, b) => a.anno - b.anno), [idx]);
  const eventi = useMemo(() => idx.corso.eventi
    .filter((e) => e.tipo !== 'periodo')
    .filter((e) => !filtro.length || filtro.includes(e.tipo))
    .filter((e) => !unita || e.unita === unita), [idx, filtro, unita]);
  // la striscia parte dal primo periodo: gli eventi più antichi (i confronti con il Vicino Oriente) restano solo nell'elenco
  const inizioStriscia = periodi[0]?.anno ?? -Infinity;
  const evStriscia = useMemo(() => eventi.filter((e) => e.anno >= inizioStriscia).sort((a, b) => a.anno - b.anno), [eventi, inizioStriscia]);

  // etichette: gli eventi correlati dello stesso anno (stesso fatto, atto citato, voce specifica in comune) ne condividono
  // una; quelli indipendenti hanno ciascuno pallino ed etichetta, su al massimo maxCorsie righe. Dove le date sono troppo
  // fitte la striscia si allarga proprio lì, quanto basta perché ogni etichetta e ogni pallino abbiano il loro posto.
  const freqVoci = useMemo(() => frequenzaVoci(idx.corso.eventi), [idx]);
  const { s, etichette, corsie } = useMemo(() => {
    const { A, X, vuoti } = puntiScala([
      ...idx.corso.eventi.filter((e) => e.tipo !== 'periodo' && e.anno >= inizioStriscia).map((e) => e.anno),
      ...periodi.flatMap((p) => [p.anno, p.annoFine!]),
    ], K, MAX_VUOTO);
    const indice = new Map(A.map((a, i) => [a, i]));
    const disp = disponiEtichette(evStriscia, X, indice, { bordo: BORDO, etichettaW, maxCorsie, freq: freqVoci });
    const destra = Math.max(0, ...disp.etichette.map((g) => g.x - BORDO));
    return {
      s: costruisciScala(A, X, vuoti, etichettaW, destra),
      etichette: disp.etichette.map((g) => ({
        id: g.eventi[0].id, x: g.x, corsia: g.corsia,
        eventi: [...g.eventi].sort((a, b) => a.tipo.localeCompare(b.tipo)),
      })),
      corsie: disp.corsie,
    };
  }, [idx, periodi, inizioStriscia, evStriscia, maxCorsie, etichettaW, freqVoci]);

  const ticks = useMemo(() => {
    const passo = 50;
    const out: { anno: number; x: number }[] = [];
    let ultimo = -Infinity;
    for (let a = Math.ceil(s.inizio / passo) * passo; a <= s.fine; a += passo) {
      const x = s.x(a);
      if (x - ultimo < 72) continue;
      ultimo = x;
      out.push({ anno: a, x });
    }
    return out;
  }, [s]);

  const vaiAnno = (anno: number) => scrollRef.current?.scrollTo({ left: s.x(anno) - 40, behavior: 'smooth' });
  const apri = (ids: string[]) => {
    if (drag.current?.mosso) return;
    setSel(ids);
    document.getElementById(ids[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (!evid) return;
    const e = idx.corso.eventi.find((x) => x.id === evid);
    const t = setTimeout(() => {
      if (e && e.anno >= inizioStriscia) scrollRef.current?.scrollTo({ left: s.x(e.anno) - 120 });
      document.getElementById(evid)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => clearTimeout(t);
  }, [evid]);

  // gruppi per periodo (il periodo che contiene l'anno dell'evento)
  const gruppi = useMemo(() => {
    const out: { periodo: Evento | null; eventi: Evento[] }[] = [];
    for (const e of eventi) {
      const per = periodi.find((p) => e.anno >= p.anno && e.anno <= (p.annoFine ?? p.anno)) ?? null;
      const last = out[out.length - 1];
      if (last && last.periodo?.id === per?.id) last.eventi.push(e);
      else out.push({ periodo: per, eventi: [e] });
    }
    return out;
  }, [eventi, periodi]);

  const tipiPresenti = [...new Set(idx.corso.eventi.map((e) => e.tipo).filter((t) => t !== 'periodo'))];
  const altezza = CORSIA0 + Math.max(1, corsie) * CORSIA_H + 4;

  const timeline = (<>{periodi.length > 0 && <div className="tl-bar">
        {periodi.map((p, i) => (
          <button key={p.id} className="chip" onClick={() => vaiAnno(p.anno)} title={p.data}>
            <span className="dot" style={{ background: COLORI_PERIODO[i % COLORI_PERIODO.length], border: '1px solid var(--line-2)' }} />
            {p.titolo.replace(/\s*\(.*\)/, '')}
          </button>
        ))}
      </div>}

      <div className="tl-wrap" style={{ marginBottom: 14 }}>
        <div
          ref={scrollRef}
          className="tl-scroll"
          onPointerDown={(e) => { if (e.pointerType === 'mouse') drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, mosso: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (Math.abs(e.clientX - d.x) > 4) d.mosso = true;
            if (d.mosso) e.currentTarget.scrollLeft = d.left - (e.clientX - d.x);
          }}
          onPointerUp={() => setTimeout(() => { drag.current = null; })}
          onPointerLeave={() => { drag.current = null; }}
        >
          <div className={`tl-canvas ${luce ? 'focus' : ''}`} style={{ width: s.larghezza, height: altezza }}>
            {periodi.map((p, i) => (
              <a key={p.id} className="tl-band" href={`#${p.id}`} title={`${p.titolo} · ${p.data}`}
                onClick={(e) => { e.preventDefault(); if (!drag.current?.mosso) document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ left: s.x(p.anno), width: s.x(p.annoFine!) - s.x(p.anno), background: COLORI_PERIODO[i % COLORI_PERIODO.length] }}>
                <span>{p.titolo}</span>
              </a>
            ))}
            <div className="tl-axis" style={{ left: BORDO, width: s.x(s.fine) - BORDO }} />
            {ticks.map((t) => (
              <span key={t.anno} className={`tl-tick ${t.anno === 0 ? 'zero' : ''}`} style={{ left: t.x }}>
                <span>{t.anno === 0 ? 'a.C. | d.C.' : fmtAnno(t.anno)}</span>
              </span>
            ))}
            {s.vuoti.map((x) => <span key={x} className="tl-gap" style={{ left: x }} title="Tratto senza eventi, accorciato">≈</span>)}
            {/* prima tutte le linee, poi le etichette: così nessuna linea passa sopra un testo (tranne quella illuminata) */}
            {etichette.map((g) => (
              <i key={g.id} className={`tl-stem ${luce === g.id ? 'hov' : ''}`} style={{ left: g.x, top: ASSE, height: CORSIA0 + g.corsia * CORSIA_H - ASSE }} />
            ))}
            {etichette.map((g) => {
              const ids = g.eventi.map((e) => e.id);
              const e = g.eventi[0];
              const accendi = { onMouseEnter: soloMouse(() => setLuce(g.id)), onMouseLeave: soloMouse(() => setLuce(null)), onFocus: () => setLuce(g.id), onBlur: () => setLuce(null) };
              return (
                <button key={g.id} {...accendi} className={`tl-lab ${luce === g.id ? 'hov' : ''} ${ids.some((id) => sel.includes(id)) ? 'on' : ''}`}
                  style={{ left: g.x - 1, top: CORSIA0 + g.corsia * CORSIA_H, width: etichettaW }}
                  title={g.eventi.map((x) => `${x.data} · ${x.titolo}`).join('\n')} onClick={() => apri(ids)}>
                  <i style={{ background: tinte(g.eventi, 'fasce') }} />
                  <b>{e.data}{g.eventi.length > 1 ? ` · ${g.eventi.length} eventi` : ''}</b>
                  <span>{e.titolo}</span>
                </button>
              );
            })}
            {etichette.map((g) => (
              <button key={g.id} className={`tl-dot ${g.eventi.length > 1 ? 'multi' : ''} ${luce === g.id ? 'hov' : ''} ${g.eventi.some((e) => sel.includes(e.id)) ? 'on' : ''}`}
                style={{ left: g.x, background: tinte(g.eventi, 'spicchi') }}
                onMouseEnter={soloMouse(() => setLuce(g.id))} onMouseLeave={soloMouse(() => setLuce(null))}
                title={g.eventi.map((x) => `${x.data} · ${x.titolo}`).join('\n')} aria-label={g.eventi.map((x) => `${x.data}: ${x.titolo}`).join('; ')}
                onClick={() => apri(g.eventi.map((e) => e.id))} />
            ))}
          </div>
        </div>
      </div></>);
  const filters = (<div className="row" style={{ gap: 6, marginBottom: 6 }}>
        {tipiPresenti.map((t) => (
          <button key={t} className={`chip ${filtro.includes(t) ? 'on' : ''}`} onClick={() => setFiltro((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]))}>
            <span className="dot" style={{ background: COLORE_TIPO[t] ?? 'var(--ink-3)' }} /> {TIPI[t] ?? t}
          </button>
        ))}
        <select className="select" value={unita} onChange={(e) => setUnita(e.target.value)} style={{ marginLeft: 'auto', padding: '5px 32px 5px 10px', fontSize: 13, backgroundPosition: 'right 10px center' }}>
          <option value="">Tutte le unità</option>
          {idx.corso.unita.map((u) => <option key={u.id} value={u.id}>{u.ordine}. {u.titolo.slice(0, 36)}</option>)}
        </select>
      </div>);

  return (
    <div className="page-narrow fade-in">
      <div className="eyebrow">{eventi.length} eventi{periodi.length ? ` · ${periodi.length} periodi` : ''}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 16px' }}>Cronologia</h1>

      {compact ? <details className="mobile-timeline" open={lineaAperta} onToggle={(e) => setLineaAperta(e.currentTarget.open)}><summary><Icon n="cronologia" size={19} /><span>Esplora la linea del tempo<small>Scorri tra le epoche e gli eventi</small></span><Icon n="giu" size={16} /></summary>{timeline}</details> : timeline}
      {compact ? <>
        <div className="mobile-timeline-actions">
          <button className="mobile-glossary-filters mobile-timeline-filter" onClick={() => setFiltersOpen(true)}><Icon n="filtri" size={18} />Filtri{(filtro.length > 0 || unita) && <span className="mobile-current" />}<span className="faint">{eventi.length} eventi</span></button>
          <a className="btn btn-sm" href={href('/allena?modo=cronologia')}><Icon n="allena" size={15} />Sfida cronologica</a>
        </div>
        <MobileSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtra la cronologia" className="mobile-timeline-sheet" modal={!inDemo()}>{filters}<button className="btn btn-primary mobile-map-done" onClick={() => setFiltersOpen(false)}>Mostra {eventi.length} eventi<Icon n="freccia" size={17} /></button></MobileSheet>
      </> : <>{filters}
      <div className="row" style={{ marginBottom: 8 }}>
        <a className="btn btn-sm" href={href('/allena?modo=cronologia')}><Icon n="allena" size={15} /> Allenati con la sfida cronologica</a>
      </div></>}

      <div className="tl-list">
        {gruppi.map((g, gi) => (
          <div key={gi}>
            {g.periodo ? (
              <div className="tl-period" id={g.periodo.id}>
                <span className="chip chip-gold">{g.periodo.data}</span>
                <h3>{g.periodo.titolo}</h3>
              </div>
            ) : periodi.length > 0 && g.eventi[0].anno < inizioStriscia && (
              <div className="tl-period"><h3>Prima di Roma</h3></div>
            )}
            <div className="tl-gruppo">
              {g.eventi.map((e) => (
                <div key={e.id} id={e.id} className="card tl-item" style={sel.includes(e.id) ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)' } : undefined}>
                  <div className="row-between" style={{ alignItems: 'baseline' }}>
                    <span className="tl-year">{e.data}{e.approssimato ? <span className="faint tiny"> · circa</span> : ''}</span>
                    <span className="faint tiny">{TIPI[e.tipo] ?? e.tipo}{e.pagine ? ` · ${rifPagine(e)}` : ''}</span>
                  </div>
                  <div style={{ fontWeight: 650, marginTop: 2 }}>{e.titolo}</div>
                  <div className="muted small">{e.descrizione}</div>
                  {(e.concetti?.length ?? 0) > 0 && (
                    <div className="row" style={{ gap: 5, marginTop: 6 }}>
                      {e.concetti!.map((c) => idx.concettoById.get(c)).filter(Boolean).map((c) => (
                        <a key={c!.id} className="chip" href={href(`/concetto/${c!.id}`)} style={{ textDecoration: 'none' }}>{c!.nome}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
