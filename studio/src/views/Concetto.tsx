import { useMemo, useRef } from 'react';
import { useCorso } from '../lib/data';
import { renderMd } from '../lib/md';
import { href } from '../lib/router';
import { padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { TIPO_SINGOLARE, VERBO_RELAZIONE } from '../lib/types';
import { useConceptPop } from '../components/ConceptPop';
import { rifPagine } from '../lib/util';
import { Icon, LivelloDot, Ring } from '../components/ui';


export default function ConcettoView({ id }: { id: string }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const c = idx.concettoById.get(id);
  const ref = useRef<HTMLDivElement>(null);
  const pop = useConceptPop(ref);

  const html = useMemo(() => (c ? renderMd(c.definizione, idx.concettoById) : ''), [c, idx]);
  if (!c) return <div className="empty"><h3>Voce non trovata</h3><a className="btn" href={href('/glossario')}>Al glossario</a></div>;

  const qs = idx.domandePerConcetto.get(c.id) ?? [];
  const haDomande = qs.some((q) => !q.inversa);
  const m = padronanza(p, qs);
  const rel = idx.relazioniPerConcetto.get(c.id) ?? [];
  const uscenti = rel.filter((r) => r.da === c.id);
  const entranti = rel.filter((r) => r.a === c.id);
  const eventi = idx.eventiPerConcetto.get(c.id) ?? [];
  const lezioni = c.lezioni.map((l) => idx.lezioneById.get(l)).filter(Boolean);

  // ogni collegamento è una frase completa «soggetto – verbo – oggetto»; la voce che si sta leggendo è in grassetto, l'altra è cliccabile
  const Rel = ({ r }: { r: typeof rel[number] }) => {
    const altro = idx.concettoById.get(r.da === c.id ? r.a : r.da);
    if (!altro) return null;
    const nome = (id: string) => (id === c.id
      ? <b className="rel-io">{c.nome}</b>
      : <a className="chip" href={href(`/concetto/${altro.id}`)} style={{ textDecoration: 'none' }}>{altro.nome}</a>);
    return (
      <div className="rel">
        {nome(r.da)}
        <span className="lab">{r.etichetta ?? VERBO_RELAZIONE[r.tipo] ?? r.tipo.replace(/-/g, ' ')}</span>
        <span className="faint" aria-hidden="true">→</span>
        {nome(r.a)}
        {r.oltre && <span className="rel-oltre" title="Collegamento aggiunto o corretto oltre gli appunti">oltre gli appunti</span>}
      </div>
    );
  };

  return (
    <div className="page fade-in" ref={ref}>
      <div className="row small faint" style={{ gap: 6, marginBottom: 10 }}>
        <a href={href('/glossario')} style={{ textDecoration: 'none' }}>Glossario</a> / <span>{TIPO_SINGOLARE[c.tipo]}</span>
      </div>
      <div className="lesson-layout">
        <div style={{ minWidth: 0 }}>
          <h1 className="title-xl">{c.nome}</h1>
          {c.latino && c.latino !== c.nome && <div className="muted" style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontSize: 19, marginTop: 4 }}>{c.latino}</div>}
          {c.alias.length > 0 && <div className="faint small" style={{ marginTop: 6 }}>Anche: {c.alias.join(', ')}</div>}
          {c.oltreAppunti && <div style={{ marginTop: 8 }}><span className="chip oltre-chip">voce aggiunta: negli appunti non c'è</span></div>}
          {c.rettificato && <div style={{ marginTop: 8 }}><span className="chip oltre-chip">definizione corretta · spiegazione e fonti qui sotto</span></div>}
          <p className="title-s muted" style={{ fontFamily: 'var(--sans)', fontWeight: 500, margin: '16px 0' }}>{c.breve}</p>
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          {c.approfondimenti.map((a) => (
            <div key={a.unita} className="card-flat" style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Nell'unità {idx.unitaById.get(a.unita)?.ordine} · {a.titolo}</div>
              <div className="prose" style={{ fontSize: 15.5 }} dangerouslySetInnerHTML={{ __html: renderMd(a.testo, idx.concettoById) }} />
            </div>
          ))}
          {c.oltre && (
            <div className="card oltre-box" style={{ marginTop: 16 }}>
              <div className="row-between" style={{ marginBottom: 6, gap: 8 }}>
                <span className="eyebrow">Oltre gli appunti</span>
                <span className="faint tiny">conoscenze di base che si danno per scontate: non vengono dal materiale del corso</span>
              </div>
              <div className="prose" style={{ fontSize: 15.5 }} dangerouslySetInnerHTML={{ __html: renderMd(c.oltre.testo, idx.concettoById) }} />
              {c.oltre.daSapere.length > 0 && (
                <ul className="oltre-punti">
                  {c.oltre.daSapere.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: renderMd(x, idx.concettoById) }} />)}
                </ul>
              )}
              {!!c.oltre.fonti?.length && (
                <details className="oltre-fonti small" style={{ marginTop: 14 }}>
                  <summary>Fonti e approfondimenti</summary>
                  <ul>
                    {c.oltre.fonti.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.titolo}</a></li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
          {pop}

          {(uscenti.length > 0 || entranti.length > 0) && (
            <div className="card" style={{ marginTop: 22 }}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <h3 className="title-s">Collegamenti</h3>
                <a className="btn btn-sm btn-ghost" href={href(`/mappa?grafo=1&c=${c.id}`)}><Icon n="mappa" size={15} /> Sulla mappa</a>
              </div>
              <div className="rel-list">
                {uscenti.map((r, i) => <Rel key={`o${i}`} r={r} />)}
                {entranti.map((r, i) => <Rel key={`i${i}`} r={r} />)}
              </div>
            </div>
          )}

          {eventi.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="title-s" style={{ marginBottom: 8 }}>Nella cronologia</h3>
              {eventi.map((e) => (
                <a key={e.id} className="lesson-line" href={href(`/cronologia?e=${e.id}`)}>
                  <span className="tl-year" style={{ minWidth: 110 }}>{e.data}</span>
                  <span>{e.titolo}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <aside className="lesson-aside">
          <div className="card" style={{ textAlign: 'center' }}>
            {qs.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Ring value={m.valore ?? 0} size={104} color={m.viste ? undefined : 'var(--none)'}>
                    <div><b>{Math.round((m.valore ?? 0) * 100)}%</b><small>padronanza</small></div>
                  </Ring>
                </div>
                <p className="small muted">{m.viste}/{m.totali} domande viste</p>
                {haDomande && <a className="btn btn-primary" href={href(`/allena?c=${c.id}`)} style={{ width: '100%' }}><Icon n="allena" size={16} /> Allenati su questo</a>}
              </>
            ) : <p className="small muted" style={{ margin: 0 }}>Nessuna domanda collegata direttamente.</p>}
            {c.schedaInversa && <a className="btn" href={href(`/allena?modo=inverse&c=${c.id}`)} style={{ width: '100%', marginTop: 10 }}><Icon n="glossario" size={16} /> Ricorda il termine</a>}
          </div>
          {lezioni.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>Dove se ne parla</div>
              {lezioni.map((l) => (
                <a key={l!.id} className="lesson-line" href={href(`/lezione/${l!.id}`)}>
                  <div style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 550 }}>{l!.titolo}</div>
                    <div className="faint tiny">Unità {idx.unitaById.get(l!.unita)?.ordine} · {rifPagine(l!)}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
          <div className="card-flat small muted">
            <LivelloDot valore={m.media} viste={m.viste} />
            {c.pagine.length > 0 ? ` ${c.pagine.map((x) => rifPagine(x)).join(', ')}` : c.oltreAppunti ? ' Voce di approfondimento oltre gli appunti' : ' Solo nei capitoli ricostruiti dal manuale'}
          </div>
        </aside>
      </div>
    </div>
  );
}
