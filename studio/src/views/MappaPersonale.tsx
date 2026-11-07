import MappaPersonale from '../components/MappaPersonale';
import { usePassaggiPersonali, hrefPassaggioPersonale } from '../lib/letture-hooks';
import { DOCUMENTI_LETTURA, linkTesto } from '../lib/letture-client';
import { useCorso } from '../lib/data';
import { vai } from '../lib/router';

export default function MappaPersonaleView() {
  const { passaggi, caricando, errore } = usePassaggiPersonali();
  const slug = useCorso().corso.materia.slug;
  const doc = DOCUMENTI_LETTURA.find((d) => d.materia === slug);
  return <>
    <p className="small muted" style={{ margin: '0 0 16px' }}>La mappa raccoglie i passaggi evidenziati e sottolineati. I collegamenti indicano i concetti presenti nel loro contesto di lettura.</p>
    {caricando && <p className="tiny faint" role="status">Collegamento dei passaggi ai testi…</p>}
    {errore && <p className="small muted" role="status">Alcuni testi non sono disponibili. Le annotazioni restano salvate e i passaggi PDF sono comunque consultabili.</p>}
    <MappaPersonale passaggi={passaggi} onApri={(p) => vai(hrefPassaggioPersonale(p))} onConcetto={(id) => vai(`/concetto/${id}`)}
      hrefLettura={doc ? linkTesto(doc.id, doc.sezioni[0]?.id) : '#/originali'} />
  </>;
}
