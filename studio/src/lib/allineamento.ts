// Allineamento tra due versioni di un Originale (testo vecchio → testo riscritto, stessa numerazione di pagina).
// Funzioni pure, condivise da scripts/allinea-originali.mjs (che costruisce la tabella) e dall'app
// (lib/migrazione-segni.ts, che sposta i segni). Nessun testo del documento vecchio finisce nella tabella:
// di ogni frase vecchia restano solo i confini e l'«impronta» (parole piene ridotte a un codice di 3 caratteri).

/** Tabella pubblicata in `public/letture/<nuovo>/allineamento-<vecchio>.json`. */
export interface TabellaAllineamento {
  formato: 1;
  vecchio: string;
  nuovo: string;
  modo: 'pagine' | 'lezioni';
  /** sha256 del testo nuovo (come `fonteSha256` nel catalogo delle letture): se cambia, la tabella non vale più. */
  fonteNuovo: string;
  /** Punteggio (0–100) sotto il quale la corrispondenza non è sicura. */
  soglia: number;
  /** File delle sezioni del documento nuovo (indice usato in `nuovi`). */
  sezioni: string[];
  /** Blocchi vecchi in ordine: [id, pagina, frasi (inizio, fine, … sul textContent), impronte per frase, pagina nuova probabile]. */
  vecchi: [string, number, number[], string[], number][];
  /** Blocchi nuovi in ordine: [id, indice della sezione, lunghezza del textContent, frasi (inizio, fine, …)]. */
  nuovi: [string, number, number, number[]][];
  /** Per ogni frase vecchia (in ordine): [punteggio 0–100, indici delle frasi nuove…]; [0] = nessuna. */
  mappa: number[][];
}

const STOP = new Set(`alla alle allo agli dalla dalle dallo dagli dalla della delle dello degli nella nelle nello negli sulla sulle sullo sugli
anche ancora come cosi così dove quando mentre sono sono essere stato stata stati state essere avere aveva avevano hanno abbia abbiano
questo questa questi queste quello quella quelli quelle quale quali loro lui lei esso essa essi esse egli ella cui chi che
non piu più meno molto molti molte tutto tutti tutte tanto tanta poco poi pure però pero quindi dunque infatti inoltre invece
ogni altro altra altri altre stesso stessa stessi stesse proprio propria propri proprie fra tra per con senza sopra sotto
dalle nelle sulla della dello degli anche cioè cioe ossia ovvero oppure ovvero perché perche poiché poiche affinché affinche
sia siano sarà sara saranno sarebbe sarebbero viene vengono veniva può puo possono potrebbe deve devono doveva dovrebbe
fare fatto fatta fatti fanno cosa cose modo caso casi parte parti volta volte tale tali qualsiasi qualunque alcuni alcune alcun
nonché nonche salvo entro verso secondo circa oltre prima dopo sempre mai già gia solo soltanto anzi bensì bensi tuttavia
mediante attraverso quanto quanta quanti quante altresì altresi ecco ecc etc cfr`.split(/\s+/));

/** Parole latine brevi o comuni da tenere comunque (pesano di più). */
export const LATINO = new Set(`ius iura iure lex leges legis legibus res rei rem ex ab ad de in per pro sub post ante erga omnes nunc tunc quo
status ultra vires bis idem una tantum facto habeas corpus pacta sunt servanda rebus sic stantibus ratio decidendi obiter dictum
prorogatio imperii interna corporis veto quorum referendum solutus princeps populus senatus consultum gens gentes pater familias
patria potestas mancipium manus dominium usus fructus actio actiones edictum praetor praetores consul consules tribunus plebis
civitas cives civis provocatio iudex iudicium mos maiorum fas nefas sacer auctoritas imperium potestas magistratus comitia curiata
centuriata tributa plebiscitum plebiscita rex reges interrex fetiales pontifex pontifices digesta institutiones codex novellae
stipulatio mutuum commodatum depositum pignus emptio venditio locatio conductio societas mandatum obligatio obligationes dolus culpa
bona fides fide mala condictio vindicatio rei possessio traditio usucapio mancipatio cessio legis actiones formula formulae
quod quia sine qua non nulla poena crimen lege praevia certa scripta`.split(/\s+/));

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Forma ridotta di una parola: minuscole, senza accenti, troncata a 6 lettere (copre le flessioni). */
export function radice(parola: string): string {
  const p = parola.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
  return /^\d/.test(p) ? p : p.slice(0, 6);
}

export interface Parola { r: string; peso: number }

/** Parole piene di una frase, con il peso del tipo (numeri e date ×3, nomi propri e latino ×2). */
export function parolePiene(testo: string): Parola[] {
  const out: Parola[] = [];
  let primo = true;
  for (const m of testo.matchAll(/[\p{L}\p{M}]+|\d+(?:[.,/]\d+)*/gu)) {
    const w = m[0];
    const base = w.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();
    const inizio = primo; primo = false;
    if (/^\d/.test(w)) { out.push({ r: base.replace(/[.,]/g, ''), peso: 3 }); continue; }
    if (LATINO.has(base)) { out.push({ r: radice(base), peso: 2 }); continue; }
    if (base.length < 4 || STOP.has(base)) continue;
    const nome = !inizio && /^\p{Lu}/u.test(w);
    out.push({ r: radice(base), peso: nome ? 2 : 1 });
  }
  return out;
}

/** Codice di 3 caratteri (18 bit di FNV-1a) di una radice: l'impronta non conserva il testo. */
export function codice(r: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < r.length; i++) { h ^= r.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const x = h >>> 14;
  return ALFABETO[(x >> 12) & 63] + ALFABETO[(x >> 6) & 63] + ALFABETO[x & 63];
}

/** Impronta di un testo: codici distinti delle sue parole piene, concatenati. */
export function impronta(testo: string): string {
  return [...new Set(parolePiene(testo).map((p) => codice(p.r)))].join('');
}
export const codiciImpronta = (imp: string): string[] => imp.match(/.{3}/g) ?? [];

const ABBREVIAZIONI = /(?:^|[\s(«"'])(?:artt?|nn?|cc?|co|comma|cost|lett|cfr|ecc|es|pp?|ss|sec|secc|vol|cap|par|sent|ord|l|d|dl|dlgs|lgs|dpr|r|rd|reg|cass|cd|cit|op|ibid|ivi|sig|prof|dott|on|avv|gr|ca|vs|vd|v|st|s|a|c|e|g|i|o|u|tab|fig|n°|ult|rist|ed|trad|dir|disp|prel|att|trans|t|u|giur|amm|pen|civ|proc|lat|it|ingl|ted|fr|sez|un|cons|stat|reg|cod|pt|lib|tit|fr|par)\.$/i;

/** Frasi del textContent di un blocco: [inizio, fine] senza spazi ai bordi. Taglia agli a capo e dopo . ! ? ; seguiti
 *  da spazio e maiuscola (o virgolette, parentesi, cifra), saltando le abbreviazioni («art.», «n.», «c.c.»). */
export function frasiDi(testo: string): [number, number][] {
  const tagli: number[] = [0];
  for (let i = 0; i < testo.length; i++) {
    const ch = testo[i];
    if (ch === '\n') { tagli.push(i + 1); continue; }
    if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== ';' && ch !== '…') continue;
    let j = i + 1;
    while (j < testo.length && /[»”"')\]]/.test(testo[j])) j++;
    if (j >= testo.length || !/[ \t ]/.test(testo[j])) continue;
    let k = j; while (k < testo.length && /[ \t ]/.test(testo[k])) k++;
    if (k >= testo.length) continue;
    if (ch !== ';' && !/[\p{Lu}«"“(\d•–-]/u.test(testo[k])) continue;
    if (ch === '.') {
      const prima = testo.slice(Math.max(0, i - 12), i + 1);
      if (ABBREVIAZIONI.test(prima) || /(?:^|\s)\p{L}\.\p{L}\.$/u.test(prima) || /\d\.$/.test(prima) && /^\d/.test(testo[k])) continue;
    }
    tagli.push(k);
  }
  tagli.push(testo.length);
  const out: [number, number][] = [];
  for (let t = 0; t < tagli.length - 1; t++) {
    let a = tagli[t], b = tagli[t + 1];
    while (a < b && /\s/.test(testo[a])) a++;
    while (b > a && /\s/.test(testo[b - 1])) b--;
    if (b > a) out.push([a, b]);
  }
  return out;
}
