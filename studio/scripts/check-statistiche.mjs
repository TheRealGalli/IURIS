// Livelli dei concetti (li sai / così così / da ripassare / mai visti) coerenti con le risposte date.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const values = new Map();
const storage = { get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null, getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
const originale = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
let checks = 0;
const check = async (name, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };
try {
  const srs = await server.ssrLoadModule('/src/lib/srs.ts');
  const store = await server.ssrLoadModule('/src/lib/store.ts');
  const q = (id) => ({ id, tipo: 'flashcard', domanda: 'D', risposta: 'R', lezione: 'l1', unita: 'u1', livello: 'base' });
  const domande = Array.from({ length: 10 }, (_, i) => q(`q${i}`));
  const ora = new Date('2026-11-07T10:00:00Z');
  const leggi = (slug) => JSON.parse(store.esporta(slug)).progresso;
  const lv = (slug, qs = domande, now = ora) => { const m = srs.padronanza(leggi(slug), qs, now); return srs.livello(m.media, m.viste); };

  await check('Mai visto finché non si risponde', () => assert.equal(lv('s0'), 'ignoto'));
  await check('Una risposta giusta appena data conta come «li sai», anche con poche domande viste', () => {
    srs.registraRisposta('s1', 'q0', 3, ora); srs.registraRisposta('s1', 'q1', 4, ora);
    assert.equal(lv('s1', domande, new Date(ora.getTime() + 60_000)), 'forte');
    const m = srs.padronanza(leggi('s1'), domande, ora);
    assert(m.valore < 0.4, 'l\'avanzamento complessivo resta proporzionale alle domande viste');
  });
  await check('Difficile è «così così», Di nuovo è «da ripassare»', () => {
    srs.registraRisposta('s2', 'q0', 2, ora); assert.equal(lv('s2'), 'medio');
    srs.registraRisposta('s3', 'q0', 1, ora); assert.equal(lv('s3'), 'debole');
  });
  await check('Il livello cala se il ricordo non viene ripassato a lungo', () => {
    assert.notEqual(lv('s1', domande, new Date(ora.getTime() + 200 * 86400_000)), 'forte');
  });
  await check('Con risposte quasi tutte giuste la maggioranza dei concetti viste è «li sai»', () => {
    const concetti = Array.from({ length: 10 }, (_, i) => [q(`c${i}a`), q(`c${i}b`)]);
    concetti.forEach(([a], i) => srs.registraRisposta('s4', a.id, i < 8 ? 3 : 1, ora));
    const livelli = concetti.map((qs) => lv('s4', qs, new Date(ora.getTime() + 3600_000)));
    assert.equal(livelli.filter((l) => l === 'forte').length, 8); assert.equal(livelli.filter((l) => l === 'debole').length, 2);
  });
  await check('Mappa per unità: i nodi si accendono con le risposte sui concetti e i nodi di raccordo riflettono i figli', async () => {
    const { readFile } = await import('node:fs/promises');
    const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
    const ml = await server.ssrLoadModule('/src/lib/mappa-livelli.ts');
    const idx = indicizza(JSON.parse(await readFile(new URL('../public/content/diritto-romano/corso.json', import.meta.url), 'utf8')));
    const radice = idx.corso.unita[0].mappa, domandeNodi = ml.domandeNodiMappa(radice, idx.domandePerConcetto);
    const trova = (n, testo) => n.testo.includes(testo) ? n : (n.figli ?? []).map((f) => trova(f, testo)).find(Boolean);
    const significati = trova(radice, '5 significati'), pubblico = trova(radice, 'Pubblico'), pandettistica = trova(radice, 'pandettistica');
    assert(significati && !significati.concetto && pubblico && pandettistica?.concetto, 'nodi di prova presenti');
    for (const n of [radice, significati, pandettistica]) assert(domandeNodi.get(n).length > 0, `${n.testo}: domande collegate`);
    const giorno = new Date(ora.getTime() + 60_000);
    assert.equal(ml.livelloNodo(leggi('m1'), domandeNodi.get(significati), giorno).livello, 'ignoto');
    for (const q of idx.domandePerConcetto.get('pandettistica')) srs.registraRisposta('m1', q.id, 3, ora);
    const p = leggi('m1');
    assert.equal(ml.livelloNodo(p, domandeNodi.get(pandettistica), giorno).livello, 'forte', 'Pandettistica si accende');
    assert.equal(ml.livelloNodo(p, domandeNodi.get(significati), giorno).livello, 'forte', 'il nodo padre riflette il figlio');
    assert.equal(ml.livelloNodo(p, domandeNodi.get(pubblico), giorno).livello, 'ignoto', 'i rami non studiati restano spenti');
    // Stesso risultato del pannello Concetti per un concetto senza figli.
    const m = srs.padronanza(p, idx.domandePerConcetto.get('pandettistica'), giorno);
    assert.equal(srs.livello(m.media, m.viste), ml.livelloNodo(p, domandeNodi.get(pandettistica), giorno).livello);
    // Nodo con domande in parte sbagliate: «così così» o «da ripassare», mai «mai verificato».
    srs.registraRisposta('m2', idx.domandePerConcetto.get('diritto-pubblico')[0].id, 1, ora);
    assert.equal(ml.livelloNodo(leggi('m2'), domandeNodi.get(pubblico), giorno).livello, 'debole');
    const tutti = []; const w = (n) => { tutti.push(n); (n.figli ?? []).forEach(w); }; w(radice);
    for (const n of tutti) for (const f of n.figli ?? []) for (const q of domandeNodi.get(f)) assert(domandeNodi.get(n).some((x) => x.id === q.id), 'il padre include le domande dei figli');
  });
  console.log(`Statistiche verificate: ${checks} scenari su livelli dei concetti, mappa per unità, risposte recenti e oblio.`);
} finally {
  await server.close();
  if (originale) Object.defineProperty(globalThis, 'localStorage', originale); else delete globalThis.localStorage;
}
