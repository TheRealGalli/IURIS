import { useEffect, useMemo, useState } from 'react';
import { useCorso } from './data';
import { useProgresso } from './store';
import { concettiDelPassaggio, proiettaSegnoTesto, type SezioneLettura } from './letture';
import { caricaSezioneLettura, DOCUMENTI_LETTURA, linkTesto, paginaBlocco, preparaBlocchi, sezionePerPagina } from './letture-client';
import type { PassaggioMappa } from '../components/MappaPersonale';

export function hrefPassaggioPersonale(p: PassaggioMappa): string {
  const id = p.id.slice(p.documento.length + 1);
  return p.blocco ? linkTesto(p.documento, p.sezione, p.blocco, id)
    : `#/originali?${new URLSearchParams({ doc: p.documento, modo: 'pdf', pagina: String(Number(p.sezione.replace(/^pdf-p/, '')) || 1) })}`;
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
  const passaggi = useMemo<PassaggioMappa[]>(() => documenti.flatMap((doc) => (p.originali?.[doc.id]?.segni ?? []).map((segno) => {
    const meta = sezionePerPagina(doc, segno.pagina), blocchi = meta ? modelli.get(meta.file) : undefined;
    const proiezione = blocchi ? proiettaSegnoTesto(segno, blocchi, doc.edizione, meta) : null;
    const collegato = proiezione?.stato === 'proiettato';
    const ids = collegato && blocchi ? concettiDelPassaggio(proiezione, blocchi) : [];
    const primoBlocco = collegato ? proiezione.ancore[0]?.blocco : segno.ancoreTesto?.[0]?.blocco;
    return { id: `${doc.id}:${segno.id}`, documento: doc.id, sezione: primoBlocco && meta ? meta.id : `pdf-p${segno.pagina}`,
      blocco: primoBlocco ?? '', titolo: meta?.titolo ?? `Pagina ${segno.pagina}`, testo: segno.testo, tipo: segno.tipo,
      colore: segno.colore, origine: segno.ancoreTesto?.length ? 'testo' as const : 'pdf' as const,
      concetti: ids.flatMap((id) => { const c = idx.concettoById.get(id); return c ? [{ id, nome: c.nome }] : []; }) };
  })), [documenti, p.originali, modelli, idx]);
  return { passaggi, caricando, errore };
}
