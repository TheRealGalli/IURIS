import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { esportaTutto, importaTutto, ispezionaBackup, riepilogoBackup, type RiepilogoBackup } from '../lib/store';
import type { MateriaInfo } from '../lib/types';
import './Backup.css';

type Anteprima = { nome: string; json: string; riepilogo: RiepilogoBackup };

export default function Backup({ materie, materia }: { materie: MateriaInfo[]; materia: string }) {
  useLayoutEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dati, setDati] = useState(() => { try { return riepilogoBackup(); } catch { return null; } });
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState(dati ? '' : 'Non è possibile leggere tutti i dati di questo browser. Puoi comunque scegliere un backup da ripristinare.');
  const [leggendo, setLeggendo] = useState(false);
  const nomeMateria = (slug: string) => materie.find((m) => m.slug === slug)?.nome ?? slug.replace(/-/g, ' ');

  function scarica() {
    setErrore(''); setMessaggio('');
    try {
      const json = esportaTutto();
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'formaiuris-backup.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDati(riepilogoBackup()); setMessaggio('Backup preparato. Conserva il file scaricato: contiene tutte le materie.');
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
    <div className="eyebrow">Tutto il tuo studio</div>
    <h1 className="title-xl" style={{ margin: '6px 0 12px' }}>Backup</h1>
    <p className="muted backup-intro">Un solo file per conservare e trasferire tutti i tuoi dati di Forma Iuris.</p>
    <div className="grid g2 backup-azioni">
      <section className="card stack">
        <Icon n="backup" size={28} />
        <h2 className="title-m">Salva tutto</h2>
        <p className="muted small">Progressi, risposte e ripassi, calendario, date degli esami, segni e pagine lette negli Originali, cronologia dei segni e preferenze.</p>
        <div className="backup-numeri" aria-label="Dati presenti in questo browser">
          <span><b>{dati?.materie.length ?? '—'}</b> {dati?.materie.length === 1 ? 'materia' : 'materie'}</span><span><b>{dati?.segni ?? '—'}</b> {dati?.segni === 1 ? 'segno' : 'segni'}</span><span><b>{dati?.documenti ?? '—'}</b> {dati?.documenti === 1 ? 'documento letto' : 'documenti letti'}</span>
        </div>
        {!!dati?.materie.length && <p className="tiny faint">{dati.materie.map(nomeMateria).join(' · ')}</p>}
        <button className="btn btn-primary" onClick={scarica}><Icon n="scarica" size={17} />Scarica backup completo</button>
        <p className="tiny faint">Include automaticamente anche le materie che aggiungerai in futuro e le sessioni di quiz in sospeso. Conserva la copia più recente.</p>
      </section>
      <section className="card stack">
        <Icon n="carica" size={28} />
        <h2 className="title-m">Riprendi dal backup</h2>
        <p className="muted small">Scegli un file salvato per ritrovare il tuo studio su questo browser o su un altro dispositivo. Vedrai cosa contiene prima di ripristinarlo.</p>
        <button className="btn" disabled={leggendo} onClick={() => fileRef.current?.click()}><Icon n="carica" size={17} />{leggendo ? 'Lettura del file…' : 'Scegli un backup'}</button>
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
        <p className="tiny faint">Puoi caricare anche i vecchi backup di una singola materia.</p>
      </section>
    </div>
    {anteprima && <section className="card backup-anteprima stack" aria-label="Anteprima del backup">
      <div className="eyebrow">{anteprima.riepilogo.tipo === 'totale' ? 'Backup completo' : 'Backup di una materia'}</div>
      <h2 className="title-s">{anteprima.nome}</h2>
      {anteprima.riepilogo.esportato && <p className="small muted">Salvato il {new Date(anteprima.riepilogo.esportato).toLocaleString('it-IT')}</p>}
      <ul className="small">{anteprima.riepilogo.materie.map((slug) => <li key={slug}>{nomeMateria(slug)}</li>)}</ul>
      <p className="small muted">{anteprima.riepilogo.segni} segni · {anteprima.riepilogo.documenti} documenti letti · {anteprima.riepilogo.sessioni} quiz in sospeso</p>
      <p className="small">I dati delle materie elencate saranno sostituiti con quelli del file. Le altre materie saranno conservate.{anteprima.riepilogo.preferenze ? ' Verranno ripristinate anche le preferenze.' : ''}</p>
      <div className="row"><button className="btn btn-primary" onClick={ripristina}><Icon n="check" size={17} />Ripristina questo backup</button><button className="btn btn-ghost" onClick={() => { setAnteprima(null); setErrore(''); }}>Annulla</button></div>
    </section>}
    {messaggio && <p className="backup-esito" role="status">{messaggio}</p>}
    {errore && <p className="backup-errore" role="alert">{errore}</p>}
    <p className="small muted backup-nota">I dati restano in questo browser. Il file di backup è la tua copia da conservare e aggiornare; non viene inviato a un server.</p>
  </div>;
}
