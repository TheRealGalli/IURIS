import { useMemo } from 'react';
import { useCorso } from '../lib/data';
import { href } from '../lib/router';
import { padronanza, pagineStudiate, pianoEsame, ripassoDiOggi, serieGiorni, statoLezione, ETICHETTA_STATO } from '../lib/srs';
import { impostaEsame, useProgresso } from '../lib/store';
import { fmtData, fmtMinuti, oggiISO, plurale, rifPagine } from '../lib/util';
import { Bar, Calendario, Icon, LivelloDot, Ring } from '../components/ui';

export default function Oggi() {
  const idx = useCorso();
  const slug = idx.corso.materia.slug;
  const p = useProgresso(slug);
  const studiate = pagineStudiate(idx, p);
  const totPag = idx.pagineTotali;
  const rip = ripassoDiOggi(idx, p);
  const piano = pianoEsame(idx, p);
  const serie = serieGiorni(p);
  const oggi = p.giorni[oggiISO()];
  const globale = padronanza(p, idx.corso.domande);
  const ultima = p.ultimaLezione ? idx.lezioneById.get(p.ultimaLezione) : undefined;
  const nRip = rip.scadute.length + rip.nuove.length;

  const deboli = useMemo(() => idx.corso.concetti
    .map((c) => ({ c, m: padronanza(p, idx.domandePerConcetto.get(c.id)) }))
    .filter((x) => x.m.viste > 0 && (x.m.valore ?? 0) < 0.45)
    .sort((a, b) => (a.m.valore ?? 0) - (b.m.valore ?? 0))
    .slice(0, 6), [idx, p]);

  const saluto = (() => { const h = new Date().getHours(); return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'; })();
  const dataLunga = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page fade-in">
      <div className="eyebrow">{dataLunga}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 22px' }}>{saluto}. <span className="faint">Si studia {idx.corso.materia.breve?.toLowerCase() ?? ''}.</span></h1>

      <div className="hero">
        <div className="card hero-main">
          <div className="row" style={{ gap: 22, alignItems: 'center' }}>
            <Ring value={totPag ? studiate / totPag : 0} size={118} stroke={11}>
              <div><b>{totPag ? Math.round((studiate / totPag) * 100) : 0}%</b><small>pagine</small></div>
            </Ring>
            <div className="stack" style={{ gap: 14, flex: 1, minWidth: 200 }}>
              <div className="row" style={{ gap: 28 }}>
                <div className="kpi"><b>{studiate}<span className="faint" style={{ fontSize: 18 }}> / {totPag}</span></b><span>pagine studiate</span></div>
                <div className="kpi"><b>{Math.round((globale.valore ?? 0) * 100)}%</b><span>padronanza</span></div>
                <div className="kpi"><b className="row" style={{ gap: 4 }}><Icon n="fiamma" size={22} />{serie}</b><span>{serie === 1 ? 'giorno di fila' : 'giorni di fila'}</span></div>
              </div>
              <EsameBox slug={slug} esame={p.esame} giorni={piano.giorni} perGiorno={piano.perGiorno} restano={piano.daStudiare.length} />
            </div>
          </div>
        </div>

        <a className="card cta-card" href={href(nRip ? '/allena?modo=ripasso' : rip.inAttesa ? '/allena?modo=libero' : '/percorso')} style={{ background: nRip ? 'var(--ink)' : undefined, color: nRip ? 'var(--bg)' : undefined }}>
          <div className="row-between">
            <span className="eyebrow" style={{ color: nRip ? 'color-mix(in srgb, var(--bg) 65%, transparent)' : undefined }}>Ripasso di oggi</span>
            <Icon n="allena" size={22} />
          </div>
          {nRip ? (
            <>
              <div className="title-l">{plurale(nRip, 'domanda', 'domande')}</div>
              <div style={{ opacity: .75 }} className="small">
                {rip.scadute.length > 0 && `${rip.scadute.length} da ripassare`}{rip.scadute.length > 0 && rip.nuove.length > 0 && ' · '}
                {rip.nuove.length > 0 && `${rip.nuove.length} nuove dalle lezioni studiate`}
                {rip.extraNuove > 0 && <div>{rip.extraNuove} di verifica sulle lezioni di oggi, oltre il limite</div>}
              </div>
              <span className="btn btn-accent" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>Inizia il ripasso <Icon n="freccia" size={16} /></span>
            </>
          ) : (
            <>
              <div className="title-m">{rip.inAttesa ? 'Nuove domande da domani' : 'Niente in scadenza'}</div>
              <div className="muted small">{rip.inAttesa ? `Hai raggiunto il limite di ${p.nuovePerGiorno} nuove per oggi. ${rip.inAttesa} restano in attesa e verranno introdotte nei prossimi giorni. Le nuove lezioni hanno comunque una verifica immediata.` : <>Le domande entrano nel ripasso quando segni una lezione come studiata.{idx.schedeInverse.length > 0 && ' Le schede inverse entrano dopo la prima risposta.'} Poi l'algoritmo decide quando riproportele.</>}</div>
              <span className="btn" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>{rip.inAttesa ? 'Continua con Quiz libero' : 'Vai al percorso'} <Icon n="freccia" size={16} /></span>
            </>
          )}
          {oggi && <div className="tiny" style={{ opacity: .7 }}>Oggi: {oggi.risposte} risposte · {oggi.lette} lezioni · {fmtMinuti(oggi.secondi)}</div>}
        </a>
      </div>

      <div className="spacer" />
      <div className="grid g2">
        <div className="card">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <h2 className="title-m">{ultima && !p.lezioni[ultima.id]?.studiata ? 'Riprendi da qui' : 'Prossime lezioni'}</h2>
            <a className="btn btn-sm btn-ghost" href={href('/percorso')}>Tutto il percorso</a>
          </div>
          {ultima && !p.lezioni[ultima.id]?.studiata && <RigaLezione id={ultima.id} evidenzia />}
          {piano.oggi.filter((l) => l.id !== ultima?.id).slice(0, 4).map((l) => <RigaLezione key={l.id} id={l.id} />)}
          {piano.daStudiare.length === 0 && <p className="muted">Hai studiato tutte le lezioni. Ora si consolida con il ripasso.</p>}
        </div>

        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <h2 className="title-m">Il tuo studio</h2>
            <a className="btn btn-sm btn-ghost" href={href('/progressi')}>Statistiche</a>
          </div>
          <Calendario p={p} />
          <hr className="sep" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>Concetti da rinforzare</div>
          {deboli.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>Qui compariranno i concetti su cui sbagli di più, così sai dove tornare.</p>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              {deboli.map(({ c, m }) => (
                <a key={c.id} className="chip" href={href(`/concetto/${c.id}`)} style={{ textDecoration: 'none' }}>
                  <LivelloDot valore={m.valore} viste={m.viste} /> {c.nome}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RigaLezione({ id, evidenzia }: { id: string; evidenzia?: boolean }) {
  const idx = useCorso();
  const p = useProgresso(idx.corso.materia.slug);
  const l = idx.lezioneById.get(id)!;
  const u = idx.unitaById.get(l.unita)!;
  const st = statoLezione(idx, p, l);
  return (
    <a className="lesson-line" href={href(`/lezione/${l.id}`)}>
      <span className={`st st-${st}`}>{st === 'padroneggiata' && <Icon n="check" size={13} stroke={3} />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lesson-line-t" style={{ fontWeight: evidenzia ? 650 : 500 }}>{l.titolo}</div>
        <div className="faint tiny">Unità {u.ordine} · {rifPagine(l)} · {l.minuti} min · {ETICHETTA_STATO[st]}</div>
      </div>
      <Icon n="freccia" size={16} />
    </a>
  );
}

function EsameBox({ slug, esame, giorni, perGiorno, restano }: {
  slug: string; esame?: string; giorni: number | null; perGiorno: number | null; restano: number;
}) {
  if (!esame) {
    return (
      <label className="row small muted" style={{ gap: 8 }}>
        <Icon n="calendario" size={16} /> Data dell'esame:
        <input className="input" type="date" min={oggiISO()} onChange={(e) => impostaEsame(slug, e.target.value || undefined)} style={{ padding: '5px 8px' }} />
      </label>
    );
  }
  return (
    <div className="card-flat" style={{ padding: '10px 14px' }}>
      <div className="row-between">
        <div className="row" style={{ gap: 8 }}>
          <Icon n="calendario" size={16} />
          <b>{giorni! > 0 ? `${giorni} giorni all'esame` : giorni === 0 ? 'Esame oggi!' : 'Esame passato'}</b>
          <span className="faint small">· {fmtData(esame, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => impostaEsame(slug, undefined)}>Cambia</button>
      </div>
      {giorni! > 0 && restano > 0 && (
        <div className="small muted" style={{ marginTop: 4 }}>
          Ritmo consigliato: <b>{plurale(perGiorno ?? 0, 'lezione', 'lezioni')} al giorno</b> ({restano} da studiare), ultimi giorni solo ripasso.
        </div>
      )}
      {giorni! > 0 && <div style={{ marginTop: 8 }}><Bar value={1 - Math.min(1, giorni! / 60)} tone="accent" thin /></div>}
    </div>
  );
}
