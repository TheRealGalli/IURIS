import { useEffect, useMemo, useState } from 'react';
import { useCorso, type Indice } from './data';
import { useProgresso } from './store';
import { proiettaSegnoTesto, ritrovaNellaSezione, type DocumentoLettura, type SezioneLettura } from './letture';
import { bloccoInAltraSezione, caricaSezioneLettura, DOCUMENTI_LETTURA, paginaBlocco, preparaBlocchi, sezioniPerPagina, type BloccoPronto } from './letture-client';
import { alberoGeometrico, daRicollocare, etichetteConcetto, semanticaGeometrica, strutturaBlocco, type NodoGeo, type SegnoGeo, type SemanticaGeo } from './mappa-geometrica';
import type { SegnoOriginale } from './originali';

/** Lavoro lungo diviso in lotti: dopo LOTTO_MS si restituisce il controllo al browser (disegno, input). */
const LOTTO_MS = 30;
const pausa = () => new Promise<void>((r) => setTimeout(r, 0));

/** Carica solo i capitoli che contengono annotazioni: il corpus non entra nel grafo intero. */
export function useSezioniAnnotate() {
  const idx = useCorso(), slug = idx.corso.materia.slug, p = useProgresso(slug);
  const documenti = useMemo(() => DOCUMENTI_LETTURA.filter((d) => d.materia === slug), [slug]);
  const necessarie = useMemo(() => {
    const risultato = new Map();
    for (const d of documenti) for (const segno of p.originali?.[d.id]?.segni ?? []) {
      const pagine = segno.ancoreTesto?.map((a) => paginaBlocco(a.blocco) ?? segno.pagina) ?? [segno.pagina];
      for (const pagina of pagine) for (const sezione of sezioniPerPagina(d, pagina)) risultato.set(sezione.file, sezione);
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
    Promise.allSettled(necessarie.map(async (s) => [s.file, await caricaSezioneLettura(s)] as const)).then(async (risultati) => {
      if (annullato) return;
      const pronte = new Map(risultati.flatMap((r) => r.status === 'fulfilled' ? [r.value] : []));
      // Blocchi preparati a piccoli lotti (restano in cache): decine di sezioni in un colpo bloccherebbero la pagina.
      let t = performance.now();
      for (const s of pronte.values()) {
        preparaBlocchi(s, idx.concettoById, idx.corso.norme);
        if (performance.now() - t > LOTTO_MS) { await pausa(); if (annullato) return; t = performance.now(); }
      }
      setCaricate(pronte);
      setErrore(risultati.some((r) => r.status === 'rejected')); setCaricando(false);
    });
    return () => { annullato = true; };
  }, [firma]);
  const modelli = useMemo(() => new Map([...caricate].map(([file, s]) => [file, preparaBlocchi(s, idx.concettoById, idx.corso.norme)])), [caricate, idx]);
  return { caricando, errore, modelli, documenti, originali: p.originali };
}

export interface SezioneGeo {
  chiave: string; documento: string; docTitolo: string; sezione: string; titolo: string; da: number; a: number;
  radici: NodoGeo[]; segnati: number; segni: number;
  /** Concetti del glossario nominati dai nodi e loro legami (prototipo). */
  semantica: SemanticaGeo;
}
/** Unità della mappa per blocchi già pronti (gli stessi oggetti finché la sezione resta in memoria). */
const struttureBlocchi = new WeakMap<BloccoPronto[], ReturnType<typeof strutturaBlocco>>();
const strutturaDi = (blocchi: BloccoPronto[]) => {
  let u = struttureBlocchi.get(blocchi);
  if (!u) { u = blocchi.flatMap((b) => strutturaBlocco(b)); struttureBlocchi.set(blocchi, u); }
  return u;
};
/** Coppie di concetti che una domanda del corso tiene insieme: conferma che il legame è pertinente. */
const coppieCorso = new WeakMap<Indice, Set<string>>();
const coppieDi = (idx: Indice) => {
  let out = coppieCorso.get(idx);
  if (!out) {
    out = new Set<string>();
    for (const d of idx.corso.domande) { const c = d.concetti ?? []; for (const x of c) for (const y of c) if (x !== y) out.add(`${x}|${y}`); }
    coppieCorso.set(idx, out);
  }
  return out;
};
/** Ultimo albero calcolato per sezione: cambia solo se cambiano i suoi segni (salvare la posizione di lettura non lo rifà). */
const alberiSezione = new WeakMap<BloccoPronto[], { idx: Indice; edizione: number; segni: SegnoOriginale[]; valore: { sezione: SezioneGeo | null; visti: string[] } }>();
const stessi = (a: SegnoOriginale[], b: SegnoOriginale[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const pagineSegno = (s: SegnoOriginale) => s.ancoreTesto?.length ? s.ancoreTesto.map((a) => paginaBlocco(a.blocco) ?? s.pagina) : [s.pagina];

/** Sezioni da rifare oltre le quali il calcolo passa ai lotti dell'effetto. */
const SUBITO_MAX = 3;
const segniSezione = (segni: SegnoOriginale[], meta: { da: number; a: number }) => segni.filter((s) => pagineSegno(s).some((pg) => pg >= meta.da && pg <= meta.a));
type AlberoSezione = { sezione: SezioneGeo | null; visti: string[] };
/** Albero della sezione già calcolato con gli stessi segni, glossario ed edizione, altrimenti `undefined`. */
function alberoInCache(doc: DocumentoLettura, meta: DocumentoLettura['sezioni'][number], blocchi: BloccoPronto[], segni: SegnoOriginale[], idx: Indice): AlberoSezione | undefined {
  const prima = alberiSezione.get(blocchi);
  return prima && prima.idx === idx && prima.edizione === doc.edizione && stessi(prima.segni, segniSezione(segni, meta)) ? prima.valore : undefined;
}
/** Albero titoli → paragrafi → voci segnate di una sezione, con la semantica del glossario (in cache per sezione). */
function alberoSezione(doc: DocumentoLettura, meta: DocumentoLettura['sezioni'][number], blocchi: BloccoPronto[], segni: SegnoOriginale[], idx: Indice): AlberoSezione {
  const giaFatto = alberoInCache(doc, meta, blocchi, segni, idx);
  if (giaFatto) return giaFatto;
  const qui = segniSezione(segni, meta);
  const coppieDomande = coppieDi(idx);
  const unita = strutturaDi(blocchi), altrove = bloccoInAltraSezione(doc, meta.id);
  const salva = (sezione: SezioneGeo | null, ids: string[]): AlberoSezione => {
    const valore = { sezione, visti: ids.map((id) => `${doc.id}:${id}`) };
    alberiSezione.set(blocchi, { idx, edizione: doc.edizione, segni: qui, valore });
    return valore;
  };
  // Ogni segno della lezione compare nella mappa: nel suo punto, ritrovato nella sezione, o in coda «da ricollocare».
  const persi: { id: string; testo: string; colore: SegnoOriginale['colore']; tipo: SegnoOriginale['tipo']; creata?: string }[] = [];
  const geo: SegnoGeo[] = qui.flatMap((s) => {
    const pr = proiettaSegnoTesto(s, blocchi, doc.edizione, meta, altrove);
    if (pr.stato === 'proiettato') return [{ id: s.id, colore: s.colore, tipo: s.tipo, creata: s.creata, ancore: pr.ancore }];
    if (pr.stato === 'fuori-sezione') return [];
    const citazione = s.ancoreTesto?.length ? s.ancoreTesto.map((a) => a.citazione).join('\n\n') : s.testo;
    const ritrovate = ritrovaNellaSezione(citazione, blocchi, doc.edizione);
    if (ritrovate) return [{ id: s.id, colore: s.colore, tipo: s.tipo, creata: s.creata, ancore: ritrovate }];
    persi.push({ id: s.id, testo: citazione, colore: s.colore, tipo: s.tipo, creata: s.creata });
    return [];
  });
  if (!geo.length && !persi.length) return salva(null, []);
  const coda = daRicollocare(persi, meta.a);
  const albero = alberoGeometrico([...unita, ...coda.unita], [...geo, ...coda.segni]);
  const ids = [...new Set(blocchi.flatMap((b) => b.concetti))].filter((x): x is string => typeof x === "string");
  const concetti = ids.flatMap((id) => { const c = idx.concettoById.get(id); return c ? [{ id, nome: c.nome, etichette: etichetteConcetto(c) }] : []; });
  const lezione = meta.lezione ?? meta.id, unitaLezione = lezione.split('-')[0];
  const dellaLezione = (id: string) => idx.concettoById.get(id)?.lezioni?.includes(lezione) ?? false;
  // solo le relazioni fra concetti della sezione: le altre la semantica le scarta comunque
  const presenti = new Set(concetti.map((c) => c.id));
  const relazioni = idx.corso.relazioni.filter((r) => presenti.has(r.da) && presenti.has(r.a)).map((r) => ({ ...r, affidabile: coppieDomande.has(`${r.da}|${r.a}`)
    || (r.tipo !== 'collegato' && (r.unita === unitaLezione || (dellaLezione(r.da) && dellaLezione(r.a)))) }));
  const semantica = semanticaGeometrica(albero.radici, concetti, relazioni);
  return salva(albero.radici.length ? { chiave: `${doc.id}/${meta.id}`, documento: doc.id, docTitolo: doc.titolo, sezione: meta.id, titolo: meta.titolo, da: meta.da, a: meta.a, ...albero, semantica } : null,
    [...geo, ...coda.segni].map((g) => g.id));
}

/** Mappa sulla geometria del testo: per ogni lezione con segni, l'albero titoli → paragrafi → voci segnate. */
export function useMappaGeometrica() {
  const { modelli, documenti, caricando, errore, originali } = useSezioniAnnotate();
  const idx = useCorso();
  // Primo calcolo (o molte sezioni da rifare): in lotti, in un effetto; il memo usa poi i risultati in cache.
  // Poche sezioni cambiate (un segno aggiunto o tolto) si rifanno subito, senza far sparire nulla.
  const [giro, setGiro] = useState(0);
  const { sezioni, collegati, mancanti } = useMemo(() => {
    const visti = new Set<string>();
    const elenco: { doc: DocumentoLettura; meta: DocumentoLettura['sezioni'][number]; blocchi: BloccoPronto[]; segni: SegnoOriginale[] }[] = [];
    for (const doc of documenti) for (const meta of doc.sezioni) {
      const blocchi = modelli.get(meta.file);
      if (blocchi) elenco.push({ doc, meta, blocchi, segni: originali?.[doc.id]?.segni ?? [] });
    }
    const daRifare = elenco.filter((x) => !alberoInCache(x.doc, x.meta, x.blocchi, x.segni, idx)).length;
    const subito = daRifare <= SUBITO_MAX;
    const sezioni: SezioneGeo[] = [];
    let mancanti = 0;
    for (const x of elenco) {
      const fresco = subito ? alberoSezione(x.doc, x.meta, x.blocchi, x.segni, idx) : alberoInCache(x.doc, x.meta, x.blocchi, x.segni, idx);
      if (!fresco) mancanti++;
      // nell'attesa dei lotti resta l'albero precedente della sezione (se c'è), invece di farla sparire
      const v = fresco ?? (alberiSezione.get(x.blocchi)?.idx === idx ? alberiSezione.get(x.blocchi)!.valore : undefined);
      if (!v) continue;
      v.visti.forEach((id) => visti.add(id));
      if (v.sezione) sezioni.push(v.sezione);
    }
    return { sezioni, collegati: visti.size, mancanti };
    // `giro`: ricalcolo quando l'effetto ha riempito la cache
  }, [documenti, originali, modelli, idx, giro]);
  useEffect(() => {
    if (!mancanti) return;
    let annullato = false;
    (async () => {
      let t = performance.now();
      for (const doc of documenti) for (const meta of doc.sezioni) {
        const blocchi = modelli.get(meta.file);
        if (!blocchi) continue;
        alberoSezione(doc, meta, blocchi, originali?.[doc.id]?.segni ?? [], idx);
        if (performance.now() - t > LOTTO_MS) { await pausa(); if (annullato) return; t = performance.now(); }
      }
      if (!annullato) setGiro((g) => g + 1);
    })();
    return () => { annullato = true; };
  }, [documenti, originali, modelli, idx, mancanti]);
  const totale = documenti.reduce((n, d) => n + (originali?.[d.id]?.segni.length ?? 0), 0);
  return { sezioni, caricando: caricando || mancanti > 0, errore, totale, nonCollegati: Math.max(0, totale - collegati) };
}
