import { useEffect, useMemo, useState } from 'react';
import { useCorso } from './data';
import { useProgresso } from './store';
import { concettiDelPassaggio, proiettaSegnoTesto, type SezioneLettura } from './letture';
import { caricaSezioneLettura, DOCUMENTI_LETTURA, linkTesto, paginaBlocco, preparaBlocchi, sezionePerPagina } from './letture-client';
import type { PassaggioMappa } from '../components/MappaPersonale';
import { confrontaPosizioni, posizioneSegno } from './ordine-segni';

export function hrefPassaggioPersonale(p: PassaggioMappa): string {
  const id = p.id.slice(p.documento.length + 1);
  return p.blocco ? linkTesto(p.documento, p.sezione, p.blocco, id)
    : `#/originali?${new URLSearchParams({ doc: p.documento, pagina: String(Number(p.sezione.replace(/^pdf-p/, '')) || 1) })}`;
}

/** Carica solo i capitoli che contengono annotazioni: il corpus non entra nel grafo intero. */
export function usePassaggiPersonali() {
  const idx = useCorso(), slug = idx.corso.materia.slug, p = useProgresso(slug);
  const documenti = useMemo(() => DOCUMENTI_LETTURA.filter((d) => d.materia === slug), [slug]);
  const necessarie = useMemo(() => {
    const risultato = new Map();
    for (const d of documenti) for (const segno of p.originali?.[d.id]?.segni ?? []) {
      const pagine = segno.ancoreTesto?.map((a) => paginaBlocco(a.blocco) ?? segno.pagina) ?? [segno.pagina];
      for (const pagina of pagine) { const sezione = sezionePerPagina(d, pagina); if (sezione) risultato.set(sezione.file, sezione); }
    }
    return [...risultato.values()] as typeof documenti[number]['sezioni'];
  }, [documenti, p.originali]);
  const firma = necessarie.map((s) => s.file).sort().join('|');
  const [caricate, setCaricate] = useState(new Map<string, SezioneLettura>());
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState(false);
  useEffect(() => {
    let annullato = false;
    setCaricando(necessarie.length > 0); setErrore(false);
    Promise.allSettled(necessarie.map(async (s) => [s.file, await caricaSezioneLettura(s)] as const)).then((risultati) => {
      if (annullato) return;
      setCaricate(new Map(risultati.flatMap((r) => r.status === 'fulfilled' ? [r.value] : [])));
      setErrore(risultati.some((r) => r.status === 'rejected')); setCaricando(false);
    });
    return () => { annullato = true; };
  }, [firma]);
  const modelli = useMemo(() => new Map([...caricate].map(([file, s]) => [file, preparaBlocchi(s, idx.concettoById)])), [caricate, idx]);
  const indiciBlocchi = useMemo(() => new Map([...modelli].map(([file, blocchi]) => [file, new Map(blocchi.map((b, i) => [b.id, i]))])), [modelli]);
  const passaggi = useMemo<PassaggioMappa[]>(() => documenti.flatMap((doc) => (p.originali?.[doc.id]?.segni ?? []).map((segno) => {
    const meta = sezionePerPagina(doc, segno.pagina), blocchi = meta ? modelli.get(meta.file) : undefined;
    // Ordine del testo: documento, sezione, poi posizione del segno nella sezione.
    const ordine = [DOCUMENTI_LETTURA.indexOf(doc), meta ? doc.sezioni.indexOf(meta) : doc.sezioni.length,
      ...posizioneSegno(segno, (id) => { const s = id && sezionePerPagina(doc, paginaBlocco(id) ?? segno.pagina); return s ? indiciBlocchi.get(s.file)?.get(id) : undefined; })];
    const proiezione = blocchi ? proiettaSegnoTesto(segno, blocchi, doc.edizione, meta) : null;
    const collegato = proiezione?.stato === 'proiettato';
    const ids = collegato && blocchi ? concettiDelPassaggio(proiezione, blocchi) : [];
    const primoBlocco = collegato ? proiezione.ancore[0]?.blocco : segno.ancoreTesto?.[0]?.blocco;
    return { id: `${doc.id}:${segno.id}`, documento: doc.id, sezione: primoBlocco && meta ? meta.id : `pdf-p${segno.pagina}`,
      blocco: primoBlocco ?? '', titolo: meta?.titolo ?? `Pagina ${segno.pagina}`, testo: segno.testo, tipo: segno.tipo,
      colore: segno.colore, ordine, creata: segno.creata, origine: segno.ancoreTesto?.length ? 'testo' as const : 'pdf' as const,
      concetti: ids.flatMap((id) => { const c = idx.concettoById.get(id); return c ? [{ id, nome: c.nome }] : []; }) };
  })).sort((a, b) => confrontaPosizioni(a.ordine, b.ordine) || (a.creata ?? '').localeCompare(b.creata ?? '')), [documenti, p.originali, modelli, indiciBlocchi, idx]);
  return { passaggi, caricando, errore };
}
