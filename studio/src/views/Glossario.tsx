import { useMemo, useState } from 'react';
import { norm, useCorso } from '../lib/data';
import { href } from '../lib/router';
import { padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { TIPI_CONCETTO, TIPO_SINGOLARE, type TipoConcetto } from '../lib/types';
import { LivelloDot } from '../components/ui';

export default function Glossario() {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<TipoConcetto | ''>('');
  const [unita, setUnita] = useState('');
  const [soloDeboli, setSoloDeboli] = useState(false);

  const lista = useMemo(() => {
    const n = norm(q);
    return idx.corso.concetti
      .filter((c) => !tipo || c.tipo === tipo)
      .filter((c) => !unita || c.unita.includes(unita))
      .filter((c) => !n || norm([c.nome, c.latino ?? '', ...c.alias, c.breve].join(' ')).includes(n))
      .map((c) => ({ c, m: padronanza(p, idx.domandePerConcetto.get(c.id)) }))
      .filter((x) => !soloDeboli || (x.m.viste > 0 && (x.m.valore ?? 0) < 0.45));
  }, [idx, p, q, tipo, unita, soloDeboli]);

  const lettere = useMemo(() => {
    const m = new Map<string, number>();
    for (const { c } of lista) { const l = norm(c.nome)[0]?.toUpperCase() ?? '#'; m.set(l, (m.get(l) ?? 0) + 1); }
    return m;
  }, [lista]);
  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of idx.corso.concetti) m.set(c.tipo, (m.get(c.tipo) ?? 0) + 1);
    return m;
  }, [idx]);

  let lettera = '';
  return (
    <div className="page fade-in">
      <div className="eyebrow">{idx.corso.concetti.length} voci</div>
      <div className="row-between" style={{ gap: 12, margin: '6px 0 16px', flexWrap: 'wrap' }}>
        <h1 className="title-xl">Glossario</h1>
        {idx.schedeInverse.length > 0 && <a className="btn" href={href('/allena?modo=inverse')}>Schede inverse · {idx.schedeInverse.length} termini</a>}
      </div>
      <div className="card stack" style={{ gap: 12, marginBottom: 18 }}>
        <input className="input input-lg" type="search" placeholder="Cerca un termine, anche in latino… (es. imperium, pretore, mancipatio)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip ${tipo === '' ? 'on' : ''}`} onClick={() => setTipo('')}>Tutti</button>
          {(Object.keys(TIPI_CONCETTO) as TipoConcetto[]).filter((t) => conteggi.has(t)).map((t) => (
            <button key={t} className={`chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(tipo === t ? '' : t)}>{TIPI_CONCETTO[t]} <span className="faint">{conteggi.get(t)}</span></button>
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <select className="select" value={unita} onChange={(e) => setUnita(e.target.value)}>
            <option value="">Tutte le unità</option>
            {idx.corso.unita.map((u) => <option key={u.id} value={u.id}>{u.ordine}. {u.titolo.slice(0, 44)}</option>)}
          </select>
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloDeboli} onChange={(e) => setSoloDeboli(e.target.checked)} /> Solo quelli che sbaglio
          </label>
          <div className="az" style={{ marginLeft: 'auto' }}>
            {'ABCDEFGHILMNOPQRSTUVZ'.split('').map((l) => (
              <button key={l} disabled={!lettere.has(l)} onClick={() => document.getElementById(`lettera-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {lista.length === 0 && <div className="empty">Nessun termine trovato.</div>}
      <div className="grid g3">
        {lista.map(({ c, m }) => {
          const l = norm(c.nome)[0]?.toUpperCase() ?? '#';
          const nuova = l !== lettera;
          lettera = l;
          return (
            <a key={c.id} id={nuova ? `lettera-${l}` : undefined} className="card term" href={href(`/concetto/${c.id}`)} style={{ scrollMarginTop: 80 }}>
              <div className="row-between">
                <span className="eyebrow">{TIPO_SINGOLARE[c.tipo]}</span>
                {m.totali > 0 && <LivelloDot valore={m.valore} viste={m.viste} />}
              </div>
              <span className="term-name">{c.nome}</span>
              {c.latino && c.latino !== c.nome && <span className="faint small" style={{ fontStyle: 'italic', marginTop: -4 }}>{c.latino}</span>}
              <span className="muted small">{c.breve}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
