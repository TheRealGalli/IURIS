import { useEffect, useMemo, useState } from 'react';
import { norm, useCorso, type Indice } from '../lib/data';
import { href, vai } from '../lib/router';
import type { Articolo, GruppoNorme, Norme as NormeDati } from '../lib/types';
import { Icon } from '../components/ui';
import './Norme.css';

const etichetta = (a: Articolo) => (a.disposizione ? `Disp. ${a.n}` : a.serie ? `Art. ${a.n} ${a.serie}` : `Art. ${a.n}`);
const chiave = (a: Articolo) => `${a.disposizione ? 'd' : a.serie ? 'p' : ''}${a.n}`;
const ancora = (a: Articolo) => `norma-${chiave(a)}`;
const porta = (k: string) => requestAnimationFrame(() => document.getElementById(`norma-${k}`)?.scrollIntoView({ block: 'start' }));

/** Testo di un atto normativo, articolo per articolo: ricerca per numero o parola, rimandi a lezioni e domande.
 *  Un atto breve (la Costituzione) è tutto nel corso; uno lungo (il Codice civile) si scarica un libro alla volta. */
export default function Norme({ id }: { id?: string }) {
  const norme = useCorso().corso.norme!;
  return norme.libri ? <NormeDivise norme={norme} id={id} /> : <NormeIntere norme={norme} id={id} />;
}

function Scheda({ a, idx, sel }: { a: Articolo; idx: Indice; sel: boolean }) {
  return (
    <article id={ancora(a)} className={`card norma${a.abrogato ? ' norma-abrogata' : ''}${sel ? ' norma-sel' : ''}`}>
      <header className="norma-testa">
        <h3 className="title-s">{etichetta(a)}</h3>
        {a.tema && <span className="norma-tema">{a.tema}</span>}
        {a.abrogato && <span className="chip">abrogato</span>}
        {a.modificato && !a.abrogato && <span className="chip chip-gold" title="Il testo originario è stato modificato">modificato</span>}
      </header>
      {a.commi.length > 1
        ? <ol className="norma-commi">{a.commi.map((c, i) => /^[a-z0-9]{1,2}\)/.test(c) ? <li key={i} className="norma-lettera">{c}</li> : <li key={i}>{c}</li>)}</ol>
        : <p className="norma-comma">{a.commi[0]}</p>}
      {(a.lezioni?.length || a.domande?.length) ? (
        <footer className="norma-rimandi">
          {a.lezioni?.map((l) => {
            const lez = idx.lezioneById.get(l);
            return lez && <a key={l} className="chip" href={href(`/lezione/${l}`)}><Icon n="percorso" size={13} /> {lez.titolo}</a>;
          })}
          {!!a.domande?.length && <a className="chip chip-accent" href={href(`/allena?art=${a.n}`)}><Icon n="allena" size={13} /> {a.domande.length} {a.domande.length === 1 ? 'domanda' : 'domande'}</a>}
        </footer>
      ) : null}
    </article>
  );
}

function Gruppi({ gruppi, idx, sel }: { gruppi: GruppoNorme[]; idx: Indice; sel?: string }) {
  return <>{gruppi.map((g) => (
    <section key={g.titolo} className="norme-gruppo">
      <h2 className="norme-titolo">{g.titolo}</h2>
      {g.articoli.map((a) => <Scheda key={ancora(a)} a={a} idx={idx} sel={sel === chiave(a)} />)}
    </section>
  ))}</>;
}

const Piede = ({ norme }: { norme: NormeDati }) => norme.fonte
  ? <p className="faint small" style={{ marginTop: 28 }}>Testo: <a href={norme.fonte.url} target="_blank" rel="noopener noreferrer">{norme.fonte.titolo}</a>.</p> : null;

/* ───────── atto breve: tutto il testo è già nel corso ───────── */
function NormeIntere({ norme, id }: { norme: NormeDati; id?: string }) {
  const idx = useCorso();
  const [q, setQ] = useState('');
  const [soloStudio, setSoloStudio] = useState(false);
  const filtro = norm(q.trim());
  const numero = /^\d{1,4}$/.test(q.trim()) ? q.trim() : null;
  const gruppi = useMemo(() => (norme.gruppi ?? []).map((g) => ({
    ...g,
    articoli: g.articoli.filter((a) => {
      if (soloStudio && !a.lezioni?.length) return false;
      if (!filtro) return true;
      if (numero) return !a.disposizione && a.n === numero;
      return norm(`${a.tema ?? ''} ${a.commi.join(' ')}`).includes(filtro);
    }),
  })).filter((g) => g.articoli.length), [norme, filtro, numero, soloStudio]);
  const trovati = gruppi.reduce((s, g) => s + g.articoli.length, 0);
  useEffect(() => { if (id) porta(id); }, [id]);

  return (
    <div className="page-narrow fade-in norme">
      <div className="eyebrow">{norme.nome ?? 'Norme'}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 6px' }}>{norme.atto}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {norme.aggiornamento} Accanto a ogni articolo trovi le lezioni che lo spiegano e le domande che lo citano.
      </p>
      <div className="norme-barra">
        <input className="input input-lg" type="search" inputMode="search" placeholder="Numero dell'articolo o parola (77, decreto, fiducia…)"
          aria-label="Cerca negli articoli" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soloStudio} onChange={(e) => setSoloStudio(e.target.checked)} /> Solo gli articoli spiegati nelle lezioni
        </label>
        {(filtro || soloStudio) && <span className="faint small" role="status">{trovati} {trovati === 1 ? 'articolo' : 'articoli'}</span>}
      </div>
      {!filtro && !soloStudio && (
        <nav className="norme-indice" aria-label="Parti dell'atto">
          {(norme.gruppi ?? []).map((g, i) => <a key={i} className="chip" href={href(`/norme/${chiave(g.articoli[0])}`)}>{g.titolo.split(' › ').pop()}</a>)}
        </nav>
      )}
      {trovati === 0 && <div className="empty">Nessun articolo trovato.</div>}
      <Gruppi gruppi={gruppi} idx={idx} sel={id} />
      <Piede norme={norme} />
      <p className="faint small">I titoletti accanto al numero non fanno parte del testo ufficiale: servono a orientarsi.</p>
    </div>
  );
}

/* ───────── atto lungo: indice nel corso, testo in un file per libro ───────── */
const cache = new Map<string, Promise<GruppoNorme[]>>();
function caricaLibro(slug: string, file: string): Promise<GruppoNorme[]> {
  const k = `${slug}/${file}`;
  if (!cache.has(k)) cache.set(k, fetch(`content/${slug}/${file}`).then((r) => { if (!r.ok) throw new Error('libro non trovato'); return r.json(); }).then((d) => d.gruppi));
  return cache.get(k)!;
}

function NormeDivise({ norme, id }: { norme: NormeDati; id?: string }) {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const libri = norme.libri!, indice = norme.indice!, programma = norme.programma ?? [];
  // dove si trova un articolo: «1321» nel codice, «p12» nelle preleggi
  const trova = (k: string) => indice.find((r) => (r[5] ? `p${r[0]}` : r[0]) === k);
  const iniziale = id ? trova(id) : undefined;
  const [libro, setLibro] = useState<number | null>(iniziale && !programma.some((a) => chiave(a) === id) ? iniziale[2] : null); // null = programma
  const [titolo, setTitolo] = useState(iniziale ? iniziale[3] : 0);
  const [gruppi, setGruppi] = useState<GruppoNorme[] | null>(null);
  const [errore, setErrore] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (libro == null) return;
    let vivo = true;
    setGruppi(null); setErrore(false);
    caricaLibro(slug, libri[libro].file).then((g) => vivo && setGruppi(g)).catch(() => vivo && setErrore(true));
    return () => { vivo = false; };
  }, [slug, libro]);

  // #/norme/1321 apre il libro e il titolo che contengono l'articolo
  useEffect(() => {
    if (!id) return;
    const r = trova(id);
    if (!r) return;
    if (libro == null && programma.some((a) => chiave(a) === id)) { porta(id); return; }
    setLibro(r[2]); setTitolo(r[3]);
  }, [id]);
  useEffect(() => { if (id && (gruppi || libro == null)) porta(id); }, [gruppi, titolo, id]);

  const testo = q.trim();
  const risultati = useMemo(() => {
    if (testo.length < 2 && !/^\d/.test(testo)) return [];
    const n = norm(testo).replace(/\s+/g, '-');
    const perNumero = /^\d/.test(testo);
    return indice.filter((r) => (perNumero ? r[0] === n || r[0].startsWith(`${n}-`) : norm(r[1]).includes(norm(testo)))).slice(0, 80);
  }, [testo, indice]);

  const delTitolo = libro != null && gruppi ? gruppi.filter((g) => g.titolo.split(' › ')[0] === libri[libro].titoli[titolo]) : [];
  const delProgramma = useMemo(() => {
    const out: GruppoNorme[] = [];
    for (const a of programma) {
      const t = `${libri[a.libro].titolo} › ${a.gruppo}`;
      if (out[out.length - 1]?.titolo !== t) out.push({ titolo: t, articoli: [] });
      out[out.length - 1].articoli.push(a);
    }
    return out;
  }, [programma]);

  return (
    <div className="page-narrow fade-in norme">
      <div className="eyebrow">{norme.nome ?? 'Norme'}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 6px' }}>{norme.atto}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{norme.aggiornamento}</p>

      <div className="norme-barra">
        <input className="input input-lg" type="search" inputMode="search" placeholder="Numero dell'articolo o parola della rubrica (1321, usucapione…)"
          aria-label="Cerca negli articoli" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {testo && (
        <div className="norme-risultati" role="status">
          {risultati.length === 0 && <span className="faint small">Nessun articolo trovato. La ricerca guarda il numero e la rubrica di tutti gli articoli.</span>}
          {risultati.map((r) => {
            const k = r[5] ? `p${r[0]}` : r[0];
            return <button key={k} className={`chip${r[4] ? ' norme-ris-abrogato' : ''}`} onClick={() => { setQ(''); vai(`/norme/${k}`); }}>
              <b>{r[5] ? `Prel. ${r[0]}` : r[0]}</b> {r[1] || (r[4] ? 'abrogato' : '')}
            </button>;
          })}
        </div>
      )}

      <nav className="norme-indice" aria-label="Libri">
        <button className={`chip ${libro == null ? 'on' : ''}`} onClick={() => setLibro(null)}>Nel programma · {programma.length}</button>
        {libri.map((l, i) => <button key={l.id} className={`chip ${libro === i ? 'on' : ''}`} title={l.titolo} onClick={() => { setLibro(i); setTitolo(0); }}>{l.titolo.split(' · ')[0].replace('Disposizioni sulla legge in generale', 'Preleggi')}</button>)}
      </nav>

      {libro == null ? (
        programma.length
          ? <><p className="muted small" style={{ margin: '4px 0 0' }}>Gli articoli citati nelle lezioni studiate finora, con le lezioni e le domande collegate. Per tutti gli altri apri un libro o cerca per numero.</p><Gruppi gruppi={delProgramma} idx={idx} sel={id} /></>
          : <div className="empty">Le lezioni non citano ancora articoli. Apri un libro o cerca per numero.</div>
      ) : (
        <>
          <div className="norme-libro">
            <b>{libri[libro].titolo}</b>
            {libri[libro].titoli.length > 1 && (
              <select className="select" aria-label="Titolo del libro" value={titolo} onChange={(e) => setTitolo(Number(e.target.value))}>
                {libri[libro].titoli.map((t, i) => <option key={i} value={i}>{t}</option>)}
              </select>
            )}
          </div>
          {errore && <div className="empty">Non riesco a caricare questo libro. Controlla la connessione e riprova.</div>}
          {!gruppi && !errore && <div className="empty faint" role="status">Apertura del libro…</div>}
          {gruppi && <Gruppi gruppi={delTitolo} idx={idx} sel={id} />}
        </>
      )}
      <Piede norme={norme} />
    </div>
  );
}
