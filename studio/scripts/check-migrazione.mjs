// Migrazione dei progressi: Diritto costituzionale A-L (id vecchi) e Martines (stessi id) confluiscono in
// `diritto-costituzionale`. Con una tabella di prova e progressi finti verifica rinomina, fusione, preferenza,
// idempotenza, rinvio senza tabella, progressi nuovi e ripristino di un backup vecchio.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, String(v)); }
  removeItem(k) { this.values.delete(k); }
}
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
const root = fileURLToPath(new URL('../', import.meta.url));

const T = 'diritto-costituzionale', M = 'diritto-costituzionale-martines';
const prog = (s) => `iuris:v1:prog:${s}`, sess = (s) => `iuris:v1:sessione:${s}`;
const leggi = (k) => JSON.parse(storage.getItem(k) ?? 'null');

// Tabella di prova: scambi (u01-l1 vecchia → u02-l3, u01-l2 vecchia → u01-l1 nuova), doppioni, id scartati.
const MIGRAZIONE = {
  versione: 2,
  da: [
    { materia: T, finoAVersione: 1,
      lezioni: { 'u01-l1': 'u02-l3', 'u01-l2': 'u01-l1', 'u03-l1': 'u01-l1' },
      domande: { 'u01-q001': 'u02-q501', 'u01-q002': 'u01-q001', 'u01-q003': 'u01-q001', 'u04-q010': null } },
    { materia: M, lezioni: 'uguali', domande: 'uguali' },
  ],
};
const MANIFEST = { versione: 2, da: [
  { materia: T, finoAVersione: 1, lezioni: 'tabella', domande: 'tabella' },
  { materia: M, lezioni: 'uguali', domande: 'uguali' },
] };

const carta = (reps, ultima, extra = {}) => ({ due: '2026-12-01T08:00:00.000Z', stability: reps * 2, difficulty: 5, elapsed_days: 1,
  scheduled_days: 3, learning_steps: 0, reps, lapses: 0, state: 2, last_review: ultima, ...extra });
const segno = (id, testo) => ({ id, pagina: 3, testo, tipo: 'evidenziato', colore: 'giallo', creata: '2026-10-01T10:00:00.000Z',
  rettangoli: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.02 }] });
const progressoAL = () => ({
  versione: 1, nuovePerGiorno: 35,
  lezioni: {
    'u01-l1': { studiata: '2026-10-02T10:00:00.000Z', letta: '2026-10-02T09:00:00.000Z', verificaIniziale: { giorno: '2026-10-02', domande: ['u01-q001', 'u01-q002', 'u04-q010'] } },
    'u01-l2': { letta: '2026-10-03T09:00:00.000Z' },
    'u03-l1': { studiata: '2026-10-05T10:00:00.000Z' },
    'u17-l9': { studiata: '2026-10-06T10:00:00.000Z' },
  },
  carte: {
    'u01-q001': carta(3, '2026-10-10T08:00:00.000Z'),
    'u01-q002': carta(1, '2026-10-04T08:00:00.000Z'),
    'u01-q003': carta(5, '2026-10-12T08:00:00.000Z'),
    'u04-q010': carta(2, '2026-10-05T08:00:00.000Z'),
    'u09-q999': carta(2, '2026-10-05T08:00:00.000Z'),
    'glossario-diretta-stato': carta(4, '2026-10-11T08:00:00.000Z'),
  },
  esiti: {
    'u01-q001': { ultimo: 3, n: 3, giuste: 2, quando: '2026-10-10T08:00:00.000Z' },
    'u01-q002': { ultimo: 4, n: 1, giuste: 1, quando: '2026-10-04T08:00:00.000Z' },
  },
  giorni: { '2026-10-10': { lette: 1, risposte: 4, corrette: 3, secondi: 600 } },
  esame: '2027-01-20', ultimaLezione: 'u01-l2',
  originali: { 'costituzionale-bin-pitruzzella-v1': { pagina: 3, segni: [segno('s-al', 'sovranità popolare')] } },
});
const progressoMartines = () => ({
  versione: 1, nuovePerGiorno: 20, nuovePerGiornoPersonalizzato: true,
  lezioni: { 'u01-l1': { studiata: '2026-10-08T10:00:00.000Z' }, 'u05-l2': { letta: '2026-10-09T10:00:00.000Z' } },
  carte: { 'u01-q001': carta(2, '2026-10-20T08:00:00.000Z'), 'u05-q003': carta(1, '2026-10-09T08:00:00.000Z') },
  esiti: { 'u01-q001': { ultimo: 2, n: 2, giuste: 1, quando: '2026-10-20T08:00:00.000Z' } },
  giorni: { '2026-10-10': { lette: 2, risposte: 1, corrette: 1, secondi: 900 }, '2026-10-20': { lette: 0, risposte: 2, corrette: 1, secondi: 300 } },
  esame: '2027-02-10', ultimaLezione: 'u05-l2',
  originali: { 'costituzionale-martines-v1': { pagina: 7, segni: [segno('s-mz', 'forma di governo')] } },
});
const sessioneMartines = () => ({ origine: 'ripasso', quando: new Date().toISOString(), i: 0, voti: [], coda: [],
  s: { titolo: 'Ripasso del giorno', registra: true, domande: [] } });

let server, store, mig;
const start = async () => {
  await server?.close();
  server = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  store = await server.ssrLoadModule('/src/lib/store.ts');
  mig = await server.ssrLoadModule('/src/lib/migrazione.ts');
};
/** Nuova «apertura dell'app»: archivio con i dati dati, moduli ricaricati (memoria vuota). */
const apri = async (dati = {}) => {
  storage.values.clear();
  for (const [k, v] of Object.entries(dati)) storage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  await start();
};
const fotografia = () => JSON.stringify([...storage.values.entries()].sort());
let checks = 0;
const check = async (nome, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

function verificaAL(p) {
  assert.equal(p.versioneContenuto, 2, 'versione dei contenuti aggiornata');
  // lezioni: u01-l1 vecchia → u02-l3; u01-l2 e u03-l1 (doppione) → u01-l1; u17-l9 senza corrispondente → scartata
  assert.deepEqual(Object.keys(p.lezioni).sort(), ['u01-l1', 'u02-l3']);
  assert.equal(p.lezioni['u02-l3'].studiata, '2026-10-02T10:00:00.000Z');
  assert.equal(p.lezioni['u01-l1'].studiata, '2026-10-05T10:00:00.000Z', 'doppione: resta la lezione studiata');
  assert.equal(p.lezioni['u01-l1'].letta, '2026-10-03T09:00:00.000Z');
  assert.deepEqual(p.lezioni['u02-l3'].verificaIniziale.domande, ['u02-q501', 'u01-q001'], 'verifica iniziale rinominata, scartate le domande tolte');
  // carte: u01-q001 vecchia → u02-q501; u01-q002 e u01-q003 → u01-q001 (vince la ripassata più di recente)
  assert.equal(p.carte['u02-q501'].reps, 3);
  assert.equal(p.carte['u01-q001'].reps, 5, 'doppione: la carta più avanzata');
  assert(!p.carte['u04-q010'] && !p.carte['u09-q999'], 'domande tolte o senza corrispondente fuori dal ripasso');
  assert.equal(p.carte['glossario-diretta-stato'].reps, 4, 'le schede del glossario restano');
  assert.equal(p.esiti['u02-q501'].n, 3);
  assert.equal(p.ultimaLezione, 'u01-l1');
  assert.deepEqual(p.giorni['2026-10-10'], { lette: 1, risposte: 4, corrette: 3, secondi: 600 }, 'statistiche dei giorni intatte');
  assert.equal(p.originali['costituzionale-bin-pitruzzella-v1'].segni[0].id, 's-al', 'segni degli Originali conservati');
}

try {
  await check('solo A-L: senza tabella si rimanda, con la tabella si rinomina', async () => {
    await apri({ [prog(T)]: progressoAL(), [sess(T)]: sessioneMartines(), 'iuris:v1:pref': { materia: T, corso: 'uniba-lmg-1-al' } });
    const prima = fotografia();
    assert.equal(store.registraMigrazione(T, MANIFEST), 'rimandata');
    assert.equal(fotografia(), prima, 'senza tabella nulla cambia');
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'fatta');
    verificaAL(leggi(prog(T)));
    assert.equal(storage.getItem(sess(T)), null, 'la sessione con domande vecchie si scarta');
    const dopo = fotografia();
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'nulla', 'idempotente');
    assert.equal(fotografia(), dopo);
    await start();  // nuova apertura: la memoria è vuota, i dati già migrati non si toccano
    assert.equal(store.registraMigrazione(T, MANIFEST), 'nulla');
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'nulla');
    assert.equal(fotografia(), dopo, 'idempotente anche dopo una nuova apertura');
  });

  await check('solo Martines: fusione subito, preferenza aggiornata', async () => {
    await apri({ [prog(M)]: progressoMartines(), [sess(M)]: sessioneMartines(), 'iuris:v1:pref': { materia: M, corso: 'uniba-ssg-1' } });
    assert.equal(store.registraMigrazione(T, MANIFEST), 'fatta', 'stessi id: non serve la tabella');
    assert.equal(store.leggiPref().materia, T);
    assert.equal(leggi('iuris:v1:pref').materia, T, 'preferenza salvata');
    assert.equal(storage.getItem(prog(M)), null, 'la vecchia chiave sparisce dopo il salvataggio');
    assert.equal(storage.getItem(sess(M)), null);
    assert(storage.getItem(sess(T)), 'la sessione in corso passa alla materia unica');
    const p = leggi(prog(T));
    const atteso = { ...progressoMartines(), versioneContenuto: 2 };
    assert.deepEqual(p, atteso, 'progressi Martines identici, con la versione dei contenuti');
    const dopo = fotografia();
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'nulla');
    assert.equal(fotografia(), dopo);
  });

  await check('A-L e Martines insieme', async () => {
    await apri({ [prog(T)]: progressoAL(), [prog(M)]: progressoMartines(), 'iuris:v1:pref': { materia: M } });
    assert.equal(store.registraMigrazione(T, MANIFEST), 'rimandata', 'Martines aspetta la tabella A-L');
    assert.equal(store.leggiPref().materia, T, 'la preferenza cambia comunque');
    assert(storage.getItem(prog(M)), 'senza tabella la chiave Martines resta');
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'fatta');
    const p = leggi(prog(T));
    assert.equal(storage.getItem(prog(M)), null);
    assert.equal(p.carte['u01-q001'].last_review, '2026-10-20T08:00:00.000Z', 'conflitto: la carta ripassata più di recente (Martines)');
    assert.equal(p.carte['u02-q501'].reps, 3, 'carta A-L rinominata');
    assert(p.carte['u05-q003'], 'carta Martines');
    assert.equal(p.lezioni['u01-l1'].studiata, '2026-10-08T10:00:00.000Z', 'lezione: lo studio più recente');
    assert(p.lezioni['u05-l2'] && p.lezioni['u02-l3']);
    assert.deepEqual(p.giorni['2026-10-10'], { lette: 2, risposte: 4, corrette: 3, secondi: 900 }, 'giorni: il valore più alto, senza doppioni');
    assert(p.giorni['2026-10-20']);
    assert.equal(p.esame, '2027-01-20', 'data d\'esame già della materia');
    assert.equal(p.nuovePerGiorno, 20, 'limite scelto a mano');
    assert.deepEqual(Object.keys(p.originali).sort(), ['costituzionale-bin-pitruzzella-v1', 'costituzionale-martines-v1'], 'segni di entrambi i documenti conservati');
    assert.equal(p.versioneContenuto, 2);
    const dopo = fotografia();
    assert.equal(store.registraMigrazione(T, MIGRAZIONE), 'nulla');
    assert.equal(fotografia(), dopo, 'idempotente');
  });

  await check('progressi nuovi non vengono rinominati', async () => {
    await apri({ 'iuris:v1:pref': { materia: T } });
    assert.equal(store.registraMigrazione(T, MANIFEST), 'nulla');
    store.segnaStudiata(T, 'u01-l1', true, ['u01-q001']);
    store.registraMigrazione(T, MIGRAZIONE);
    assert.equal(leggi(prog(T)).versioneContenuto, 2, 'nascono sulla versione corrente');
    await start();
    store.registraMigrazione(T, MANIFEST); store.registraMigrazione(T, MIGRAZIONE);
    assert(leggi(prog(T)).lezioni['u01-l1'].studiata, 'u01-l1 nuova resta u01-l1');
    store.azzera(T);
    assert.equal(leggi(prog(T)).versioneContenuto, 2, 'azzerare conserva la versione');
    // Progressi vuoti rimasti dalla versione precedente (solo una data d'esame): niente da rinominare.
    await apri({ [prog(T)]: { versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {}, esame: '2027-01-20' } });
    assert.equal(store.registraMigrazione(T, MANIFEST), 'fatta', 'senza id la tabella non serve');
    assert.equal(leggi(prog(T)).esame, '2027-01-20');
  });

  await check('backup vecchio ripristinato', async () => {
    const backup = JSON.stringify({ formato: 'iuris-backup', versione: 1, esportato: '2026-11-01T10:00:00.000Z',
      materie: { [T]: progressoAL(), [M]: progressoMartines(), 'diritto-romano': { versione: 1, nuovePerGiorno: 35, lezioni: { 'u01-l1': { studiata: '2026-10-01T10:00:00.000Z' } }, carte: {}, esiti: {}, giorni: {} } },
      preferenze: { materia: M, corso: 'uniba-lmg-1-mz' }, sessioni: { [M]: sessioneMartines() }, altriDati: {} });
    // Dispositivo con l'app nuova già aperta sulla materia unica.
    await apri();
    store.registraMigrazione(T, MANIFEST); store.registraMigrazione(T, MIGRAZIONE);
    const riepilogo = store.ispezionaBackup(backup);
    assert(riepilogo.materie.includes(M), 'il riepilogo mostra ciò che il file contiene');
    store.importaTutto(backup);
    const p = leggi(prog(T));
    assert.equal(p.versioneContenuto, 2);
    assert(p.carte['u02-q501'] && p.carte['u05-q003'] && p.lezioni['u02-l3'], 'A-L rinominato e Martines fuso');
    assert.equal(storage.getItem(prog(M)), null);
    assert.equal(store.leggiPref().materia, T);
    assert.equal(leggi(prog('diritto-romano')).lezioni['u01-l1'].studiata, '2026-10-01T10:00:00.000Z', 'le altre materie non cambiano');
    // Il backup nuovo si ripristina identico (validato con versioneContenuto) e non si migra di nuovo.
    const nuovo = store.esportaTutto();
    const prima = leggi(prog(T));
    await apri();
    store.registraMigrazione(T, MANIFEST); store.registraMigrazione(T, MIGRAZIONE);
    store.importaTutto(nuovo);
    assert.deepEqual(leggi(prog(T)), prima, 'backup nuovo: nessuna seconda rinomina');
  });

  await check('backup vecchio prima di aprire la materia', async () => {
    const backup = JSON.stringify({ formato: 'iuris-backup', versione: 1, materie: { [T]: progressoAL(), [M]: progressoMartines() },
      preferenze: { materia: T }, sessioni: {}, altriDati: {} });
    await apri();
    store.registraMigrazione(T, MANIFEST);  // solo manifest: corso.json non ancora caricato
    store.importaTutto(backup);
    assert.equal(leggi(prog(T)).versioneContenuto, undefined, 'senza tabella si rimanda');
    assert(storage.getItem(prog(M)), 'nessun dato perso nell\'attesa');
    store.registraMigrazione(T, MIGRAZIONE);  // corso.json caricato
    const p = leggi(prog(T));
    assert.equal(p.versioneContenuto, 2);
    assert.equal(storage.getItem(prog(M)), null);
    assert(p.lezioni['u02-l3'] && p.lezioni['u05-l2'] && p.carte['u02-q501'] && p.carte['u05-q003'] && !p.lezioni['u17-l9'], 'rinominato e fuso al caricamento di corso.json');
  });

  await check('backup di sola Martines si somma ai progressi del dispositivo', async () => {
    const nuovo = { versione: 1, nuovePerGiorno: 35, versioneContenuto: 2, lezioni: { 'u10-l1': { studiata: '2026-11-05T10:00:00.000Z' } },
      carte: { 'u10-q001': carta(1, '2026-11-05T10:00:00.000Z') }, esiti: {}, giorni: {} };
    await apri({ [prog(T)]: nuovo });
    store.registraMigrazione(T, MANIFEST); store.registraMigrazione(T, MIGRAZIONE);
    store.importaTutto(JSON.stringify({ materia: M, esportato: '2026-11-01T10:00:00.000Z', progresso: progressoMartines() }));
    const p = leggi(prog(T));
    assert(p.lezioni['u10-l1'] && p.lezioni['u05-l2'] && p.carte['u10-q001'] && p.carte['u05-q003'], 'progressi sommati');
    assert.equal(storage.getItem(prog(M)), null);
  });

  await check('funzioni pure', () => {
    const a = { ...progressoMartines(), versioneContenuto: 2 };
    assert.deepEqual(mig.fondi(a, a), a, 'fondere con sé stessi non cambia nulla');
    assert.deepEqual(mig.fondi(mig.fondi(a, progressoMartines()), progressoMartines()), mig.fondi(a, progressoMartines()));
    assert.deepEqual(mig.descrizioneMigrazione(MIGRAZIONE), MANIFEST);
    assert(mig.migrazioneValida(MIGRAZIONE) && mig.migrazioneValida(MANIFEST));
    assert(!mig.migrazioneValida({ versione: 1, da: [] }) && !mig.migrazioneValida({ versione: 2, da: [{ materia: T, lezioni: [], domande: 'uguali' }] }));
  });

  console.log(`Migrazione dei progressi verificata: ${checks} controlli (A-L rinominato, Martines fuso, preferenza, idempotenza, rinvio senza tabella, backup vecchi).`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
