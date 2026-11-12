// Verifica il piano e la ripresa del ripasso usando gli stessi moduli dell'app.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.get(String(key)) ?? null; }
  setItem(key, value) { this.#items.set(String(key), String(value)); }
  removeItem(key) { this.#items.delete(String(key)); }
  clear() { this.#items.clear(); }
  get length() { return this.#items.size; }
  key(i) { return [...this.#items.keys()][i] ?? null; }
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
  const { domandeSbloccate, famigliaDomanda, ordinaRipasso, registraRisposta, ripassoDiOggi, Rating } = await server.ssrLoadModule('/src/lib/srs.ts');
  const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
  const { integraRipasso, sessioneRipasso } = await server.ssrLoadModule('/src/views/Allena.tsx');
  const { statoStudioSezione } = await server.ssrLoadModule('/src/lib/letture.ts');
  const now = new Date('2026-11-06T12:00:00+01:00');
  const yesterday = new Date('2026-11-05T12:00:00+01:00');
  const tomorrow = new Date('2026-11-07T12:00:00+01:00');
  let fixtures = 0, checks = 0;
  const check = (name, fn) => {
    try { fn(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; }
  };
  const ids = (questions) => questions.map((q) => q.id);
  const read = (slug) => JSON.parse(store.esporta(slug)).progresso;
  const fixture = (counts, inverseCount = 0, eventCount = 0) => {
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
      concetti: concepts, relazioni: [], eventi: Array.from({ length: eventCount }, (_, i) => ({
        id: `ev-${i + 1}`, anno: i * 100 - 300, data: `Data ${i + 1}`, titolo: `Evento ${i + 1}`,
        descrizione: `Descrizione evento ${i + 1}`, tipo: i === 0 ? 'periodo' : 'evento', unita: 'u1',
      })), domande: questions, mancanti: [] });
    // I casi storici verificano ancora un limite personalizzato25; il nuovo default35 ha casi dedicati.
    store.impostaNuove(slug, 25);
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
    assert.equal(p.verifiche.length, 18, 'le verifiche hanno priorità anche quando sono già incluse nelle 25 ordinarie');
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
    assert.equal(after.verifiche.length, 0);
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
    assert.equal(p.verifiche.length, 0, 'la priorità della verifica scade con il giorno locale');
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

  check('Le scadute non hanno limite; le inverse non ancora viste si attivano con lo studio', () => {
    const f = fixture([40], 3);
    f.mark(0, yesterday);
    f.questions(0).forEach((q) => f.answer(q, yesterday));
    f.idx.schedeInverse.slice(0, 2).forEach((q) => f.answer(q, yesterday));
    store.aggiorna(f.slug, (p) => { for (const c of Object.values(p.carte)) c.due = yesterday.toISOString(); });
    const p = f.plan();
    assert.equal(p.scadute.length, 42);
    assert.equal(p.nuove.length, 1);
    assert.deepEqual(ids(p.scadute.filter((q) => q.inversa)).sort(), ids(f.idx.schedeInverse.slice(0, 2)).sort());
    assert(ids(p.nuove).includes(f.idx.schedeInverse[2].id));
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

  check('La sessione nuova propone le verifiche prima di tutte le scadute e delle nuove ordinarie', () => {
    const f = fixture([40, 15, 8], 1);
    f.mark(0, yesterday);
    f.questions(0).slice(0, 10).forEach((q) => f.answer(q, yesterday));
    f.answer(f.idx.schedeInverse[0], yesterday);
    store.aggiorna(f.slug, (p) => { for (const c of Object.values(p.carte)) c.due = yesterday.toISOString(); });
    f.mark(1); f.mark(2);
    const plan = f.plan();
    assert.equal(plan.verifiche.length, 12);
    assert.equal(plan.extraNuove, 12, 'le verifiche restano extra quando le ordinarie sono delle lezioni precedenti');
    const session = sessioneRipasso(f.idx, f.read(), now);
    const verificationIds = new Set(ids(plan.verifiche));
    assert.deepEqual(new Set(ids(session.domande.slice(0, 12))), verificationIds);
    assert(session.domande.slice(12).every((q) => !verificationIds.has(q.id)));
    assert.deepEqual(ids(session.domande.slice(12, 12 + plan.scadute.length)), ids(plan.scadute), 'nessun rimescolamento dei ripassi FSRS');
    assert.equal(session.domande.length, plan.scadute.length + plan.nuove.length);
    assert.equal(new Set(ids(session.domande)).size, session.domande.length);
    assert(session.domande.some((q) => q.inversa), 'le inverse già introdotte rimangono fra le scadute');
  });

  check('Ordinamento stabile, con verifiche già nelle 25 e ripetizioni lasciate al loro posto relativo', () => {
    const f = fixture([8, 8]);
    f.mark(0, yesterday); f.mark(1);
    const plan = f.plan(), verificationIds = new Set(ids(plan.verifiche));
    assert.equal(plan.extraNuove, 0);
    assert.equal(plan.verifiche.length, 6);
    const [a, b] = f.questions(0), [c, d] = plan.verifiche;
    const input = [a, c, b, d, a];
    const ordered = ordinaRipasso(input, plan.verifiche);
    assert.deepEqual(ids(ordered), [c.id, d.id, a.id, b.id, a.id]);
    assert.deepEqual(ids(input), [a.id, c.id, b.id, d.id, a.id]);
    assert.strictEqual(ordinaRipasso(ordered, plan.verifiche), ordered);
    assert.strictEqual(ordinaRipasso(input, []), input);
    const session = sessioneRipasso(f.idx, f.read(), now);
    assert(session.domande.slice(0, 6).every((q) => verificationIds.has(q.id)));
  });

  check('Ripresa dopo una nuova lezione: verifiche davanti alla coda, prefisso e ripetizioni conservati', () => {
    const f = fixture([8, 8]);
    f.mark(0, yesterday);
    const [a, b, c] = f.questions(0);
    registraRisposta(f.slug, a.id, Rating.Again, now);
    const saved = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: [a, b, c], registra: true },
      coda: [a, b, c, a], i: 1, voti: [Rating.Again], quando: now.toISOString() };
    const before = structuredClone(saved);
    f.mark(1);
    const plan = f.plan();
    const resumed = integraRipasso(saved, [...plan.scadute, ...plan.nuove, plan.verifiche[0]], plan.verifiche);
    assert.equal(resumed.i, saved.i); assert.strictEqual(resumed.voti, saved.voti);
    assert.strictEqual(resumed.coda[0], saved.coda[0]);
    assert.deepEqual(ids(resumed.coda.slice(resumed.i, resumed.i + 6)), ids(plan.verifiche));
    assert.deepEqual(ids(resumed.coda.slice(resumed.i + 6, resumed.i + 9)), [b.id, c.id, a.id]);
    assert.equal(resumed.coda.filter((q) => q.id === a.id).length, 2, 'la ripetizione già prevista rimane');
    assert(resumed.s.domande.every((q, i) => i >= saved.s.domande.length || q === saved.s.domande[i]));
    assert.equal(new Set(ids(resumed.s.domande)).size, resumed.s.domande.length);
    assert.deepEqual(saved, before, 'il salvataggio originale non viene mutato');
    assert.strictEqual(integraRipasso(resumed, [...plan.scadute, ...plan.nuove], plan.verifiche), resumed);
  });

  check('Le verifiche già presenti in fondo risalgono anche senza nuove aggiunte', () => {
    const f = fixture([8]);
    const [a, b, c, d] = f.questions(0);
    const saved = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: [a, b, c, d], registra: true },
      coda: [a, b, c, d, a], i: 1, voti: [Rating.Again], quando: now.toISOString() };
    const resumed = integraRipasso(saved, [a, b, c, d], [d, c]);
    assert.deepEqual(ids(resumed.coda), [a.id, c.id, d.id, b.id, a.id]);
    assert.strictEqual(resumed.s, saved.s); assert.strictEqual(resumed.voti, saved.voti);
    assert.equal(resumed.i, 1);
    assert.strictEqual(integraRipasso(resumed, [d, c], [d, c]), resumed);
  });

  check('Una carta già introdotta non riceve più la priorità della verifica', () => {
    const f = fixture([8]);
    f.mark(0);
    const first = f.plan().verifiche[0];
    f.answer(first);
    store.aggiorna(f.slug, (p) => { p.carte[first.id].due = yesterday.toISOString(); });
    const plan = f.plan();
    assert.equal(plan.verifiche.length, 5, 'la riserva non scorre a una settima domanda');
    assert(!ids(plan.verifiche).includes(first.id));
    assert(ids(plan.scadute).includes(first.id));
    const session = sessioneRipasso(f.idx, f.read(), now);
    assert.equal(session.domande[5].id, first.id, 'la carta introdotta torna fra i ripassi, dopo le verifiche ancora nuove');
    const saved = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: [first, ...plan.verifiche], registra: true },
      coda: [first, ...plan.verifiche, first], i: 1, voti: [Rating.Again], quando: now.toISOString() };
    const resumed = integraRipasso(saved, plan.verifiche, [first, ...plan.verifiche]);
    assert.strictEqual(resumed, saved, 'anche una priorità errata non deve anticipare la ripetizione di una risposta nel prefisso');
  });

  check('La priorità segue il giorno locale anche intorno alla mezzanotte', () => {
    const f = fixture([8]);
    const midnight = new Date('2026-11-05T23:30:00Z');
    f.mark(0, midnight);
    assert.equal(f.plan().verifiche.length, 6);
    assert.equal(f.plan(tomorrow).verifiche.length, 0);
  });

  check('Le altre sessioni restano identiche anche se vengono passate verifiche prioritarie', () => {
    const f = fixture([4]);
    const [a, b, c, d] = f.questions(0);
    for (const title of ['Quiz libero', 'Schede inverse', 'Punti deboli', 'Sfida cronologica', 'Simulazione d\'orale']) {
      const saved = { origine: '', s: { titolo: title, domande: [a, b, c], registra: true },
        coda: [a, b, c, a], i: 1, voti: [Rating.Again], quando: now.toISOString() };
      assert.strictEqual(integraRipasso(saved, [d], [c, d]), saved);
    }
  });

  check('Default35, migrazione25 legacy e limiti personalizzati sopravvivono al riavvio/import', () => {
    const fresh = read('default35'); assert.equal(fresh.nuovePerGiorno, 35);
    storage.setItem('iuris:v1:prog:legacy25', JSON.stringify({ ...fresh, nuovePerGiorno: 25 }));
    assert.equal(read('legacy25').nuovePerGiorno, 35);
    storage.setItem('iuris:v1:prog:legacy40', JSON.stringify({ ...fresh, nuovePerGiorno: 40 }));
    assert.equal(read('legacy40').nuovePerGiorno, 40);
    store.importa('import-legacy25', JSON.stringify({ ...fresh, nuovePerGiorno: 25 }));
    assert.equal(read('import-legacy25').nuovePerGiorno, 35);
    store.impostaNuove('default35', 25);
    assert.equal(read('default35').nuovePerGiornoPersonalizzato, true);
    store.importa('explicit25', store.esporta('default35'));
    assert.equal(read('explicit25').nuovePerGiorno, 25);
    storage.setItem('iuris:v1:prog:explicit-reload25', JSON.stringify(read('explicit25')));
    assert.equal(read('explicit-reload25').nuovePerGiorno, 25);
    store.importaTutto(JSON.stringify({ ...fresh, nuovePerGiorno: 25 }), 'full-legacy25');
    assert.equal(read('full-legacy25').nuovePerGiorno, 35);
  });

  check('Glossario e date richiedono lezioni pertinenti, poi unità/corso completi come fallback', () => {
    const f = fixture([2, 2]);
    const corso = structuredClone(f.idx.corso);
    corso.unita[0].lezioni[0].pagine = [1, 2];
    corso.unita[0].lezioni[1].pagine = [3, 4];
    corso.unita.push({ ...corso.unita[0], id: 'u2', ordine: 2, lezioni: [{ ...corso.unita[0].lezioni[0], id: 'l3', unita: 'u2', concetti: [] }] });
    const concept = (id, lezioni, unita, inversa = false) => ({ id, nome: id, tipo: 'concetto', alias: [], breve: 'Breve', definizione: 'Definizione',
      lezioni, unita, pagine: [], approfondimenti: [], ...(inversa ? { schedaInversa: 'Definizione curata senza nome' } : {}) });
    corso.concetti = [concept('legato-a-l2', ['l2'], ['u1'], true), concept('solo-unita', [], ['u1']), concept('senza-riferimenti', [], [])];
    corso.eventi = [
      { id: 'con-pagina', anno: 100, data: '100', titolo: 'Data pagina3', descrizione: '', tipo: 'evento', unita: 'u1', pagine: [3, 3] },
      { id: 'solo-unita', anno: 200, data: '200', titolo: 'Data unità', descrizione: '', tipo: 'periodo', unita: 'u1' },
      { id: 'senza-unita', anno: 300, data: '300', titolo: 'Data corso', descrizione: '', tipo: 'evento', unita: 'inesistente' },
    ];
    const idx = indicizza(corso), p = f.read();
    const unlocked = () => new Set(ids(domandeSbloccate(idx, p)));
    assert.equal(unlocked().size, 0);
    p.lezioni.l1 = { studiata: yesterday.toISOString() };
    assert(!unlocked().has('glossario-inversa-legato-a-l2'));
    assert(!unlocked().has('glossario-diretta-solo-unita'));
    assert(!unlocked().has('cronologia-data-con-pagina'));
    p.lezioni.l2 = { studiata: yesterday.toISOString() };
    assert(unlocked().has('glossario-inversa-legato-a-l2'));
    assert(unlocked().has('glossario-diretta-solo-unita'));
    assert(unlocked().has('cronologia-data-con-pagina'));
    assert(unlocked().has('cronologia-data-solo-unita'));
    assert(!unlocked().has('glossario-diretta-senza-riferimenti'));
    assert(!unlocked().has('cronologia-data-senza-unita'));
    p.lezioni.l3 = { studiata: yesterday.toISOString() };
    assert.equal(unlocked().size, idx.domandaById.size);
    assert.equal(idx.schedeInverse.length, 1); assert.equal(idx.domandeGlossario.length, 3);
    assert(!idx.domandeGlossario.find((q) => q.id === 'glossario-diretta-solo-unita').inversa);
  });

  check('Le pagine delle date non confondono fonti diverse della stessa materia', () => {
    const f = fixture([1, 1]);
    const corso = structuredClone(f.idx.corso);
    corso.unita[0].lezioni.forEach((l, i) => { l.fonteNome = i ? 'Moro' : 'Incampo'; l.pagine = [1, 2]; });
    corso.eventi = [{ id: 'moro', anno: 1900, data: '1900', titolo: 'Evento Moro', descrizione: '', tipo: 'evento', unita: 'u1', fonteNome: 'Moro', pagine: [1, 1] }];
    const idx = indicizza(corso), p = f.read(); p.lezioni.l1 = { studiata: yesterday.toISOString() };
    assert(!ids(domandeSbloccate(idx, p)).includes('cronologia-data-moro'));
    p.lezioni.l2 = { studiata: yesterday.toISOString() };
    assert(ids(domandeSbloccate(idx, p)).includes('cronologia-data-moro'));
  });

  check('Ordina cronologico conserva il formato, ID stabili e prerequisiti di tutti gli eventi', () => {
    const f = fixture([1, 1, 1]); const corso = structuredClone(f.idx.corso);
    corso.unita[0].lezioni.forEach((l, i) => { l.pagine = [i + 1, i + 1]; });
    corso.eventi = Array.from({ length: 3 }, (_, i) => ({ id: `puntuale-${i}`, anno: 100 + i * 100, data: String(100 + i * 100),
      titolo: `Evento ${i}`, descrizione: '', tipo: 'evento', unita: 'u1', pagine: [i + 1, i + 1] }));
    corso.eventi.push({ ...corso.eventi[0], id: 'stesso-anno', titolo: 'Altro evento stesso anno' },
      { ...corso.eventi[0], id: 'approssimata', anno: 150, approssimato: true },
      { ...corso.eventi[0], id: 'range', anno: 170, annoFine: 180 },
      { ...corso.eventi[0], id: 'periodo', anno: 190, tipo: 'periodo' });
    const idx = indicizza(corso), [q] = idx.domandeCronologia.filter((q) => q.tipo === 'ordina');
    assert(q); assert.equal(q.elementi.length, 3); assert.equal(new Set(q.elementi).size, 3);
    assert(q.eventiCronologia.every((id) => !['approssimata', 'range', 'periodo'].includes(id)));
    assert.equal(indicizza(corso).domandeCronologia.find((x) => x.tipo === 'ordina').id, q.id);
    const p = f.read();
    p.lezioni.l1 = p.lezioni.l2 = { studiata: yesterday.toISOString() };
    assert(!ids(domandeSbloccate(idx, p)).includes(q.id));
    p.lezioni.l3 = { studiata: yesterday.toISOString() };
    assert(ids(domandeSbloccate(idx, p)).includes(q.id));
    store.importa(f.slug, JSON.stringify(p)); f.answer(q, yesterday);
    store.aggiorna(f.slug, (p) => { p.carte[q.id].due = yesterday.toISOString(); });
    assert(ids(ripassoDiOggi(idx, f.read(), now).scadute).includes(q.id));
  });

  check('Carte manuali entrano in FSRS senza sbloccare gli altri contenuti non studiati', () => {
    const f = fixture([8], 4, 4);
    assert.equal(f.plan().nuove.length, 0);
    const qs = [f.idx.domandeGlossario[0], f.idx.domandeCronologia[0]];
    qs.forEach((q) => f.answer(q, yesterday));
    store.aggiorna(f.slug, (p) => { qs.forEach((q) => { p.carte[q.id].due = yesterday.toISOString(); }); });
    const p = f.plan();
    assert.equal(p.nuove.length, 0); assert.deepEqual(new Set(ids(p.scadute)), new Set(ids(qs)));
    qs.forEach((q) => { assert.equal(f.read().carte[q.id].reps, 1); assert(f.read().esiti[q.id]); });
    assert.equal(f.read().giorni['2026-11-05'].risposte, 2);
    assert.deepEqual(ids(indicizza(f.idx.corso).domandeCronologia), ids(f.idx.domandeCronologia), 'ID persistenti a ogni indicizzazione');
  });

  check('Base35 unica con mix stabile per tutte le famiglie e senza starvation nei giorni seguenti', () => {
    const f = fixture([50], 30, 20); f.mark(0, yesterday); store.impostaNuove(f.slug, 35);
    const first = f.plan();
    assert.equal(first.nuove.length, 35); assert.equal(first.extraNuove, 0);
    assert.deepEqual(first.nuovePerFamiglia, { lezioni: 21, glossario: 7, cronologia: 7 });
    assert.deepEqual(ids(f.plan().nuove), ids(first.nuove), 'il piano non cambia senza risposte o nuovi studi');
    const seen = new Set();
    for (let day = 0; day < 6; day++) {
      const date = new Date(now); date.setDate(date.getDate() + day);
      const plan = f.plan(date); assert(plan.nuove.length <= 35);
      for (const q of plan.nuove) { assert(!seen.has(q.id)); seen.add(q.id); f.answer(q, date); }
      assert.equal(f.plan(date).nuove.length, 0, 'nessun nuovo posto dopo aver consumato il budget del giorno');
    }
    assert.equal(seen.size, f.idx.domandaById.size, 'tutte le famiglie e tutti gli ID vengono raggiunti');
    const small = fixture([5], 5, 5); small.mark(0, yesterday); store.impostaNuove(small.slug, 1);
    const families = new Set();
    for (let day = 0; day < 5; day++) {
      const date = new Date(now); date.setDate(date.getDate() + day);
      const [q] = small.plan(date).nuove; families.add(famigliaDomanda(q)); small.answer(q, date);
    }
    assert.equal(families.size, 3, 'anche un limite personalizzato1 raggiunge glossario e cronologia');
  });

  check('Ripresa con nuovo mix preserva risposte e ripetizioni senza prenotare nuove oltre budget', () => {
    const f = fixture([5]); f.mark(0, yesterday); store.impostaNuove(f.slug, 2);
    const [a, b, c, d] = f.questions(0); f.answer(a);
    const saved = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: [a, b, c, d], registra: true },
      coda: [a, b, c, d, a], i: 1, voti: [Rating.Again], quando: now.toISOString() };
    const plan = f.plan(), p = f.read();
    const resumed = integraRipasso(saved, [...plan.scadute, ...plan.nuove], plan.verifiche, p);
    assert.deepEqual(ids(resumed.coda), [a.id, b.id, a.id]);
    assert.equal(resumed.i, saved.i); assert.strictEqual(resumed.voti, saved.voti);
    assert.equal(resumed.coda.slice(resumed.i).filter((q) => !p.carte[q.id]).length, 1);
  });

  check('Vecchi registri con molte sole lezioni non affamano né lezioni né nuove famiglie', () => {
    const f = fixture([70], 20, 20); f.mark(0, yesterday); store.impostaNuove(f.slug, 35);
    f.questions(0).slice(0, 30).forEach((q) => f.answer(q, yesterday));
    assert.deepEqual(f.plan().nuovePerFamiglia, { lezioni: 21, glossario: 7, cronologia: 7 });
  });

  check('Backup totale conserva carte delle nuove famiglie, flag custom e sessioni con ripetizioni', () => {
    const f = fixture([2], 1, 1); const qs = [f.idx.domandeGlossario[0], f.idx.domandeCronologia[0]];
    qs.forEach((q) => f.answer(q));
    const session = { origine: 'modo=ripasso', s: { titolo: 'Ripasso del giorno', domande: qs, registra: true },
      coda: [...qs, qs[0]], i: 1, voti: [Rating.Again], quando: now.toISOString() };
    const backup = { formato: 'iuris-backup', versione: 1, materie: { [f.slug]: f.read() }, preferenze: {}, sessioni: { [f.slug]: session }, altriDati: {} };
    store.azzera(f.slug); store.importaTutto(JSON.stringify(backup));
    assert.deepEqual(f.read(), backup.materie[f.slug]);
    assert.deepEqual(JSON.parse(storage.getItem(`iuris:v1:sessione:${f.slug}`)), JSON.parse(JSON.stringify(session)));
    assert.equal(f.read().nuovePerGiorno, 25); assert.equal(f.read().nuovePerGiornoPersonalizzato, true);
    const invalid = structuredClone(backup); invalid.materie[f.slug].nuovePerGiornoPersonalizzato = 'sì';
    assert.throws(() => store.ispezionaBackup(JSON.stringify(invalid)));
  });

  const catalogoLetture = JSON.parse(await readFile(new URL('../src/lib/letture-catalogo.json', import.meta.url), 'utf8'));
  for (const slug of ['diritto-romano', 'filosofia-del-diritto', 'filosofia-del-diritto-ssg', 'diritto-costituzionale', 'filosofia-del-diritto-mz']) {
    const corso = JSON.parse(await readFile(new URL(`../public/content/${slug}/corso.json`, import.meta.url), 'utf8'));
    if (catalogoLetture.some((d) => d.materia === slug)) check(`Studio reale Originali ${slug}: tutte le lezioni da sezioni complete, nessun titolo scambiato per testo`, () => {
      const idx = indicizza(corso), p = read(`sezioni-${slug}`);
      const sezioni = catalogoLetture.filter((d) => d.materia === slug).flatMap((d) => d.sezioni);
      for (const meta of sezioni) {
        for (const id of statoStudioSezione(meta, p.lezioni).ids) {
          assert(idx.lezioneById.has(id), 'la sezione non deve segnare lezioni inesistenti');
          p.lezioni[id] = { studiata: yesterday.toISOString() };
        }
      }
      assert(sezioni.filter((s) => !s.soloTitolo && (s.lezione || s.lezioni?.length)).every((s) => statoStudioSezione(s, p.lezioni).studiata));
      for (const s of sezioni.filter((s) => s.soloTitolo)) assert.equal(statoStudioSezione(s, p.lezioni).ids.length, 0);
      const residue = idx.lezioni.filter((l) => !p.lezioni[l.id]?.studiata);
      assert.equal(residue.length, 0, 'anche le dodici ricostruzioni hanno il testo completo negli Originali');
      assert.equal(domandeSbloccate(idx, p).length, idx.domandaById.size);
    });
    check(`Corso reale ${slug}: intero studio raggiunge ogni quiz, ogni voce glossario e ogni data`, () => {
      const idx = indicizza(corso), p = read(`real-${slug}`);
      assert.equal(domandeSbloccate(idx, p).length, 0);
      p.lezioni = Object.fromEntries(idx.lezioni.map((l) => [l.id, { studiata: yesterday.toISOString() }]));
      const all = domandeSbloccate(idx, p);
      const ordini = idx.domandeCronologia.filter((q) => q.tipo === 'ordina');
      assert(ordini.length > 0, 'il formato Ordina rimane presente anche nel corso reale');
      assert.equal(all.length, corso.domande.length + corso.concetti.length + corso.eventi.length + ordini.length);
      assert.equal(idx.domandeGlossario.length, corso.concetti.length);
      assert.equal(idx.domandeCronologia.length, corso.eventi.length + ordini.length);
      assert.equal(new Set(ids(all)).size, all.length);
      assert.deepEqual(new Set(idx.domandeGlossario.map((q) => q.glossario)), new Set(corso.concetti.map((c) => c.id)));
      assert.deepEqual(new Set(idx.domandeCronologia.filter((q) => q.tipo === 'flashcard').map((q) => q.cronologia)), new Set(corso.eventi.map((e) => e.id)));
      const plan = ripassoDiOggi(idx, p, now);
      assert.equal(plan.nuove.length, 35); assert.equal(plan.nuoveTotali, all.length);
      for (const family of ['lezioni', 'glossario', 'cronologia']) assert(plan.nuovePerFamiglia[family] > 0);
      const seen = new Set();
      // Simula solo le prime introduzioni: FSRS e persistenza sono verificati separatamente sopra.
      for (let day = 0; day <= Math.ceil(all.length / 35); day++) {
        const date = new Date(now); date.setDate(date.getDate() + day);
        const daily = ripassoDiOggi(idx, p, date); assert(daily.nuove.length <= 35);
        for (const q of daily.nuove) {
          assert(!seen.has(q.id)); seen.add(q.id);
          p.carte[q.id] = { due: '2099-01-01T00:00:00Z', introdotta: date.toISOString(), reps: 1 };
        }
      }
      assert.equal(seen.size, all.length, 'anche il piano limitato, nei giorni successivi, raggiunge ogni ID reale');
      console.log(`${slug}: ${corso.domande.length} domande, ${corso.concetti.length} glossario, ${corso.eventi.length} date, ${ordini.length} sequenze; copertura ${seen.size}/${all.length}.`);
    });
  }

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
