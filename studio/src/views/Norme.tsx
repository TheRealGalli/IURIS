import { useEffect, useMemo, useState } from 'react';
import { norm, useCorso } from '../lib/data';
import { href } from '../lib/router';
import type { Articolo } from '../lib/types';
import { Icon } from '../components/ui';
import './Norme.css';

const etichetta = (a: Articolo) => (a.disposizione ? `Disp. ${a.n}` : `Art. ${a.n}`);
const ancora = (a: Articolo) => `norma-${a.disposizione ? 'd' : ''}${a.n}`;

/** Testo di un atto normativo, articolo per articolo: ricerca per numero o parola, rimandi a lezioni e domande. */
export default function Norme({ id }: { id?: string }) {
  const idx = useCorso();
  const norme = idx.corso.norme!;
  const [q, setQ] = useState('');
  const [soloStudio, setSoloStudio] = useState(false);

  const filtro = norm(q.trim());
  const numero = /^\d{1,3}$/.test(q.trim()) ? q.trim() : null;
  const gruppi = useMemo(() => norme.gruppi.map((g) => ({
    ...g,
    articoli: g.articoli.filter((a) => {
      if (soloStudio && !a.lezioni?.length) return false;
      if (!filtro) return true;
      if (numero) return !a.disposizione && a.n === numero;
      return norm(`${a.tema ?? ''} ${a.commi.join(' ')}`).includes(filtro);
    }),
  })).filter((g) => g.articoli.length), [norme, filtro, numero, soloStudio]);
  const trovati = gruppi.reduce((s, g) => s + g.articoli.length, 0);

  // #/norme/77 porta all'articolo
  useEffect(() => {
    if (!id) return;
    const el = document.getElementById(`norma-${id}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [id]);

  return (
    <div className="page-narrow fade-in norme">
      <div className="eyebrow">Norme</div>
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
          {norme.gruppi.map((g, i) => <a key={i} className="chip" href={href(`/norme/${ancora(g.articoli[0]).slice(6)}`)}>{g.titolo.split(' › ').pop()}</a>)}
        </nav>
      )}

      {trovati === 0 && <div className="empty">Nessun articolo trovato.</div>}
      {gruppi.map((g) => (
        <section key={g.titolo} className="norme-gruppo">
          <h2 className="norme-titolo">{g.titolo}</h2>
          {g.articoli.map((a) => (
            <article key={ancora(a)} id={ancora(a)} className={`card norma${a.abrogato ? ' norma-abrogata' : ''}${id === ancora(a).slice(6) ? ' norma-sel' : ''}`}>
              <header className="norma-testa">
                <h3 className="title-s">{etichetta(a)}</h3>
                {a.tema && <span className="norma-tema">{a.tema}</span>}
                {a.modificato && !a.abrogato && <span className="chip chip-gold" title="Il testo originario del 1948 è stato modificato">modificato</span>}
              </header>
              {a.commi.length > 1
                ? <ol className="norma-commi">{a.commi.map((c, i) => /^[a-z]\)/.test(c) ? <li key={i} className="norma-lettera">{c}</li> : <li key={i}>{c}</li>)}</ol>
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
          ))}
        </section>
      ))}

      {norme.fonte && <p className="faint small" style={{ marginTop: 28 }}>Testo: <a href={norme.fonte.url} target="_blank" rel="noopener noreferrer">{norme.fonte.titolo}</a>. I titoletti accanto al numero non fanno parte del testo ufficiale: servono a orientarsi.</p>}
    </div>
  );
}
