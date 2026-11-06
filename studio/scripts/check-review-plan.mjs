// Verifica il piano e la ripresa del ripasso usando gli stessi moduli dell'app.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.get(String(key)) ?? null; }
  setItem(key, value) { this.#items.set(String(key), String(value)); }
  removeItem(key) { this.#items.delete(String(key)); }
  clear() { this.#items.clear(); }
}

const originalGlobals = new Map(['localStorage', 'window', 'location'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const previousTZ = process.env.TZ;
process.env.TZ = 'Europe/Rome';
const storage = new MemoryStorage();
const location = { hash: '#/allena?modo=ripasso' };
const window = Object.assign(new EventTarget(), { location, scrollTo() {} });
for (const [key, value] of Object.entries({ localStorage: storage, window, location })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

let server;
try {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    logLevel: 'error',
    // Il caricamento SSR non richiede porte HTTP o WebSocket.
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true },
  });
  const store = await server.ssrLoadModule('/src/lib/store.ts');
  const { registraRisposta, ripassoDiOggi, Rating } = await server.ssrLoadModule('/src/lib/srs.ts');
  const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
  const { integraRipasso } = await server.ssrLoadModule('/src/views/Allena.tsx');
  const now = new Date('2026-11-06T12:00:00+01:00');
  const yesterday = new Date('2026-11-05T12:00:00+01:00');
  const tomorrow = new Date('2026-11-07T12:00:00+01:00');
  let fixtures = 0, checks = 0;
  const check = (name, fn) => {
    try { fn(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
  };
  const ids = (questions) => questions.map((q) => q.id);
  const read = (slug) => JSON.parse(store.esporta(slug)).progresso;
  const fixture = (counts, inverseCount = 0) => {
    const slug = `review-check-${++fixtures}`;
    const lessons = counts.map((_, i) => ({ id: `l${i + 1}`, unita: 'u1', titolo: `Lezione ${i + 1}`,
      minuti: 20, sintesi: '', puntiChiave: [], memoria: [], concetti: [] }));
    const questions = counts.flatMap((count, i) => Array.from({ length: count }, (_, n) => ({
      id: `l${i + 1}-q${n + 1}`, lezione: lessons[i].id, unita: 'u1', livello: 'base',
      tipo: 'flashcard', domanda: `Domanda ${i + 1}/${n + 1}`, risposta: 'Risposta',
    })));
    const concepts = Array.from({ length: inverseCount }, (_, i) => ({ id: `c${i + 1}`, nome: `Termine ${i + 1}`,
      tipo: 'concetto', alias: [], breve: '', definizione: '', unita: ['u1'], lezioni: [], pagine: [],
      approfondimenti: [], schedaInversa: `Definizione del termine ${i + 1}` }));
    const idx = indicizza({ generatedAt: now.toISOString(), materia: { slug, nome: 'Corso di prova' },
      unita: [{ id: 'u1', ordine: 1, titolo: 'Unità', capitolo: null, abstract: '', note: null,
        lezioni: lessons, mappa: { testo: 'Unità' } }],
      concetti: concepts, relazioni: [], eventi: [], domande: questions, mancanti: [] });
    return {
      slug, idx,
      questions: (i) => idx.domandePerLezione.get(lessons[i].id),
      mark: (i, date = now, order) => store.segnaStudiata(slug, lessons[i].id, true, order ?? ids(idx.domandePerLezione.get(lessons[i].id)), date),
      answer: (question, date = now) => registraRisposta(slug, typeof question === 'string' ? question : question.id, Rating.Easy, date),
      read: () => read(slug),
      plan: (date = now) => ripassoDiOggi(idx, read(slug), date),
    };
  };
  const noDuplicates = (plan) => {
    const all = ids([...plan.scadute, ...plan.nuove]);
    assert.equal(new Set(all).size, all.length, 'domande duplicate nel piano');
  };

  check('Limite ordinario e verifica della terza lezione', () => {
    const f = fixture([15, 15, 15]);
    f.mark(0); f.mark(1);
    let p = f.plan();
    assert.equal(p.nuove.length, 25);
    assert.equal(p.extraNuove, 0);
    assert.equal(p.inAttesa, 5);
    noDuplicates(p);
    f.mark(2);
    p = f.plan();
    assert.equal(p.nuove.length, 31);
    assert.equal(p.extraNuove, 6);
    assert.equal(p.inAttesa, 14);
    assert.deepEqual(ids(p.nuove.filter((q) => q.lezione === 'l3')), ids(f.questions(2).slice(0, 6)));
    assert.deepEqual(f.read().lezioni.l3.verificaIniziale.domande, ids(f.questions(2).slice(0, 6)));
    noDuplicates(p);
  });

  check('Sei domande fisse dopo aver esaurito il limite', () => {
    const f = fixture([25, 15]);
    f.mark(0, yesterday);
    f.questions(0).forEach((q) => f.answer(q));
    f.mark(1);
    const initial = f.plan();
    assert.equal(initial.nuoveFatteOggi, 25);
    assert.equal(initial.nuove.length, 6);
    assert.equal(initial.extraNuove, 6);
    assert.equal(initial.inAttesa, 9);
    initial.nuove.forEach((q) => f.answer(q));
    const after = f.plan();
    assert.equal(after.nuoveFatteOggi, 31);
    assert.equal(after.nuove.length, 0, 'la riserva non deve scorrere alle successive sei');
    assert.equal(after.extraNuove, 0);
    assert.equal(after.inAttesa, 9);
    noDuplicates(after);
  });

  check('Le ripetizioni non riaprono posti per domande nuove', () => {
    const f = fixture([25, 10]);
    f.mark(0, yesterday); f.mark(1, yesterday);
    f.questions(0).forEach((q) => f.answer(q));
    const introduced = f.read().carte[f.questions(0)[0].id].introdotta;
    f.questions(0).slice(0, 8).forEach((q) => f.answer(q, new Date('2026-11-06T15:00:00+01:00')));
    const p = f.plan(new Date('2026-11-06T16:00:00+01:00'));
    assert.equal(p.nuoveFatteOggi, 25);
    assert.equal(p.nuove.length, 0);
    assert.equal(p.inAttesa, 10);
    assert.equal(f.read().carte[f.questions(0)[0].id].introdotta, introduced);
    const old = fixture([30]);
    old.mark(0, yesterday);
    old.answer(old.questions(0)[0], yesterday);
    old.answer(old.questions(0)[0], now);
    assert.equal(old.plan().nuoveFatteOggi, 0, 'ripetere oggi una vecchia carta non è una prima introduzione');
    assert.equal(old.plan().nuove.length, 25);
  });

  check('Compatibilità con i backup precedenti', () => {
    const f = fixture([25, 15]);
    f.mark(0, yesterday); f.mark(1);
    f.questions(0).forEach((q) => f.answer(q));
    const backup = f.read();
    for (const c of Object.values(backup.carte)) delete c.introdotta;
    for (const l of Object.values(backup.lezioni)) delete l.verificaIniziale;
    store.importa(f.slug, JSON.stringify({ progresso: backup }));
    let p = f.plan();
    assert.equal(p.nuoveFatteOggi, 25, 'le vecchie carte con una sola risposta hanno ancora la data ricostruibile');
    assert.equal(p.nuove.length, 6, 'una lezione già marcata oggi riceve comunque la verifica iniziale');
    assert.deepEqual(ids(p.nuove), ids(f.questions(1).slice(0, 6)));
    f.answer(f.questions(0)[0], new Date('2026-11-06T13:00:00+01:00'));
    p = f.plan(new Date('2026-11-06T14:00:00+01:00'));
    assert.equal(p.nuoveFatteOggi, 25, 'la prima ripetizione dopo la migrazione deve conservare la data nota');
    p.nuove.forEach((q) => f.answer(q, new Date('2026-11-06T14:00:00+01:00')));
    assert.equal(f.plan(new Date('2026-11-06T15:00:00+01:00')).nuove.length, 0, 'anche la riserva ricostruita resta sulle stesse sei domande');
    noDuplicates(p);
  });

  check('Il giorno dopo non eredita gli extra', () => {
    const f = fixture([15, 15, 15]);
    f.mark(0); f.mark(1); f.mark(2);
    assert.equal(f.plan().nuove.length, 31);
    const p = f.plan(tomorrow);
    assert.equal(p.nuoveFatteOggi, 0);
    assert.equal(p.nuove.length, 25);
    assert.equal(p.extraNuove, 0);
    assert.equal(p.inAttesa, 20);
    noDuplicates(p);
  });

  check('Il conteggio usa il giorno locale italiano, non la data UTC', () => {
    const f = fixture([30]);
    f.mark(0, yesterday);
    const midnight = new Date('2026-11-05T23:30:00Z');
    assert.equal(midnight.getDate(), 6, 'il controllo richiede Europe/Rome');
    f.questions(0).slice(0, 7).forEach((q) => f.answer(q, midnight));
    const p = f.plan();
    assert.equal(p.nuoveFatteOggi, 7);
    assert.equal(p.nuove.length, 18);
    assert.equal(f.read().giorni['2026-11-06'].risposte, 7);
    assert.equal(f.read().carte[f.questions(0)[0].id].introdotta, midnight.toISOString());
  });

  check('Le scadute non hanno limite; le inverse entrano dopo la prima risposta', () => {
    const f = fixture([40], 3);
    f.mark(0, yesterday);
    f.questions(0).forEach((q) => f.answer(q, yesterday));
    f.idx.schedeInverse.slice(0, 2).forEach((q) => f.answer(q, yesterday));
    store.aggiorna(f.slug, (p) => { for (const c of Object.values(p.carte)) c.due = yesterday.toISOString(); });
    const p = f.plan();
    assert.equal(p.scadute.length, 42);
    assert.equal(p.nuove.length, 0);
    assert.deepEqual(ids(p.scadute.filter((q) => q.inversa)).sort(), ids(f.idx.schedeInverse.slice(0, 2)).sort());
    assert(!ids([...p.scadute, ...p.nuove]).includes(f.idx.schedeInverse[2].id));
    noDuplicates(p);
  });

  check('Togliere e rimettere Studiata non rigenera la riserva', () => {
    const f = fixture([25, 15]);
    f.mark(0, yesterday);
    f.questions(0).forEach((q) => f.answer(q));
    f.mark(1);
    const reservation = structuredClone(f.read().lezioni.l2.verificaIniziale);
    f.plan().nuove.forEach((q) => f.answer(q));
    store.segnaStudiata(f.slug, 'l2', false);
    f.mark(1, now, ids(f.questions(1)).reverse());
    assert.deepEqual(f.read().lezioni.l2.verificaIniziale, reservation);
    assert.equal(f.plan().nuove.length, 0);
    store.segnaStudiata(f.slug, 'l2', false);
    f.mark(1, tomorrow, ids(f.questions(1)).reverse());
    assert.deepEqual(f.read().lezioni.l2.verificaIniziale, reservation);
    assert.equal(f.plan(tomorrow).extraNuove, 0);
  });

  check('Backup e ripristino conservano introduzioni e verifiche', () => {
    const f = fixture([25, 15]);
    f.mark(0, yesterday);
    f.questions(0).forEach((q) => f.answer(q));
    f.mark(1);
    f.answer(f.plan().nuove[0]);
    const before = f.read();
    const backup = store.esporta(f.slug);
    store.azzera(f.slug);
    assert.equal(Object.keys(f.read().carte).length, 0);
    store.importa(f.slug, backup);
    const after = f.read();
    assert.deepEqual(after, before);
    assert.deepEqual(ripassoDiOggi(f.idx, after, now), f.plan());
    const persisted = JSON.parse(storage.getItem(`iuris:v1:prog:${f.slug}`));
    assert.deepEqual(persisted.lezioni.l2.verificaIniziale, before.lezioni.l2.verificaIniziale);
    assert.equal(persisted.carte[f.questions(0)[0].id].introdotta, now.toISOString());
  });

  check('Riprendere il ripasso aggiunge solo ID nuovi e conserva posizione e voti', () => {
    const f = fixture([6]);
    const [a, b, c, d, e] = f.questions(0);
    const saved = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: [a, b, c], registra: true },
      coda: [a, b, a, c], i: 2, voti: [Rating.Again, Rating.Good], quando: now.toISOString() };
    const unchanged = structuredClone(saved);
    const resumed = integraRipasso(saved, [b, d, d, e, c]);
    assert.equal(resumed.i, 2);
    assert.strictEqual(resumed.voti, saved.voti);
    assert.equal(resumed.origine, saved.origine);
    assert.equal(resumed.quando, saved.quando);
    assert.deepEqual(ids(resumed.coda), [a.id, b.id, a.id, c.id, d.id, e.id]);
    assert.deepEqual(ids(resumed.s.domande), [a.id, b.id, c.id, d.id, e.id]);
    assert.deepEqual(saved, unchanged, 'la sessione salvata non viene mutata');
    assert.strictEqual(integraRipasso(resumed, [d, b, e]), resumed, 'una seconda integrazione non duplica le aggiunte');
    for (const title of ['Quiz libero', 'Schede inverse', 'Simulazione d\'orale']) {
      const other = { ...saved, s: { ...saved.s, titolo: title } };
      assert.strictEqual(integraRipasso(other, [d, e]), other, 'gli altri tipi di sessione restano invariati');
    }
  });

  console.log(`Ripasso verificato: ${checks} scenari su limite, verifiche iniziali, date locali, backup e sessioni riprese.`);
} finally {
  await server?.close();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  if (previousTZ === undefined) delete process.env.TZ;
  else process.env.TZ = previousTZ;
}
