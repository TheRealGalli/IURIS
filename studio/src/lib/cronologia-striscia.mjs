// Linea del tempo della Cronologia: quali eventi dello stesso anno condividono pallino ed etichetta
// e dove vanno le etichette. Modulo puro (niente React) perché lo provano anche gli script di controllo.

/** Un tratto senza eventi non supera questa larghezza (px): i secoli vuoti si comprimono */
export const MAX_VUOTO = 140;

/** Punti della scala: per ogni anno notevole (A) la sua posizione in px (X), lineare a k px/anno,
 *  ma con i lunghi tratti vuoti accorciati a maxVuoto (i loro indici in «vuoti») */
export function puntiScala(anni, k, maxVuoto = MAX_VUOTO) {
  const A = [...new Set(anni)].sort((a, b) => a - b);
  const X = [0];
  const vuoti = [];
  for (let i = 1; i < A.length; i++) {
    const w = (A[i] - A[i - 1]) * k;
    if (w > maxVuoto) vuoti.push(i);
    X.push(X[i - 1] + Math.min(w, maxVuoto));
  }
  return { A, X, vuoti };
}

/** Una voce è «specifica» se compare in pochi eventi della materia: «Costituzione italiana» o «Unione europea»
 *  legano tanti fatti diversi, «Granital» o «legge Gasparri» uno solo. */
export const SOGLIA_VOCE_SPECIFICA = 4;

const senzaAccenti = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Atti citati in titolo e descrizione, come «n/anno»: «Sentenze n. 348 e 349/2007» → 348/2007, 349/2007;
 *  «Legge costituzionale n. 3 del 2001» → 3/2001. */
const cacheAtti = new WeakMap();
export function attiCitati(e) {
  if (cacheAtti.has(e)) return cacheAtti.get(e);
  const out = new Set();
  cacheAtti.set(e, out);
  const testo = senzaAccenti(`${e.titolo ?? ''} ${e.descrizione ?? ''}`);
  for (const m of testo.matchAll(/\b(\d{1,4}(?:\s*(?:,|e)\s*\d{1,4})*)\s*(?:\/|del(?:l')?\s+)\s*(\d{4})\b/g)) {
    for (const n of m[1].split(/\s*(?:,|e)\s*/)) out.add(`${Number(n)}/${m[2]}`);
  }
  return out;
}

// parole che non bastano a riconoscere un fatto: articoli, preposizioni e nomi generici degli atti
const VUOTE = new Set(('della delle degli dello dalla dalle sulla sulle sugli nella nelle negli alla alle agli con per tra fra una uno '
  + 'legge leggi sentenza sentenze decreto costituzionale costituzionali primo prima nuovo nuova riforma corte stato diritto').split(' '));
/** Radici delle parole significative (le prime 6 lettere: «costituente» e «Costituente», «statuti» e «statuto» coincidono) */
const radici = (s) => new Set(senzaAccenti(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !VUOTE.has(w)).map((w) => w.slice(0, 6)));
/** a cita b se nel testo di a ricorrono quasi tutte le parole significative del titolo di b (almeno tre) */
const cacheRadici = new WeakMap();
function radiciEvento(e) {
  let r = cacheRadici.get(e);
  if (!r) cacheRadici.set(e, (r = { titolo: radici(e.titolo ?? ''), testo: radici(`${e.titolo ?? ''} ${e.descrizione ?? ''}`) }));
  return r;
}
function cita(a, b) {
  const titolo = radiciEvento(b).titolo;
  if (titolo.size < 3) return false; // due parole sole («Primo referendum abrogativo») tornano in troppi testi
  const testo = radiciEvento(a).testo;
  let trovate = 0;
  for (const r of titolo) if (testo.has(r)) trovate++;
  return trovate / titolo.size >= 0.75;
}

/** Quante volte ogni voce compare negli eventi (periodi esclusi) */
export function frequenzaVoci(eventi) {
  const freq = new Map();
  for (const e of eventi) if (e.tipo !== 'periodo') for (const c of new Set(e.concetti ?? [])) freq.set(c, (freq.get(c) ?? 0) + 1);
  return freq;
}

/** Due eventi sono correlati se raccontano lo stesso fatto o fatti legati: una voce specifica in comune
 *  (o almeno due voci in comune), uno stesso atto citato, oppure l'uno richiama il titolo dell'altro. */
export function correlati(a, b, freq) {
  const cb = new Set(b.concetti ?? []);
  const comuni = [...new Set(a.concetti ?? [])].filter((c) => cb.has(c));
  if (comuni.length >= 2 || comuni.some((c) => (freq.get(c) ?? 0) <= SOGLIA_VOCE_SPECIFICA)) return true;
  const ab = attiCitati(b);
  for (const x of attiCitati(a)) if (ab.has(x)) return true;
  return cita(a, b) || cita(b, a);
}

/** Divide gli eventi di uno stesso anno in gruppi di eventi correlati (componenti connesse: se A~B e B~C, stanno insieme).
 *  L'ordine dei gruppi segue il primo evento di ciascuno. */
export function gruppiCorrelati(eventi, freq) {
  const capo = eventi.map((_, i) => i);
  const trova = (i) => (capo[i] === i ? i : (capo[i] = trova(capo[i])));
  for (let i = 0; i < eventi.length; i++) for (let j = i + 1; j < eventi.length; j++) {
    if (trova(i) !== trova(j) && correlati(eventi[i], eventi[j], freq)) capo[trova(j)] = trova(i);
  }
  const gruppi = new Map();
  eventi.forEach((e, i) => { const r = trova(i); if (!gruppi.has(r)) gruppi.set(r, []); gruppi.get(r).push(e); });
  return [...gruppi.values()];
}

/**
 * Dispone pallini ed etichette sulla striscia.
 * - eventi: già ordinati per anno; X: posizione in px (senza bordo) di ogni anno notevole, indice: anno → indice in X.
 * - Gli eventi correlati dello stesso anno condividono pallino ed etichetta; gli altri hanno ciascuno il proprio,
 *   un po' più a destra (passo) dentro lo stesso anno, e la striscia si allarga lì di quanto serve.
 * - Le etichette stanno su al massimo maxCorsie righe; se non c'è posto, la striscia si allarga da quel punto.
 * Modifica X (gli anni successivi si spostano) e restituisce { etichette: [{ eventi, x, corsia }], corsie }.
 */
export function disponiEtichette(eventi, X, indice, { bordo, etichettaW, maxCorsie, passo = 14, distacco = 8, freq }) {
  const fineCorsia = [];
  const etichette = [];
  let ultimoX = -Infinity; // posizione dell'ultimo pallino: due pallini non si toccano
  for (let k = 0; k < eventi.length;) {
    const anno = eventi[k].anno;
    let fine = k;
    while (fine < eventi.length && eventi[fine].anno === anno) fine++;
    const i = indice.get(anno);
    let primo = true;
    for (const gruppo of gruppiCorrelati(eventi.slice(k, fine), freq)) {
      // Il primo gruppo sta sull'anno e, se serve spazio, sposta l'anno stesso e quelli dopo; gli altri gruppi
      // si mettono a destra del precedente: se sconfinano verso l'anno dopo, sarà quello a spostarsi.
      let x = primo ? bordo + X[i] : ultimoX + passo;
      const sposta = (d) => { if (primo) allarga(X, i, d); x += d; };
      if (primo && etichette.length && x < ultimoX + passo) sposta(ultimoX + passo - x); // due pallini non si toccano
      let c = fineCorsia.findIndex((f) => f <= x - distacco);
      if (c < 0 && fineCorsia.length < maxCorsie) c = fineCorsia.push(-Infinity) - 1;
      if (c < 0) {
        c = fineCorsia.indexOf(Math.min(...fineCorsia));
        sposta(fineCorsia[c] + distacco - x);
      }
      fineCorsia[c] = x + etichettaW;
      etichette.push({ eventi: gruppo, x, corsia: c });
      ultimoX = x;
      primo = false;
    }
    k = fine;
  }
  return { etichette, corsie: fineCorsia.length };
}

function allarga(X, da, d) {
  for (let j = da; j < X.length; j++) X[j] += d;
}
