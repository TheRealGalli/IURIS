import MappaGeometrica from '../components/MappaGeometrica';
import { useMappaGeometrica } from '../lib/letture-hooks';
import { vai } from '../lib/router';

export default function MappaPersonaleView() {
  const { sezioni, caricando, errore, totale, nonCollegati } = useMappaGeometrica();
  return <>
    <p className="small muted" style={{ margin: '0 0 14px' }}>I passaggi evidenziati e sottolineati, nella forma del testo da cui vengono.</p>
    {caricando && <p className="tiny faint" role="status">Lettura della struttura dei testi…</p>}
    {errore && <p className="small muted" role="status">Alcuni testi non sono disponibili. Le annotazioni restano salvate.</p>}
    <MappaGeometrica sezioni={sezioni} totale={totale} nonCollegati={nonCollegati} onApri={vai} />
  </>;
}
