import { useEffect, useMemo, useState } from 'react';
import { useCorso } from '../lib/data';
import { originaliMateria } from '../lib/originali';
import { scriviPref, usePref } from '../lib/store';
import { useRotta, vai } from '../lib/router';
import { DOCUMENTI_LETTURA, linkTesto, sezionePerPagina } from '../lib/letture-client';
import LettoreTesto from './LettoreTesto';
import './Originali.css';

/**
 * Gli Originali si leggono soltanto come testo. Documento, sezione e passaggio vivono nell'indirizzo;
 * i vecchi rimandi al PDF (`modo=pdf&pagina=N`) aprono la sezione che contiene quella pagina.
 */
export default function Originali() {
  const idx = useCorso(), slug = idx.corso.materia.slug;
  const [indiceAperto, onIndice] = useState(false);
  const { query } = useRotta(), pref = usePref();
  const documenti = useMemo(() => originaliMateria(slug), [slug]);
  const doc = documenti.find((d) => d.id === (query.get('doc') ?? pref.originale)) ?? documenti[0];
  const testo = doc ? DOCUMENTI_LETTURA.find((d) => d.id === doc.id) : undefined;
  const pagina = Number(query.get('pagina')) || undefined;
  const sezione = query.get('sezione') ?? (pagina && testo ? sezionePerPagina(testo, pagina)?.id : undefined);
  useEffect(() => { if (doc && pref.originale !== doc.id) scriviPref({ originale: doc.id }); }, [doc?.id]);
  if (!doc) return <div className="empty"><h1 className="title-m">Originali</h1><p>Non ci sono ancora documenti per questa materia.</p></div>;
  if (!testo) return <div className="empty"><h1 className="title-m">{doc.titolo}</h1><p>Il testo di questo documento non è ancora disponibile.</p></div>;
  const scegli = (id: string) => vai(linkTesto(id));
  return <LettoreTesto key={`${slug}-${doc.id}`} doc={doc} documento={testo} documenti={documenti} scegli={scegli} indiceAperto={indiceAperto} onIndice={onIndice}
    sezioneId={sezione} bloccoFocus={query.get('blocco') ?? undefined} segnoFocus={query.get('segno') ?? undefined} paginaFocus={query.get('sezione') ? undefined : pagina} />;
}
