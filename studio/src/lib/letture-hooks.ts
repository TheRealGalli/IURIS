import { useEffect, useMemo, useState } from 'react';
import { useCorso } from './data';
import { useProgresso } from './store';
import { proiettaSegnoTesto, type SezioneLettura } from './letture';
import { caricaSezioneLettura, DOCUMENTI_LETTURA, paginaBlocco, preparaBlocchi, sezionePerPagina } from './letture-client';
import { alberoGeometrico, etichetteConcetto, semanticaGeometrica, strutturaBlocco, type NodoGeo, type SegnoGeo, type SemanticaGeo } from './mappa-geometrica';
import type { SegnoOriginale } from './originali';

/** Carica solo i capitoli che contengono annotazioni: il corpus non entra nel grafo intero. */
export function useSezioniAnnotate() {
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
  return { caricando, errore, modelli, documenti, originali: p.originali };
}

export interface SezioneGeo {
  chiave: string; documento: string; docTitolo: string; sezione: string; titolo: string; da: number; a: number;
  radici: NodoGeo[]; segnati: number; segni: number;
  /** Concetti del glossario nominati dai nodi e loro legami (prototipo). */
  semantica: SemanticaGeo;
}
const pagineSegno = (s: SegnoOriginale) => s.ancoreTesto?.length ? s.ancoreTesto.map((a) => paginaBlocco(a.blocco) ?? s.pagina) : [s.pagina];

/** Mappa sulla geometria del testo: per ogni lezione con segni, l'albero titoli → paragrafi → voci segnate. */
export function useMappaGeometrica() {
  const { modelli, documenti, caricando, errore, originali } = useSezioniAnnotate();
  const idx = useCorso();
  // Coppie di concetti che una domanda del corso tiene insieme: conferma che il legame è pertinente.
  const coppieDomande = useMemo(() => {
    const out = new Set<string>();
    for (const d of idx.corso.domande) { const c = d.concetti ?? []; for (const x of c) for (const y of c) if (x !== y) out.add(`${x}|${y}`); }
    return out;
  }, [idx]);
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
        const ids = [...new Set(blocchi.flatMap((b) => b.concetti))].filter((x): x is string => typeof x === "string");
        const concetti = ids.flatMap((id) => { const c = idx.concettoById.get(id); return c ? [{ id, nome: c.nome, etichette: etichetteConcetto(c) }] : []; });
        const lezione = meta.lezione ?? meta.id, unitaLezione = lezione.split('-')[0];
        const dellaLezione = (id: string) => idx.concettoById.get(id)?.lezioni?.includes(lezione) ?? false;
        const relazioni = idx.corso.relazioni.map((r) => ({ ...r, affidabile: coppieDomande.has(`${r.da}|${r.a}`)
          || (r.tipo !== 'collegato' && (r.unita === unitaLezione || (dellaLezione(r.da) && dellaLezione(r.a)))) }));
        const semantica = semanticaGeometrica(albero.radici, concetti, relazioni);
        geo.forEach((g) => visti.add(`${doc.id}:${g.id}`));
        return albero.radici.length ? [{ chiave: `${doc.id}/${meta.id}`, documento: doc.id, docTitolo: doc.titolo, sezione: meta.id, titolo: meta.titolo, da: meta.da, a: meta.a, ...albero, semantica }] : [];
      });
    });
    return { sezioni, collegati: visti.size };
  }, [documenti, originali, modelli, strutture, idx, coppieDomande]);
  const totale = documenti.reduce((n, d) => n + (originali?.[d.id]?.segni.length ?? 0), 0);
  return { sezioni, caricando, errore, totale, nonCollegati: Math.max(0, totale - collegati) };
}
