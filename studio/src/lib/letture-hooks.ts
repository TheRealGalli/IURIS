import { useEffect, useMemo, useState } from 'react';
import { useCorso, type Indice } from './data';
import { useProgresso } from './store';
import { proiettaSegnoTesto, ritrovaNellaSezione, type DocumentoLettura, type SezioneLettura } from './letture';
import { bloccoInAltraSezione, blocchiGiaPronti, caricaSezioneLettura, DOCUMENTI_LETTURA, sezioniArrivate, paginaBlocco, preparaBlocchi, sezioniPerPagina, type BloccoPronto } from './letture-client';
import { alberoGeometrico, daRicollocare, etichetteConcetto, semanticaGeometrica, strutturaBlocco, type NodoGeo, type SegnoGeo, type SemanticaGeo } from './mappa-geometrica';
import type { SegnoOriginale } from './originali';

/** Lavoro lungo diviso in lotti: dopo LOTTO_MS si restituisce il controllo al browser (disegno, input). */
const LOTTO_MS = 30;
const pausa = () => new Promise<void>((r) => setTimeout(r, 0));
/** Dopo il prossimo disegno della pagina (fotogramma, poi un task): il lavoro di fondo non lo ritarda. */
const dopoDisegno = () => new Promise<void>((r) => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(r, 0));

/** Sezioni preparate e disegnate prima delle altre: quella aperta nel lettore (se ha segni) e le prime del testo. */
const PRIME = 2;

/**
 * Carica solo i capitoli che contengono annotazioni: il corpus non entra nel grafo intero.
 * In due tempi: prima le sezioni che la mappa mostra subito (`priorita`, «documento/sezione», e le prime del testo),
 * poi tutte le altre a lotti, dopo il primo disegno.
 */
export function useSezioniAnnotate(priorita?: string) {
  const idx = useCorso(), slug = idx.corso.materia.slug, p = useProgresso(slug);
  const documenti = useMemo(() => DOCUMENTI_LETTURA.filter((d) => d.materia === slug), [slug]);
  const necessarie = useMemo(() => {
    const risultato = new Map<string, { chiave: string; meta: DocumentoLettura['sezioni'][number]; ordine: number }>();
    documenti.forEach((d, i) => {
      for (const segno of p.originali?.[d.id]?.segni ?? []) {
        const pagine = segno.ancoreTesto?.map((a) => paginaBlocco(a.blocco) ?? segno.pagina) ?? [segno.pagina];
        for (const pagina of pagine) for (const sezione of sezioniPerPagina(d, pagina)) {
          risultato.set(sezione.file, { chiave: `${d.id}/${sezione.id}`, meta: sezione, ordine: i * 1e4 + d.sezioni.indexOf(sezione) });
        }
      }
    });
    // nell'ordine della mappa (documento, poi sezione): le prime sono quelle che compaiono per prime
    return [...risultato.values()].sort((a, b) => a.ordine - b.ordine);
  }, [documenti, p.originali]);
  const firma = necessarie.map((s) => s.meta.file).join('|');
  // Sezioni già arrivate (mappa riaperta, pannello del lettore): subito nello stato, niente giro a vuoto.
  const [caricate, setCaricate] = useState(() => new Map(necessarie.flatMap((s) => {
    const v = sezioniArrivate.get(s.meta.file); return v ? [[s.meta.file, v] as const] : [];
  })));
  // in caricamento finché una sezione non è arrivata o non è pronta
  const daFare = () => necessarie.some((s) => { const v = sezioniArrivate.get(s.meta.file); return !v || !blocchiGiaPronti(v, idx.concettoById, idx.corso.norme); });
  const [caricando, setCaricando] = useState(daFare);
  const [errore, setErrore] = useState(false);
  // sale quando i lotti hanno preparato tutte le sezioni: `modelli` le prende dalla cache
  const [preparate, setPreparate] = useState(0);
  // le sezioni della vista iniziale: le sole che si preparano durante il disegno, se non sono già pronte
  const prioritarie = useMemo(() => new Set(necessarie.flatMap((s, i) => i < PRIME || s.chiave === priorita ? [s.meta.file] : [])), [necessarie, priorita]);
  useEffect(() => {
    let annullato = false;
    setCaricando(daFare()); setErrore(false);
    // tutte le richieste partono insieme (restano in cache); si aspettano prima quelle della vista iniziale
    const richieste = necessarie.map((s) => caricaSezioneLettura(s.meta).then((v) => [s.meta.file, v] as const));
    const subito = necessarie.flatMap((s, i) => i < PRIME || s.chiave === priorita ? [i] : []);
    const prepara = (s: SezioneLettura) => preparaBlocchi(s, idx.concettoById, idx.corso.norme);
    (async () => {
      if (subito.length < necessarie.length) {
        const prime = await Promise.allSettled(subito.map((i) => richieste[i]));
        if (annullato) return;
        const pronte = new Map(prime.flatMap((r) => r.status === 'fulfilled' ? [r.value] : []));
        pronte.forEach(prepara);
        // aggiunte a quelle già in memoria: un segno in una sezione nuova non fa sparire le altre
        setCaricate((prima) => [...pronte].every(([f, v]) => prima.get(f) === v) ? prima : new Map([...prima, ...pronte]));
      }
      const risultati = await Promise.allSettled(richieste);
      // il resto dopo il primo disegno della mappa (anche quando le sezioni sono già tutte arrivate)
      await dopoDisegno(); if (annullato) return;
      const pronte = new Map(risultati.flatMap((r) => r.status === 'fulfilled' ? [r.value] : []));
      // Blocchi preparati a piccoli lotti (restano in cache): decine di sezioni in un colpo bloccherebbero la pagina.
      let t = performance.now();
      for (const s of pronte.values()) {
        prepara(s);
        if (performance.now() - t > LOTTO_MS) { await pausa(); if (annullato) return; t = performance.now(); }
      }
      // stesso contenuto: si tiene lo stesso oggetto, così la mappa non si ricalcola né si ridisegna
      setCaricate((prima) => prima.size === pronte.size && [...pronte].every(([f, v]) => prima.get(f) === v) ? prima : pronte);
      setPreparate((n) => n + 1);
      setErrore(risultati.some((r) => r.status === 'rejected')); setCaricando(false);
    })();
    return () => { annullato = true; };
  }, [firma]);
  // Durante il disegno si preparano solo le sezioni della vista iniziale: le altre arrivano già pronte dai lotti
  // (riaprendo la mappa prima che i lotti finiscano, non si preparano tutte in un colpo).
  const modelli = useMemo(() => new Map([...caricate].flatMap(([file, s]) => {
    const blocchi = blocchiGiaPronti(s, idx.concettoById, idx.corso.norme) ?? (prioritarie.has(file) ? preparaBlocchi(s, idx.concettoById, idx.corso.norme) : undefined);
    return blocchi ? [[file, blocchi] as const] : [];
  })), [caricate, idx, prioritarie, preparate]);
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

/** Mappa sulla geometria del testo: per ogni lezione con segni, l'albero titoli → paragrafi → voci segnate.
 *  `priorita` («documento/sezione»): la lezione da mostrare per prima, calcolata prima delle altre. */
export function useMappaGeometrica(priorita?: string) {
  const { modelli, documenti, caricando, errore, originali } = useSezioniAnnotate(priorita);
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
    // Altrimenti si calcolano qui solo quelle che la mappa mostra per prime (la richiesta e le prime del testo):
    // la mappa compare subito, le altre arrivano dai lotti.
    const prime = new Set(elenco.flatMap((x, i) => i < PRIME || `${x.doc.id}/${x.meta.id}` === priorita ? [x] : []).slice(0, SUBITO_MAX));
    const sezioni: SezioneGeo[] = [];
    let mancanti = 0;
    for (const x of elenco) {
      const fresco = subito || prime.has(x) ? alberoSezione(x.doc, x.meta, x.blocchi, x.segni, idx) : alberoInCache(x.doc, x.meta, x.blocchi, x.segni, idx);
      if (!fresco) mancanti++;
      // nell'attesa dei lotti resta l'albero precedente della sezione (se c'è), invece di farla sparire
      const v = fresco ?? (alberiSezione.get(x.blocchi)?.idx === idx ? alberiSezione.get(x.blocchi)!.valore : undefined);
      if (!v) continue;
      v.visti.forEach((id) => visti.add(id));
      if (v.sezione) sezioni.push(v.sezione);
    }
    return { sezioni, collegati: visti.size, mancanti };
    // `giro`: ricalcolo quando l'effetto ha riempito la cache
  }, [documenti, originali, modelli, idx, giro, priorita]);
  useEffect(() => {
    if (!mancanti) return;
    let annullato = false;
    (async () => {
      // prima si lascia disegnare la mappa con le lezioni già pronte
      await dopoDisegno(); if (annullato) return;
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
