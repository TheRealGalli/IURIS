// Moduli reali del lettore, con storage isolato dai progressi personali.
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
const createTestServer = () => createServer({
  root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});
let server;
try {
  server = await createTestServer();
  const lib = await server.ssrLoadModule('/src/lib/originali.ts');
  let store = await server.ssrLoadModule('/src/lib/store.ts');
  const doc = lib.originaliMateria('diritto-romano')[0];
  const [altro, terzo] = lib.originaliMateria('filosofia-del-diritto');
  const slug = doc.materia;
  const vuoto = { versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: 25 };
  const read = (materia = slug) => JSON.parse(store.esporta(materia)).progresso;
  const reset = () => { pieno = false; store.importa(slug, JSON.stringify(vuoto)); };
  const lettura = () => read().originali?.[doc.id];
  const storia = () => lib.cronologiaSegni(lettura());
  const segno = { pagina: 2, testo: 'Un passaggio degli appunti', rettangoli: [{ x: .12, y: .2, w: .6, h: .018 }], tipo: 'evidenziato', colore: 'giallo' };
  const aggiungi = (testo = segno.testo) => store.aggiungiSegnoOriginale(slug, doc, { ...segno, testo });
  const undo = () => store.annullaSegnoOriginale(slug, doc);
  const redo = () => store.ripristinaSegnoOriginale(slug, doc);
  const eseguita = (result) => assert.deepEqual(result, { eseguito: true, salvato: true });
  const nessuna = (result) => assert.deepEqual(result, { eseguito: false, salvato: true });
  const freeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  };
  let checks = 0;
  const check = (name, fn) => { try { fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };

  check('Catalogo per materia e limiti delle pagine', () => {
    assert.equal(lib.originaliMateria('diritto-romano').length, 1);
    assert.equal(lib.originaliMateria('filosofia-del-diritto').length, 3);
    assert.equal(lib.paginaValida(-3, doc.pagine), 1);
    assert.equal(lib.paginaValida(99999, doc.pagine), doc.pagine);
    assert.equal(lib.paginaValida(NaN, doc.pagine), 1);
    assert.deepEqual(lib.cronologiaSegni(), { indietro: [], avanti: [] });
  });
  check('Geometria ai bordi e rifiuto di selezioni vuote', () => {
    const clipped = lib.normalizzaSegno({ ...segno, rettangoli: [{ x: .8, y: .99, w: .7, h: .02 }, { x: NaN, y: 0, w: 1, h: 1 }] }, doc.pagine);
    assert.equal(clipped.rettangoli.length, 1);
    const r = clipped.rettangoli[0];
    assert.equal(r.x + r.w, 1); assert.equal(r.y + r.h, 1);
    assert.throws(() => lib.normalizzaSegno({ ...segno, testo: '  ' }, doc.pagine));
    assert.throws(() => lib.normalizzaSegno({ ...segno, pagina: doc.pagine + 1 }, doc.pagine));
    assert.throws(() => lib.normalizzaSegno({ ...segno, rettangoli: [] }, doc.pagine));
  });
  check('Pagina, segni e storia convivono con i progressi del corso', () => {
    reset(); store.segnaStudiata(slug, 'u01-l1', true, ['q1']);
    const prima = read();
    assert(store.salvaPaginaOriginale(slug, doc, 12));
    const result = aggiungi();
    assert(result.salvato); assert(result.id);
    const p = read();
    assert.equal(p.originali[doc.id].pagina, 12);
    assert.equal(p.originali[doc.id].segni.length, 1);
    assert.deepEqual(p.originali[doc.id].segni[0].rettangoli, segno.rettangoli);
    assert.equal(storia().indietro[0].segno.id, result.id);
    for (const k of ['lezioni', 'carte', 'esiti', 'giorni', 'nuovePerGiorno']) assert.deepEqual(p[k], prima[k]);
  });
  check('Aggiunta, rimozione centrale, undo e redo conservano ID, date, geometria e ordine', () => {
    reset(); store.salvaPaginaOriginale(slug, doc, 18);
    const a = aggiungi('Primo').id, b = aggiungi('Secondo').id, c = aggiungi('Terzo').id;
    const originali = lettura().segni;
    assert(store.rimuoviSegnoOriginale(slug, doc, b));
    assert.deepEqual(lettura().segni.map((s) => s.id), [a, c]);
    assert.equal(storia().indietro.at(-1).posizione, 1);
    eseguita(undo()); assert.deepEqual(lettura().segni, originali);
    eseguita(redo()); assert.deepEqual(lettura().segni, [originali[0], originali[2]]);
    eseguita(undo()); eseguita(undo());
    assert.deepEqual(lettura().segni, originali.slice(0, 2));
    eseguita(redo()); assert.deepEqual(lettura().segni, originali);
    assert.equal(lettura().pagina, 18, 'la storia dei segni non sposta la pagina corrente');
  });
  check('Una nuova modifica dopo Undo tronca Redo, una rimozione inesistente no', () => {
    reset(); const a = aggiungi('A').id, b = aggiungi('B').id;
    eseguita(undo()); assert.equal(storia().avanti.length, 1);
    const prima = storia();
    assert(store.rimuoviSegnoOriginale(slug, doc, 'inesistente'));
    assert.deepEqual(storia(), prima);
    const c = aggiungi('C').id;
    assert.equal(storia().avanti.length, 0); nessuna(redo());
    assert.deepEqual(lettura().segni.map((s) => s.id), [a, c]);
    assert(!lettura().segni.some((s) => s.id === b));
    eseguita(undo());
    assert(store.rimuoviSegnoOriginale(slug, doc, a));
    assert.equal(storia().avanti.length, 0, 'anche una rimozione reale chiude il ramo redo');
  });
  check('Un vecchio backup abilita Undo sugli ultimi cinquanta segni già presenti', () => {
    const segni = Array.from({ length: 70 }, (_, i) => ({ ...segno, id: `legacy-${i}`, creata: '2026-11-06T12:00:00.000Z', testo: `Segno ${i}` }));
    store.importa(slug, JSON.stringify({ ...vuoto, originali: { [doc.id]: { pagina: 9, segni } } }));
    const iniziale = storia();
    assert.equal(iniziale.indietro.length, 50);
    assert.equal(iniziale.indietro[0].posizione, 20);
    for (let i = 0; i < 50; i++) eseguita(undo());
    assert.deepEqual(lettura().segni, segni.slice(0, 20));
    nessuna(undo()); assert.equal(storia().indietro.length, 0, 'una pila svuotata non viene rigenerata dai segni rimasti');
    for (let i = 0; i < 50; i++) eseguita(redo());
    assert.deepEqual(lettura().segni, segni); nessuna(redo());
    assert.equal(lettura().pagina, 9);
  });
  check('La storia nuova conserva al massimo cinquanta azioni', () => {
    reset(); for (let i = 0; i < 65; i++) aggiungi(`Passaggio ${i}`);
    const tutti = lettura().segni;
    assert.equal(storia().indietro.length, 50);
    for (let i = 0; i < 50; i++) eseguita(undo());
    assert.deepEqual(lettura().segni, tutti.slice(0, 15));
    assert.equal(storia().avanti.length, 50); nessuna(undo());
    for (let i = 0; i < 50; i++) eseguita(redo());
    assert.deepEqual(lettura().segni, tutti);
    assert.equal(storia().indietro.length, 50); nessuna(redo());
  });
  check('Documenti e materie hanno storie indipendenti', () => {
    reset(); aggiungi('Romano'); const romano = read();
    store.importa(altro.materia, JSON.stringify(vuoto));
    store.aggiungiSegnoOriginale(altro.materia, altro, { ...segno, tipo: 'sottolineato', colore: 'verde' });
    store.aggiungiSegnoOriginale(terzo.materia, terzo, segno);
    const prima = read(altro.materia);
    eseguita(store.annullaSegnoOriginale(altro.materia, altro));
    assert.equal(read(altro.materia).originali[altro.id].segni.length, 0);
    assert.deepEqual(read(terzo.materia).originali[terzo.id], prima.originali[terzo.id]);
    assert.deepEqual(read(), romano);
    for (const fn of [
      () => store.salvaPaginaOriginale(slug, altro, 2),
      () => store.aggiungiSegnoOriginale(slug, altro, segno),
      () => store.rimuoviSegnoOriginale(slug, altro, 'x'),
      () => store.annullaSegnoOriginale(slug, altro),
      () => store.ripristinaSegnoOriginale(slug, altro),
    ]) assert.throws(fn);
  });
  check('Backup e ripristino conservano entrambe le pile e il comportamento successivo', () => {
    reset(); const a = aggiungi('A').id; aggiungi('B');
    store.rimuoviSegnoOriginale(slug, doc, a); eseguita(undo()); eseguita(undo());
    const prima = read(), backup = store.esporta(slug);
    assert(storia().indietro.length > 0 && storia().avanti.length > 0);
    store.azzera(slug); assert(!read().originali);
    store.importa(slug, backup); assert.deepEqual(read(), prima);
    eseguita(redo()); eseguita(redo());
    assert.equal(lettura().segni.length, 1);
    assert.equal(lettura().segni[0].testo, 'B');
  });
  check('Le trasformazioni pure non mutano snapshot e riusano i segni invariati', () => {
    const a = { ...segno, id: 'a', creata: '2026-11-06T12:00:00Z' };
    const b = { ...segno, id: 'b', creata: '2026-11-06T13:00:00Z' };
    const prima = freeze({ pagina: 3, segni: [a] });
    const azione = freeze({ tipo: 'aggiungi', segno: b, posizione: 1 });
    const dopo = lib.applicaAzioneSegno(prima, azione);
    assert.notStrictEqual(dopo, prima); assert.notStrictEqual(dopo.segni, prima.segni);
    assert.strictEqual(dopo.segni[0], a); assert.strictEqual(dopo.segni[1], b);
    assert.equal(prima.segni.length, 1); assert.equal(prima.storiaSegni, undefined);
    const indietro = lib.spostaCronologiaSegni(freeze(dopo), 'indietro');
    assert.strictEqual(indietro.segni[0], a);
    const avanti = lib.spostaCronologiaSegni(freeze(indietro), 'avanti');
    assert.strictEqual(avanti.segni[1], b); assert.strictEqual(avanti.storiaSegni.indietro.at(-1), azione);
    const copia = lib.cronologiaSegni(avanti); copia.indietro.pop();
    assert.equal(avanti.storiaSegni.indietro.length, 2, 'il getter non espone la pila mutabile');
  });
  check('Le mutazioni Originali evitano il clone dei progressi e non ne cambiano i dati', () => {
    reset(); store.segnaStudiata(slug, 'lezione', true, ['q1']);
    store.aggiorna(slug, (p) => { p.carte.q1 = { prova: 'Carta conservata' }; p.esiti.q1 = { ultimo: 3, n: 1, giuste: 1, quando: '2026-11-06T12:00:00Z' }; });
    const prima = read();
    const clone = globalThis.structuredClone;
    globalThis.structuredClone = () => { throw new Error('Clone completo dei progressi durante una modifica Originali'); };
    try {
      assert(store.salvaPaginaOriginale(slug, doc, 7));
      const { id } = aggiungi(); assert(store.rimuoviSegnoOriginale(slug, doc, id));
      eseguita(undo()); eseguita(redo());
      assert(store.salvaPaginaOriginale(slug, doc, 8));
    } finally { globalThis.structuredClone = clone; }
    const dopo = read();
    for (const k of ['lezioni', 'carte', 'esiti', 'giorni', 'nuovePerGiorno']) assert.deepEqual(dopo[k], prima[k]);
  });
  check('Un backup precedente al lettore continua a funzionare', () => {
    reset(); assert(!read().originali);
    nessuna(undo()); nessuna(redo()); assert(!read().originali);
    store.salvaPaginaOriginale(slug, doc, doc.pagine + 100);
    assert.equal(lettura().pagina, doc.pagine);
  });
  check('Quota piena segnala anche Undo/Redo e conserva la sessione recuperabile', () => {
    reset(); aggiungi('Primo'); const b = aggiungi('Secondo').id; aggiungi('Terzo');
    const tutti = lettura().segni;
    const persistito = values.get(`iuris:v1:prog:${slug}`);
    pieno = true;
    assert.equal(store.rimuoviSegnoOriginale(slug, doc, b), false);
    assert.deepEqual(undo(), { eseguito: true, salvato: false }); assert.deepEqual(lettura().segni, tutti);
    assert.deepEqual(redo(), { eseguito: true, salvato: false });
    const nuovo = aggiungi('Quarto'); assert.equal(nuovo.salvato, false);
    assert.deepEqual(undo(), { eseguito: true, salvato: false });
    assert.deepEqual(redo(), { eseguito: true, salvato: false });
    assert.equal(store.salvaPaginaOriginale(slug, doc, 3), false);
    assert.equal(values.get(`iuris:v1:prog:${slug}`), persistito, 'nessun falso salvataggio su disco');
    const inMemoria = read();
    assert(inMemoria.originali[doc.id].segni.some((s) => s.id === nuovo.id));
    pieno = false;
    assert(store.salvaPaginaOriginale(slug, doc, 3), 'riprovare la stessa pagina salva anche la storia rimasta in memoria');
    assert.deepEqual(JSON.parse(values.get(`iuris:v1:prog:${slug}`)), inMemoria);
  });

  check('La gomma cancella insieme evidenziazioni e sottolineature, senza toccare altri passaggi o pagine', () => {
    reset();
    store.aggiungiSegnoOriginale(slug, doc, { ...segno, testo: 'Evidenziato' });
    store.aggiungiSegnoOriginale(slug, doc, { ...segno, testo: 'Da conservare', rettangoli: [{ x: .12, y: .4, w: .6, h: .018 }] });
    store.aggiungiSegnoOriginale(slug, doc, { ...segno, testo: 'Sottolineato', tipo: 'sottolineato', colore: 'rosa' });
    store.aggiungiSegnoOriginale(slug, doc, { ...segno, testo: 'Altra pagina', pagina: 3 });
    const prima = lettura().segni, n = storia().indietro.length;
    const scelta = [{ x: .2, y: .201, w: .04, h: .016 }];
    assert.deepEqual(store.cancellaSegniOriginale(slug, doc, 2, scelta), { rimossi: 2, salvato: true });
    assert.deepEqual(lettura().segni.map((s) => s.testo), ['Da conservare', 'Altra pagina']);
    assert.equal(storia().indietro.length, n + 1, 'una sola azione per tutta la passata');
    eseguita(undo()); assert.deepEqual(lettura().segni, prima, 'stessi ID, posizioni, date e geometrie');
    eseguita(redo()); assert.deepEqual(lettura().segni, [prima[1], prima[3]]);
    const dopo = lettura();
    assert.deepEqual(store.cancellaSegniOriginale(slug, doc, 2, scelta), { rimossi: 0, salvato: true });
    assert.deepEqual(lettura(), dopo, 'nessun segno toccato: cronologia invariata');
  });
  check('La gomma ignora bordi a contatto, righe vicine e pagine diverse', () => {
    const s = { ...segno, id: 'geometria', creata: '2026-11-07T10:00:00Z' };
    assert.equal(lib.segnoNellaSelezione(s, 2, [{ x: .3, y: .203, w: .02, h: .01 }]), true);
    assert.equal(lib.segnoNellaSelezione(s, 3, s.rettangoli), false);
    assert.equal(lib.segnoNellaSelezione(s, 2, [{ x: .72, y: .2, w: .1, h: .018 }]), false);
    assert.equal(lib.segnoNellaSelezione(s, 2, [{ x: .3, y: .218, w: .1, h: .018 }]), false);
    assert.equal(lib.segnoNellaSelezione(s, 2, [{ x: .3, y: .217, w: .1, h: .018 }]), false);
  });

  // Riavvio del modulo: la cache in memoria sparisce, localStorage e pile restano.
  reset(); aggiungi('Resta'); aggiungi('Da ripristinare'); eseguita(undo());
  store.salvaPaginaOriginale(slug, doc, 11);
  const atteso = read();
  const dopoRedo = lib.spostaCronologiaSegni(atteso.originali[doc.id], 'avanti');
  await server.close(); server = null;
  server = await createTestServer();
  store = await server.ssrLoadModule('/src/lib/store.ts');
  check('Riaprire l’app rilegge gli stessi segni, pagina e pile dal browser', () => assert.deepEqual(read(), atteso));
  check('Undo e Redo funzionano anche dopo il riavvio', () => {
    eseguita(redo()); assert.deepEqual(lettura(), dopoRedo);
    eseguita(undo()); assert.deepEqual(lettura(), atteso.originali[doc.id]);
  });
  console.log(`Originali verificati: ${checks} scenari su geometria, cronologia, backup, quota e persistenza.`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
