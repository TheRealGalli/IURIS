import { useEffect, useMemo, useState } from 'react';
import { useCorso } from './data';
import { useProgresso } from './store';
import { concettiDelPassaggio, proiettaSegnoTesto, type SezioneLettura } from './letture';
import { caricaSezioneLettura, DOCUMENTI_LETTURA, linkTesto, paginaBlocco, preparaBlocchi, sezionePerPagina } from './letture-client';
import type { PassaggioMappa } from '../components/MappaPersonale';
import { confrontaPosizioni, posizioneSegno } from './ordine-segni';
import { alberoGeometrico, strutturaBlocco, type NodoGeo, type SegnoGeo } from './mappa-geometrica';
import type { SegnoOriginale } from './originali';

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
  return { passaggi, caricando, errore, modelli, documenti, originali: p.originali };
}

export interface SezioneGeo {
  chiave: string; documento: string; docTitolo: string; sezione: string; titolo: string; da: number; a: number;
  radici: NodoGeo[]; segnati: number; segni: number;
}
const pagineSegno = (s: SegnoOriginale) => s.ancoreTesto?.length ? s.ancoreTesto.map((a) => paginaBlocco(a.blocco) ?? s.pagina) : [s.pagina];

/** Mappa sulla geometria del testo: per ogni lezione con segni, l'albero titoli → paragrafi → voci segnate. */
export function useMappaGeometrica() {
  const { modelli, documenti, caricando, errore, originali } = usePassaggiPersonali();
  const strutture = useMemo(() => new Map([...modelli].map(([file, blocchi]) => [file, blocchi.flatMap((b) => strutturaBlocco(b))])), [modelli]);
  const { sezioni, collegati } = useMemo(() => {
    const visti = new Set<string>();
    const sezioni: SezioneGeo[] = documenti.flatMap((doc) => {
      const segni = originali?.[doc.id]?.segni ?? [];
      return doc.sezioni.flatMap((meta) => {
        const blocchi = modelli.get(meta.file), unita = strutture.get(meta.file);
        if (!blocchi || !unita) return [];
        const geo: SegnoGeo[] = segni.filter((s) => s.ancoreTesto?.length && pagineSegno(s).some((pg) => pg >= meta.da && pg <= meta.a)).flatMap((s) => {
          const pr = proiettaSegnoTesto(s, blocchi, doc.edizione, meta);
          return pr.stato === 'proiettato' ? [{ id: s.id, colore: s.colore, tipo: s.tipo, creata: s.creata, ancore: pr.ancore }] : [];
        });
        if (!geo.length) return [];
        const albero = alberoGeometrico(unita, geo);
        geo.forEach((g) => visti.add(`${doc.id}:${g.id}`));
        return albero.radici.length ? [{ chiave: `${doc.id}/${meta.id}`, documento: doc.id, docTitolo: doc.titolo, sezione: meta.id, titolo: meta.titolo, da: meta.da, a: meta.a, ...albero }] : [];
      });
    });
    return { sezioni, collegati: visti.size };
  }, [documenti, originali, modelli, strutture]);
  const totale = documenti.reduce((n, d) => n + (originali?.[d.id]?.segni.length ?? 0), 0);
  return { sezioni, caricando, errore, totale, nonCollegati: Math.max(0, totale - collegati) };
}
