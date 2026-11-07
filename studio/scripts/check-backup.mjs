// Backup reale dell'app, su storage isolato: nessun dato personale viene letto o scritto.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

class MemoryStorage {
  values = new Map(); writes = 0; failAt = Infinity; failAlways = false; quota = Infinity;
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) {
    if (++this.writes === this.failAt || this.failAlways) throw new Error('QuotaExceededError');
    const next = new Map(this.values); next.set(k, String(v));
    if ([...next].reduce((n, [key, value]) => n + key.length + value.length, 0) > this.quota) throw new Error('QuotaExceededError');
    this.values = next;
  }
  removeItem(k) { this.writes++; this.values.delete(k); }
}
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
let server, store, srs, originali;
const start = async () => {
  await server?.close();
  server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  store = await server.ssrLoadModule('/src/lib/store.ts');
  srs = await server.ssrLoadModule('/src/lib/srs.ts');
  originali = await server.ssrLoadModule('/src/lib/originali.ts');
};
const fresh = async () => { storage.values.clear(); storage.writes = 0; storage.failAt = Infinity; storage.failAlways = false; storage.quota = Infinity; await start(); };
const progress = (slug) => JSON.parse(store.esporta(slug)).progresso;
const empty = () => ({ versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: 25 });
const full = (materie = { romano: empty() }) => ({ formato: 'iuris-backup', versione: 1, esportato: '2026-11-07T10:00:00Z', materie,
  preferenze: { tema: 'scuro', materia: Object.keys(materie)[0] ?? 'romano', voce: true }, sessioni: {}, altriDati: {} });
const disk = () => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
const snapshot = () => { const value = JSON.parse(store.esportaTutto()); delete value.esportato; return value; };
const q = (id, props = {}) => ({ id, tipo: 'flashcard', domanda: 'Domanda', risposta: 'Risposta', lezione: 'l1', unita: 'u1', livello: 'base', ...props });
const session = (questions = [q('q1'), q('q2')]) => ({ origine: 'modo=ripasso', quando: '2026-11-07T10:00:00Z',
  s: { titolo: 'Ripasso del giorno', domande: questions, registra: true }, coda: [...questions, questions[0]], i: 1, voti: [3] });
const originalSign = { pagina: 2, testo: 'Testo annotato', rettangoli: [{ x: .1, y: .2, w: .5, h: .02 }], tipo: 'evidenziato', colore: 'verde' };
let checks = 0;
const check = async (name, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };

try {
  await check('Tutte le materie persistite, future e dati in memoria sono enumerati', async () => {
    await fresh();
    storage.setItem('iuris:v1:prog:corso-futuro', JSON.stringify({ ...empty(), nuovePerGiorno: 40 }));
    store.segnaStudiata('romano', 'l1', true, ['q1']);
    storage.failAlways = true; store.segnaStudiata('materia-in-memoria', 'l9', true, ['q9']);
    store.scriviPref({ tema: 'chiaro', materia: 'materia-in-memoria', voce: true });
    const b = JSON.parse(store.esportaTutto());
    assert.deepEqual(Object.keys(b.materie).sort(), ['corso-futuro', 'materia-in-memoria', 'romano']);
    assert(b.materie['materia-in-memoria'].lezioni.l9.studiata);
    assert.equal(b.preferenze.tema, 'chiaro');
    assert.equal(storage.getItem('iuris:v1:prog:materia-in-memoria'), null);
    storage.failAlways = false;
  });
  await check('Roundtrip totale conserva FSRS, preferenze, Originali e cronologie', async () => {
    await fresh();
    const doc = originali.originaliMateria('diritto-romano')[0];
    store.segnaStudiata(doc.materia, 'l1', true, ['q1', 'q2'], new Date('2026-11-07T09:00:00Z'));
    srs.registraRisposta(doc.materia, 'q1', srs.Rating.Good, new Date('2026-11-07T10:00:00Z'));
    store.salvaPaginaOriginale(doc.materia, doc, 14);
    store.aggiungiSegnoOriginale(doc.materia, doc, originalSign);
    store.aggiungiSegnoOriginale(doc.materia, doc, { ...originalSign, testo: 'Secondo segno' });
    store.annullaSegnoOriginale(doc.materia, doc);
    store.segnaStudiata('futuro-2028', 'lezione-futura', true, []);
    store.scriviPref({ materia: 'futuro-2028', tema: 'scuro', voce: true });
    storage.setItem('iuris:v1:sessione:diritto-romano', JSON.stringify(session()));
    storage.setItem('iuris:v1:impostazione-futura', 'valore non JSON');
    storage.setItem('altra-app:privato', 'non trasferire');
    const prima = snapshot(), backup = store.esportaTutto();
    const summary = store.ispezionaBackup(backup);
    assert.equal(summary.segni, 1); assert.equal(summary.documenti, 1); assert.equal(summary.sessioni, 1);
    assert.equal(summary.altriDati, 1); assert.equal(summary.tipo, 'totale');
    assert(!backup.includes('non trasferire'));
    await fresh();
    store.segnaStudiata('fuori-dal-file', 'conservata', true, []);
    const fuori = progress('fuori-dal-file');
    store.importaTutto(backup);
    const dopo = snapshot(); delete dopo.materie['fuori-dal-file'];
    assert.deepEqual(dopo, prima); assert.deepEqual(progress('fuori-dal-file'), fuori);
    assert.deepEqual(store.leggiPref(), prima.preferenze);
    assert.equal(store.ripristinaSegnoOriginale(doc.materia, doc).eseguito, true);
    assert.equal(progress(doc.materia).originali[doc.id].segni[1].testo, 'Secondo segno');
  });
  await check('Riapertura rilegge l’intero ripristino dal solo storage', async () => {
    const prima = snapshot(); await start(); assert.deepEqual(snapshot(), prima);
  });
  await check('Le sette famiglie di esercizi e le code con ripetizioni sono trasferite', async () => {
    await fresh();
    const questions = [q('f'), q('m', { tipo: 'multipla', opzioni: ['A', 'B'], corretta: 1 }),
      q('v', { tipo: 'verofalso', affermazione: 'A', vero: false, spiegazione: 'B' }),
      q('c', { tipo: 'completa', testo: '{{vuoto}}' }), q('o', { tipo: 'ordina', consegna: 'Ordina', elementi: ['A', 'B'] }),
      q('a', { tipo: 'abbina', consegna: 'Abbina', coppie: [['A', 'B']] }),
      q('ap', { tipo: 'aperta', traccia: 'Traccia', punti: [{ testo: 'Punto', chiavi: ['radice'] }] })];
    const backup = full(); backup.sessioni.romano = session(questions);
    store.importaTutto(JSON.stringify(backup));
    assert.deepEqual(JSON.parse(storage.getItem('iuris:v1:sessione:romano')), backup.sessioni.romano);
    assert.deepEqual(JSON.parse(store.esportaTutto()).sessioni, backup.sessioni);
  });
  await check('Una materia con la sola sessione viene inclusa nel backup', async () => {
    await fresh(); storage.setItem('iuris:v1:sessione:solo-sessione', JSON.stringify(session()));
    const b = JSON.parse(store.esportaTutto());
    assert.deepEqual(b.materie['solo-sessione'], empty()); assert(b.sessioni['solo-sessione']);
  });
  await check('Fuori dal file nulla cambia; sessioni obsolete delle materie importate vengono rimosse', async () => {
    await fresh(); store.segnaStudiata('esclusa', 'l2', true, []);
    storage.setItem('iuris:v1:sessione:esclusa', JSON.stringify(session()));
    storage.setItem('iuris:v1:sessione:romano', JSON.stringify(session()));
    storage.setItem('iuris:v1:preferenza-esclusa', 'resta'); storage.setItem('non-iuris', 'resta');
    const prima = progress('esclusa'), s = storage.getItem('iuris:v1:sessione:esclusa');
    store.importaTutto(JSON.stringify(full()));
    assert.deepEqual(progress('esclusa'), prima); assert.equal(storage.getItem('iuris:v1:sessione:esclusa'), s);
    assert.equal(storage.getItem('iuris:v1:sessione:romano'), null);
    assert.equal(storage.getItem('iuris:v1:preferenza-esclusa'), 'resta'); assert.equal(storage.getItem('non-iuris'), 'resta');
  });
  await check('Vecchi backup monomateria usano la loro materia e non alterano le preferenze', async () => {
    await fresh(); store.segnaStudiata('romano', 'lezione-originale', true, []);
    const legacy = store.esporta('romano');
    store.scriviPref({ tema: 'chiaro', materia: 'altra' }); const pref = { ...store.leggiPref() };
    store.segnaStudiata('altra', 'lezione-altra', true, []); const altra = progress('altra');
    const summary = store.ispezionaBackup(legacy, 'altra');
    assert.equal(summary.tipo, 'materia'); assert.deepEqual(summary.materie, ['romano']); assert.equal(summary.preferenze, false);
    store.importaTutto(legacy, 'altra'); assert.deepEqual(store.leggiPref(), pref); assert.deepEqual(progress('altra'), altra);
    const bare = JSON.stringify(empty()); assert.throws(() => store.ispezionaBackup(bare));
    store.importaTutto(bare, 'corso-legacy'); assert.deepEqual(progress('corso-legacy'), empty());
  });
  await check('Il vecchio lettore senza cronologia viene accettato e conserva Undo', async () => {
    await fresh(); const doc = originali.originaliMateria('diritto-romano')[0];
    const p = empty(); p.originali = { [doc.id]: { pagina: 3, segni: [{ ...originalSign, id: 'vecchio-segno', creata: '2025-01-01T10:00:00Z' }] } };
    store.importaTutto(JSON.stringify({ materia: doc.materia, progresso: p }));
    assert.equal(store.annullaSegnoOriginale(doc.materia, doc).eseguito, true);
    assert.equal(progress(doc.materia).originali[doc.id].segni.length, 0);
  });
  await check('File invalidi non provocano alcuna scrittura né modifica della cache', async () => {
    await fresh(); store.segnaStudiata('romano', 'da-conservare', true, []); store.scriviPref({ tema: 'chiaro' });
    const prima = snapshot(), suDisco = disk();
    const valid = full();
    const mutate = (fn) => { const b = structuredClone(valid); fn(b); return JSON.stringify(b); };
    const bad = ['null', '[]', '{}', 'non JSON', mutate(b => { b.versione = 9; }),
      mutate(b => { b.materie.romano.lezioni = []; }), mutate(b => { delete b.materie.romano.giorni; }),
      mutate(b => { b.materie.romano.nuovePerGiorno = -1; }), mutate(b => { b.preferenze.tema = 'finto'; }),
      mutate(b => { b.materie.romano.giorni['2026-02-30'] = { lette: 1, risposte: 0, corrette: 0, secondi: 0 }; }),
      mutate(b => { b.materie.romano.carte.q = { due: 'non-data' }; }),
      mutate(b => { b.sessioni.romano = { ...session(), i: 999 }; }),
      mutate(b => { b.sessioni.romano = session([q('errata', { tipo: 'sconosciuto' })]); }),
      mutate(b => { b.materie['../altra'] = empty(); }),
      mutate(b => { b.altriDati['non-iuris:chiave'] = 'x'; }),
      ...['iuris:v1:pref', 'iuris:v1:prog:romano', 'iuris:v1:sessione:romano'].map(k => mutate(b => { b.altriDati[k] = '{}'; })),
      '{"formato":"iuris-backup","versione":1,"materie":{"__proto__":{}},"preferenze":{}}',
      mutate(b => { b.materie.romano.nuovePerGiorno = 999; }).replace('999', '1e999')];
    for (const b of bad) {
      const writes = storage.writes;
      assert.throws(() => store.ispezionaBackup(b)); assert.throws(() => store.importaTutto(b));
      assert.equal(storage.writes, writes); assert.deepEqual(disk(), suDisco); assert.deepEqual(snapshot(), prima);
    }
  });
  await check('Geometrie e cronologie incoerenti non vengono importate', async () => {
    await fresh(); const doc = originali.originaliMateria('diritto-romano')[0];
    store.aggiungiSegnoOriginale(doc.materia, doc, originalSign);
    const valid = JSON.parse(store.esportaTutto()), prima = snapshot(), suDisco = disk();
    const mutations = [l => { l.segni[0].rettangoli[0].w = 2; }, l => { l.segni.push(structuredClone(l.segni[0])); },
      l => { l.storiaSegni.indietro[0].posizione = 100; }, l => { l.storiaSegni.indietro[0].segno.testo = 'non corrisponde'; }];
    for (const edit of mutations) {
      const b = structuredClone(valid); edit(b.materie[doc.materia].originali[doc.id]);
      assert.throws(() => store.importaTutto(JSON.stringify(b))); assert.deepEqual(snapshot(), prima); assert.deepEqual(disk(), suDisco);
    }
  });
  await check('Quota esaurita prima della prima scrittura lascia tutto invariato', async () => {
    await fresh(); store.segnaStudiata('romano', 'resta', true, []); store.scriviPref({ tema: 'chiaro' });
    const prima = snapshot(), suDisco = disk(), pref = store.leggiPref(); storage.failAlways = true;
    assert.throws(() => store.importaTutto(JSON.stringify(full())), /annullata/);
    storage.failAlways = false;
    assert.deepEqual(snapshot(), prima); assert.deepEqual(disk(), suDisco); assert.strictEqual(store.leggiPref(), pref);
  });
  await check('Errore a metà transazione ripristina tutte le chiavi senza pubblicare nuovi dati', async () => {
    await fresh(); store.segnaStudiata('romano', 'prima', true, []); store.segnaStudiata('futuro', 'seconda', true, []);
    store.scriviPref({ tema: 'chiaro' }); storage.setItem('iuris:v1:sessione:romano', JSON.stringify(session()));
    const prima = snapshot(), suDisco = disk(), pref = store.leggiPref(); storage.writes = 0; storage.failAt = 2;
    assert.throws(() => store.importaTutto(JSON.stringify(full({ romano: empty(), futuro: empty() }))), /annullata/);
    storage.failAt = Infinity;
    assert.deepEqual(disk(), suDisco); assert.deepEqual(snapshot(), prima); assert.strictEqual(store.leggiPref(), pref);
  });
  await check('Quota reale a metà transazione ripristina lo spazio e i dati iniziali', async () => {
    await fresh(); store.segnaStudiata('romano', 'prima', true, []); store.segnaStudiata('futuro', 'seconda', true, []);
    const prima = snapshot(), suDisco = disk();
    storage.quota = [...storage.values].reduce((n, [k, v]) => n + k.length + v.length, 0) + 100;
    const backup = full({ romano: { ...empty(), campoFuturo: 'A' }, futuro: { ...empty(), campoFuturo: 'X'.repeat(5000) } });
    assert.throws(() => store.importaTutto(JSON.stringify(backup)), /annullata/);
    storage.quota = Infinity; assert.deepEqual(disk(), suDisco); assert.deepEqual(snapshot(), prima);
  });
  await check('Anteprima e riepilogo non mutano i dati', async () => {
    await fresh(); store.segnaStudiata('romano', 'lezione', true, []);
    const suDisco = disk(), writes = storage.writes;
    const summary = store.ispezionaBackup(store.esportaTutto());
    assert.deepEqual(summary.materie, ['romano']); assert.deepEqual(store.riepilogoBackup().materie, ['romano']);
    assert.equal(storage.writes, writes); assert.deepEqual(disk(), suDisco);
  });
  console.log(`Backup verificato: ${checks} scenari su tutte le materie, sessioni, Originali, preferenze, validazione e rollback.`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
