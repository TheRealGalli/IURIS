import { archivio, inDemo } from '../lib/archivio';
import { useEffect, useMemo, useState } from 'react';
import { useCorso, type Indice } from '../lib/data';
import { href, vai } from '../lib/router';
import { ordinaRipasso, padronanzaDomanda, registraRisposta, ripassoDiOggi, type Voto } from '../lib/srs';
import { DOMANDE_VERIFICA_INIZIALE, useProgresso, type Progresso } from '../lib/store';
import { TIPI_DOMANDA, type Domanda, type TipoDomanda } from '../lib/types';
import { plurale, shuffle } from '../lib/util';
import { Bar, Icon } from '../components/ui';
import MobileSheet, { useCompact } from '../components/MobileSheet';
import DomandaView from './Domande';

type Modo = 'ripasso' | 'libero' | 'deboli' | 'orale' | 'cronologia' | 'inverse';
interface Sessione { titolo: string; domande: Domanda[]; orale?: boolean; registra: boolean }

/* La sessione in corso è salvata nel browser a ogni risposta: se la pagina si ricarica o si chiude, si riprende da lì. */
interface Salvata { origine: string; s: Sessione; coda: Domanda[]; i: number; voti: Voto[]; quando: string }
const chiaveSessione = (slug: string) => `iuris:v1:sessione:${slug}`;
function leggiSalvata(slug: string): Salvata | null {
  try {
    const x = JSON.parse(archivio().getItem(chiaveSessione(slug)) ?? 'null') as Salvata | null;
    // vale solo se non è finita e non è più vecchia di un giorno e mezzo
    if (!x || x.i >= x.coda.length || Date.now() - Date.parse(x.quando) > 36 * 3600e3) return null;
    return x;
  } catch { return null; }
}
function scriviSalvata(slug: string, x: Salvata | null) {
  try { if (x) archivio().setItem(chiaveSessione(slug), JSON.stringify(x)); else archivio().removeItem(chiaveSessione(slug)); } catch { /* senza storage non si riprende, pazienza */ }
}

/** Integra le verifiche delle nuove lezioni senza perdere il punto del ripasso in sospeso. */
export function integraRipasso(salvata: Salvata, disponibili: Domanda[], verifiche: Domanda[] = [], progresso?: Progresso): Salvata {
  if (salvata.s.titolo !== 'Ripasso del giorno') return salvata;
  const presenti = new Set(salvata.coda.map((q) => q.id));
  const aggiunte = disponibili.filter((q) => {
    if (presenti.has(q.id)) return false;
    presenti.add(q.id); return true;
  });
  const risposte = salvata.coda.slice(0, salvata.i);
  const giaRisposte = new Set(risposte.map((q) => q.id));
  const ammesse = new Set(disponibili.map((q) => q.id));
  // Il mix può cambiare dopo risposte manuali o un nuovo giorno: le vecchie nuove non prenotano posti aggiuntivi.
  const codaValida = salvata.coda.slice(salvata.i).filter((q) => !progresso || progresso.carte[q.id] || ammesse.has(q.id));
  const rimanenti = ordinaRipasso([...codaValida, ...aggiunte], verifiche.filter((q) => !giaRisposte.has(q.id)));
  if (!aggiunte.length && rimanenti.length === salvata.coda.length - salvata.i && rimanenti.every((q, i) => q === salvata.coda[salvata.i + i])) return salvata;
  return { ...salvata,
    s: aggiunte.length ? { ...salvata.s, domande: [...salvata.s.domande, ...aggiunte] } : salvata.s,
    coda: [...risposte, ...rimanenti] };
}

const MODI: { k: Modo; t: string; d: string; icon: string }[] = [
  { k: 'ripasso', t: 'Ripasso del giorno', d: 'Prima le verifiche delle lezioni appena studiate, poi le domande in scadenza e le altre nuove.', icon: 'allena' },
  { k: 'libero', t: 'Quiz libero', d: 'Scegli unità, tipi di domanda e quantità.', icon: 'percorso' },
  { k: 'inverse', t: 'Schede inverse', d: 'Dalla definizione al termine del glossario. Nel ripasso si attivano studiando le lezioni pertinenti; qui puoi anticiparle.', icon: 'glossario' },
  { k: 'deboli', t: 'Punti deboli', d: 'Solo le domande che hai sbagliato o che stai dimenticando.', icon: 'fiamma' },
  { k: 'orale', t: 'Simulazione d\'orale', d: 'Domande d\'esame lette ad alta voce: rispondi a voce e confronta con la traccia.', icon: 'mic' },
  { k: 'cronologia', t: 'Sfida cronologica', d: 'Date, periodi e sequenze: ricorda quando avvengono gli eventi e mettili in ordine. Le risposte entrano nel ripasso spaziato.', icon: 'cronologia' },
];

export default function Allena({ query }: { query: URLSearchParams }) {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const p = useProgresso(slug);
  const [sessione, setSessione] = useState<Sessione | null>(null);
  const [ripresa, setRipresa] = useState<Salvata | null>(null);
  const [inSospeso, setInSospeso] = useState<Salvata | null>(null);
  const origine = query.toString();
  const avvia = (s: Sessione | null, da: Salvata | null = null) => { setRipresa(da); setSessione(s); };
  const riprendi = (salvata: Salvata) => {
    if (salvata.s.titolo !== 'Ripasso del giorno') return avvia(salvata.s, salvata);
    const r = ripassoDiOggi(idx, p);
    const aggiornata = integraRipasso(salvata, [...r.scadute, ...r.nuove], r.verifiche, p);
    avvia(aggiornata.s, aggiornata);
  };

  // avvio diretto da link: ?modo=ripasso, ?l=lezione, ?u=unità, ?c=concetto
  useEffect(() => {
    const salvata = leggiSalvata(slug);
    // stessa pagina di prima (per esempio dopo un ricaricamento): si riprende la sessione interrotta
    if (salvata && salvata.origine === origine) {
      riprendi(salvata); return;
    }
    setInSospeso(salvata);
    setRipresa(null);
    const l = query.get('l'), u = query.get('u'), c = query.get('c'), modo = query.get('modo') as Modo | null;
    if (modo === 'inverse' && c) {
      const q = idx.schedeInverse.find((q) => q.inversa === c);
      setSessione(q ? { titolo: 'Schede inverse', domande: [q], registra: true } : null);
    } else if (query.get('art') && idx.corso.norme) {
      // domande che citano un articolo, aperte dalla sezione Norme
      const n = query.get('art');
      const a = idx.corso.norme.gruppi.flatMap((g) => g.articoli).find((x) => !x.disposizione && x.n === n);
      const qs = (a?.domande ?? []).map((id) => idx.domandaById.get(id)).filter((q): q is Domanda => !!q);
      setSessione(qs.length ? { titolo: `Art. ${n} ${idx.corso.norme.sigla}`, domande: shuffle(qs), registra: true } : null);
    } else if (l) {
      const les = idx.lezioneById.get(l);
      if (les) setSessione({ titolo: les.titolo, domande: shuffle(idx.domandePerLezione.get(l) ?? []), registra: true });
    } else if (u) {
      const un = idx.unitaById.get(u);
      if (un) setSessione({ titolo: `Unità ${un.ordine} · ${un.titolo}`, domande: shuffle(un.lezioni.flatMap((x) => idx.domandePerLezione.get(x.id) ?? [])).slice(0, 25), registra: true });
    } else if (c) {
      const cc = idx.concettoById.get(c);
      if (cc) setSessione({ titolo: cc.nome, domande: shuffle((idx.domandePerConcetto.get(c) ?? []).filter((q) => !q.inversa)), registra: true });
    } else if (modo === 'ripasso') {
      const s = sessioneRipasso(idx, p);
      setSessione(s.domande.length ? s : null);
    } else setSessione(null);
  }, [origine]);
  const iniziale = (query.get('modo') as Modo | null) ?? 'ripasso';

  if (sessione) {
    return <Runner key={sessione.titolo + sessione.domande.length} s={sessione} origine={ripresa?.origine ?? origine} ripresa={ripresa}
      onFine={() => { scriviSalvata(slug, null); setInSospeso(null); avvia(null); vai('/allena'); }} />;
  }
  return (
    <>
      {inSospeso && (
        <div className="page-narrow" style={{ paddingBottom: 0 }}>
          <div className="card-flat row-between" style={{ gap: 12, background: 'var(--gold-soft)' }}>
            <span className="small"><b>Sessione interrotta:</b> {inSospeso.s.titolo}, domanda {inSospeso.i + 1} di {inSospeso.coda.length}</span>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm btn-primary" onClick={() => riprendi(inSospeso)}>Riprendi</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { scriviSalvata(slug, null); setInSospeso(null); }}>Lascia perdere</button>
            </span>
          </div>
        </div>
      )}
      <Setup key={iniziale} iniziale={iniziale} onStart={(s) => avvia(s)} />
    </>
  );
}

export function sessioneRipasso(idx: Indice, p: Progresso, now = new Date()): Sessione {
  const r = ripassoDiOggi(idx, p, now);
  return { titolo: 'Ripasso del giorno', domande: ordinaRipasso([...r.scadute, ...r.nuove], r.verifiche), registra: true };
}

function Setup({ onStart, iniziale }: { onStart: (s: Sessione) => void; iniziale: Modo }) {
  const compact = useCompact();
  const [chooserOpen, setChooserOpen] = useState(false), [filtersOpen, setFiltersOpen] = useState(false);
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [modo, setModo] = useState<Modo>(MODI.some((m) => m.k === iniziale) ? iniziale : 'ripasso');
  const [unita, setUnita] = useState<string[]>([]);
  const [tipi, setTipi] = useState<TipoDomanda[]>([]);
  const [n, setN] = useState(20);
  const rip = ripassoDiOggi(idx, p);
  const nRip = rip.scadute.length + rip.nuove.length;

  const pool = useMemo(() => {
    let qs = modo === 'inverse' ? idx.schedeInverse : modo === 'cronologia' ? idx.domandeCronologia : [...idx.domandaById.values()];
    if (unita.length) qs = qs.filter((q) => q.inversa
      ? idx.concettoById.get(q.inversa)?.unita.some((u) => unita.includes(u))
      : unita.includes(q.unita));
    if (modo === 'orale') qs = qs.filter((q) => q.tipo === 'aperta');
    else if ((modo === 'libero' || modo === 'deboli') && tipi.length) qs = qs.filter((q) => tipi.includes(q.tipo));
    if (modo === 'deboli') {
      const now = new Date();
      qs = qs.filter((q) => { const m = padronanzaDomanda(p, q.id, now); return m != null && m < 0.6; })
        .sort((a, b) => (padronanzaDomanda(p, a.id, now) ?? 0) - (padronanzaDomanda(p, b.id, now) ?? 0));
    }
    return qs;
  }, [idx, p, modo, unita, tipi]);

  const avvia = () => {
    if (modo === 'ripasso') return onStart(sessioneRipasso(idx, p));
    const qs = modo === 'deboli' ? pool.slice(0, n) : shuffle(pool).slice(0, n);
    onStart({ titolo: MODI.find((m) => m.k === modo)!.t, domande: modo === 'deboli' ? shuffle(qs) : qs, orale: modo === 'orale', registra: true });
  };

  const disponibili = modo === 'ripasso' ? nRip : pool.length;
  const pronto = disponibili > 0;
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const scelto = MODI.find((m) => m.k === modo)!;
  const modes = (<div className="grid g2" style={{ marginBottom: 20 }}>
        {MODI.filter((m) => m.k !== 'inverse' || idx.schedeInverse.length > 0).map((m) => (
          <button key={m.k} className={`setup-opt ${modo === m.k ? 'on' : ''}`} onClick={() => { setModo(m.k); setChooserOpen(false); }}>
            <span className="row" style={{ gap: 8 }}><Icon n={m.icon} /> <b>{m.t}</b>
              {m.k === 'ripasso' && nRip > 0 && <span className="chip chip-accent" style={{ marginLeft: 'auto' }}>{nRip}</span>}
            </span>
            <span className="muted small">{m.d}</span>
          </button>
        ))}
      </div>);
  const filters = (<div className="card stack" style={{ gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Unità {unita.length === 0 && <span className="faint">(tutte)</span>}</div>
            <div className="row" style={{ gap: 6 }}>
              {idx.corso.unita.map((u) => (
                <button key={u.id} className={`chip ${unita.includes(u.id) ? 'on' : ''}`} onClick={() => setUnita(toggle(unita, u.id))} title={u.titolo}>
                  {u.ordine}. {u.titolo.length > 26 ? u.titolo.slice(0, 26) + '…' : u.titolo}
                </button>
              ))}
            </div>
          </div>
          {(modo === 'libero' || modo === 'deboli') && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Tipi di domanda {tipi.length === 0 && <span className="faint">(tutti)</span>}</div>
              <div className="row" style={{ gap: 6 }}>
                {(Object.keys(TIPI_DOMANDA) as TipoDomanda[]).map((t) => (
                  <button key={t} className={`chip ${tipi.includes(t) ? 'on' : ''}`} onClick={() => setTipi(toggle(tipi, t))}>{TIPI_DOMANDA[t]}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Quante</div>
            <div className="row" style={{ gap: 6 }}>
              {[10, 20, 40, 80].map((x) => <button key={x} className={`chip ${n === x ? 'on' : ''}`} onClick={() => setN(x)}>{x}</button>)}
            </div>
          </div>
        </div>);
  const spiegazioneRipasso = (<>
          <b>{p.nuovePerGiorno} nuove al giorno per questa materia.</b> I ripassi in scadenza si aggiungono senza questo limite.
          <div className="muted" style={{ marginTop: 5 }}>Il limite è condiviso fra domande delle lezioni, glossario e cronologia: si attivano con gli argomenti studiati.</div>
          <div className="muted" style={{ marginTop: 5 }}>Ogni lezione appena studiata può aggiungere fino a {DOMANDE_VERIFICA_INIZIALE} domande di verifica, proposte per prime anche a limite raggiunto.
            {rip.extraNuove > 0 && ` Oggi ce ne sono ${rip.extraNuove} in più.`}
          </div>
          {rip.inAttesa > 0 && <div className="muted" style={{ marginTop: 5 }}>{rip.inAttesa} nuove restano da introdurre nei prossimi giorni. Puoi anticiparle con «Quiz libero» o «Quiz su questa lezione».</div>}
        </>);
  const ripassoInfo = (<div className="card-flat small" style={{ marginBottom: 16 }}>{spiegazioneRipasso}</div>);

  return (
    <div className="page-narrow fade-in">
      <div className="eyebrow">{plurale(idx.corso.domande.length, 'domanda', 'domande')} di lezione · {idx.domandeGlossario.length} schede glossario · {idx.domandeCronologia.length} esercizi di cronologia</div>
      <h1 className="title-xl" style={{ margin: '6px 0 20px' }}>Allenamento</h1>

      {compact ? <>
        <button className="mobile-training-choice" onClick={() => setChooserOpen(true)}><Icon n={scelto.icon} size={23} /><span><small>Come vuoi allenarti?</small><strong>{scelto.t}</strong></span><Icon n="giu" size={17} /></button>
        <p className="muted small mobile-training-description">{scelto.d}</p>
        <MobileSheet open={chooserOpen} onClose={() => setChooserOpen(false)} title="Scegli l’allenamento" className="mobile-training-sheet" modal={!inDemo()}>{modes}</MobileSheet>
      </> : modes}

      {modo !== 'ripasso' && (compact ? <>
        <button className="mobile-training-filters" onClick={() => setFiltersOpen(true)}><Icon n="filtri" size={19} /><span><strong>Personalizza il quiz</strong><small>{unita.length ? `${unita.length} unità` : 'Tutte le unità'} · {Math.min(n, disponibili)} domande</small></span><Icon n="freccia" size={17} /></button>
        <MobileSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Personalizza il quiz" className="mobile-training-sheet" modal={!inDemo()}>{filters}<button className="btn btn-primary mobile-map-done" onClick={() => setFiltersOpen(false)}>Fatto<Icon n="check" size={17} /></button></MobileSheet>
      </> : filters)}

      {modo === 'ripasso' && (
        compact ? <details className="mobile-review-info"><summary>Come funziona il ripasso<Icon n="giu" size={15} /></summary><div>{spiegazioneRipasso}</div></details> : ripassoInfo
      )}

      <div className="row-between training-start" style={{ marginTop: 20 }}>
        <span className="muted small">
          {modo === 'ripasso' && (nRip ? `${rip.scadute.length} da ripassare · ${rip.nuove.length} nuove${rip.extraNuove ? ` (${rip.extraNuove} di verifica oltre il limite)` : ''}` : rip.inAttesa ? 'Limite delle nuove raggiunto per oggi. Le altre rimangono in attesa.' : 'Niente in scadenza: segna come studiata una lezione per far entrare le sue domande.')}
          {modo === 'deboli' && (pool.length ? `${pool.length} domande deboli` : 'Ancora nessuna domanda debole: prima rispondi a qualche quiz.')}
          {(modo === 'libero' || modo === 'orale') && `${pool.length} domande disponibili`}
          {modo === 'inverse' && `${pool.length} schede inverse disponibili`}
          {modo === 'cronologia' && `${pool.length} quiz cronologia disponibili`}
        </span>
        <button className="btn btn-accent btn-lg" disabled={!pronto} onClick={avvia}>Inizia <Icon n="freccia" size={17} /></button>
      </div>
      {modo === 'ripasso' && !nRip && <div style={{ marginTop: 14 }}><a className="btn" href={href('/percorso')}>Vai al percorso</a></div>}
    </div>
  );
}

function Runner({ s, origine, ripresa, onFine }: { s: Sessione; origine: string; ripresa: Salvata | null; onFine: () => void }) {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const [i, setI] = useState(ripresa?.i ?? 0);
  const [voti, setVoti] = useState<Voto[]>(ripresa?.voti ?? []);
  const [coda, setCoda] = useState<Domanda[]>(ripresa?.coda ?? s.domande);

  // a ogni risposta si salva il punto in cui sei; a sessione finita il salvataggio si cancella
  useEffect(() => {
    scriviSalvata(slug, i < coda.length ? { origine, s, coda, i, voti, quando: new Date().toISOString() } : null);
  }, [i, coda]);

  const q = coda[i];
  const onVoto = (v: Voto) => {
    if (s.registra && idx.domandaById.has(q.id)) registraRisposta(slug, q.id, v);
    setVoti((x) => [...x, v]);
    // chi sbaglia in sessione di ripasso rivede la domanda a fine giro (una volta)
    if (v === 1 && s.registra && coda.filter((x) => x.id === q.id).length === 1 && coda.length < s.domande.length * 1.5) {
      setCoda((c) => [...c, q]);
    }
    setI((n) => n + 1);
  };

  if (!coda.length) return <div className="empty"><h3>Nessuna domanda</h3><button className="btn" onClick={onFine}>Indietro</button></div>;

  if (i >= coda.length) {
    const giuste = voti.filter((v) => v >= 3).length;
    const sbagliate = coda.filter((_, k) => voti[k] === 1);
    return (
      <div className="quiz-wrap fade-in">
        <div className="card qcard" style={{ textAlign: 'center' }}>
          <div className="eyebrow">{s.titolo}</div>
          <h2 className="title-xl" style={{ margin: '10px 0 4px' }}>{Math.round((giuste / voti.length) * 100)}%</h2>
          <p className="muted">{giuste} sapute su {voti.length} risposte{voti.filter((v) => v === 2).length ? ` · ${voti.filter((v) => v === 2).length} a fatica` : ''}</p>
          {s.registra && <p className="small faint">Le risposte sono salvate: l'algoritmo ti riproporrà ogni domanda al momento giusto.</p>}
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            {sbagliate.length > 0 && <button className="btn btn-primary" onClick={() => { setCoda(shuffle([...new Map(sbagliate.map((x) => [x.id, x])).values()])); setI(0); setVoti([]); }}>Rifai le sbagliate ({new Set(sbagliate.map((x) => x.id)).size})</button>}
            <button className="btn" onClick={onFine}>Fine</button>
          </div>
        </div>
      </div>
    );
  }

  const lez = q.lezione ? idx.lezioneById.get(q.lezione) : undefined;
  return (
    <div className="quiz-wrap">
      <div className="quiz-top">
        <button className="btn btn-sm btn-ghost" onClick={onFine} aria-label="Esci"><Icon n="x" /></button>
        <Bar value={i / coda.length} tone="accent" />
        <span className="small faint" style={{ whiteSpace: 'nowrap' }}>{i + 1} / {coda.length}</span>
      </div>
      <div className="faint small" style={{ marginBottom: 8 }}>{q.inversa ? 'Schede inverse · Glossario' : q.glossario ? 'Glossario · Dal termine alla definizione' : q.cronologia ? q.eventiCronologia ? 'Cronologia · Ordina gli eventi' : 'Cronologia · Date e periodi' : <>{s.titolo}{lez && lez.titolo !== s.titolo ? ` · ${lez.titolo}` : ''}</>}</div>
      <DomandaView key={`${q.id}-${i}`} q={q} onVoto={onVoto} orale={s.orale} />
    </div>
  );
}
