import { useMemo, useState } from 'react';
import { norm, useCorso } from '../lib/data';
import { href } from '../lib/router';
import { livello, padronanza } from '../lib/srs';
import { useProgresso } from '../lib/store';
import { TIPI_CONCETTO, TIPO_SINGOLARE, type TipoConcetto } from '../lib/types';
import MobileSheet, { useCompact } from '../components/MobileSheet';
import { inDemo } from '../lib/archivio';
import { Icon, LivelloDot } from '../components/ui';

export default function Glossario() {
  const compact = useCompact();
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      .filter((x) => !soloDeboli || livello(x.m.media, x.m.viste) === 'debole');
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

  const filtriTipi = (<div className="row" style={{ gap: 6 }}>
          <button className={`chip ${tipo === '' ? 'on' : ''}`} onClick={() => setTipo('')}>Tutti</button>
          {(Object.keys(TIPI_CONCETTO) as TipoConcetto[]).filter((t) => conteggi.has(t)).map((t) => (
            <button key={t} className={`chip ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(tipo === t ? '' : t)}>{TIPI_CONCETTO[t]} <span className="faint">{conteggi.get(t)}</span></button>
          ))}
        </div>);
  const filtriUnita = (<>
          <select className="select" aria-label="Unità del glossario" value={unita} onChange={(e) => setUnita(e.target.value)}>
            <option value="">Tutte le unità</option>
            {idx.corso.unita.map((u) => <option key={u.id} value={u.id}>{u.ordine}. {u.titolo.slice(0, 44)}</option>)}
          </select>
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloDeboli} onChange={(e) => setSoloDeboli(e.target.checked)} /> Solo quelli che sbaglio
          </label>
        </>);
  const filtri = (<div className="stack" style={{ gap: 18 }}>{filtriTipi}<div className="stack" style={{ gap: 10 }}>{filtriUnita}</div></div>);
  const alfabeto = (<div className="az" style={{ marginLeft: 'auto' }}>
            {'ABCDEFGHILMNOPQRSTUVZ'.split('').map((l) => (
              <button key={l} disabled={!lettere.has(l)} onClick={() => document.getElementById(`lettera-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{l}</button>
            ))}
          </div>);

  let lettera = '';
  return (
    <div className="page fade-in">
      <div className="eyebrow">{idx.corso.concetti.length} voci</div>
      <div className="row-between" style={{ gap: 12, margin: '6px 0 16px', flexWrap: 'wrap' }}>
        <h1 className="title-xl">Glossario</h1>
        {idx.schedeInverse.length > 0 && <a className="btn" href={href('/allena?modo=inverse')}>Schede inverse · {idx.schedeInverse.length} termini</a>}
      </div>
      <div className="card stack glossary-search" style={{ gap: 12, marginBottom: 18 }}>
        <input className="input input-lg" type="search" aria-label="Cerca nel glossario" placeholder="Cerca un termine, anche in latino… (es. imperium, pretore, mancipatio)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={!matchMedia('(pointer: coarse)').matches} />
        {compact ? <>
          <button className="mobile-glossary-filters" onClick={() => setFiltersOpen(true)}><Icon n="filtri" size={18} />Filtri{(tipo || unita || soloDeboli) && <span className="mobile-current" />}<span className="faint">{lista.length} voci</span></button>
          <MobileSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtra il glossario" className="mobile-glossary-sheet" modal={!inDemo()}>{filtri}<button className="btn btn-primary mobile-map-done" onClick={() => setFiltersOpen(false)}>Mostra {lista.length} voci<Icon n="freccia" size={17} /></button></MobileSheet>
        </> : <>{filtriTipi}<div className="row" style={{ gap: 10 }}>{filtriUnita}{alfabeto}</div></>}
        {compact && alfabeto}
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
                {m.totali > 0 && <LivelloDot valore={m.media} viste={m.viste} />}
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
