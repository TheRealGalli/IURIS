// Test dei dati reali del lettore, con storage isolato dai progressi personali.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const values = new Map();
let pieno = false;
const storage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => { if (pieno) throw new Error('QuotaExceededError'); values.set(k, v); },
};
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
let server;
try {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  });
  const lib = await server.ssrLoadModule('/src/lib/originali.ts');
  let store = await server.ssrLoadModule('/src/lib/store.ts');
  const doc = lib.originaliMateria('diritto-romano')[0];
  const altro = lib.originaliMateria('filosofia-del-diritto')[0];
  const slug = doc.materia;
  const read = () => JSON.parse(store.esporta(slug)).progresso;
  const segno = { pagina: 2, testo: 'Un passaggio degli appunti', rettangoli: [{ x: .12, y: .2, w: .6, h: .018 }], tipo: 'evidenziato', colore: 'giallo' };
  let checks = 0;
  const check = (name, fn) => { try { fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };

  check('Catalogo per materia e limiti delle pagine', () => {
    assert.equal(lib.originaliMateria('diritto-romano').length, 1);
    assert.equal(lib.originaliMateria('filosofia-del-diritto').length, 3);
    assert.equal(lib.paginaValida(-3, doc.pagine), 1);
    assert.equal(lib.paginaValida(99999, doc.pagine), doc.pagine);
    assert.equal(lib.paginaValida(NaN, doc.pagine), 1);
  });
  check('Geometria valida anche ai bordi e rifiuto di selezioni vuote', () => {
    const clipped = lib.normalizzaSegno({ ...segno, rettangoli: [{ x: .8, y: .99, w: .7, h: .02 }, { x: NaN, y: 0, w: 1, h: 1 }] }, doc.pagine);
    assert.equal(clipped.rettangoli.length, 1);
    const r = clipped.rettangoli[0];
    assert.equal(r.x + r.w, 1); assert.equal(r.y + r.h, 1);
    assert.throws(() => lib.normalizzaSegno({ ...segno, testo: '  ' }, doc.pagine));
    assert.throws(() => lib.normalizzaSegno({ ...segno, pagina: doc.pagine + 1 }, doc.pagine));
    assert.throws(() => lib.normalizzaSegno({ ...segno, rettangoli: [] }, doc.pagine));
  });
  let id;
  check('Segni e pagina convivono con i progressi del corso', () => {
    store.segnaStudiata(slug, 'u01-l1', true, ['q1']);
    const prima = read();
    assert(store.salvaPaginaOriginale(slug, doc, 12));
    const result = store.aggiungiSegnoOriginale(slug, doc, segno); id = result.id;
    assert(result.salvato); assert(id);
    const p = read();
    assert.equal(p.originali[doc.id].pagina, 12);
    assert.equal(p.originali[doc.id].segni.length, 1);
    assert.deepEqual(p.originali[doc.id].segni[0].rettangoli, segno.rettangoli);
    for (const k of ['lezioni', 'carte', 'esiti', 'giorni', 'nuovePerGiorno']) assert.deepEqual(p[k], prima[k]);
  });
  check('Nessuna contaminazione fra materie o documenti', () => {
    assert.throws(() => store.salvaPaginaOriginale(slug, altro, 2));
    assert.throws(() => store.aggiungiSegnoOriginale(slug, altro, segno));
    store.aggiungiSegnoOriginale(altro.materia, altro, { ...segno, tipo: 'sottolineato', colore: 'verde' });
    const filo = JSON.parse(store.esporta(altro.materia)).progresso;
    assert.equal(filo.originali[altro.id].segni[0].tipo, 'sottolineato');
    assert.equal(read().originali[doc.id].segni[0].id, id);
  });
  check('Backup e ripristino includono tutti i segni e la pagina', () => {
    const prima = read(); const backup = store.esporta(slug);
    store.azzera(slug); assert(!read().originali);
    store.importa(slug, backup); assert.deepEqual(read(), prima);
  });
  check('Rimozione e annullamento conservano testo e geometria', () => {
    const prima = read().originali[doc.id].segni[0];
    assert(store.rimuoviSegnoOriginale(slug, doc, prima.id));
    assert.equal(read().originali[doc.id].segni.length, 0);
    const { id: _, creata, ...contenuto } = prima;
    store.aggiungiSegnoOriginale(slug, doc, contenuto);
    const dopo = read().originali[doc.id].segni[0];
    assert.deepEqual(dopo.rettangoli, prima.rettangoli); assert.equal(dopo.testo, prima.testo);
  });
  check('Backup precedente al lettore continua a funzionare', () => {
    store.importa(slug, JSON.stringify({ versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: 25 }));
    assert(!read().originali);
    store.salvaPaginaOriginale(slug, doc, doc.pagine + 100);
    assert.equal(read().originali[doc.id].pagina, doc.pagine);
  });
  check('Storage pieno è segnalato senza fingere un salvataggio riuscito', () => {
    pieno = true;
    assert.equal(store.salvaPaginaOriginale(slug, doc, 3), false);
    assert.equal(store.aggiungiSegnoOriginale(slug, doc, segno).salvato, false);
    assert.equal(read().originali[doc.id].segni.length, 1, 'il testo resta recuperabile dalla sessione e dal backup');
    pieno = false;
    assert(store.salvaPaginaOriginale(slug, doc, 3));
    assert.equal(JSON.parse(values.get(`iuris:v1:prog:${slug}`)).originali[doc.id].segni.length, 1);
  });
  // Simula un riavvio: il modulo perde la cache in memoria, lo storage resta.
  const atteso = read();
  await server.close(); server = null;
  server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  store = await server.ssrLoadModule('/src/lib/store.ts');
  check('Riaprire l’app rilegge gli stessi dati dal browser', () => assert.deepEqual(read(), atteso));
  console.log(`Originali verificati: ${checks} scenari, segni personali, compatibilità dei backup e persistenza.`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
