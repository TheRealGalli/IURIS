import { useState } from 'react';
import MappaPersonale from '../components/MappaPersonale';
import MappaGeometrica from '../components/MappaGeometrica';
import { usePassaggiPersonali, hrefPassaggioPersonale, useMappaGeometrica } from '../lib/letture-hooks';
import { DOCUMENTI_LETTURA, linkTesto } from '../lib/letture-client';
import { useCorso } from '../lib/data';
import { vai } from '../lib/router';

function Concetti() {
  const { passaggi, caricando, errore } = usePassaggiPersonali();
  const slug = useCorso().corso.materia.slug;
  const doc = DOCUMENTI_LETTURA.find((d) => d.materia === slug);
  return <>
    {caricando && <p className="tiny faint" role="status">Collegamento dei passaggi ai testi…</p>}
    {errore && <p className="small muted" role="status">Alcuni testi non sono disponibili. Le annotazioni restano salvate e i passaggi PDF sono comunque consultabili.</p>}
    <MappaPersonale passaggi={passaggi} onApri={(p) => vai(hrefPassaggioPersonale(p))} onConcetto={(id) => vai(`/concetto/${id}`)}
      hrefLettura={doc ? linkTesto(doc.id, doc.sezioni[0]?.id) : '#/originali'} />
  </>;
}

function Struttura() {
  const { sezioni, caricando, errore, totale, nonCollegati } = useMappaGeometrica();
  return <>
    {caricando && <p className="tiny faint" role="status">Lettura della struttura dei testi…</p>}
    {errore && <p className="small muted" role="status">Alcuni testi non sono disponibili. Le annotazioni restano salvate.</p>}
    <MappaGeometrica sezioni={sezioni} totale={totale} nonCollegati={nonCollegati} onApri={vai} />
  </>;
}

export default function MappaPersonaleView() {
  const [vista, setVista] = useState<'struttura' | 'concetti'>('struttura');
  return <>
    <div className="row-between" style={{ margin: '0 0 14px', gap: 10, flexWrap: 'wrap' }}>
      <p className="small muted" style={{ margin: 0 }}>{vista === 'struttura' ? 'I passaggi evidenziati e sottolineati, nella forma del testo da cui vengono.' : 'I passaggi evidenziati e sottolineati, collegati ai concetti presenti nel loro contesto.'}</p>
      <div className="row" style={{ gap: 4 }} aria-label="Tipo di mappa personale">
        <button className={`btn btn-sm ${vista === 'struttura' ? '' : 'btn-ghost'}`} aria-pressed={vista === 'struttura'} onClick={() => setVista('struttura')}>Struttura del testo</button>
        <button className={`btn btn-sm ${vista === 'concetti' ? '' : 'btn-ghost'}`} aria-pressed={vista === 'concetti'} onClick={() => setVista('concetti')}>Concetti</button>
      </div>
    </div>
    {vista === 'struttura' ? <Struttura /> : <Concetti />}
  </>;
}
