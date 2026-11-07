import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bar, Icon } from '../components/ui';
import { caricaCorso, type Indice } from '../lib/data';
import { padronanza, pagineStudiate } from '../lib/srs';
import { esportaTutto, importaTutto, ispezionaBackup, riepilogoBackup, useProgresso, type RiepilogoBackup } from '../lib/store';
import type { MateriaInfo } from '../lib/types';
import './Backup.css';

type Anteprima = { nome: string; json: string; riepilogo: RiepilogoBackup };

export default function Backup({ materie, materia }: { materie: MateriaInfo[]; materia: string }) {
  useLayoutEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dati, setDati] = useState(() => { try { return riepilogoBackup(); } catch { return null; } });
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState(dati ? '' : 'Non è possibile leggere tutti i dati del browser. È comunque possibile caricare un backup da ripristinare.');
  const [leggendo, setLeggendo] = useState(false);
  const [indici, setIndici] = useState<Map<string, Indice>>(new Map());
  const [caricando, setCaricando] = useState(true);
  const nomeMateria = (slug: string) => materie.find((m) => m.slug === slug)?.nome ?? slug.replace(/-/g, ' ');
  const daMostrare = [...new Set([...materie.filter((m) => m.disponibile).map((m) => m.slug), ...(dati?.materie ?? [])])];
  useEffect(() => {
    let annullato = false;
    setCaricando(true);
    const disponibili = materie.filter((m) => m.disponibile && m.file);
    Promise.allSettled(disponibili.map(async (m) => [m.slug, await caricaCorso(m.file!)] as const)).then((risultati) => {
      if (annullato) return;
      setIndici(new Map(risultati.flatMap((r) => r.status === 'fulfilled' ? [r.value] : [])));
      setCaricando(false);
    });
    return () => { annullato = true; };
  }, [materie]);

  function scarica() {
    setErrore(''); setMessaggio('');
    try {
      const json = esportaTutto();
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'formaiuris-backup.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDati(riepilogoBackup()); setMessaggio('Backup completo preparato: un unico file con tutte le materie e le annotazioni.');
    } catch (e) { setErrore((e as Error).message); }
  }

  function ripristina() {
    if (!anteprima) return;
    setErrore(''); setMessaggio('');
    try {
      const esito = importaTutto(anteprima.json, materia);
      setAnteprima(null);
      try { setDati(riepilogoBackup()); } catch { setDati(null); }
      setMessaggio(`Backup ripristinato: ${esito.materie.length} ${esito.materie.length === 1 ? 'materia' : 'materie'}, ${esito.segni} segni.`);
    } catch (e) { setErrore((e as Error).message); }
  }

  return <div className="page backup-page fade-in">
    <div className="eyebrow">Archivio dello studio</div>
    <h1 className="title-xl" style={{ margin: '6px 0 12px' }}>Backup</h1>
    <p className="muted backup-intro">Un unico file per salvare e ripristinare tutti i dati di Forma Iuris, per tutte le materie.</p>
    <div className="grid g2 backup-azioni">
      <section className="card stack">
        <Icon n="backup" size={28} />
        <h2 className="title-m">Backup completo</h2>
        <p className="muted small">Include progressi, storico delle risposte, ripassi, calendario, esami, annotazioni degli Originali, posizioni di lettura e preferenze.</p>
        {dati && <div className="backup-materie" aria-label="Progressi per materia">
          {daMostrare.map((slug) => <RigaMateria key={slug} slug={slug} nome={nomeMateria(slug)} idx={indici.get(slug)} caricando={caricando} />)}
        </div>}
        {dati && <p className="tiny faint">{dati.segni} {dati.segni === 1 ? 'annotazione salvata' : 'annotazioni salvate'} · tutte incluse nello stesso file.</p>}
        <button className="btn btn-primary" onClick={scarica}><Icon n="scarica" size={17} />Scarica backup completo</button>
        <p className="tiny faint">Un file .json, anche per le materie aggiunte in futuro e i quiz in sospeso. È sufficiente conservare la copia più recente.</p>
      </section>
      <section className="card stack">
        <Icon n="carica" size={28} />
        <h2 className="title-m">Ripristina il backup</h2>
        <p className="muted small">Il caricamento di un solo file ripristina tutte le materie e le annotazioni incluse. Il contenuto viene verificato e mostrato prima del ripristino.</p>
        <button className="btn" disabled={leggendo} onClick={() => fileRef.current?.click()}><Icon n="carica" size={17} />{leggendo ? 'Lettura del file…' : 'Carica backup'}</button>
        <input ref={fileRef} type="file" accept=".json,application/json" aria-label="File di backup" hidden onChange={async (e) => {
          const file = e.target.files?.[0]; e.target.value = '';
          if (!file) return;
          setLeggendo(true); setAnteprima(null); setErrore(''); setMessaggio('');
          try {
            const json = await file.text();
            setAnteprima({ nome: file.name, json, riepilogo: ispezionaBackup(json, materia) });
          } catch (err) { setErrore(`File non valido: ${(err as Error).message}`); }
          finally { setLeggendo(false); }
        }} />
        <p className="tiny faint">Lo stesso file può trasferire l’intero archivio su un altro browser o dispositivo.</p>
      </section>
    </div>
    {anteprima && <section className="card backup-anteprima stack" aria-label="Anteprima del backup">
      <div className="eyebrow">{anteprima.riepilogo.tipo === 'totale' ? 'Backup completo' : 'Backup di una materia'}</div>
      <h2 className="title-s">{anteprima.nome}</h2>
      {anteprima.riepilogo.esportato && <p className="small muted">Salvato il {new Date(anteprima.riepilogo.esportato).toLocaleString('it-IT')}</p>}
      <ul className="small">{anteprima.riepilogo.materie.map((slug) => <li key={slug}>{nomeMateria(slug)}</li>)}</ul>
      <p className="small muted">{anteprima.riepilogo.segni} annotazioni · {anteprima.riepilogo.sessioni} quiz in sospeso</p>
      <p className="small">I dati delle materie elencate saranno sostituiti con quelli del file. Le altre materie saranno conservate.{anteprima.riepilogo.preferenze ? ' Verranno ripristinate anche le preferenze.' : ''}</p>
      <div className="row"><button className="btn btn-primary" onClick={ripristina}><Icon n="check" size={17} />Ripristina questo backup</button><button className="btn btn-ghost" onClick={() => { setAnteprima(null); setErrore(''); }}>Annulla</button></div>
    </section>}
    {messaggio && <p className="backup-esito" role="status">{messaggio}</p>}
    {errore && <p className="backup-errore" role="alert">{errore}</p>}
    <p className="small muted backup-nota">I dati sono conservati in questo browser. Il backup è una copia completa da aggiornare periodicamente; nessun dato viene inviato a un server.</p>
  </div>;
}

function RigaMateria({ slug, nome, idx, caricando }: { slug: string; nome: string; idx?: Indice; caricando: boolean }) {
  const p = useProgresso(slug);
  const stato = useMemo(() => {
    if (!idx) return null;
    const pagine = pagineStudiate(idx, p), totale = idx.pagineTotali;
    return { pagine, totale, quota: totale ? pagine / totale : 0, padronanza: padronanza(p, idx.corso.domande).valore ?? 0 };
  }, [idx, p]);
  return <div className="backup-materia">
    <b className="small">{nome}</b>
    {stato ? <>
      <div className="backup-percentuali small"><span><strong>{Math.round(stato.quota * 100)}%</strong> studiato</span><span><strong>{Math.round(stato.padronanza * 100)}%</strong> padronanza</span></div>
      <Bar value={stato.quota} tone="ok" thin />
      <span className="tiny faint">{stato.pagine}/{stato.totale} pagine del Percorso studiate</span>
    </> : <span className="tiny faint">{caricando ? 'Calcolo dei progressi…' : 'Dati conservati; percentuali non disponibili in questa versione.'}</span>}
  </div>;
}
