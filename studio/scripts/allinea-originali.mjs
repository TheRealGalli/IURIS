#!/usr/bin/env node
// Allinea frase per frase un Originale vecchio al testo che lo sostituisce (stessa numerazione di pagina, frasi
// riscritte), così i segni di chi studia si possono spostare sul testo nuovo (src/lib/migrazione-segni.ts).
//
//   node scripts/allinea-originali.mjs <vecchio-doc> <nuovo-doc> [--per-lezione | --stesse-lezioni] [--soglia N] [--commit <rev>] [--scostamento N]
//
// - Il documento vecchio si legge da public/letture/<vecchio>/ se c'è ancora, altrimenti dalla storia git
//   (ultima versione prima che fosse tolto, o `--commit`). Il nuovo dal repository attuale.
// - Pagine: per ogni pagina p, frasi vecchie di p contro frasi nuove delle pagine p-1…p+1, con un allineamento
//   monotono (programmazione dinamica, più frasi vecchie possono cadere sulla stessa frase nuova e una frase vecchia
//   può prendere anche le vicine). `--per-lezione`: per ogni sezione vecchia (lezione), la lezione nuova dalla
//   tabella `migrazione.json` della materia e le sezioni nuove che la contengono. `--stesse-lezioni`: come
//   `--per-lezione`, ma ogni lezione vecchia va nella lezione nuova con lo stesso id (stessa materia, testo spostato:
//   le unità 14 e 15 di Romano dalle integrazioni dal Percorso al testo IURIS).
// - `--scostamento N` (solo pagine): la pagina p del vecchio corrisponde alla pagina p+N del nuovo (un documento
//   confluito in coda a un altro: Schauer, pp. 1–76, è alle pp. 57–132 del testo IURIS di Filosofia M-Z).
//   La tabella conserva le pagine vecchie dei blocchi e dichiara `scostamento`, che l'app usa per le pagine stimate.
// - Somiglianza su parole piene normalizzate (src/lib/allineamento.ts): pesi per tipo (numeri e date ×3, nomi propri
//   e latino ×2) per rarità (idf); punteggio F2 (conta di più ritrovare il contenuto vecchio nel nuovo).
// - Le frasi rimaste sotto soglia si cercano anche fuori dall'ordine (pagine vicine o, per lezione, tutto il testo).
//
// Scrive public/letture/<nuovo>/allineamento-<vecchio>.json (nessun testo vecchio: solo confini e impronte) e
// piani/fase-<materia>/allineamento-<vecchio>.md (frasi vecchie con punteggio basso, pagina per pagina).
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { apriVersione } from './lib/originale-versione.mjs';

const studio = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const opz = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const [VECCHIO, NUOVO] = args.filter((a, i) => !a.startsWith('--') && !['--soglia', '--commit', '--report', '--debug', '--scostamento'].includes(args[i - 1]));
if (!VECCHIO || !NUOVO) { console.error('Uso: node scripts/allinea-originali.mjs <vecchio-doc> <nuovo-doc> [--per-lezione | --stesse-lezioni] [--soglia N] [--commit <rev>]'); process.exit(2); }
const STESSE_LEZIONI = args.includes('--stesse-lezioni');
const PER_LEZIONE = args.includes('--per-lezione') || STESSE_LEZIONI;
const SOGLIA = Number(opz('--soglia') ?? (PER_LEZIONE ? 55 : 40));
const SCOSTAMENTO = Number(opz('--scostamento') ?? 0);
if (!Number.isInteger(SCOSTAMENTO) || (SCOSTAMENTO && PER_LEZIONE)) { console.error('--scostamento: un intero, solo nel modo per pagine'); process.exit(2); }

const server = await createServer({ root: studio, configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
try {
  const md = await server.ssrLoadModule('/src/lib/md.ts');
  const al = await server.ssrLoadModule('/src/lib/allineamento.ts');

  // ---------- documenti ----------
  const vecchio = apriVersione(VECCHIO, { md, frasiDi: al.frasiDi, commit: opz('--commit') });
  const nuovo = apriVersione(NUOVO, { md, frasiDi: al.frasiDi });
  if (nuovo.origine !== 'repository attuale') throw new Error(`Documento nuovo ${NUOVO} assente dal repository (manca l'estrazione?)`);
  const docVecchio = vecchio.doc, docNuovo = nuovo.doc, origineVecchio = vecchio.origine;
  // resoconto nella cartella di lavoro della materia: piani/fase-costituzionale/, piani/fase-romano/…
  const REPORT = opz('--report') ?? `${repo}piani/fase-${docNuovo.materia.replace(/^diritto-/, '')}/allineamento-${VECCHIO}.md`;
  const bv = vecchio.blocchi, bn = nuovo.blocchi;
  const frasi = (blocchi) => blocchi.flatMap((b, bi) => b.frasi.map(([i, f]) => ({ b: bi, blocco: b, i, f, pagina: b.pagina, testo: b.testo.slice(i, f) })));
  // Frasi vecchie con la pagina corrispondente nel nuovo (pagina vecchia + scostamento).
  const V = frasi(bv).map((x) => ({ ...x, pagina: x.pagina + SCOSTAMENTO })), N = frasi(bn);

  // ---------- pesi (idf su tutte le frasi) e somiglianza ----------
  const df = new Map();
  for (const x of [...V, ...N]) {
    x.parole = new Map();
    for (const p of al.parolePiene(x.testo)) x.parole.set(p.r, Math.max(x.parole.get(p.r) ?? 0, p.peso));
    for (const r of x.parole.keys()) df.set(r, (df.get(r) ?? 0) + 1);
  }
  const totale = V.length + N.length;
  const idf = (r) => Math.log(1 + totale / (1 + (df.get(r) ?? 0)));
  for (const x of [...V, ...N]) {
    x.w = new Map([...x.parole].map(([r, t]) => [r, t * idf(r)]));
    x.W = [...x.w.values()].reduce((a, b) => a + b, 0);
  }
  /** F2 tra una frase vecchia e un gruppo di frasi nuove (unione delle parole). */
  function punteggio(v, gruppo) {
    if (!v.W) return 0;
    const u = new Map();
    for (const n of gruppo) for (const [r, w] of n.w) u.set(r, Math.max(u.get(r) ?? 0, w));
    let comune = 0, Wn = 0;
    for (const w of u.values()) Wn += w;
    for (const [r, w] of v.w) if (u.has(r)) comune += Math.min(w, u.get(r));
    if (!comune) return 0;
    const R = comune / v.W, P = comune / Wn;
    return 5 * P * R / (4 * P + R);
  }

  // ---------- allineamento monotono a fasce ----------
  const assegna = new Array(V.length).fill(null); // indici in N
  const TAU = 0.2;
  /** Allineamento monotono: `iv` frasi vecchie in ordine, `J` frasi nuove candidate in ordine (indici in N),
   *  `fasce[a]` = [lo, hi] posizioni in J ammesse per la frase vecchia a (lo e hi non decrescenti).
   *  G[a][j] = miglior totale per le prime a frasi vecchie con assegnazioni ≤ j; più frasi vecchie possono andare
   *  sulla stessa nuova. Fuori fascia: G[a][j>hi] = G[a][hi] e G[a][lo-1] = `prima` (portato dalla riga precedente). */
  function allinea(iv, J, fasce) {
    const righe = [];
    let prec = null;
    for (let a = 0; a < iv.length; a++) {
      let [lo, hi] = fasce[a];
      if (hi < lo) { righe.push(prec ? { ...prec, vuota: true } : null); continue; }
      if (prec) { lo = Math.max(lo, prec.lo); hi = Math.max(hi, prec.hi); }
      const val = (j) => !prec ? 0 : j < prec.lo ? prec.prima : j > prec.hi ? prec.v[prec.v.length - 1] : prec.v[j - prec.lo];
      const v = new Float64Array(hi - lo + 1), c = new Uint8Array(v.length);
      const prima = val(lo - 1);
      for (let j = lo; j <= hi; j++) {
        const k = j - lo;
        let best = k ? v[k - 1] : prima, scelta = 0;
        const salta = val(j);
        if (salta > best) { best = salta; scelta = 1; }
        const s = punteggio(V[iv[a]], [N[J[j]]]) - TAU;
        if (s > 0 && salta + s > best) { best = salta + s; scelta = 2; }
        v[k] = best; c[k] = scelta;
      }
      prec = { lo, hi, v, c, prima };
      righe.push(prec);
    }
    let a = iv.length - 1, j = Infinity;
    while (a >= 0) {
      const r = righe[a];
      if (!r || r.vuota) { a--; continue; }
      if (j > r.hi) j = r.hi;
      if (j < r.lo) { a--; continue; }
      const scelta = r.c[j - r.lo];
      if (scelta === 0) { j--; continue; }
      if (scelta === 2) assegna[iv[a]] = [J[j]];
      a--;
    }
  }
  const primaFrase = new Map(); // pagina → [primo, ultimo] in N
  N.forEach((x, k) => { const r = primaFrase.get(x.pagina); if (!r) primaFrase.set(x.pagina, [k, k]); else r[1] = k; });
  const intervalloPagine = (da, a) => {
    let lo = Infinity, hi = -1;
    for (let p = da; p <= a; p++) { const r = primaFrase.get(p); if (r) { lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]); } }
    return hi < 0 ? [0, -1] : [lo, hi];
  };

  const lezioniNuove = new Map(); // lezione → indici di N
  if (PER_LEZIONE) {
    const tab = tabellaLezioni(docNuovo.materia);
    N.forEach((x, k) => { for (const l of x.blocco.lezioni) { if (!lezioniNuove.has(l)) lezioniNuove.set(l, []); lezioniNuove.get(l).push(k); } });
    const perSezione = new Map();
    V.forEach((x, k) => { const s = x.blocco.sezione; if (!perSezione.has(s)) perSezione.set(s, []); perSezione.get(s).push(k); });
    for (const [s, iv] of perSezione) {
      const sec = docVecchio.sezioni[s];
      const vecchie = [...new Set([sec.lezione, ...(sec.lezioni ?? [])].filter(Boolean))];
      const nuove = [...new Set(vecchie.map((l) => tab[l]).filter(Boolean))];
      const idx = [...new Set(nuove.flatMap((l) => lezioniNuove.get(l) ?? []))].sort((a, b) => a - b);
      const dentro = new Set(idx);
      for (const k of iv) V[k].dentro = dentro;
      if (!idx.length) continue;
      allinea(iv, idx, iv.map(() => [0, idx.length - 1]));
    }
  } else {
    // fasce per pagina (p-1…p+1); l'ordine dei blocchi vecchi segue le pagine
    const fasce = V.map((x) => intervalloPagine(x.pagina - 1, x.pagina + 1));
    allinea(V.map((_, k) => k), N.map((_, k) => k), fasce);
  }

  // ---------- estensione alle frasi vicine e recupero fuori ordine ----------
  const indiceInverso = new Map();
  N.forEach((x, k) => { for (const r of x.w.keys()) { if (!indiceInverso.has(r)) indiceInverso.set(r, []); indiceInverso.get(r).push(k); } });
  const finestra = (x) => PER_LEZIONE ? null : [x.pagina - 2, x.pagina + 2];
  /** Le migliori frasi nuove per una frase vecchia, fuori dall'ordine (nella finestra di pagine, o ovunque per lezione). */
  function candidati(x, quanti = 5) {
    const cand = new Map();
    const pesanti = [...x.w].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const f = finestra(x);
    for (const [r] of pesanti) for (const k of indiceInverso.get(r) ?? []) {
      if (f && (N[k].pagina < f[0] || N[k].pagina > f[1])) continue;
      cand.set(k, (cand.get(k) ?? 0) + 1);
    }
    return [...cand].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([k]) => ({ k, s: punteggio(x, [N[k]]) - fuoriLezione(x, k) }))
      .sort((a, b) => b.s - a.s).slice(0, quanti);
  }
  /** Per lezione: le frasi fuori dalle lezioni nuove indicate dalla tabella valgono un po' meno. */
  const fuoriLezione = (x, k) => PER_LEZIONE && !x.dentro?.has(k) ? 0.12 : 0;
  /** Frasi con poche parole piene: due parole in comune non bastano per essere sicuri. */
  const fiducia = (x) => Math.sqrt(Math.min(1, x.parole.size / 6));
  function estendi(x, gruppo) {
    let g = [...gruppo], s = punteggio(x, g.map((k) => N[k]));
    for (let giro = 0; giro < 3; giro++) {
      let meglio = null;
      for (const k of [Math.min(...g) - 1, Math.max(...g) + 1]) {
        if (k < 0 || k >= N.length || N[k].blocco.sezione !== N[g[0]].blocco.sezione && !(Math.abs(N[k].pagina - N[g[0]].pagina) <= 1)) continue;
        const t = punteggio(x, [...g, k].map((j) => N[j]));
        if (t > s + 0.06 && (!meglio || t > meglio.t)) meglio = { k, t };
      }
      if (!meglio) break;
      g = [...g, meglio.k].sort((a, b) => a - b); s = meglio.t;
    }
    return { g, s };
  }
  // Contesto: una corrispondenza è più credibile se le frasi vecchie vicine (±2, stesso blocco o sezione) cadono
  // vicino (±6 frasi nuove). Scelta tra la frase della DP e i candidati fuori ordine: somiglianza + 0,06 × sostegno.
  // Regioni: ogni blocco vecchio (capoverso) si cerca come un tutto tra le finestre di tre blocchi nuovi consecutivi;
  // un capoverso ha molte più parole di una frase, quindi il posto è molto più sicuro. Le frasi delle due finestre
  // migliori entrano tra i candidati e valgono un po' di più.
  const unisciPesi = (lista) => { const u = new Map(); for (const x of lista) for (const [r, w] of x.w) u.set(r, Math.max(u.get(r) ?? 0, w)); return u; };
  const F2 = (a, b) => {
    let Wa = 0, Wb = 0, c = 0;
    for (const w of a.values()) Wa += w;
    for (const w of b.values()) Wb += w;
    for (const [r, w] of a) if (b.has(r)) c += Math.min(w, b.get(r));
    if (!c) return 0; const R = c / Wa, P = c / Wb; return 5 * P * R / (4 * P + R);
  };
  const frasiN = bn.map(() => []); N.forEach((x, k) => frasiN[x.b].push(k));
  const pesiBloccoN = bn.map((_, bi) => unisciPesi(frasiN[bi].map((k) => N[k])));
  const indiceBlocchiN = new Map();
  pesiBloccoN.forEach((w, bi) => { for (const r of w.keys()) { if (!indiceBlocchiN.has(r)) indiceBlocchiN.set(r, []); indiceBlocchiN.get(r).push(bi); } });
  const frasiV = bv.map(() => []); V.forEach((x, k) => frasiV[x.b].push(k));
  const regione = new Array(V.length).fill(null);
  bv.forEach((b, bi) => {
    const ks = frasiV[bi]; if (!ks.length) return;
    const w = unisciPesi(ks.map((k) => V[k])); if (!w.size) return;
    const f = finestra(V[ks[0]]);
    const hit = new Map();
    for (const [r] of [...w].sort((a, c) => c[1] - a[1]).slice(0, 12)) for (const nb of indiceBlocchiN.get(r) ?? []) {
      if (f && (bn[nb].pagina < f[0] - 1 || bn[nb].pagina > f[1] + 1)) continue;
      hit.set(nb, (hit.get(nb) ?? 0) + 1);
    }
    const finestre = [...hit].sort((a, c) => c[1] - a[1]).slice(0, 40).map(([nb]) => {
      const blocchi = [nb - 1, nb, nb + 1].filter((x) => x >= 0 && x < bn.length && Math.abs(bn[x].pagina - bn[nb].pagina) <= 1);
      const frasiFin = blocchi.flatMap((x) => frasiN[x]);
      const pen = PER_LEZIONE && !V[ks[0]].dentro?.has(frasiN[nb][0]) ? 0.12 : 0;
      return { nb, frasi: frasiFin, s: F2(w, unisciPesi(frasiFin.map((k) => N[k]))) - pen };
    }).sort((a, c) => c.s - a.s);
    if (!finestre.length || finestre[0].s < 0.15) return;
    const r = new Set([...finestre[0].frasi, ...(finestre[1] && finestre[1].s > finestre[0].s - 0.05 ? finestre[1].frasi : [])]);
    for (const k of ks) regione[k] = r;
  });
  const inRegione = (k, j) => regione[k]?.has(j) ? 1 : 0;

  const VICINI = 2, RAGGIO = 6, BONUS_SCELTA = 0.06, BONUS_PUNTEGGIO = 0.04, BONUS_REGIONE = 0.08;
  const opzioni = V.map((x, k) => {
    const o = new Map();
    if (assegna[k]) o.set(assegna[k][0], { k: assegna[k][0], s: punteggio(x, [N[assegna[k][0]]]), dp: true });
    for (const c of candidati(x)) if (!o.has(c.k)) o.set(c.k, c);
    for (const j of regione[k] ?? []) if (!o.has(j)) { const s = punteggio(x, [N[j]]); if (s > 0.05) o.set(j, { k: j, s }); }
    return [...o.values()];
  });
  let scelta = opzioni.map((o, k) => o.length ? o.reduce((a, b) => (b.s + (b.dp ? 0.03 : 0) + BONUS_REGIONE * inRegione(k, b.k) > a.s + (a.dp ? 0.03 : 0) + BONUS_REGIONE * inRegione(k, a.k) ? b : a)).k : null);
  const vicini = (k) => { const out = []; for (let d = -VICINI; d <= VICINI; d++) if (d && V[k + d] && V[k + d].blocco.sezione === V[k].blocco.sezione) out.push(k + d); return out; };
  const sostegno = (k, j) => vicini(k).filter((v) => scelta[v] !== null && Math.abs(scelta[v] - j) <= RAGGIO).length;
  for (let giro = 0; giro < 2; giro++) {
    scelta = V.map((_, k) => {
      if (!opzioni[k].length) return null;
      let best = null, bv = -1;
      for (const c of opzioni[k]) { const v = c.s + BONUS_SCELTA * sostegno(k, c.k) + (c.dp ? 0.03 : 0) + BONUS_REGIONE * inRegione(k, c.k); if (v > bv) { bv = v; best = c.k; } }
      return best;
    });
  }
  let recuperate = 0;
  const risultato = V.map((x, k) => {
    if (scelta[k] === null) return { g: [], s: 0, grezzo: 0 };
    if (!(assegna[k] && assegna[k][0] === scelta[k])) recuperate++;
    const e = estendi(x, [scelta[k]]);
    const base = (e.s - fuoriLezione(x, scelta[k])) * fiducia(x);
    return { g: e.g, grezzo: e.s, s: Math.max(0, Math.min(1, base + BONUS_PUNTEGGIO * sostegno(k, scelta[k]) + 0.06 * inRegione(k, scelta[k]))) };
  });

  // ---------- tabella ----------
  const sezioniNuove = docNuovo.sezioni.map((s) => s.file);
  const inizioN = []; { let c = 0; for (const b of bn) { inizioN.push(c); c += b.frasi.length; } }
  const paginaProbabile = (b, bi) => {
    // pagina nuova più frequente tra le frasi del blocco assegnate; altrimenti la stessa (pagine) o la prima della lezione
    const conta = new Map();
    V.forEach((x, k) => { if (x.b === bi) for (const j of risultato[k].g) conta.set(N[j].pagina, (conta.get(N[j].pagina) ?? 0) + 1); });
    if (conta.size) return [...conta].sort((a, c) => c[1] - a[1])[0][0];
    if (!PER_LEZIONE) return Math.min(b.pagina + SCOSTAMENTO, docNuovo.pagine);
    const tab = tabellaLezioni(docNuovo.materia), l = tab[b.lezione];
    const idx = l ? lezioniNuove.get(l) : null;
    return idx?.length ? N[idx[0]].pagina : 1;
  };
  const tabella = {
    formato: 1, vecchio: VECCHIO, nuovo: NUOVO, modo: PER_LEZIONE ? 'lezioni' : 'pagine', fonteNuovo: docNuovo.fonteSha256,
    soglia: SOGLIA, ...(SCOSTAMENTO ? { scostamento: SCOSTAMENTO } : {}), sezioni: sezioniNuove,
    vecchi: bv.map((b, bi) => [b.id, b.pagina, b.frasi.flat(), b.frasi.map(([i, f]) => al.impronta(b.testo.slice(i, f))), paginaProbabile(b, bi)]),
    nuovi: bn.map((b) => [b.id, b.sezione, b.testo.length, b.frasi.flat()]),
    mappa: risultato.map((r) => r.g.length ? [Math.round(r.s * 100), ...r.g] : [0]),
  };
  if (opz('--debug')) writeFileSync(opz('--debug'), JSON.stringify(V.map((x, k) => ({ p: x.pagina, b: x.blocco.id, s: Math.round(risultato[k].s * 100),
    r: Math.round(risultato[k].grezzo * 100), v: x.testo, n: risultato[k].g.map((j) => `[p${N[j].pagina}] ${N[j].testo}`) })), null, 1));
  const uscita = `${studio}public/letture/${NUOVO}/allineamento-${VECCHIO}.json`;
  writeFileSync(uscita, JSON.stringify(tabella));

  // ---------- resoconto ----------
  const pieni = V.map((x, k) => ({ x, k, r: risultato[k] })).filter((o) => o.x.W > 0 && o.x.parole.size >= 3);
  const sicure = pieni.filter((o) => Math.round(o.r.s * 100) >= SOGLIA && o.r.g.length);
  const pct = (a, b) => b ? `${(100 * a / b).toFixed(1).replace('.', ',')}%` : '–';
  const paroleV = pieni.reduce((n, o) => n + o.x.parole.size, 0), paroleSicure = sicure.reduce((n, o) => n + o.x.parole.size, 0);
  const basse = pieni.filter((o) => !(Math.round(o.r.s * 100) >= SOGLIA && o.r.g.length));
  const corto = (t, n = 14) => { const p = t.replace(/\s+/g, ' ').trim().split(' '); return p.slice(0, n).join(' ') + (p.length > n ? ' …' : ''); };
  const perPagina = new Map();
  for (const o of basse) { if (!perPagina.has(o.x.pagina)) perPagina.set(o.x.pagina, []); perPagina.get(o.x.pagina).push(o); }
  const contaPagina = new Map();
  for (const o of pieni) contaPagina.set(o.x.pagina, (contaPagina.get(o.x.pagina) ?? 0) + 1);
  const righe = [
    `# Allineamento ${VECCHIO} → ${NUOVO}`, '',
    `Generato da \`node scripts/allinea-originali.mjs ${VECCHIO} ${NUOVO}${STESSE_LEZIONI ? ' --stesse-lezioni' : PER_LEZIONE ? ' --per-lezione' : ''}${SCOSTAMENTO ? ` --scostamento ${SCOSTAMENTO}` : ''}\` (${new Date().toISOString().slice(0, 10)}).`,
    `Documento vecchio: ${origineVecchio}. Modo: ${STESSE_LEZIONI ? 'per lezione (stessi id di lezione)' : PER_LEZIONE ? 'per lezione (tabella migrazione.json)' : `pagina per pagina (p-1…p+1)${SCOSTAMENTO ? `, pagine vecchie spostate di ${SCOSTAMENTO}: le pagine qui sotto sono quelle del testo nuovo` : ''}`}. Soglia: ${SOGLIA}.`, '',
    '| Misura | Valore |', '|---|---|',
    `| Blocchi / frasi vecchie | ${bv.length} / ${V.length} |`,
    `| Blocchi / frasi nuove | ${bn.length} / ${N.length} |`,
    `| Frasi vecchie con almeno 3 parole piene | ${pieni.length} |`,
    `| … con corrispondenza sicura (≥ ${SOGLIA}) | ${sicure.length} (${pct(sicure.length, pieni.length)}) |`,
    `| … pesate per parole piene | ${pct(paroleSicure, paroleV)} |`,
    `| Senza alcuna corrispondenza | ${pieni.filter((o) => !o.r.g.length).length} |`,
    `| Recuperate fuori ordine | ${recuperate} |`,
    `| Punteggio mediano | ${(() => { const s = pieni.map((o) => o.r.s).sort((a, b) => a - b); return s.length ? Math.round(100 * s[s.length >> 1]) : 0; })()} |`, '',
    '## Frasi vecchie con punteggio basso, pagina per pagina', '',
    'Possibile contenuto perso o molto riformulato nel testo nuovo. Si mostrano le prime parole della frase vecchia,',
    'il punteggio e l\'inizio della frase nuova più vicina (o «—»). Le pagine con più del 30% di frasi basse sono in grassetto.', '',
  ];
  for (const [p, lista] of [...perPagina].sort((a, b) => a[0] - b[0])) {
    const quota = lista.length / (contaPagina.get(p) ?? 1);
    righe.push(`### ${quota > 0.3 ? `**p. ${p}**` : `p. ${p}`} · ${lista.length} su ${contaPagina.get(p)}`, '');
    for (const o of lista) {
      const n = o.r.g.length ? N[o.r.g[0]] : null;
      righe.push(`- ${Math.round(o.r.s * 100)} · «${corto(o.x.testo)}» → ${n ? `p. ${n.pagina} «${corto(n.testo, 10)}»` : '—'}`);
    }
    righe.push('');
  }
  mkdirSync(REPORT.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(REPORT, righe.join('\n'));
  const kb = Math.round(readFileSync(uscita).length / 1024);
  console.log(`${VECCHIO} → ${NUOVO} (${tabella.modo}, vecchio da ${origineVecchio})`);
  console.log(`  frasi vecchie ${V.length} (piene ${pieni.length}), nuove ${N.length}; sicure ${sicure.length} = ${pct(sicure.length, pieni.length)} (per parole ${pct(paroleSicure, paroleV)}); senza corrispondenza ${pieni.filter((o) => !o.r.g.length).length}; recuperate fuori ordine ${recuperate}`);
  console.log(`  pagine con frasi basse: ${perPagina.size}; più basse: ${[...perPagina].map(([p, l]) => [p, l.length / (contaPagina.get(p) ?? 1)]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, q]) => `p. ${p} (${Math.round(q * 100)}%)`).join(', ')}`);
  console.log(`  tabella ${uscita.replace(studio, '')} (${kb} KB), resoconto ${REPORT.replace(repo, '')}`);
} finally {
  await server.close();
}

/** Tabella lezione vecchia → lezione nuova dalla migrazione della materia (cartella `<Materia>/05 - Contenuti`). */
function tabellaLezioni(materia) {
  if (STESSE_LEZIONI) return new Proxy({}, { get: (_, l) => (typeof l === 'string' ? l : undefined) });
  const slug = (s) => s.trim().toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const d of readdirSync(repo)) {
    if (slug(d) !== materia) continue;
    const f = `${repo}${d}/05 - Contenuti/migrazione.json`;
    if (!existsSync(f)) break;
    const m = JSON.parse(readFileSync(f, 'utf8'));
    const t = m.da.find((x) => x.materia === materia && x.lezioni && typeof x.lezioni === 'object');
    if (t) return t.lezioni;
  }
  throw new Error(`--per-lezione: nessuna tabella delle lezioni in migrazione.json per ${materia}`);
}
