// Corsi di studio: configurazione coerente col manifest, corso predefinito per i dati già esistenti, scelta nei backup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
let server, store, corsi, backup;
const start = async () => {
  await server?.close();
  server = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  store = await server.ssrLoadModule('/src/lib/store.ts');
  corsi = await server.ssrLoadModule('/src/data/corsi.ts');
  backup = await server.ssrLoadModule('/src/lib/backup-dati.ts');
};
let checks = 0;
const check = async (nome, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

try {
  await start();
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/content/manifest.json', import.meta.url), 'utf8'));
  const slugs = manifest.materie.map((m) => m.slug);
  const { CORSI, CORSO_PREDEFINITO, corsoDi, materieDelCorso, descriviCorso } = corsi;

  await check('configurazione', () => {
    assert(CORSI.length >= 1, 'serve almeno un corso');
    assert.equal(new Set(CORSI.map((c) => c.id)).size, CORSI.length, 'id dei corsi duplicati');
    for (const c of CORSI) {
      assert(backup.slugBackupValido(c.id), `id non valido per i backup: ${c.id}`);
      assert(c.breve && c.breve.length <= 24, `etichetta assente o troppo lunga per il riquadro: ${c.breve}`);
      assert(c.universita && c.laurea && Number.isInteger(c.anno) && c.anno >= 1, `dati del corso incompleti: ${c.id}`);
      assert(c.materie.length > 0 && new Set(c.materie).size === c.materie.length, `materie vuote o ripetute: ${c.id}`);
      for (const s of c.materie) assert(slugs.includes(s), `${c.id}: materia assente dal manifest: ${s}`);
      assert(descriviCorso(c).includes(c.universita));
    }
    for (const s of slugs) assert(CORSI.some((c) => c.materie.includes(s)), `materia senza corso, resterebbe invisibile: ${s}`);
  });

  await check('corso attuale', () => {
    const c = corsoDi('uniba-lmg-1-al');
    assert.equal(c.breve, 'LMG · I anno · A-L');
    assert.deepEqual(c.materie, ['filosofia-del-diritto', 'diritto-romano']);
    assert.equal(CORSO_PREDEFINITO.id, c.id, 'i dati esistenti devono ricadere in questo corso');
  });

  await check('dati precedenti e corso sconosciuto', () => {
    assert.equal(corsoDi(undefined), CORSO_PREDEFINITO);
    assert.equal(corsoDi('corso-tolto'), CORSO_PREDEFINITO);
    storage.values.set('iuris:v1:pref', JSON.stringify({ materia: 'diritto-romano', tema: 'scuro' }));
  });

  await start();
  await check('preferenze senza corso', () => {
    const p = store.leggiPref();
    assert.equal(p.corso, undefined);
    const c = corsoDi(p.corso);
    assert(c.materie.includes(p.materia), 'la materia aperta prima del selettore resta visibile');
  });

  await check('filtro per corso', () => {
    const finto = { id: 'prova', breve: 'Prova', universita: 'U', laurea: 'L', anno: 2, materie: ['diritto-romano', 'non-esiste'] };
    assert.deepEqual(materieDelCorso(finto, manifest.materie).map((m) => m.slug), ['diritto-romano']);
    assert.deepEqual(materieDelCorso(CORSO_PREDEFINITO, [...manifest.materie].reverse()).map((m) => m.slug), CORSO_PREDEFINITO.materie);
  });

  await check('scelta salvata e nel backup', async () => {
    store.scriviPref({ corso: CORSO_PREDEFINITO.id });
    assert.equal(JSON.parse(storage.getItem('iuris:v1:pref')).corso, CORSO_PREDEFINITO.id);
    const file = store.esportaTutto();
    assert.equal(JSON.parse(file).preferenze.corso, CORSO_PREDEFINITO.id);
    storage.values.clear(); await start();
    assert.equal(store.leggiPref().corso, undefined);
    store.importaTutto(file);
    assert.equal(store.leggiPref().corso, CORSO_PREDEFINITO.id);
    const rotto = JSON.parse(file); rotto.preferenze.corso = 'Corso Non Valido!';
    assert.throws(() => store.importaTutto(JSON.stringify(rotto)), /preferenze/);
    assert.equal(store.leggiPref().corso, CORSO_PREDEFINITO.id, 'un backup respinto non cambia il corso');
  });

  await check('riquadro sopra le Materie', () => {
    const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    const i = app.indexOf('<SceltaCorso corso={corso} />'), j = app.indexOf('<div className="nav-label">Materie</div>');
    assert(i > 0 && j > i, 'il selettore deve stare sopra la sezione Materie');
    assert(!/manifest\.materie\.map/.test(app), 'barra laterale e menu mobile devono mostrare solo le materie del corso');
    assert(app.includes('<SceltaCorso corso={corso} classe="corso-switch-pagina" />'), 'su mobile il corso si sceglie da Altro');
  });

  console.log(`Corsi verificati: ${checks} controlli su configurazione, corso predefinito, filtro delle materie e backup (${CORSI.length} ${CORSI.length === 1 ? 'corso' : 'corsi'}).`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
