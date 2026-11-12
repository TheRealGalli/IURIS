import { useMemo, useState } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import { livello, padronanza, pagineStudiate, prossimaScadenza, serieGiorni } from '../lib/srs';
import { azzera, DOMANDE_VERIFICA_INIZIALE, haAttivita, impostaEsame, impostaNuove, scriviPref, usePref, useProgresso } from '../lib/store';
import { TIPI_DOMANDA, type TipoDomanda } from '../lib/types';
import { fmtData, fmtMinuti, isoDi, oggiISO } from '../lib/util';
import { Bar, Calendario, Icon, LivelloDot, SceltaData, useToast } from '../components/ui';

export default function Progressi() {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const p = useProgresso(slug);
  const pref = usePref();
  const toast = useToast();

  const totali = useMemo(() => {
    let risposte = 0, corrette = 0, secondi = 0, giorni = 0;
    for (const g of Object.values(p.giorni)) { risposte += g.risposte; corrette += g.corrette; secondi += g.secondi; if (haAttivita(g)) giorni++; }
    return { risposte, corrette, secondi, giorni };
  }, [p]);

  const ultimi14 = useMemo(() => {
    const out: { iso: string; r: number; c: number }[] = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const iso = isoDi(d); const g = p.giorni[iso]; out.push({ iso, r: g?.risposte ?? 0, c: g?.corrette ?? 0 }); }
    return out;
  }, [p]);
  const maxR = Math.max(10, ...ultimi14.map((x) => x.r));
  // giorno scelto nel calendario o nelle barre (all'inizio oggi): se ne mostra il dettaglio
  const [giorno, setGiorno] = useState(oggiISO());
  const gg = p.giorni[giorno];

  const perTipo = useMemo(() => {
    const m = new Map<TipoDomanda, { n: number; giuste: number }>();
    for (const q of idx.domandaById.values()) {
      const e = p.esiti[q.id];
      if (!e) continue;
      const x = m.get(q.tipo) ?? { n: 0, giuste: 0 };
      x.n += e.n; x.giuste += e.giuste; m.set(q.tipo, x);
    }
    return m;
  }, [idx, p]);

  const distribuzione = useMemo(() => {
    const d = { forte: 0, medio: 0, debole: 0, ignoto: 0 };
    for (const c of idx.corso.concetti) {
      const m = padronanza(p, idx.domandePerConcetto.get(c.id));
      if (!m.totali) continue;
      d[livello(m.media, m.viste)]++;
    }
    return d;
  }, [idx, p]);
  const totConc = distribuzione.forte + distribuzione.medio + distribuzione.debole + distribuzione.ignoto;
  const prossima = prossimaScadenza(p);

  return (
    <div className="page fade-in">
      <div className="eyebrow">{idx.corso.materia.nome}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 18px' }}>Progressi</h1>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card kpi"><b>{pagineStudiate(idx, p)}<span className="faint" style={{ fontSize: 17 }}>/{idx.pagineTotali}</span></b><span>pagine studiate</span></div>
        <div className="card kpi"><b>{totali.risposte}</b><span>risposte date · {totali.risposte ? Math.round((totali.corrette / totali.risposte) * 100) : 0}% giuste</span></div>
        <div className="card kpi"><b>{fmtMinuti(totali.secondi)}</b><span>tempo di lettura</span></div>
        <div className="card kpi"><b>{serieGiorni(p)}</b><span>giorni di fila · {totali.giorni} in tutto</span></div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3 className="title-s" style={{ marginBottom: 10 }}>Attività</h3>
          <Calendario p={p} sel={giorno} onSelect={setGiorno} />
          <div className="giorno-box small">
            <b>{giorno === oggiISO() ? 'Oggi' : fmtData(giorno, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
            {gg && (gg.risposte || gg.lette || gg.secondi)
              ? <span className="muted"> · {gg.risposte} risposte ({gg.corrette} giuste) · {gg.lette} {gg.lette === 1 ? 'lezione' : 'lezioni'} · {fmtMinuti(gg.secondi)} di lettura</span>
              : <span className="faint"> · nessuna attività</span>}
          </div>
          <div className="bars14" aria-label="Risposte degli ultimi 14 giorni">
            {ultimi14.map((x) => (
              <button key={x.iso} className={`b14 ${x.iso === giorno ? 'on' : ''}`} onClick={() => setGiorno(x.iso)}
                title={`${fmtData(x.iso, { weekday: 'long', day: 'numeric', month: 'long' })}: ${x.r} risposte, ${x.c} giuste`}>
                <span className="n">{x.r || ''}</span>
                <span className="area">
                  <span className="col" style={{ height: `${(x.r / maxR) * 100}%` }}>
                    <span className="ok" style={{ height: x.r ? `${(x.c / x.r) * 100}%` : 0 }} />
                  </span>
                </span>
                <span className="d">{fmtData(x.iso, { day: 'numeric' })}</span>
              </button>
            ))}
          </div>
          <div className="faint tiny" style={{ marginTop: 4 }}>Ultimi 14 giorni: altezza = risposte date, in verde quelle giuste. Tocca un giorno per il dettaglio.</div>
          {prossima && <p className="small muted" style={{ marginBottom: 0 }}>Prossima domanda in scadenza: {prossima <= new Date() ? 'adesso' : prossima.toLocaleString('it-IT', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>

        <div className="card" data-tour="concetti">
          <h3 className="title-s" style={{ marginBottom: 10 }}>Concetti</h3>
          {totConc ? (
            <>
              <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', background: 'var(--bg-2)' }}>
                {(['forte', 'medio', 'debole'] as const).map((k) => <div key={k} className={`lv-${k}`} style={{ width: `${(distribuzione[k] / totConc) * 100}%`, background: 'var(--lv)' }} />)}
              </div>
              <div className="row small" style={{ gap: 14, marginTop: 8 }}>
                <span className="row" style={{ gap: 5 }}><span className="dot lv-forte" /> {distribuzione.forte} li sai</span>
                <span className="row" style={{ gap: 5 }}><span className="dot lv-medio" /> {distribuzione.medio} così così</span>
                <span className="row" style={{ gap: 5 }}><span className="dot lv-debole" /> {distribuzione.debole} da ripassare</span>
                <span className="row faint" style={{ gap: 5 }}><span className="dot lv-ignoto" /> {totConc - distribuzione.forte - distribuzione.medio - distribuzione.debole} mai visti</span>
              </div>
            </>
          ) : <p className="muted small">Rispondi a qualche domanda per vedere come stai sui concetti.</p>}
          <hr className="sep" />
          <h3 className="title-s" style={{ marginBottom: 8 }}>Per tipo di domanda</h3>
          {perTipo.size === 0 && <p className="muted small" style={{ margin: 0 }}>Ancora nessuna risposta.</p>}
          <div className="stack" style={{ gap: 8 }}>
            {[...perTipo.entries()].map(([t, x]) => (
              <div key={t}>
                <div className="row-between small"><span>{TIPI_DOMANDA[t]}</span><span className="faint">{Math.round((x.giuste / x.n) * 100)}% su {x.n}</span></div>
                <Bar value={x.giuste / x.n} tone="ok" thin />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="title-s" style={{ marginBottom: 12 }}>Per unità</h3>
        <div className="stack" style={{ gap: 10 }}>
          {idx.corso.unita.map((u) => {
            const qs = u.lezioni.flatMap((l) => idx.domandePerLezione.get(l.id) ?? []);
            const m = padronanza(p, qs);
            const fatte = u.lezioni.filter((l) => p.lezioni[l.id]?.studiata).length;
            return (
              <a key={u.id} href={href(`/allena?u=${u.id}`)} className="row" style={{ gap: 12, textDecoration: 'none' }}>
                <span className="faint small" style={{ width: 22 }}>{u.ordine}</span>
                <span style={{ flex: 1, minWidth: 140 }} className="small">{u.titolo}</span>
                <span className="faint tiny" style={{ width: 70 }}>{fatte}/{u.lezioni.length} lezioni</span>
                <div style={{ width: 160 }}><Bar value={m.valore ?? 0} tone="ok" thin /></div>
                <span className="row tiny" style={{ gap: 5, width: 48 }}><LivelloDot valore={m.media} viste={m.viste} />{Math.round((m.valore ?? 0) * 100)}%</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16, gap: 14 }}>
          <h3 className="title-s">Impostazioni</h3>
          <div className="row-between small">Data dell'esame
            <SceltaData etichetta="Data dell'esame" value={p.esame} onChange={(d) => impostaEsame(slug, d)} />
          </div>
          <label className="row-between small">Domande nuove al giorno
            <select className="select" value={p.nuovePerGiorno} onChange={(e) => impostaNuove(slug, Number(e.target.value))}>
              {[10, 15, 25, 35, 40, 60, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <p className="faint tiny" style={{ margin: 0 }}>Il limite delle nuove vale per questa materia e si rinnova ogni giorno. I ripassi in scadenza sono sempre inclusi; ogni lezione appena studiata può aggiungere fino a {DOMANDE_VERIFICA_INIZIALE} domande di verifica.</p>
          <label className="row-between small">Tema
            <select className="select" value={pref.tema ?? 'auto'} onChange={(e) => scriviPref({ tema: e.target.value as 'auto' | 'chiaro' | 'scuro' })}>
              <option value="auto">Automatico</option><option value="chiaro">Chiaro</option><option value="scuro">Scuro</option>
            </select>
          </label>
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--bad)' }}
            onClick={() => { if (confirm('Azzerare tutti i progressi di questa materia? Non si può annullare (scarica prima un backup).')) { azzera(slug); toast.show('Progressi azzerati'); } }}>
            Azzera i progressi
          </button>
      </div>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <a className="card cta-card" href={href('/cronologia')}><Icon n="cronologia" size={22} /><b className="title-s">Cronologia</b><span className="muted small">{idx.corso.eventi.length} eventi su una linea del tempo</span></a>
        <a className="card cta-card" href={href('/glossario')}><Icon n="glossario" size={22} /><b className="title-s">Glossario</b><span className="muted small">{idx.corso.concetti.length} voci ricercabili</span></a>
        <a className="card cta-card" href={href('/originali')}><Icon n="libro" size={22} /><b className="title-s">Originali</b><span className="muted small">Appunti originali da leggere, evidenziare e sottolineare</span></a>
      </div>
      <section className="stack" style={{ marginTop: 28 }} aria-label="Strumenti per tutte le materie">
        <h2 className="eyebrow">Tutte le materie</h2>
        <div className="grid g2">
          <a className="card cta-card" href={href('/backup')}><Icon n="backup" size={22} /><b className="title-s">Backup completo</b><span className="muted small">Un solo file per l’intero archivio: progressi, mappe personali e segni di tutte le materie.</span></a>
          <a className="card cta-card" href={href('/demo')}><Icon n="demo" size={22} /><b className="title-s">Demo interattiva</b><span className="muted small">Scopri come studiare, leggere le statistiche e proteggere i tuoi progressi.</span></a>
        </div>
      </section>
      {toast.el}
    </div>
  );
}
