import { useState } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import { ETICHETTA_STATO, padronanza, pagineStudiate, statoLezione } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { rifPagine } from '../lib/util';
import { Bar, Icon, LivelloDot } from '../components/ui';

export default function Percorso() {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [aperte, setAperte] = useState<Record<string, boolean>>(() => {
    const prima = idx.corso.unita.find((u) => u.lezioni.some((l) => !p.lezioni[l.id]?.studiata));
    return prima ? { [prima.id]: true } : {};
  });
  // l'avviso «Da sapere» dell'unità resta nascosto finché non si tocca il triangolino
  const [noteAperte, setNoteAperte] = useState<Record<string, boolean>>({});
  const m = idx.corso.materia;
  const studiate = pagineStudiate(idx, p);

  return (
    <div className="page-narrow fade-in">
      <div className="eyebrow">{[m.docente, m.manuale].filter(Boolean).join(' · ')}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 6px' }}>Il percorso</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {idx.corso.unita.length} unità, {idx.lezioni.length} lezioni, {idx.pagineTotali} pagine di appunti.
        Studia una lezione, segnala come studiata e le sue domande entrano nel ripasso.
      </p>
      <div className="card-flat row" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="row-between small"><b>{studiate} / {idx.pagineTotali} pagine studiate</b><span className="faint">{Math.round((studiate / Math.max(1, idx.pagineTotali)) * 100)}%</span></div>
          <div style={{ marginTop: 6 }}><Bar value={studiate / Math.max(1, idx.pagineTotali)} tone="ok" /></div>
        </div>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {idx.corso.unita.map((u) => {
          const fatte = u.lezioni.filter((l) => p.lezioni[l.id]?.studiata).length;
          const qs = u.lezioni.flatMap((l) => idx.domandePerLezione.get(l.id) ?? []);
          const mu = padronanza(p, qs);
          const open = !!aperte[u.id];
          const minuti = u.lezioni.reduce((s, l) => s + (l.minuti || 0), 0);
          return (
            <div key={u.id} className={`card unit ${fatte === u.lezioni.length ? 'done' : ''}`}>
              <div className="unit-head" onClick={() => setAperte((a) => ({ ...a, [u.id]: !open }))}>
                <div className="unit-num">{fatte === u.lezioni.length ? <Icon n="check" stroke={2.6} /> : u.ordine}</div>
                <div className="unit-body">
                  <div className="faint tiny">
                    {u.capitolo} · {rifPagine(u)} · {minuti} min
                    {u.ricostruita && <span className="chip chip-gold" style={{ marginLeft: 8 }} title="Gli appunti non trattano questo capitolo">ricostruita dal manuale</span>}
                  </div>
                  <h3 className="title-s" style={{ margin: '2px 0 6px' }}>{u.titolo}</h3>
                  {open && <p className="muted small" style={{ margin: '0 0 8px' }}>{u.abstract}</p>}
                  <div className="row" style={{ gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 120, maxWidth: 260 }}><Bar value={fatte / u.lezioni.length} thin tone="ok" /></div>
                    <span className="faint tiny">{fatte}/{u.lezioni.length} lezioni</span>
                    {mu.viste > 0 && <span className="row tiny faint" style={{ gap: 5 }}><LivelloDot valore={mu.media} viste={mu.viste} /> {Math.round((mu.valore ?? 0) * 100)}%</span>}
                    {u.note && open && (
                      <button className={`nota-btn ${noteAperte[u.id] ? 'on' : ''}`} title="Da sapere su questa unità"
                        aria-label="Da sapere su questa unità" aria-expanded={!!noteAperte[u.id]}
                        onClick={(e) => { e.stopPropagation(); setNoteAperte((n) => ({ ...n, [u.id]: !n[u.id] })); }}>
                        <Icon n="avviso" size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <span className="faint" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}><Icon n="giu" /></span>
              </div>
              {open && (
                <div className="unit-lessons">
                  {u.note && noteAperte[u.id] && <div className="small muted fade-in" style={{ padding: '10px 20px', background: 'var(--gold-soft)' }}>{u.note}</div>}
                  {u.lezioni.map((l) => {
                    const st = statoLezione(idx, p, l);
                    const nq = idx.domandePerLezione.get(l.id)?.length ?? 0;
                    return (
                      <a key={l.id} className="unit-lesson" href={href(`/lezione/${l.id}`)}>
                        <span className={`st st-${st}`}>{st !== 'nuova' && <Icon n="check" size={12} stroke={3} />}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 550 }}>{l.titolo}</div>
                          <div className="faint tiny">{rifPagine(l)} · {l.minuti} min · {nq} domande</div>
                        </div>
                        <span className={`chip ${st === 'padroneggiata' ? 'chip-ok' : st === 'in-ripasso' ? 'chip-mid' : st === 'studiata' ? 'chip-gold' : ''}`}>{ETICHETTA_STATO[st]}</span>
                      </a>
                    );
                  })}
                  <div className="row" style={{ padding: '12px 20px', gap: 8 }}>
                    <a className="btn btn-sm" href={href(`/mappa?u=${u.id}`)}><Icon n="mappa" size={15} /> Mappa dell'unità</a>
                    <a className="btn btn-sm" href={href(`/allena?u=${u.id}`)}><Icon n="allena" size={15} /> Quiz sull'unità</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
