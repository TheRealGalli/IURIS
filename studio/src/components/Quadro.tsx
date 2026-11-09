import type { CSSProperties } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import { padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import type { SchemaQuadro, VoceQuadro } from '../lib/types';
import { Bar, LivelloDot } from './ui';
import './Quadro.css';

type Rete = Extract<SchemaQuadro, { tipo: 'rete' }>;
type Piramide = Extract<SchemaQuadro, { tipo: 'piramide' }>;
type Fasce = Extract<SchemaQuadro, { tipo: 'fasce' }>;

/** Vista «Quadro» della Mappa: il programma a colpo d'occhio e gli schemi d'insieme della materia. */
export default function Quadro({ scelto }: { scelto: string | null }) {
  const idx = useCorso();
  const schemi = idx.corso.quadro?.schemi ?? [];
  const attivo = schemi.find((s) => s.id === scelto);
  return (
    <div className="quadro">
      <div className="row quadro-schede" role="tablist" aria-label="Schemi del quadro">
        <a role="tab" aria-selected={!attivo} className={`chip ${!attivo ? 'on' : ''}`} href={href('/mappa?quadro=1')}>Programma</a>
        {schemi.map((s) => <a key={s.id} role="tab" aria-selected={attivo?.id === s.id} className={`chip ${attivo?.id === s.id ? 'on' : ''}`} href={href(`/mappa?quadro=1&s=${s.id}`)}>{s.titolo}</a>)}
      </div>
      {attivo ? (
        <section>
          {attivo.sottotitolo && <p className="muted quadro-sotto">{attivo.sottotitolo}</p>}
          {attivo.tipo === 'rete' && <SchemaRete s={attivo} />}
          {attivo.tipo === 'piramide' && <SchemaPiramide s={attivo} />}
          {attivo.tipo === 'fasce' && <SchemaFasce s={attivo} />}
          {attivo.nota && <p className="faint small" style={{ marginTop: 14 }}>{attivo.nota}</p>}
        </section>
      ) : <Programma />}
    </div>
  );
}

function Voce({ v, className }: { v: VoceQuadro; className?: string }) {
  return v.concetto ? <a className={className} href={href(`/concetto/${v.concetto}`)}>{v.testo}</a> : <span className={className}>{v.testo}</span>;
}

/* ───────── il programma: tutte le unità con i rami principali della loro mappa ───────── */
function Programma() {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  return (
    <>
      <p className="muted quadro-sotto">Tutto il programma in una pagina: ogni riquadro è un'unità, con i suoi argomenti principali. Tocca un'unità per aprirne la mappa.</p>
      <div className="quadro-programma">
        {idx.corso.unita.map((u) => {
          const fatte = u.lezioni.filter((l) => p.lezioni[l.id]?.studiata).length;
          const m = padronanza(p, u.lezioni.flatMap((l) => idx.domandePerLezione.get(l.id) ?? []));
          return (
            <a key={u.id} className="card quadro-unita" href={href(`/mappa?u=${u.id}`)}>
              <div className="quadro-unita-testa">
                <span className="quadro-unita-n">{u.ordine}</span>
                <b>{u.titolo}</b>
                {m.viste > 0 && <LivelloDot valore={m.media} viste={m.viste} />}
              </div>
              <ul>{(u.mappa.figli ?? []).slice(0, 6).map((f, i) => <li key={i}>{f.testo}</li>)}</ul>
              <div className="quadro-unita-piede">
                <Bar value={fatte / Math.max(1, u.lezioni.length)} thin tone="ok" />
                <span className="faint tiny">{fatte}/{u.lezioni.length} lezioni</span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}

/* ───────── rete: organi e rapporti ───────── */
const NW = 236, NH = 64;
function SchemaRete({ s }: { s: Rete }) {
  const nodo = new Map(s.nodi.map((n) => [n.id, n]));
  const H = Math.max(...s.nodi.map((n) => n.y)) + NH / 2 + 24;
  const W = Math.max(...s.nodi.map((n) => n.x)) + NW / 2 + 32;
  const doppio = (a: string, b: string) => s.archi.some((x) => x.da === b && x.a === a);
  return (
    <>
      <div className="quadro-rete-scroll">
        <svg className="quadro-rete" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={s.titolo}>
          <defs>
            <marker id="quadro-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10Z" className="quadro-punta" />
            </marker>
          </defs>
          {s.archi.map((e, i) => {
            const A = nodo.get(e.da), B = nodo.get(e.a);
            if (!A || !B) return null;
            const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
            // due archi opposti tra gli stessi nodi corrono affiancati
            const off = doppio(e.da, e.a) ? 15 : 0;
            const ox = (-dy / len) * off, oy = (dx / len) * off;
            const taglio = Math.min(dx ? (NW / 2 + 6) / Math.abs(dx) : Infinity, dy ? (NH / 2 + 6) / Math.abs(dy) : Infinity);
            const x1 = A.x + dx * taglio + ox, y1 = A.y + dy * taglio + oy;
            const x2 = B.x - dx * taglio + ox, y2 = B.y - dy * taglio + oy;
            // in una coppia verticale le due etichette si sfalsano lungo la linea, ciascuna vicina alla propria partenza
            const t = off && Math.abs(dy) > Math.abs(dx) ? 0.3 : 0.5;
            const lx = x1 + (x2 - x1) * t, ly = y1 + (y2 - y1) * t;
            const w = e.testo.length * 6.4 + 14;
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="quadro-arco" markerEnd="url(#quadro-freccia)" />
                <rect x={lx - w / 2} y={ly - 10} width={w} height={20} rx={6} className="quadro-arco-sfondo" />
                <text x={lx} y={ly + 4} textAnchor="middle" className="quadro-arco-testo">{e.testo}</text>
              </g>
            );
          })}
          {s.nodi.map((n) => {
            const corpo = (
              <g className="quadro-nodo">
                <rect x={n.x - NW / 2} y={n.y - NH / 2} width={NW} height={NH} rx={12} />
                <text x={n.x} y={n.sotto ? n.y - 4 : n.y + 5} textAnchor="middle" className="quadro-nodo-nome">{n.testo}</text>
                {n.sotto && <text x={n.x} y={n.y + 15} textAnchor="middle" className="quadro-nodo-sotto">{n.sotto}</text>}
              </g>
            );
            return n.concetto ? <a key={n.id} href={href(`/concetto/${n.concetto}`)}>{corpo}</a> : <g key={n.id}>{corpo}</g>;
          })}
        </svg>
      </div>
      {s.elenco && (
        <div className="quadro-elenco">
          {s.elenco.map((r, i) => (
            <div key={i} className="quadro-elenco-riga">
              <b>{r.chi}</b>
              <span>{r.fa}</span>
              {r.norma && <span className="faint small">{r.norma}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ───────── piramide: fonti per grado ───────── */
function SchemaPiramide({ s }: { s: Piramide }) {
  return (
    <div className="quadro-piramide-griglia">
      <div className="quadro-piramide">
        {s.livelli.map((l, i) => (
          <div key={i} className="quadro-livello" style={{ '--i': i, '--n': s.livelli.length } as CSSProperties}>
            <div className="quadro-livello-titolo">{l.titolo}</div>
            <div className="quadro-livello-voci">{l.voci.map((v, j) => <Voce key={j} v={v} className="chip" />)}</div>
            {l.nota && <div className="quadro-livello-nota">{l.nota}</div>}
          </div>
        ))}
      </div>
      {s.aLato && (
        <aside className="quadro-lato">
          {s.aLato.map((a, i) => (
            <div key={i} className="card-flat">
              <b>{a.concetto ? <a href={href(`/concetto/${a.concetto}`)}>{a.titolo}</a> : a.titolo}</b>
              <p>{a.testo}</p>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}

/* ───────── fasce: corsie parallele sulla stessa linea del tempo ───────── */
const LARGHEZZA = 1320; // px della linea del tempo: scorre in orizzontale sugli schermi stretti
const anno = (a: number) => (a < 0 ? `${-a} a.C.` : `${a} d.C.`);
function SchemaFasce({ s }: { s: Fasce }) {
  const durata = s.a - s.da;
  const x = (a: number) => ((a - s.da) / durata) * 100;
  const pxAnno = LARGHEZZA / durata;
  const tacche: number[] = [];
  for (let a = Math.ceil(s.da / 100) * 100; a <= s.a; a += 100) tacche.push(a);
  // ogni barra occupa almeno lo spazio della sua etichetta: le righe di una corsia si riempiono senza sovrapporsi
  const righe = (barre: Fasce['corsie'][number]['barre']) => {
    const fine: number[] = [];
    return [...barre].sort((p, q) => p.da - q.da).map((b) => {
      const fineVera = Math.max(b.a, b.da + (b.testo.length * 7 + 26) / pxAnno);
      let r = fine.findIndex((f) => f <= b.da);
      if (r < 0) { r = fine.length; fine.push(fineVera); } else fine[r] = fineVera;
      return { b, r };
    });
  };
  return (
    <div className="quadro-fasce-scroll" tabIndex={0} role="group" aria-label={s.titolo}>
      <div className="quadro-fasce" style={{ width: LARGHEZZA }}>
        <div className="quadro-periodi">
          {s.periodi.map((p, i) => <Voce key={i} v={p} className={`quadro-periodo quadro-periodo-${i % 2}`} />).map((el, i) => (
            <div key={i} className="quadro-periodo-box" style={{ left: `${x(s.periodi[i].da)}%`, width: `${x(s.periodi[i].a) - x(s.periodi[i].da)}%` }} title={`${anno(s.periodi[i].da)} – ${anno(s.periodi[i].a)}`}>{el}</div>
          ))}
        </div>
        <div className="quadro-asse">
          {tacche.map((a) => <span key={a} style={{ left: `${x(a)}%` }}>{a === 0 ? '1' : anno(a)}</span>)}
        </div>
        {s.corsie.map((c) => {
          const posti = righe(c.barre);
          const n = Math.max(...posti.map((p) => p.r)) + 1;
          return (
            <div key={c.titolo} className="quadro-corsia" style={{ height: n * 34 + 30 }}>
              <div className="quadro-corsia-titolo">{c.titolo}</div>
              {tacche.map((a) => <i key={a} className="quadro-griglia" style={{ left: `${x(a)}%` }} />)}
              {posti.map(({ b, r }, i) => (
                <div key={i} className="quadro-barra-box" style={{ left: `${x(b.da)}%`, top: r * 34 + 26, minWidth: `${x(b.a) - x(b.da)}%` }} title={`${anno(b.da)} – ${anno(b.a)}`}>
                  <Voce v={b} className="quadro-barra" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
