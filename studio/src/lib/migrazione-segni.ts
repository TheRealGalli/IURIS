// Segni degli Originali sostituiti da un testo riscritto (novembre 2026: Martines e Bin-Pitruzzella → testo IURIS di
// costituzionale; poi gli appunti di Romano → testo IURIS di Romano). La tabella di allineamento frase per frase
// (scripts/allinea-originali.mjs, `public/letture/<nuovo>/allineamento-<vecchio>.json`) dice dove è finita ogni frase
// vecchia; qui ogni segno salvato sul documento vecchio diventa un segno sul documento nuovo, con lo stesso tipo e
// colore, sulle frasi nuove corrispondenti. Sotto la soglia della tabella il segno resta «da ricollocare»: è salvato
// sulla pagina probabile con la citazione vecchia, il lettore lo elenca tra i segni da verificare e la mappa lo mette
// in coda. I dati del documento vecchio non si toccano (restano nel backup). Idempotente: i segni già trattati sono
// annotati in `segniMigrati` della lettura nuova; senza tabella o testi nuovi non cambia nulla e si riprova dopo.
import { codiciImpronta, impronta, type TabellaAllineamento } from './allineamento';
import { creaAncoraTesto, occorrenzeCitazione, type BloccoTestoLettura, type DocumentoLettura } from './letture';
import { normalizzaAncoreTesto, type AncoraTesto, type LetturaOriginale, type SegnoOriginale } from './originali';
import { caricaSezioneLettura, DOCUMENTI_LETTURA } from './letture-client';
import { renderMd } from './md';
import { aggiorna, progressoSalvato } from './store';
import { inDemo } from './archivio';

/** Documenti sostituiti. La coppia si attiva quando il documento nuovo è nel catalogo delle letture. */
export const SOSTITUZIONI_ORIGINALI: { vecchio: string; nuovo: string; sigla: string }[] = [
  { vecchio: 'costituzionale-martines-v1', nuovo: 'costituzionale-iuris-v1', sigla: 'mt' },
  { vecchio: 'costituzionale-bin-pitruzzella-v1', nuovo: 'costituzionale-iuris-v1', sigla: 'bp' },
  { vecchio: 'romano-pennacchio-2021-22-v1', nuovo: 'romano-iuris-v1', sigla: 'rp' },
];

export const BLOCCO_DA_RICOLLOCARE = 'ricollocare';
const paginaBlocco = (id: string): number | null => { const m = /^(?:manuale-[a-z0-9-]+-)?p(\d+)-/.exec(id); return m ? Number(m[1]) : null; };
const idRicollocare = (pagina: number) => `p${String(pagina).padStart(3, '0')}-${BLOCCO_DA_RICOLLOCARE}`;

interface FraseVecchia { blocco: string; i: number; f: number; pagina: number; imp: Set<string>; mappa: number[] }
interface FraseNuova { blocco: string; sezione: number; i: number; f: number }
export interface TabellaPronta {
  t: TabellaAllineamento;
  vecchie: FraseVecchia[];
  perBlocco: Map<string, { prima: number; quante: number; paginaNuova: number }>;
  perPagina: Map<number, number[]>;
  nuove: FraseNuova[];
  lunghezze: Map<string, number>;
}

/** Indici della tabella compatta (una volta per tabella). */
export function preparaTabella(t: TabellaAllineamento): TabellaPronta {
  const vecchie: FraseVecchia[] = [], perBlocco = new Map<string, { prima: number; quante: number; paginaNuova: number }>(), perPagina = new Map<number, number[]>();
  for (const [id, pagina, frasi, impronte, paginaNuova] of t.vecchi) {
    perBlocco.set(id, { prima: vecchie.length, quante: frasi.length / 2, paginaNuova });
    for (let k = 0; k < frasi.length; k += 2) {
      const n = vecchie.length;
      vecchie.push({ blocco: id, i: frasi[k], f: frasi[k + 1], pagina, imp: new Set(codiciImpronta(impronte[k / 2] ?? '')), mappa: t.mappa[n] ?? [0] });
      if (!perPagina.has(pagina)) perPagina.set(pagina, []);
      perPagina.get(pagina)!.push(n);
    }
  }
  const nuove: FraseNuova[] = [], lunghezze = new Map<string, number>();
  for (const [id, sezione, lunghezza, frasi] of t.nuovi) {
    lunghezze.set(id, lunghezza);
    for (let k = 0; k < frasi.length; k += 2) nuove.push({ blocco: id, sezione, i: frasi[k], f: frasi[k + 1] });
  }
  return { t, vecchie, perBlocco, perPagina, nuove, lunghezze };
}

interface Pezzo { testo: string; pagina: number; blocco?: string; inizio?: number; fine?: number }
const intersezione = (a: Set<string>, b: Set<string>) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };

/** Frasi vecchie coperte da un pezzo di segno: prima dagli indici dell'ancora (se il blocco c'è e le parole tornano),
 *  poi cercando le parole della citazione nelle frasi della pagina (±1). `null` = non si ritrova con sicurezza. */
function frasiDelPezzo(tab: TabellaPronta, p: Pezzo): number[] | null {
  const T = new Set(codiciImpronta(impronta(p.testo)));
  const b = p.blocco ? tab.perBlocco.get(p.blocco) : undefined;
  if (b && p.inizio !== undefined && p.fine !== undefined) {
    const qui: number[] = [];
    for (let k = b.prima; k < b.prima + b.quante; k++) { const s = tab.vecchie[k]; if (s.f > p.inizio && s.i < p.fine) qui.push(k); }
    if (qui.length) {
      const U = new Set(qui.flatMap((k) => [...tab.vecchie[k].imp]));
      if (!T.size || intersezione(T, U) / T.size >= 0.6) return qui;
    }
  }
  if (T.size < 2) return null;
  const finestra = [p.pagina - 1, p.pagina, p.pagina + 1].flatMap((pg) => tab.perPagina.get(pg) ?? []).sort((x, y) => x - y);
  // frasi quasi tutte dentro la citazione (segno su più frasi): il gruppo contiguo più ricco
  const dentro = finestra.filter((k) => { const s = tab.vecchie[k].imp; const n = intersezione(T, s); return s.size > 0 && n >= Math.min(2, s.size) && n / s.size >= 0.5; });
  if (dentro.length) {
    const gruppi: number[][] = [];
    for (const k of dentro) { const g = gruppi[gruppi.length - 1]; if (g && k - g[g.length - 1] <= 2) g.push(k); else gruppi.push([k]); }
    const valore = (g: number[]) => intersezione(T, new Set(g.flatMap((k) => [...tab.vecchie[k].imp])));
    gruppi.sort((x, y) => valore(y) - valore(x));
    const migliore = gruppi[0], v = valore(migliore);
    if (v / T.size >= 0.6 && (gruppi.length < 2 || valore(gruppi[1]) < v)) return migliore;
  }
  // citazione dentro una frase sola: la frase che ne contiene più parole, se è l'unica
  const punti = finestra.map((k) => ({ k, n: intersezione(T, tab.vecchie[k].imp) })).sort((x, y) => y.n - x.n);
  if (punti.length && punti[0].n / T.size >= 0.6 && (punti.length < 2 || punti[1].n < punti[0].n)) return [punti[0].k];
  return null;
}

export interface EsitoSegno { stato: 'migrato' | 'ricollocare' | 'perso'; segno?: SegnoOriginale; punteggio: number; frasiVecchie: number[] }

/** Il segno vecchio sul documento nuovo. `testi`: textContent dei blocchi nuovi (id → blocco) già caricati. */
export function migraSegno(segno: SegnoOriginale, tab: TabellaPronta, testi: Map<string, BloccoTestoLettura>, edizione: number, sigla: string, pagineNuove: number): EsitoSegno {
  const pezzi: Pezzo[] = segno.ancoreTesto?.length
    ? segno.ancoreTesto.map((a) => ({ testo: a.citazione, pagina: paginaBlocco(a.blocco) ?? segno.pagina, blocco: a.blocco, inizio: a.inizio, fine: a.fine }))
    : [{ testo: segno.testo, pagina: segno.pagina }];
  const trovate = pezzi.map((p) => frasiDelPezzo(tab, p));
  const frasiVecchie = [...new Set(trovate.flatMap((x) => x ?? []))].sort((a, b) => a - b);
  const citazione = (segno.ancoreTesto?.length ? segno.ancoreTesto.map((a) => a.citazione).join('\n\n') : segno.testo).trim().slice(0, 10000);
  const id = `${sigla}-${segno.id}`.slice(0, 200);
  const base = { id, tipo: segno.tipo, colore: segno.colore, creata: segno.creata, rettangoli: [] };
  const ricollocare = (punteggio: number): EsitoSegno => {
    if (!citazione) return { stato: 'perso', punteggio, frasiVecchie };
    const prima = frasiVecchie.length ? tab.vecchie[frasiVecchie[0]] : null;
    const stima = (prima && tab.perBlocco.get(prima.blocco)?.paginaNuova)
      || (pezzi[0].blocco && tab.perBlocco.get(pezzi[0].blocco)?.paginaNuova)
      || (tab.t.modo === 'pagine' ? pezzi[0].pagina : 1);
    const pagina = Math.max(1, Math.min(pagineNuove, Math.round(stima)));
    const ancora: AncoraTesto = { edizione, blocco: idRicollocare(pagina), inizio: 0, fine: citazione.length, citazione, prefisso: '', suffisso: '' };
    return { stato: 'ricollocare', punteggio, frasiVecchie, segno: { ...base, pagina, testo: citazione, ancoreTesto: [ancora] } };
  };
  if (!frasiVecchie.length) return ricollocare(0);
  // punteggio: media delle frasi coperte pesata sulle parole piene
  let somma = 0, peso = 0;
  const nuove = new Set<number>();
  for (const k of frasiVecchie) {
    const s = tab.vecchie[k], w = Math.max(1, s.imp.size);
    somma += s.mappa[0] * w; peso += w;
    for (const j of s.mappa.slice(1)) nuove.add(j);
  }
  const punteggio = Math.round(somma / peso);
  // un pezzo non ritrovato: il segno non è più intero, meglio ricollocarlo
  if (!nuove.size || punteggio < tab.t.soglia || trovate.some((x) => !x)) return ricollocare(punteggio);
  const indici = [...nuove].sort((a, b) => a - b);
  for (const j of indici) {
    const n = tab.nuove[j], b = testi.get(n.blocco);
    if (!b || b.testo.length !== tab.lunghezze.get(n.blocco)) return ricollocare(punteggio);  // testo nuovo cambiato
  }
  // Se la citazione vecchia c'è pari pari (una volta sola) nelle frasi nuove, si segna solo quel tratto.
  let ancore: AncoraTesto[] = [];
  if (pezzi.length === 1) {
    const blocchi = [...new Set(indici.map((j) => tab.nuove[j].blocco))];
    const esatte = blocchi.flatMap((id) => occorrenzeCitazione(testi.get(id)!.testo, citazione).map((r) => ({ id, ...r })));
    if (esatte.length === 1) { const a = creaAncoraTesto(testi.get(esatte[0].id)!, esatte[0].inizio, esatte[0].fine, edizione); if (a) ancore = [a]; }
  }
  if (!ancore.length) {
    // frasi nuove contigue dello stesso blocco → un solo tratto
    let tratto: { blocco: string; i: number; f: number; ultimo: number } | null = null;
    const chiudi = () => { if (tratto) { const a = creaAncoraTesto(testi.get(tratto.blocco)!, tratto.i, tratto.f, edizione); if (a) ancore.push(a); } };
    for (const j of indici) {
      const n = tab.nuove[j];
      if (tratto && tratto.blocco === n.blocco && j === tratto.ultimo + 1) { tratto.f = n.f; tratto.ultimo = j; continue; }
      chiudi(); tratto = { blocco: n.blocco, i: n.i, f: n.f, ultimo: j };
    }
    chiudi();
  }
  let caratteri = 0;
  ancore = ancore.filter((a) => (caratteri += a.citazione.length) <= 10000).slice(0, 1000);
  try { ancore = normalizzaAncoreTesto(ancore); } catch { return ricollocare(punteggio); }
  if (!ancore.length) return ricollocare(punteggio);
  const pagina = Math.max(1, Math.min(pagineNuove, paginaBlocco(ancore[0].blocco) ?? testi.get(ancore[0].blocco)?.pagina ?? 1));
  return { stato: 'migrato', punteggio, frasiVecchie, segno: { ...base, pagina, testo: ancore.map((a) => a.citazione).join('\n').slice(0, 10000), ancoreTesto: ancore } };
}

export interface ResocontoSegni { vecchio: string; nuovo: string; migrati: number; ricollocare: number; persi: number }

/** Applica a una lettura del documento nuovo i segni del vecchio non ancora trattati. Pura: restituisce la lettura
 *  nuova (o quella di prima, se non c'è nulla da fare). I segni si aggiungono in coda, fuori dalla cronologia di Annulla. */
export function applicaMigrazioneSegni(nuova: LetturaOriginale | undefined, vecchia: LetturaOriginale, vecchio: string, esiti: Map<string, EsitoSegno>, paginaIniziale: number): { lettura: LetturaOriginale | undefined; resoconto: Omit<ResocontoSegni, 'vecchio' | 'nuovo'> } {
  const fatti = new Set(nuova?.segniMigrati?.[vecchio] ?? []);
  const presenti = new Set((nuova?.segni ?? []).map((s) => s.id));
  const resoconto = { migrati: 0, ricollocare: 0, persi: 0 };
  const aggiunti: SegnoOriginale[] = [], trattati: string[] = [];
  for (const s of vecchia.segni) {
    if (fatti.has(s.id)) continue;
    const e = esiti.get(s.id);
    if (!e) continue;  // non calcolato (es. testi nuovi non caricati): si riprova
    trattati.push(s.id);
    if (e.stato === 'perso' || !e.segno) { resoconto.persi++; continue; }
    if (presenti.has(e.segno.id)) continue;
    presenti.add(e.segno.id); aggiunti.push(e.segno);
    if (e.stato === 'migrato') resoconto.migrati++; else resoconto.ricollocare++;
  }
  if (!trattati.length) return { lettura: nuova, resoconto };
  const base: LetturaOriginale = nuova ?? { pagina: paginaIniziale, segni: [], storiaSegni: { indietro: [], avanti: [] } };
  // Senza storia esplicita, Annulla toglierebbe anche i segni migrati: la si fissa prima di aggiungerli.
  const storiaSegni = base.storiaSegni ?? { indietro: (base.segni ?? []).slice(-50).map((segno, i, arr) => ({ tipo: 'aggiungi' as const, segno, posizione: base.segni.length - arr.length + i })), avanti: [] };
  return {
    lettura: { ...base, segni: [...base.segni, ...aggiunti], storiaSegni,
      segniMigrati: { ...base.segniMigrati, [vecchio]: [...fatti, ...trattati] } },
    resoconto,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Esecuzione nell'app: tabelle e testi caricati dalla rete, scrittura con lo store.

const tabelle = new Map<string, Promise<TabellaPronta | null>>();
async function caricaTabella(nuovo: string, vecchio: string, sha: string): Promise<TabellaPronta | null> {
  const chiave = `${nuovo}/${vecchio}`;
  if (!tabelle.has(chiave)) tabelle.set(chiave, (async () => {
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const r = await fetch(`${base}letture/${nuovo}/allineamento-${vecchio}.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error('tabella non disponibile');
    const t = await r.json() as TabellaAllineamento;
    // tabella fatta su un altro testo nuovo: non si usa (va rifatta con allinea-originali.mjs)
    return t.formato === 1 && t.vecchio === vecchio && t.nuovo === nuovo && t.fonteNuovo === sha ? preparaTabella(t) : null;
  })().catch((e) => { tabelle.delete(chiave); throw e; }));
  return tabelle.get(chiave)!;
}

/** textContent dei blocchi come lo calcola il lettore (Markdown → HTML → testo). */
async function testiNuovi(doc: DocumentoLettura, tab: TabellaPronta, sezioni: Set<number>): Promise<Map<string, BloccoTestoLettura>> {
  const out = new Map<string, BloccoTestoLettura>();
  for (const si of sezioni) {
    const meta = doc.sezioni.find((s) => s.file === tab.t.sezioni[si]);
    if (!meta) continue;
    const sezione = await caricaSezioneLettura(meta);
    for (const b of sezione.blocchi) {
      if (out.has(b.id)) continue;
      const div = document.createElement('div'); div.innerHTML = renderMd(b.markdown);
      out.set(b.id, { id: b.id, pagina: b.pagina, testo: div.textContent ?? '' });
    }
  }
  return out;
}

const inCorso = new Map<string, Promise<ResocontoSegni[]>>();
/**
 * Migra i segni di tutte le coppie attive (o solo quelle della materia indicata). Ripetibile: ogni volta tratta solo
 * i segni vecchi non ancora annotati. In demo non fa nulla. Errori di rete: nessuna modifica, si riprova dopo.
 */
export function migraSegniOriginali(materia?: string): Promise<ResocontoSegni[]> {
  const chiave = materia ?? '*';
  if (!inCorso.has(chiave)) inCorso.set(chiave, esegui(materia)
    .catch((e) => { console.warn('Migrazione dei segni degli Originali non riuscita', e); return []; })
    .finally(() => inCorso.delete(chiave)));
  return inCorso.get(chiave)!;
}

async function esegui(materia?: string): Promise<ResocontoSegni[]> {
  const out: ResocontoSegni[] = [];
  for (const { vecchio, nuovo, sigla } of SOSTITUZIONI_ORIGINALI) {
    const doc = DOCUMENTI_LETTURA.find((d) => d.id === nuovo);
    if (!doc || (materia && doc.materia !== materia) || inDemo()) continue;
    const p = progressoSalvato(doc.materia);
    const vecchia = p?.originali?.[vecchio];
    const fatti = new Set(p?.originali?.[nuovo]?.segniMigrati?.[vecchio] ?? []);
    const daFare = (vecchia?.segni ?? []).filter((s) => !fatti.has(s.id));
    if (!vecchia || !daFare.length) continue;
    let tab: TabellaPronta | null;
    try { tab = await caricaTabella(nuovo, vecchio, doc.fonteSha256); } catch { continue; }
    if (!tab) continue;
    const t = tab;
    // prima si trovano le frasi vecchie, poi si caricano solo le sezioni nuove che servono
    const sezioni = new Set<number>();
    for (const s of daFare) {
      const prova = migraSegno(s, t, new Map(), doc.edizione, sigla, doc.pagine);
      for (const k of prova.frasiVecchie) for (const j of t.vecchie[k].mappa.slice(1)) sezioni.add(t.nuove[j].sezione);
    }
    let testi: Map<string, BloccoTestoLettura>;
    try { testi = await testiNuovi(doc, t, sezioni); } catch { continue; }
    const esiti = new Map(daFare.map((s) => [s.id, migraSegno(s, t, testi, doc.edizione, sigla, doc.pagine)]));
    if (inDemo()) continue;
    let resoconto: Omit<ResocontoSegni, 'vecchio' | 'nuovo'> = { migrati: 0, ricollocare: 0, persi: 0 };
    aggiorna(doc.materia, (q) => {
      const v = q.originali?.[vecchio];
      if (!v) return q;
      const r = applicaMigrazioneSegni(q.originali?.[nuovo], v, vecchio, esiti, tab.t.modo === 'pagine' ? Math.min(doc.pagine, v.pagina) : 1);
      resoconto = r.resoconto;
      if (!r.lettura || r.lettura === q.originali?.[nuovo]) return q;
      return { ...q, originali: { ...q.originali, [nuovo]: r.lettura } };
    });
    out.push({ vecchio, nuovo, ...resoconto });
  }
  return out;
}
