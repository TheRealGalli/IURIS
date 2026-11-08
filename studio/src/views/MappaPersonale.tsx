import MappaGeometrica from '../components/MappaGeometrica';
import { useMappaGeometrica } from '../lib/letture-hooks';
import { vai } from '../lib/router';
import { useCompact } from '../components/MobileSheet';

export default function MappaPersonaleView() {
  const { sezioni, caricando, errore, totale, nonCollegati } = useMappaGeometrica();
  const compact = useCompact();
  // Sul computer niente testo sopra la mappa: la finestra occupa lo stesso spazio di Per unità e Collegamenti.
  return <>
    {compact && <p className="small muted" style={{ margin: '0 0 14px' }}>I passaggi evidenziati e sottolineati, nella forma del testo da cui vengono.</p>}
    {caricando && <p className={compact ? 'tiny faint' : 'tiny faint mg-avviso'} role="status">Lettura della struttura dei testi…</p>}
    {errore && <p className={compact ? 'small muted' : 'small muted mg-avviso'} role="status">Alcuni testi non sono disponibili. Le annotazioni restano salvate.</p>}
    <MappaGeometrica pagina sezioni={sezioni} totale={totale} nonCollegati={nonCollegati} onApri={vai} />
  </>;
}
