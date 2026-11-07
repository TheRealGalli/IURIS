import { memo, useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import type { NodoGeo } from '../lib/mappa-geometrica';
import { primoSegno } from '../lib/mappa-geometrica';
import type { SezioneGeo } from '../lib/letture-hooks';
import { linkTesto } from '../lib/letture-client';
import { Icon } from './ui';
import './MappaGeometrica.css';

interface Props {
  sezioni: SezioneGeo[];
  /** Nel pannello degli Originali: parte dalla lezione che si sta leggendo. */
  compatta?: boolean;
  sezioneIniziale?: string;
  onApri: (href: string) => void;
  totale?: number;
  nonCollegati?: number;
}

const accorcia = (t: string, n: number) => t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
/** Colonne dell'albero aperto: servono a dividere la larghezza disponibile fra i livelli. */
const livelli = (nodi: NodoGeo[], chiusi: Set<string>): number => nodi.reduce((m, x) => Math.max(m, 1 + (chiusi.has(x.id) ? 0 : livelli(x.figli, chiusi))), 0);
const contaNodi = (nodi: NodoGeo[]): number => nodi.reduce((n, x) => n + (x.segnato ? 1 : 0) + contaNodi(x.figli), 0);

function Nodo({ n, sezione, modo, chiusi, alterna, apri }: { n: NodoGeo; sezione: SezioneGeo; modo: 'albero' | 'schema'; chiusi: Set<string>; alterna: (id: string) => void; apri: (e: MouseEvent, href: string) => void }) {
  const segno = primoSegno(n), u = n.unita;
  const href = linkTesto(sezione.documento, sezione.sezione, u.blocco, segno);
  const chiuso = chiusi.has(n.id), haFigli = n.figli.length > 0;
  const etichetta = n.segnato ? n.pezzi.map((p) => p.testo).join('') : u.testo;
  const scheda = <div className="mg-nodo-riga">
    <a className={`mg-nodo mg-${u.tipo}${u.tipo === 'titolo' ? ` mg-h${u.livello}` : ''}${n.segnato ? ' mg-segnato' : ' mg-antenato'}`}
      href={href} onClick={(e) => apri(e, href)} title={u.testo}
      aria-label={`${n.segnato ? 'Parte segnata' : 'Contiene parti segnate'}: ${accorcia(etichetta, 160)}. Apri nel testo`}>
      {u.numero && <span className="mg-numero">{u.numero}</span>}
      <span className="mg-testo">{n.segnato
        ? n.pezzi.map((p, i) => p.segnato
          ? <span key={i} className={`mg-segno${p.colore ? ` ev-${p.colore}` : ''}${p.linea ? ` li-${p.linea}` : ''}`}>{p.testo}</span>
          : <span key={i} className="mg-attorno">{p.testo}</span>)
        : accorcia(u.testo, u.tipo === 'titolo' ? 90 : 110)}</span>
    </a>
    {haFigli && <button className="mg-piega" aria-expanded={!chiuso} aria-label={chiuso ? `Mostra ${n.figli.length} sotto-parti` : 'Nascondi le sotto-parti'} onClick={() => alterna(n.id)}>{chiuso ? n.figli.length : '−'}</button>}
  </div>;
  if (modo === 'schema') return <li>{scheda}{haFigli && !chiuso && <ul>{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} />)}</ul>}</li>;
  return <div className="mg-ramo">{scheda}{haFigli && !chiuso && <div className="mg-figli">{n.figli.map((f) => <Nodo key={f.id} n={f} sezione={sezione} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} />)}</div>}</div>;
}

function MappaGeometrica({ sezioni, compatta = false, sezioneIniziale, onApri, totale, nonCollegati = 0 }: Props) {
  const iniziale = sezioneIniziale && sezioni.some((s) => s.chiave === sezioneIniziale) ? sezioneIniziale : '';
  const [scelta, setScelta] = useState(compatta ? iniziale : '');
  const [modo, setModo] = useState<'albero' | 'schema'>(compatta ? 'schema' : 'albero');
  const [aperte, setAperte] = useState<Set<string>>(() => new Set(sezioni.slice(0, 1).map((s) => s.chiave)));
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  useEffect(() => { if (compatta && iniziale && !scelta) setScelta(iniziale); }, [compatta, iniziale]);
  useEffect(() => { if (scelta && !sezioni.some((s) => s.chiave === scelta)) setScelta(''); }, [sezioni, scelta]);
  useEffect(() => { setAperte((a) => a.size ? a : new Set(sezioni.slice(0, 1).map((s) => s.chiave))); }, [sezioni.length > 0]);
  const visibili = useMemo(() => scelta ? sezioni.filter((s) => s.chiave === scelta) : sezioni, [sezioni, scelta]);
  const documenti = useMemo(() => [...new Map(sezioni.map((s) => [s.documento, s.docTitolo]))], [sezioni]);
  const alterna = (id: string) => setChiusi((c) => { const s = new Set(c); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const apri = (e: MouseEvent, href: string) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onApri(href); };
  const parti = sezioni.reduce((n, s) => n + s.segnati, 0);

  if (!sezioni.length) return <section className="mappa-geo"><div className="mg-vuota"><Icon n="mappa" size={26} /><p className="muted small">Evidenzia o sottolinea un passaggio negli Originali: qui comparirà nella forma del testo, con i titoli e gli elenchi che lo contengono.</p></div></section>;
  return <section className={`mappa-geo${compatta ? ' mg-compatta' : ''}`} aria-label="Mappa personale nella struttura del testo">
    <div className="mg-barra">
      <select className="select" aria-label="Scegli la lezione" value={scelta} onChange={(e) => { setScelta(e.target.value); if (e.target.value) setAperte((a) => new Set([...a, e.target.value])); }}>
        <option value="">Tutte le lezioni ({sezioni.length})</option>
        {documenti.map(([doc, titolo]) => <optgroup key={doc} label={titolo}>{sezioni.filter((s) => s.documento === doc).map((s) => <option key={s.chiave} value={s.chiave}>{accorcia(s.titolo, 70)} · {s.segnati}</option>)}</optgroup>)}
      </select>
      <div className="mg-vista" aria-label="Forma della mappa">
        <button className={`btn btn-sm ${modo === 'albero' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'albero'} onClick={() => setModo('albero')}>Albero</button>
        <button className={`btn btn-sm ${modo === 'schema' ? 'mg-attivo' : 'btn-ghost'}`} aria-pressed={modo === 'schema'} onClick={() => setModo('schema')}>Schema</button>
      </div>
      <div className="mg-azioni">
        <button className="btn btn-sm btn-ghost" onClick={() => { setAperte(new Set(sezioni.map((s) => s.chiave))); setChiusi(new Set()); }}>Apri tutto</button>
        <button className="btn btn-sm btn-ghost" onClick={() => setAperte(new Set())}>Chiudi tutto</button>
      </div>
    </div>
    <p className="mg-spiegazione small muted">La mappa ha la forma del testo: titoli, paragrafi ed elenchi nell’ordine in cui sono scritti. Compaiono solo le parti che hai segnato; in grigio i titoli e i paragrafi che le contengono. Evidenziature e sottolineature restano come nel testo.</p>
    <div className="mg-corpo">
      {visibili.map((s) => {
        const aperta = aperte.has(s.chiave) || !!scelta;
        return <article key={s.chiave} className="mg-lezione">
          <button className="mg-lezione-testa" aria-expanded={aperta} onClick={() => setAperte((a) => { const x = new Set(a); if (x.has(s.chiave)) x.delete(s.chiave); else x.add(s.chiave); return x; })}>
            <Icon n={aperta ? 'giu' : 'freccia'} size={14} />
            <span className="mg-lezione-titolo">{s.titolo}</span>
            <span className="tiny faint">{documenti.length > 1 ? `${accorcia(s.docTitolo, 34)} · ` : ''}pp. {s.da}{s.a !== s.da ? `–${s.a}` : ''} · {s.segnati} {s.segnati === 1 ? 'parte segnata' : 'parti segnate'}</span>
          </button>
          {aperta && (modo === 'albero'
            ? <div className="mg-albero" style={{ '--mg-livelli': livelli(s.radici, chiusi) } as CSSProperties}><div className="mg-albero-dentro">{s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} />)}</div></div>
            : <ul className="mg-schema">{s.radici.map((n) => <Nodo key={n.id} n={n} sezione={s} modo={modo} chiusi={chiusi} alterna={alterna} apri={apri} />)}</ul>)}
        </article>;
      })}
    </div>
    <footer className="mg-footer tiny faint" role="status">
      {parti} {parti === 1 ? 'parte segnata' : 'parti segnate'} in {sezioni.length} {sezioni.length === 1 ? 'lezione' : 'lezioni'}{totale !== undefined ? ` · ${totale} segni` : ''}
      {nonCollegati > 0 && ` · ${nonCollegati} ${nonCollegati === 1 ? 'segno resta' : 'segni restano'} solo nell’elenco (dal PDF o da verificare)`}
      {scelta && visibili[0] && ` · ${contaNodi(visibili[0].radici)} in questa lezione`}
    </footer>
  </section>;
}

export default memo(MappaGeometrica);
