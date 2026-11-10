import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui';
import { esportaTutto, importaTutto, ispezionaBackup, type RiepilogoBackup } from '../lib/store';
import type { MateriaInfo } from '../lib/types';
import './Backup.css';

type Anteprima = { nome: string; json: string; riepilogo: RiepilogoBackup };

export default function Backup({ materie, materia }: { materie: MateriaInfo[]; materia: string }) {
  useLayoutEffect(() => { window.scrollTo({ top: 0 }); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState('');
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
      setMessaggio('Backup completo scaricato. Conserva il file per ritrovare i tuoi dati.');
    } catch (e) { setErrore((e as Error).message); }
  }

  function ripristina() {
    if (!anteprima) return;
    setErrore(''); setMessaggio('');
    try {
      importaTutto(anteprima.json, materia);
      setAnteprima(null);
      setMessaggio('Backup ripristinato. Puoi riprendere lo studio.');
    } catch (e) { setErrore((e as Error).message); }
  }

  return <div className="page backup-page fade-in">
    <div className="eyebrow">Archivio generale · tutte le materie</div>
    <h1 className="title-xl" style={{ margin: '6px 0 12px' }}>Backup</h1>
    <p className="muted backup-intro">Un unico file per salvare e ripristinare tutti i dati di Forma Iuris, per tutte le materie.</p>
    <section className="backup-guida" aria-label="Come usare il backup">
      <p className="small muted">Scarica il file e conservalo. Per recuperare i dati o portarli su un altro dispositivo, apri questa pagina e carica lo stesso file.</p>
    </section>
    <div className="grid g2 backup-azioni">
      <section className="card stack">
        <Icon n="backup" size={28} />
        <h2 className="title-m">Backup completo</h2>
        <p className="muted small">Un unico file con tutti i tuoi progressi, ripassi, annotazioni e preferenze.</p>
        <button data-tour="scarica-backup" className="btn btn-primary" onClick={scarica}><Icon n="scarica" size={17} />Scarica backup completo</button>
        <p className="tiny faint">Conserva la copia più recente in un posto facile da ritrovare.</p>
      </section>
      <section className="card stack">
        <Icon n="carica" size={28} />
        <h2 className="title-m">Ripristina il backup</h2>
        <p className="muted small">Scegli il file salvato e conferma il ripristino dei dati che contiene.</p>
        <button data-tour="carica-backup" className="btn" disabled={leggendo} onClick={() => fileRef.current?.click()}><Icon n="carica" size={17} />{leggendo ? 'Lettura del file…' : 'Carica backup'}</button>
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
    <p className="small muted backup-nota">Lo studio si salva in questo browser. Aggiorna periodicamente la tua copia del backup.</p>
  </div>;
}
