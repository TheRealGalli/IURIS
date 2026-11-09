import { useEffect } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import { Icon } from '../components/ui';
import './Procedimenti.css';

/** Schemi a passi (chi fa che cosa, in che ordine, con quali esiti) e tabelle di confronto tra istituti. */
export default function Procedimenti({ id, query }: { id?: string; query: URLSearchParams }) {
  const idx = useCorso();
  const dati = idx.corso.procedimenti!;
  const procedimenti = dati.procedimenti ?? [];
  const confronti = dati.confronti ?? [];
  const vista = query.get('v') === 'confronti' || !procedimenti.length ? 'confronti' : 'passi';

  useEffect(() => {
    if (!id) return;
    const el = document.getElementById(`proc-${id}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [id, vista]);

  const lezione = (l?: string) => {
    const lez = l ? idx.lezioneById.get(l) : undefined;
    return lez && <a className="chip" href={href(`/lezione/${lez.id}`)}><Icon n="percorso" size={13} /> {lez.titolo}</a>;
  };

  return (
    <div className="page-narrow fade-in procedimenti">
      <div className="eyebrow">Procedimenti</div>
      <h1 className="title-xl" style={{ margin: '6px 0 6px' }}>{vista === 'passi' ? 'Come funziona, passo per passo' : 'Istituti a confronto'}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {vista === 'passi'
          ? 'Chi fa che cosa, in quale ordine e con quali esiti. Prova a ripetere i passi a voce prima di aprirli.'
          : 'Le distinzioni che all\'esame si chiedono più spesso, una riga per volta.'}
      </p>
      {procedimenti.length > 0 && confronti.length > 0 && (
        <div className="row" style={{ gap: 6, margin: '14px 0 18px' }}>
          <a className={`chip ${vista === 'passi' ? 'on' : ''}`} href={href('/procedimenti')}>Passo per passo · {procedimenti.length}</a>
          <a className={`chip ${vista === 'confronti' ? 'on' : ''}`} href={href('/procedimenti?v=confronti')}>Confronti · {confronti.length}</a>
        </div>
      )}

      {vista === 'passi' && procedimenti.map((p) => (
        <details key={p.id} id={`proc-${p.id}`} className="card proc" open={id === p.id || procedimenti.length === 1}>
          <summary>
            <span className="proc-titolo title-s">{p.titolo}</span>
            {p.norme && <span className="proc-norme">{p.norme}</span>}
            <span className="proc-n faint small">{p.passi.length} passi</span>
          </summary>
          {p.sintesi && <p className="muted proc-sintesi">{p.sintesi}</p>}
          <ol className="proc-passi">
            {p.passi.map((s, i) => (
              <li key={i}>
                <span className="proc-num" aria-hidden="true">{i + 1}</span>
                <div className="proc-corpo">
                  <div className="proc-passo">
                    {s.concetto ? <a href={href(`/concetto/${s.concetto}`)}>{s.titolo}</a> : s.titolo}
                  </div>
                  {s.chi && <div className="proc-chi">{s.chi}</div>}
                  <p>{s.testo}</p>
                  {s.esiti && (
                    <ul className="proc-esiti">
                      {s.esiti.map((e, j) => <li key={j}><b>{e.se}</b><span>{e.allora}</span></li>)}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {p.lezione && <div className="proc-piede">{lezione(p.lezione)}</div>}
        </details>
      ))}

      {vista === 'confronti' && confronti.map((c) => (
        <section key={c.id} id={`proc-${c.id}`} className="card confronto">
          <h2 className="title-s">{c.titolo}</h2>
          <div className="confronto-scroll">
            <table>
              <thead><tr>{c.colonne.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
              <tbody>{c.righe.map((r, i) => <tr key={i}>{r.map((x, j) => (j === 0 ? <th key={j} scope="row">{x}</th> : <td key={j}>{x}</td>))}</tr>)}</tbody>
            </table>
          </div>
          {c.lezione && <div className="proc-piede">{lezione(c.lezione)}</div>}
        </section>
      ))}
    </div>
  );
}
