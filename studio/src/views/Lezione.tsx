import { useEffect, useMemo, useRef, useState } from 'react';
import { useCorso } from '../lib/data';
import { renderMd } from '../lib/md';
import { href } from '../lib/router';
import { ETICHETTA_STATO, padronanza, statoLezione } from '../lib/srs';
import { aggiungiTempo, apriLezione, DOMANDE_VERIFICA_INIZIALE, segnaStudiata, useProgresso } from '../lib/store';
import { useConceptPop } from '../components/ConceptPop';
import { DOCUMENTI_LETTURA, linkTesto } from '../lib/letture-client';
import { Icon, LivelloDot, Pagine } from '../components/ui';

export default function LezioneView({ id }: { id: string }) {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const p = useProgresso(slug);
  const l = idx.lezioneById.get(id);
  const artRef = useRef<HTMLDivElement>(null);
  const pop = useConceptPop(artRef);
  const [nascondi, setNascondi] = useState(false);
  const [svelate, setSvelate] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!l) return;
    apriLezione(slug, l.id);
    setSvelate({});
    let inizio = Date.now();
    let visibile = !document.hidden;
    const flush = () => {
      const fine = new Date();
      if (visibile) aggiungiTempo(slug, Math.min(1800, (fine.getTime() - inizio) / 1000), fine);
      inizio = fine.getTime();
    };
    const onVis = () => { flush(); visibile = !document.hidden; };
    const timer = window.setInterval(flush, 30000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, [l?.id]);

  const html = useMemo(() => (l ? renderMd(l.sintesi, idx.concettoById) : ''), [l, idx]);

  if (!l) return <div className="empty"><h3>Lezione non trovata</h3><a className="btn" href={href('/percorso')}>Al percorso</a></div>;

  const u = idx.unitaById.get(l.unita)!;
  const i = idx.lezioni.findIndex((x) => x.id === l.id);
  const prev = idx.lezioni[i - 1];
  const next = idx.lezioni[i + 1];
  const studiata = !!p.lezioni[l.id]?.studiata;
  const st = statoLezione(idx, p, l);
  const qs = idx.domandePerLezione.get(l.id) ?? [];
  const m = padronanza(p, qs);
  const concetti = l.concetti.map((c) => idx.concettoById.get(c)).filter(Boolean);
  // Rimando dalla sintesi al testo esteso revisionato della stessa lezione, quando esiste.
  const testoEsteso = DOCUMENTI_LETTURA.filter((d) => d.materia === slug)
    .flatMap((d) => d.sezioni.filter((s) => !s.soloTitolo && (s.lezione === l.id || s.lezioni?.includes(l.id))).map((s) => linkTesto(d.id, s.id)))[0];

  return (
    <div className="page fade-in">
      <div className="row small faint" style={{ gap: 6, marginBottom: 10 }}>
        <a href={href('/percorso')} style={{ textDecoration: 'none' }}>Percorso</a> /
        <span>Unità {u.ordine} · {u.titolo}</span>
      </div>
      <div className="lesson-layout">
        <div style={{ minWidth: 0 }}>
          <h1 className="title-xl" style={{ marginBottom: 12 }}>{l.titolo}</h1>
          <div className="row" style={{ gap: 6, marginBottom: 24 }}>
            <Pagine x={l} />
            <span className="chip">{l.minuti} min</span>
            <span className="chip">{qs.length} domande</span>
            <span className={`chip ${st === 'padroneggiata' ? 'chip-ok' : st === 'in-ripasso' ? 'chip-mid' : st === 'studiata' ? 'chip-gold' : ''}`}>{ETICHETTA_STATO[st]}</span>
          </div>

          {u.ricostruita && (
            <div className="card-flat small" style={{ background: 'var(--gold-soft)', marginBottom: 24 }}>
              <b>Lezione ricostruita.</b> Gli appunti non trattano questo capitolo: il testo segue i paragrafi del manuale,
              ma non viene dagli appunti. Prima dell'esame controllalo sul libro.
            </div>
          )}

          <article ref={artRef} className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          {pop}

          {l.puntiChiave.length > 0 && (
            <div className="keypoints" style={{ marginTop: 32 }}>
              <h3>Da dire all'esame</h3>
              <ol>{l.puntiChiave.map((k, j) => <li key={j}>{k}</li>)}</ol>
            </div>
          )}

          {l.memoria.length > 0 && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <h3 className="title-s">Da sapere a memoria</h3>
                <button className="btn btn-sm" onClick={() => { setNascondi((v) => !v); setSvelate({}); }}>
                  <Icon n="occhio" size={15} /> {nascondi ? 'Mostra tutto' : 'Mettiti alla prova'}
                </button>
              </div>
              {nascondi && <p className="faint small" style={{ marginTop: 0 }}>Prova a ricordare il dettaglio, poi tocca per scoprirlo.</p>}
              <table className="memo"><tbody>
                {l.memoria.map((mm, j) => (
                  <tr key={j}>
                    <td>{mm.voce}</td>
                    <td className={nascondi && !svelate[j] ? 'hide' : ''} onClick={() => setSvelate((s) => ({ ...s, [j]: true }))}>{mm.dettaglio}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}

          <div className="card-flat row-between" style={{ marginTop: 24 }}>
            {prev ? <a className="btn btn-ghost" href={href(`/lezione/${prev.id}`)}><Icon n="indietro" size={16} /> {prev.titolo.slice(0, 38)}{prev.titolo.length > 38 ? '…' : ''}</a> : <span />}
            {next && <a className="btn" href={href(`/lezione/${next.id}`)}>{next.titolo.slice(0, 38)}{next.titolo.length > 38 ? '…' : ''} <Icon n="freccia" size={16} /></a>}
          </div>
        </div>

        <aside className="lesson-aside">
          <div className="card stack" style={{ gap: 10 }}>
            <button className={`btn btn-lg ${studiata ? 'btn-ok' : 'btn-primary'}`} onClick={() => segnaStudiata(slug, l.id, !studiata, qs.map((q) => q.id))}>
              <Icon n="check" size={18} stroke={2.4} /> {studiata ? 'Studiata' : 'Segna come studiata'}
            </button>
            {testoEsteso && <a className="btn" href={testoEsteso}><Icon n="libro" size={16} /> Leggi il testo esteso</a>}
            <a className="btn" href={href(`/allena?l=${l.id}`)}><Icon n="allena" size={16} /> Quiz su questa lezione</a>
            <a className="btn btn-ghost" href={href(`/mappa?u=${u.id}`)}><Icon n="mappa" size={16} /> Mappa dell'unità</a>
            {m.viste > 0 && (
              <div className="small muted row" style={{ gap: 6 }}>
                <LivelloDot valore={m.valore} viste={m.viste} /> Padronanza {Math.round((m.valore ?? 0) * 100)}% · {m.viste}/{m.totali} domande viste
              </div>
            )}
            {!studiata && <div className="faint tiny">Quando la segni come studiata, le sue {qs.length} domande entrano nel programma di ripasso: fino a {DOMANDE_VERIFICA_INIZIALE} subito, anche oltre il limite giornaliero. Le altre verranno introdotte nei giorni successivi.</div>}
          </div>
          {concetti.length > 0 && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>Concetti della lezione</div>
              <div className="stack" style={{ gap: 6 }}>
                {concetti.map((c) => {
                  const mc = padronanza(p, idx.domandePerConcetto.get(c!.id));
                  return (
                    <a key={c!.id} href={href(`/concetto/${c!.id}`)} className="row small" style={{ gap: 8, textDecoration: 'none' }}>
                      <LivelloDot valore={mc.valore} viste={mc.viste} /> {c!.nome}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
