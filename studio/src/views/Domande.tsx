// Una domanda, qualunque sia il tipo: mostra, verifica e restituisce un voto FSRS (1–4).
import { useEffect, useMemo, useRef, useState } from 'react';
import { norm, useCorso } from '../lib/data';
import { renderMd } from '../lib/md';
import { href } from '../lib/router';
import type { Voto } from '../lib/srs';
import { ascolta, leggiAdAltaVoce, puntiDetti, puoAscoltare, puoParlare, zitto, type Ascolto } from '../lib/speech';
import type { Domanda } from '../lib/types';
import { TIPI_DOMANDA } from '../lib/types';
import { rifPagine, shuffle } from '../lib/util';
import { Icon } from '../components/ui';

export interface PropsDomanda { q: Domanda; onVoto: (v: Voto) => void; orale?: boolean }

export default function DomandaView({ q, onVoto, orale }: PropsDomanda) {
  return (
    <div className="card qcard fade-in" key={q.id}>
      <div className="row" style={{ gap: 6 }}>
        <span className="chip">{q.inversa ? 'Scheda inversa' : TIPI_DOMANDA[q.tipo]}</span>
        <span className={`chip ${q.livello === 'avanzato' ? 'chip-accent' : q.livello === 'medio' ? 'chip-gold' : ''}`}>{q.livello}</span>
        {q.pagine && <span className="chip faint">{rifPagine(q)}</span>}
      </div>
      {q.tipo === 'flashcard' && <Flashcard q={q} onVoto={onVoto} />}
      {q.tipo === 'multipla' && <Multipla q={q} onVoto={onVoto} />}
      {q.tipo === 'verofalso' && <VeroFalso q={q} onVoto={onVoto} />}
      {q.tipo === 'completa' && <Completa q={q} onVoto={onVoto} />}
      {q.tipo === 'ordina' && <Ordina q={q} onVoto={onVoto} />}
      {q.tipo === 'abbina' && <Abbina q={q} onVoto={onVoto} />}
      {q.tipo === 'aperta' && <Aperta q={q} onVoto={onVoto} orale={orale} />}
    </div>
  );
}

type Q<T extends Domanda['tipo']> = Extract<Domanda, { tipo: T }>;

function useTasti(map: Record<string, () => void>, deps: unknown[]) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const f = map[e.key];
      if (f) { e.preventDefault(); f(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, deps);
}

function Md({ text, className }: { text: string; className?: string }) {
  const idx = useCorso();
  return <div className={`prose ${className ?? ''}`} style={{ fontSize: 15.5 }} dangerouslySetInnerHTML={{ __html: renderMd(text, idx.concettoById) }} />;
}

function Dopo({ q, ok, testo, voto, onVoto, etichetta }: {
  q: Domanda; ok: boolean | null; testo?: string; voto: Voto; onVoto: (v: Voto) => void; etichetta?: string;
}) {
  const idx = useCorso();
  useTasti({ Enter: () => onVoto(voto), ' ': () => onVoto(voto) }, [voto]);
  const concetti = (q.concetti ?? []).map((c) => idx.concettoById.get(c)).filter(Boolean);
  return (
    <>
      <div className={`answer ${ok === true ? 'ok' : ok === false ? 'ko' : ''}`}>
        {etichetta && <b style={{ display: 'block', marginBottom: 4 }}>{etichetta}</b>}
        {testo && <Md text={testo} />}
        {concetti.length > 0 && (
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            {concetti.slice(0, 5).map((c) => <a key={c!.id} className="chip" href={href(`/concetto/${c!.id}`)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{c!.nome}</a>)}
          </div>
        )}
      </div>
      <div className="row-between" style={{ marginTop: 14 }}>
        <a className="btn btn-sm btn-ghost" href={href(`/lezione/${q.lezione}`)} target="_blank" rel="noreferrer"><Icon n="libro" size={15} /> Rivedi la lezione</a>
        <button className="btn btn-primary" onClick={() => onVoto(voto)} autoFocus>Continua <Icon n="freccia" size={16} /></button>
      </div>
    </>
  );
}

export function Voti({ onVoto, suggerito }: { onVoto: (v: Voto) => void; suggerito?: Voto }) {
  useTasti({ '1': () => onVoto(1), '2': () => onVoto(2), '3': () => onVoto(3), '4': () => onVoto(4) }, [onVoto]);
  const V: { v: Voto; t: string; s: string; c: string }[] = [
    { v: 1, t: 'Non la sapevo', s: 'rivedila a breve', c: 'btn-bad' },
    { v: 2, t: 'A fatica', s: 'presto', c: 'btn-mid' },
    { v: 3, t: 'La sapevo', s: 'tra qualche giorno', c: 'btn-ok' },
    { v: 4, t: 'Facile', s: 'più avanti', c: '' },
  ];
  return (
    <div className="grades">
      {V.map((x) => (
        <button key={x.v} className={`btn ${x.c}`} onClick={() => onVoto(x.v)} style={suggerito === x.v ? { outline: '2px solid var(--ink)', outlineOffset: 2 } : undefined}>
          {x.t}<small>{x.v} · {x.s}</small>
        </button>
      ))}
    </div>
  );
}

function Flashcard({ q, onVoto }: { q: Q<'flashcard'>; onVoto: (v: Voto) => void }) {
  const [vista, setVista] = useState(false);
  useTasti({ ' ': () => setVista(true), Enter: () => setVista(true) }, []);
  return (
    <>
      {q.inversa && <div className="eyebrow" style={{ marginTop: 20 }}>Qual è il termine?</div>}
      <div className="qtext">{q.domanda}</div>
      {!vista ? (
        <div className="stack">
          <p className="faint small" style={{ margin: 0 }}>Rispondi a mente (o a voce alta), poi scopri la risposta e valutati con onestà.</p>
          <button className="btn btn-primary btn-lg" onClick={() => setVista(true)} style={{ alignSelf: 'flex-start' }}>Mostra la risposta <kbd className="tiny" style={{ opacity: .6 }}>spazio</kbd></button>
        </div>
      ) : (
        <>
          <div className="answer"><Md text={q.risposta} /></div>
          {q.inversa && <a className="btn btn-sm btn-ghost" href={href(`/concetto/${q.inversa}`)} target="_blank" rel="noreferrer" style={{ marginBottom: 12 }}><Icon n="glossario" size={15} /> Rivedi la voce nel glossario</a>}
          <Voti onVoto={onVoto} />
        </>
      )}
    </>
  );
}

function Multipla({ q, onVoto }: { q: Q<'multipla'>; onVoto: (v: Voto) => void }) {
  const ordine = useMemo(() => shuffle(q.opzioni.map((_, i) => i)), [q.id]);
  const [scelta, setScelta] = useState<number | null>(null);
  const tasti: Record<string, () => void> = {};
  ordine.forEach((o, i) => { tasti[String(i + 1)] = () => scelta == null && setScelta(o); });
  useTasti(tasti, [scelta, ordine]);
  const ok = scelta === q.corretta;
  return (
    <>
      <div className="qtext">{q.domanda}</div>
      <div className="opts">
        {ordine.map((o, i) => {
          const cls = scelta == null ? '' : o === q.corretta ? 'giusta' : o === scelta ? 'sbagliata' : '';
          return (
            <button key={o} className={`opt ${cls}`} disabled={scelta != null} onClick={() => setScelta(o)}>
              <span className="k">{scelta != null && o === q.corretta ? <Icon n="check" size={14} stroke={3} /> : i + 1}</span>
              <span>{q.opzioni[o]}</span>
            </button>
          );
        })}
      </div>
      {scelta != null && <Dopo q={q} ok={ok} etichetta={ok ? 'Esatto.' : `Risposta corretta: ${q.opzioni[q.corretta]}`} testo={q.spiegazione} voto={ok ? 3 : 1} onVoto={onVoto} />}
    </>
  );
}

function VeroFalso({ q, onVoto }: { q: Q<'verofalso'>; onVoto: (v: Voto) => void }) {
  const [scelta, setScelta] = useState<boolean | null>(null);
  useTasti({ v: () => scelta == null && setScelta(true), f: () => scelta == null && setScelta(false) }, [scelta]);
  const ok = scelta === q.vero;
  return (
    <>
      <div className="qtext">{q.affermazione}</div>
      <div className="grid g2">
        {[true, false].map((v) => (
          <button key={String(v)} className={`opt ${scelta == null ? '' : v === q.vero ? 'giusta' : v === scelta ? 'sbagliata' : ''}`}
            disabled={scelta != null} onClick={() => setScelta(v)} style={{ justifyContent: 'center', fontWeight: 600 }}>
            {v ? 'Vero' : 'Falso'} <span className="faint tiny">({v ? 'V' : 'F'})</span>
          </button>
        ))}
      </div>
      {scelta != null && <Dopo q={q} ok={ok} etichetta={ok ? 'Esatto.' : `Era ${q.vero ? 'vero' : 'falso'}.`} testo={q.spiegazione} voto={ok ? 3 : 1} onVoto={onVoto} />}
    </>
  );
}

const pulisci = (s: string) => norm(s).replace(/[.,;:()\-–—\s]/g, '').replace(/^(il|lo|la|i|gli|le|l)(?=[a-z])/, '');
function Completa({ q, onVoto }: { q: Q<'completa'>; onVoto: (v: Voto) => void }) {
  const parti = useMemo(() => q.testo.split(/(\{\{[^}]+\}\})/g), [q.id]);
  const buchi = parti.filter((s) => s.startsWith('{{')).map((s) => s.slice(2, -2).split('|'));
  const [val, setVal] = useState<string[]>(() => buchi.map(() => ''));
  const [fatto, setFatto] = useState(false);
  const esiti = buchi.map((alt, i) => alt.some((a) => pulisci(a) === pulisci(val[i] ?? '')));
  const giuste = esiti.filter(Boolean).length;
  let b = -1;
  return (
    <>
      <div className="qtext" style={{ lineHeight: 2 }}>
        {parti.map((s, i) => {
          if (!s.startsWith('{{')) return <span key={i}>{s}</span>;
          b++;
          const j = b;
          const w = Math.max(5, ...buchi[j].map((a) => a.length)) + 2;
          return (
            <input key={i} className={`cloze-input ${fatto ? (esiti[j] ? 'ok' : 'ko') : ''}`} style={{ width: `${w}ch` }}
              value={val[j]} disabled={fatto} autoFocus={j === 0}
              onChange={(e) => setVal((v) => v.map((x, k) => (k === j ? e.target.value : x)))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !fatto) setFatto(true); }} />
          );
        })}
      </div>
      {!fatto ? (
        <div className="row">
          <button className="btn btn-primary" onClick={() => setFatto(true)}>Verifica</button>
          <button className="btn btn-ghost" onClick={() => { setVal(buchi.map(() => '')); setFatto(true); }}>Non lo so</button>
        </div>
      ) : (
        <Dopo q={q} ok={giuste === buchi.length}
          etichetta={giuste === buchi.length ? 'Tutto giusto.' : `Soluzione: ${buchi.map((a) => a[0]).join(' · ')}`}
          testo={q.spiegazione} voto={giuste === buchi.length ? 3 : giuste > 0 ? 2 : 1} onVoto={onVoto} />
      )}
    </>
  );
}

function Ordina({ q, onVoto }: { q: Q<'ordina'>; onVoto: (v: Voto) => void }) {
  const [lista, setLista] = useState<number[]>(() => {
    let s = shuffle(q.elementi.map((_, i) => i));
    if (s.every((x, i) => x === i)) s = s.reverse();
    return s;
  });
  const [fatto, setFatto] = useState(false);
  const muovi = (i: number, d: number) => setLista((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const giuste = lista.filter((x, i) => x === i).length;
  return (
    <>
      <div className="qtext">{q.consegna}</div>
      <div>
        {lista.map((x, i) => (
          <div key={x} className={`order-item ${fatto ? (x === i ? 'giusta' : 'sbagliata') : ''}`}>
            <span className="n">{i + 1}</span>
            <span>{q.elementi[x]}</span>
            {!fatto ? (
              <span className="mv">
                <button className="btn btn-sm btn-ghost" onClick={() => muovi(i, -1)} disabled={i === 0} aria-label="Su"><Icon n="su" size={15} /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => muovi(i, 1)} disabled={i === lista.length - 1} aria-label="Giù"><Icon n="giu" size={15} /></button>
              </span>
            ) : x !== i && <span className="mv faint tiny">posto giusto: {x + 1}</span>}
          </div>
        ))}
      </div>
      {!fatto ? <button className="btn btn-primary" onClick={() => setFatto(true)}>Verifica l'ordine</button> : (
        <Dopo q={q} ok={giuste === lista.length}
          etichetta={giuste === lista.length ? 'Ordine perfetto.' : `${giuste} su ${lista.length} al posto giusto. Ordine corretto:`}
          testo={(giuste === lista.length ? '' : q.elementi.map((e, i) => `${i + 1}. ${e}`).join('\n') + '\n\n') + (q.spiegazione ?? '')}
          voto={giuste === lista.length ? 3 : giuste >= lista.length / 2 ? 2 : 1} onVoto={onVoto} />
      )}
    </>
  );
}

function Abbina({ q, onVoto }: { q: Q<'abbina'>; onVoto: (v: Voto) => void }) {
  const destra = useMemo(() => shuffle(q.coppie.map((_, i) => i)), [q.id]);
  const [sel, setSel] = useState<number | null>(null);
  const [coppie, setCoppie] = useState<Record<number, number>>({}); // sinistra → destra
  const [fatto, setFatto] = useState(false);
  const usate = new Set(Object.values(coppie));
  const tutte = Object.keys(coppie).length === q.coppie.length;
  const errori = Object.entries(coppie).filter(([s, d]) => Number(s) !== d).length;
  return (
    <>
      <div className="qtext">{q.consegna}</div>
      <p className="faint small" style={{ marginTop: -8 }}>Tocca un elemento a sinistra e poi quello che gli corrisponde a destra.</p>
      <div className="match">
        <div className="match-col">
          {q.coppie.map((c, i) => (
            <button key={i} className={`opt ${sel === i ? 'sel' : ''} ${coppie[i] != null && !fatto ? 'paired' : ''} ${fatto ? (coppie[i] === i ? 'giusta' : 'sbagliata') : ''}`}
              disabled={fatto} onClick={() => { setSel(i); setCoppie((p) => { const n = { ...p }; delete n[i]; return n; }); }}>
              {c[0]}{coppie[i] != null && <span className="faint tiny" style={{ marginLeft: 'auto' }}>→ {q.coppie[coppie[i]][1].slice(0, 28)}</span>}
            </button>
          ))}
        </div>
        <div className="match-col">
          {destra.map((d) => (
            <button key={d} className={`opt ${usate.has(d) ? 'paired' : ''}`} disabled={fatto || sel == null || usate.has(d)}
              onClick={() => { if (sel == null) return; setCoppie((p) => ({ ...p, [sel]: d })); setSel(null); }}>
              {q.coppie[d][1]}
            </button>
          ))}
        </div>
      </div>
      {!fatto ? (
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={!tutte} onClick={() => setFatto(true)}>Verifica</button>
      ) : (
        <Dopo q={q} ok={errori === 0} etichetta={errori === 0 ? 'Tutte giuste.' : `${errori} abbinamenti sbagliati. Quelli corretti:`}
          testo={errori === 0 ? undefined : q.coppie.map((c) => `- **${c[0]}** → ${c[1]}`).join('\n')}
          voto={errori === 0 ? 3 : errori === 1 ? 2 : 1} onVoto={onVoto} />
      )}
    </>
  );
}

function Aperta({ q, onVoto, orale }: { q: Q<'aperta'>; onVoto: (v: Voto) => void; orale?: boolean }) {
  const [testo, setTesto] = useState('');
  const [provv, setProvv] = useState('');
  const [ascolto, setAscolto] = useState<Ascolto | null>(null);
  const [errMic, setErrMic] = useState<string | null>(null);
  const [fase, setFase] = useState<'risposta' | 'confronto'>('risposta');
  const [spunte, setSpunte] = useState<boolean[]>(() => q.punti.map(() => false));
  const testoRef = useRef('');

  useEffect(() => {
    if (orale && puoParlare()) leggiAdAltaVoce(q.domanda);
    return () => { zitto(); };
  }, [q.id]);
  useEffect(() => () => ascolto?.stop(), [ascolto]);

  const startMic = () => {
    setErrMic(null);
    zitto();
    const base = testoRef.current;
    const a = ascolta(
      (fin, pr) => { const t = (base ? base + ' ' : '') + fin; testoRef.current = t; setTesto(t); setProvv(pr); },
      (e) => { setAscolto(null); setProvv(''); if (e) setErrMic(e); },
    );
    setAscolto(a);
  };
  const stopMic = () => { ascolto?.stop(); setAscolto(null); };
  const confronta = () => {
    stopMic();
    setSpunte(puntiDetti(testo, q.punti));
    setFase('confronto');
  };
  const fatti = spunte.filter(Boolean).length;
  const ratio = fatti / q.punti.length;
  const suggerito: Voto = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;

  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="qtext" style={{ flex: 1 }}>{q.domanda}</div>
        {puoParlare() && <button className="btn btn-sm btn-ghost" onClick={() => leggiAdAltaVoce(q.domanda)} aria-label="Leggi la domanda"><Icon n="voce" /></button>}
      </div>
      {fase === 'risposta' ? (
        <div className="stack">
          <p className="faint small" style={{ margin: 0 }}>Rispondi come all'orale: a voce o scrivendo. Poi confronta con la traccia e i punti che la prof. si aspetta.</p>
          {puoAscoltare() && (
            <div className="row">
              {!ascolto
                ? <button className="mic" onClick={startMic}><Icon n="mic" /> {testo ? 'Continua a parlare' : 'Rispondi a voce'}</button>
                : <button className="mic live" onClick={stopMic}><Icon n="mic" /> Sto ascoltando… tocca per fermare</button>}
              {errMic && <span className="small" style={{ color: 'var(--bad)' }}>{errMic}</span>}
            </div>
          )}
          {ascolto || (testo && puoAscoltare()) ? (
            <div className="transcript">{testo || (!provv && <i>Parla pure…</i>)} <i>{provv}</i></div>
          ) : null}
          <textarea className="input" placeholder={puoAscoltare() ? '…oppure scrivi qui la risposta (anche per punti)' : 'Scrivi la risposta (anche per punti)'}
            value={testo} onChange={(e) => { setTesto(e.target.value); testoRef.current = e.target.value; }} />
          <div className="row">
            <button className="btn btn-primary" onClick={confronta}>Confronta con la traccia</button>
            <button className="btn btn-ghost" onClick={() => { setTesto(''); confronta(); }}>Mostrami la risposta</button>
          </div>
        </div>
      ) : (
        <>
          <div className="eyebrow" style={{ margin: '4px 0 8px' }}>Punti da toccare: {fatti}/{q.punti.length} {testo ? '(spuntati in automatico da ciò che hai detto, correggi pure)' : ''}</div>
          <div className="checklist">
            {q.punti.map((pt, i) => (
              <button key={i} className={`check ${spunte[i] ? 'on' : ''}`} onClick={() => setSpunte((s) => s.map((x, k) => (k === i ? !x : x)))}>
                <span className="box">{spunte[i] && <Icon n="check" size={13} stroke={3} />}</span>
                <span>{pt.testo}</span>
              </button>
            ))}
          </div>
          <div className="answer" style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Traccia della risposta</div>
            <Md text={q.traccia} />
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Come è andata? {suggerito === 3 ? 'Hai toccato quasi tutti i punti.' : suggerito === 2 ? 'Mancano alcuni punti.' : 'Mancano molti punti: ripassa la lezione.'}</p>
          <Voti onVoto={onVoto} suggerito={suggerito} />
        </>
      )}
    </>
  );
}
