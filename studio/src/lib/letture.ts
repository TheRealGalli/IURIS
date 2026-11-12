import type { AncoraTesto, SegnoOriginale } from './originali';

export interface SezioneCatalogoLettura {
  id: string; titolo: string; da: number; a: number; file: string;
  /** Primo blocco, quando la pagina d'inizio è condivisa con la sezione precedente (blocchi riportati indietro). */
  primo?: string;
  lezione?: string; lezioni?: string[]; revisionata?: boolean;
  tipoFonte?: 'manuale-ricostruito'; manuale?: [number, number];
  soloTitolo?: boolean; integrazione?: { documento: string; sezione: string };
}
export type IndiceSezioneLettura = SezioneCatalogoLettura;
export interface DocumentoLettura {
  id: string; edizione: number; materia: string; titolo: string;
  fonteSha256: string; pagine: number; sezioni: SezioneCatalogoLettura[];
  tipoFonte?: 'manuale-ricostruito'; manuale?: [number, number];
}
export interface BloccoLettura {
  id: string; pagina: number; markdown: string; concetti: string[];
  testoFonte?: string; notaRevisione?: string;
  /** Avviso per lo studente su un aggiornamento sostanziale, distinto dalle note redazionali. */
  notaAggiornamento?: string;
}
export interface SezioneLettura {
  documento: string; edizione: number; id: string; titolo: string; da: number; a: number;
  lezione?: string; lezioni?: string[]; revisionata?: boolean; blocchi: BloccoLettura[];
  tipoFonte?: 'manuale-ricostruito'; manuale?: [number, number];
  soloTitolo?: boolean; integrazione?: { documento: string; sezione: string };
}
/** `testo` deve essere il textContent reso dal lettore: gli offset non sono offset Markdown. */
export interface BloccoTestoLettura {
  id: string; pagina: number; testo: string; concetti?: string[];
}
export type BloccoTesto = BloccoTestoLettura;
export interface ProiezioneSegnoTesto {
  stato: 'proiettato' | 'da-verificare' | 'fuori-sezione';
  origine: 'testo' | 'pdf'; ancore: AncoraTesto[];
  /** Una parte del segno appartiene a un'altra sezione, che resta conservata. */
  parziale?: boolean;
}
export type SegnoTestoProiettato = ProiezioneSegnoTesto & { segno: SegnoOriginale };

interface TestoIndicizzato { testo: string; inizi: number[]; fini: number[] }
const indiciTesto = new Map<string, TestoIndicizzato>();

/** Normalizzazione conservativa, mantenendo il percorso verso ogni offset originale UTF-16. */
function indicizzaTesto(testo: string): TestoIndicizzato {
  const precedente = indiciTesto.get(testo);
  if (precedente) { indiciTesto.delete(testo); indiciTesto.set(testo, precedente); return precedente; }
  const segmenti = [...testo.matchAll(/\p{L}\p{M}*|\p{M}+|[\s\S]/gu)].map((m) => ({ testo: m[0], inizio: m.index!, fine: m.index! + m[0].length }));
  const caratteri: string[] = [], inizi: number[] = [], fini: number[] = [];
  for (let i = 0; i < segmenti.length; i++) {
    const s = segmenti[i];
    if (s.testo === '\u00ad') continue;
    // Ricongiunge soltanto sillabazioni con un effettivo ritorno a capo tra lettere.
    if (s.testo === '-' && i > 0 && /^\p{L}/u.test(segmenti[i - 1].testo)) {
      let j = i + 1, aCapo = false;
      while (j < segmenti.length && /^\s+$/u.test(segmenti[j].testo)) { aCapo ||= /[\r\n]/.test(segmenti[j].testo); j++; }
      if (aCapo && j < segmenti.length && /^\p{L}/u.test(segmenti[j].testo)) { i = j - 1; continue; }
    }
    let normalizzato = /^\s+$/u.test(s.testo) ? ' ' : s.testo.normalize('NFC').toLowerCase();
    normalizzato = normalizzato.replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"');
    if (normalizzato === ' ' && (!caratteri.length || caratteri[caratteri.length - 1] === ' ')) {
      if (caratteri.length) fini[fini.length - 1] = s.fine;
      continue;
    }
    for (let k = 0; k < normalizzato.length; k++) { caratteri.push(normalizzato[k]); inizi.push(s.inizio); fini.push(s.fine); }
  }
  if (caratteri[caratteri.length - 1] === ' ') { caratteri.pop(); inizi.pop(); fini.pop(); }
  const indice = { testo: caratteri.join(''), inizi, fini };
  // Piccola cache della vista corrente: non cresce insieme a tutti i capitoli letti.
  if (testo.length >= 256 && testo.length <= 60000) {
    if (indiciTesto.size >= 16) indiciTesto.delete(indiciTesto.keys().next().value!);
    indiciTesto.set(testo, indice);
  }
  return indice;
}

export const normalizzaTestoLettura = (testo: string): string => indicizzaTesto(testo).testo;

function occorrenze(testo: string, citazione: string): { inizio: number; fine: number }[] {
  return occorrenzeIn(indicizzaTesto(testo), normalizzaTestoLettura(citazione));
}
/** Come `occorrenze`, con testo già indicizzato e citazione già normalizzata (ricerche ripetute sugli stessi blocchi). */
function occorrenzeIn(indice: TestoIndicizzato, query: string): { inizio: number; fine: number }[] {
  if (!query) return [];
  const trovate: { inizio: number; fine: number }[] = [];
  for (let da = 0; da <= indice.testo.length - query.length;) {
    const pos = indice.testo.indexOf(query, da);
    if (pos < 0) break;
    trovate.push({ inizio: indice.inizi[pos], fine: indice.fini[pos + query.length - 1] }); da = pos + 1;
  }
  return trovate;
}

/**
 * Ricerca tollerante all'impaginazione: ignora spazi, a capo, segni di elenco e frecce (- – — • > →) e i numeri
 * delle voci («4- », «5. », «b) »), che una revisione può trasformare in un vero elenco (il numero esce
 * dal testo e diventa il segno della voce) senza cambiare le parole.
 */
const SEGNI_IMPAGINAZIONE = /[\s\-–—•>→]/u;
const NUMERO_VOCE = /(^|[\s(])(?:\d{1,2}|[a-z])[-–.)°](?=\s|$)/gu;
function compatta(testo: string): { car: string[]; pos: number[] } {
  const salta = new Set<number>();
  for (const m of testo.matchAll(NUMERO_VOCE)) for (let k = m.index! + m[1].length; k < m.index! + m[0].length; k++) salta.add(k);
  const car: string[] = [], pos: number[] = [];
  for (let k = 0; k < testo.length; k++) if (!salta.has(k) && !SEGNI_IMPAGINAZIONE.test(testo[k])) { car.push(testo[k]); pos.push(k); }
  return { car, pos };
}
const compatti = new WeakMap<TestoIndicizzato, { car: string[]; pos: number[] }>();
function occorrenzeElastiche(testo: string, citazione: string): { inizio: number; fine: number }[] {
  return occorrenzeElasticheIn(indicizzaTesto(testo), compatta(normalizzaTestoLettura(citazione)).car.join(''));
}
function occorrenzeElasticheIn(indice: TestoIndicizzato, q: string): { inizio: number; fine: number }[] {
  if (q.length < 8) return [];
  let c = compatti.get(indice); if (!c) { c = compatta(indice.testo); compatti.set(indice, c); }
  const { car, pos } = c;
  const compatto = car.join(''), trovate: { inizio: number; fine: number }[] = [];
  for (let da = 0; ;) {
    const i = compatto.indexOf(q, da); if (i < 0) break;
    trovate.push({ inizio: indice.inizi[pos[i]], fine: indice.fini[pos[i + q.length - 1]] }); da = i + 1;
  }
  return trovate;
}

/** Occorrenze di una citazione nel testo (offset sul testo originale): esatte a meno di maiuscole e spazi, altrimenti
 *  ignorando impaginazione e numeri delle voci. Serve anche alla migrazione dei segni tra versioni di un Originale. */
export function occorrenzeCitazione(testo: string, citazione: string): { inizio: number; fine: number }[] {
  const esatte = occorrenze(testo, citazione);
  return esatte.length ? esatte : occorrenzeElastiche(testo, citazione);
}

export function creaAncoraTesto(blocco: BloccoTestoLettura, inizio: number, fine: number, edizione: number): AncoraTesto | null {
  if (!Number.isSafeInteger(inizio) || !Number.isSafeInteger(fine) || inizio < 0 || fine > blocco.testo.length || fine <= inizio || !Number.isSafeInteger(edizione) || edizione < 1) return null;
  const parte = blocco.testo.slice(inizio, fine);
  const a = inizio + (parte.match(/^\s*/u)?.[0].length ?? 0), b = fine - (parte.match(/\s*$/u)?.[0].length ?? 0);
  if (b <= a) return null;
  return { edizione, blocco: blocco.id, inizio: a, fine: b, citazione: blocco.testo.slice(a, b), prefisso: blocco.testo.slice(Math.max(0, a - 40), a), suffisso: blocco.testo.slice(b, b + 40) };
}

function contestoCoerente(testo: string, inizio: number, fine: number, ancora: AncoraTesto): boolean {
  const prima = normalizzaTestoLettura(testo.slice(0, inizio)), dopo = normalizzaTestoLettura(testo.slice(fine));
  const prefisso = normalizzaTestoLettura(ancora.prefisso), suffisso = normalizzaTestoLettura(ancora.suffisso);
  return (!prefisso || prima.endsWith(prefisso)) && (!suffisso || dopo.startsWith(suffisso));
}

function ritrovaAncora(blocco: BloccoTestoLettura, ancora: AncoraTesto, edizione: number): AncoraTesto | null {
  if (ancora.edizione === edizione && blocco.testo.slice(ancora.inizio, ancora.fine) === ancora.citazione && contestoCoerente(blocco.testo, ancora.inizio, ancora.fine, ancora)) {
    return creaAncoraTesto(blocco, ancora.inizio, ancora.fine, edizione);
  }
  const trovate = occorrenze(blocco.testo, ancora.citazione);
  const coerenti = trovate.length === 1 ? trovate : trovate.filter((r) => contestoCoerente(blocco.testo, r.inizio, r.fine, ancora));
  if (coerenti.length === 1) return creaAncoraTesto(blocco, coerenti[0].inizio, coerenti[0].fine, edizione);
  if (trovate.length) return null;
  const elastiche = occorrenzeElastiche(blocco.testo, ancora.citazione);
  return elastiche.length === 1 ? creaAncoraTesto(blocco, elastiche[0].inizio, elastiche[0].fine, edizione) : null;
}

function paginaBlocco(id: string): number | null {
  const m = /^(?:manuale-[a-z0-9-]+-)?p(\d+)-/.exec(id); return m ? Number(m[1]) : null;
}

type IntervalloSezione = { da: number; a: number; tipoFonte?: 'manuale-ricostruito' };
/** Dati della sezione che non dipendono dal segno: calcolati una volta per tutti i segni (vedi `proiettaSegniTesto`). */
interface ContestoProiezione {
  blocchi: BloccoTestoLettura[]; byId: Map<string, BloccoTestoLettura>; range: { da: number; a: number } | null;
  soloManuale: boolean; intervallo?: IntervalloSezione;
  /** Il blocco (assente qui) sta in un'altra sezione che condivide la pagina: il segno è fuori sezione, non da verificare. */
  altrove?: (blocco: string) => boolean;
}
function contestoProiezione(blocchi: BloccoTestoLettura[], intervallo?: IntervalloSezione, altrove?: (blocco: string) => boolean): ContestoProiezione {
  let da = Infinity, a = -Infinity;
  for (const b of blocchi) { if (b.pagina < da) da = b.pagina; if (b.pagina > a) a = b.pagina; }
  return { blocchi, byId: new Map(blocchi.map((b) => [b.id, b])), range: intervallo ?? (blocchi.length ? { da, a } : null),
    soloManuale: blocchi.length > 0 && blocchi.every((b) => b.id.startsWith('manuale-')), intervallo, altrove };
}

/**
 * Non migra né modifica il segno salvato: restituisce solo intervalli verificati
 * nel testo visibile. Se la citazione è stata rettificata, resta da verificare.
 * `altrove`: vero per i blocchi di un'altra sezione dello stesso documento (pagine condivise tra due sezioni).
 */
export function proiettaSegnoTesto(segno: SegnoOriginale, blocchi: BloccoTestoLettura[], edizione: number, intervallo?: IntervalloSezione, altrove?: (blocco: string) => boolean): ProiezioneSegnoTesto {
  return proietta(segno, contestoProiezione(blocchi, intervallo, altrove), edizione);
}
function proietta(segno: SegnoOriginale, ctx: ContestoProiezione, edizione: number): ProiezioneSegnoTesto {
  const { blocchi, range, intervallo } = ctx;
  const origine = segno.ancoreTesto?.length ? 'testo' : 'pdf';
  const fuori = (pagina: number) => !!range && (pagina < range.da || pagina > range.a);
  const risultato = (stato: ProiezioneSegnoTesto['stato'], ancore: AncoraTesto[] = [], parziale = false): ProiezioneSegnoTesto => ({ stato, origine, ancore, ...(parziale ? { parziale: true } : {}) });
  if (origine === 'pdf' && (intervallo?.tipoFonte === 'manuale-ricostruito' || ctx.soloManuale)) return risultato('fuori-sezione');
  if (origine === 'testo') {
    const byId = ctx.byId;
    const ancore: AncoraTesto[] = [];
    let fuoriSezione = 0;
    for (const a of segno.ancoreTesto!) {
      const blocco = byId.get(a.blocco);
      if (!blocco) {
        const pagina = paginaBlocco(a.blocco);
        if (pagina !== null && (fuori(pagina) || ctx.altrove?.(a.blocco))) { fuoriSezione++; continue; }
        return risultato('da-verificare');
      }
      const ritrovata = ritrovaAncora(blocco, a, edizione);
      if (!ritrovata) return risultato('da-verificare');
      ancore.push(ritrovata);
    }
    return ancore.length ? risultato('proiettato', ancore, fuoriSezione > 0) : risultato('fuori-sezione');
  }
  if (fuori(segno.pagina)) return risultato('fuori-sezione');
  const pagina = blocchi.filter((b) => b.pagina === segno.pagina);
  if (!pagina.length) return risultato('da-verificare');
  const posizioni: { blocco: BloccoTestoLettura; inizio: number; fine: number }[] = [];
  let testo = '';
  for (const b of pagina) {
    if (testo) testo += '\n';
    const inizio = testo.length; testo += b.testo;
    posizioni.push({ blocco: b, inizio, fine: testo.length });
  }
  const trovate = occorrenze(testo, segno.testo);
  if (trovate.length !== 1) return risultato('da-verificare');
  const r = trovate[0];
  const ancore = posizioni.flatMap((p) => {
    const inizio = Math.max(r.inizio, p.inizio), fine = Math.min(r.fine, p.fine);
    const ancora = fine > inizio ? creaAncoraTesto(p.blocco, inizio - p.inizio, fine - p.inizio, edizione) : null;
    return ancora ? [ancora] : [];
  });
  return ancore.length ? risultato('proiettato', ancore) : risultato('da-verificare');
}

/**
 * Ultima risorsa per la mappa: la citazione (o il suo tratto più lungo, almeno sei parole) cercata in tutti i
 * paragrafi della sezione, anche se il blocco o il contesto sono cambiati. Solo occorrenze uniche; altrimenti null.
 */
export function ritrovaNellaSezione(citazione: string, blocchi: BloccoTestoLettura[], edizione: number): AncoraTesto[] | null {
  // Ogni blocco si indicizza una volta sola per tutte le ricerche (prima: una volta per blocco e per tratto cercato).
  const indici = blocchi.map((b) => indicizzaTesto(b.testo));
  const cerca = (q: string) => {
    const norm = normalizzaTestoLettura(q), compattata = compatta(norm).car.join('');
    const esatte = blocchi.flatMap((b, i) => occorrenzeIn(indici[i], norm).map((r) => ({ b, ...r })));
    const trovate = esatte.length ? esatte : blocchi.flatMap((b, i) => occorrenzeElasticheIn(indici[i], compattata).map((r) => ({ b, ...r })));
    return trovate.length === 1 ? creaAncoraTesto(trovate[0].b, trovate[0].inizio, trovate[0].fine, edizione) : null;
  };
  const pezzi = citazione.split(/\n\s*\n/).map((x) => x.trim()).filter((x) => x.length >= 3);
  const intere = pezzi.map(cerca);
  if (intere.length && intere.every(Boolean)) return intere as AncoraTesto[];
  // Il tratto più lungo che si ritrova una volta sola: meglio una parte nel punto giusto che niente.
  const parole = citazione.split(/\s+/).filter(Boolean);
  for (let n = Math.min(parole.length - 1, 40); n >= 6; n = n > 12 ? Math.floor(n * 0.75) : n - 2) {
    for (let i = 0; i + n <= parole.length; i += Math.max(1, Math.floor(n / 3))) {
      const a = cerca(parole.slice(i, i + n).join(' '));
      if (a) return [a];
    }
  }
  return null;
}

export function proiettaSegniTesto(segni: SegnoOriginale[], blocchi: BloccoTestoLettura[], edizione: number, intervallo?: IntervalloSezione, altrove?: (blocco: string) => boolean): SegnoTestoProiettato[] {
  const ctx = contestoProiezione(blocchi, intervallo, altrove);
  return segni.map((segno) => ({ segno, ...proietta(segno, ctx, edizione) }));
}

export const ancoreSiToccano = (a: AncoraTesto, b: AncoraTesto): boolean => a.blocco === b.blocco && Math.min(a.fine, b.fine) > Math.max(a.inizio, b.inizio);

export function idsSegniNellaSelezioneTesto(proiezioni: SegnoTestoProiettato[], selezione: AncoraTesto[]): string[] {
  return proiezioni.filter((p) => p.stato === 'proiettato' && p.ancore.some((a) => selezione.some((b) => ancoreSiToccano(a, b)))).map((p) => p.segno.id);
}

/** Concetti di contesto del paragrafo, distinti dai collegamenti editoriali del corso. */
export function concettiDelPassaggio(proiezione: ProiezioneSegnoTesto, blocchi: BloccoTestoLettura[]): string[] {
  const ids = new Set(proiezione.ancore.map((a) => a.blocco));
  return [...new Set(blocchi.filter((b) => ids.has(b.id)).flatMap((b) => b.concetti ?? []))];
}

/** Lezioni del Percorso coperte da una sezione: lo stato «Studiata» è solo quello delle lezioni, mai una copia. */
export function lezioniSezione(s: Pick<SezioneCatalogoLettura, 'lezione' | 'lezioni' | 'soloTitolo'>): string[] {
  if (s.soloTitolo) return [];
  return [...new Set([...(s.lezione ? [s.lezione] : []), ...(s.lezioni ?? [])])];
}
/** Una sezione è studiata quando lo sono tutte le sue lezioni; `parziale` se solo alcune. */
export function statoStudioSezione(s: Pick<SezioneCatalogoLettura, 'lezione' | 'lezioni' | 'soloTitolo'>, lezioni: Record<string, { studiata?: string } | undefined>) {
  const ids = lezioniSezione(s), studiate = ids.filter((id) => !!lezioni[id]?.studiata);
  return { ids, studiate, studiata: ids.length > 0 && studiate.length === ids.length, parziale: studiate.length > 0 && studiate.length < ids.length };
}
