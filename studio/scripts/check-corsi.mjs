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
      assert(c.breve && c.breve.length <= 24, `etichetta assente o troppo lunga: ${c.breve}`);
      assert(c.sigla && c.sigla.length <= 16 && !c.breve.includes(c.universita), `sigla del riquadro assente o troppo lunga: ${c.id}`);
      if (c.lettere) assert(c.breve.endsWith(c.lettere) && !c.sigla.includes(c.lettere), `la classe va solo accanto alla sigla: ${c.id}`);
      for (const m of c.inArrivo ?? []) {
        assert(m.nome && /^#[0-9a-f]{6}$/i.test(m.colore), `materia in arrivo incompleta: ${c.id}`);
        // Il nome non deve coincidere con una materia vera dello stesso corso (attivata ma rimasta «in arrivo»);
        // un altro corso può annunciare una materia omonima con appunti propri (es. costituzionale SSG).
        const delCorso = manifest.materie.filter((x) => c.materie.includes(x.slug));
        assert(!delCorso.some((x) => x.nome === m.nome || x.breve === m.nome), `«${m.nome}» è già una materia vera di ${c.id}`);
      }
      const colori = [...manifest.materie.map((m) => m.colore), ...(c.inArrivo ?? []).map((m) => m.colore)].map((x) => x.toLowerCase());
      assert.equal(new Set(colori).size, colori.length, `colori delle materie ripetuti: ${c.id}`);
      const wa = new URL(corsi.linkMateriale(c));
      assert.equal(wa.origin + wa.pathname, 'https://wa.me/393925689596');
      assert.equal(wa.searchParams.get('text'), 'Ciao Carlo! Ho del materiale: ', 'messaggio WhatsApp precompilato diverso');
      assert(c.universita && c.laurea && Number.isInteger(c.anno) && c.anno >= 1, `dati del corso incompleti: ${c.id}`);
      assert(c.materie.length > 0 && new Set(c.materie).size === c.materie.length, `materie vuote o ripetute: ${c.id}`);
      for (const s of c.materie) assert(slugs.includes(s), `${c.id}: materia assente dal manifest: ${s}`);
      assert(descriviCorso(c).includes(c.universita));
    }
    for (const s of slugs) assert(CORSI.some((c) => c.materie.includes(s)), `materia senza corso, resterebbe invisibile: ${s}`);
  });

  await check('corso attuale', () => {
    const c = corsoDi('uniba-lmg-1-al');
    assert.equal(c.breve, 'LMG · I anno · A-L'); assert.equal(c.sigla, 'LMG · I anno'); assert.equal(c.lettere, 'A-L');
    assert.deepEqual(CORSI.map((x) => x.breve), ['LMG · I anno · A-L', 'LMG · I anno · M-Z', 'SSG · I anno']);
    assert.deepEqual(c.inArrivo.map((m) => m.nome), ['Diritto privato']);
    assert.deepEqual(c.materie, ['filosofia-del-diritto', 'diritto-romano', 'diritto-costituzionale']);
    assert.equal(CORSO_PREDEFINITO.id, c.id, 'i dati esistenti devono ricadere in questo corso');
  });

  await check('dati precedenti e corso sconosciuto', () => {
    assert.equal(corsoDi(undefined), CORSO_PREDEFINITO);
    assert.equal(corsoDi('corso-tolto'), CORSO_PREDEFINITO);
    assert(corsi.corsoDisponibile(CORSO_PREDEFINITO), 'il corso predefinito deve essere selezionabile');
    assert.deepEqual(CORSI.filter(corsi.corsoDisponibile).map((c) => c.id), ['uniba-lmg-1-al', 'uniba-ssg-1'], 'per ora sono selezionabili A-L e SSG');
    const ssg = corsoDi('uniba-ssg-1');
    assert.equal(ssg.id, 'uniba-ssg-1', 'SSG salvato resta SSG');
    assert.deepEqual(ssg.materie, ['filosofia-del-diritto-ssg', 'diritto-romano'], 'SSG: filosofia propria, romano condiviso con LMG');
    assert.deepEqual(ssg.inArrivo.map((m) => m.nome), ['Diritto costituzionale', 'Diritto privato'], 'SSG: costituzionale con appunti propri, in arrivo');
    for (const id of ['uniba-lmg-1-mz']) {
      assert(CORSI.some((c) => c.id === id), `${id} deve restare visibile nell'elenco`);
      assert.equal(corsoDi(id), CORSO_PREDEFINITO, `${id} salvato: si torna ad A-L`);
    }
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
    const griglia = fs.readFileSync(new URL('../src/components/GrigliaMaterie.tsx', import.meta.url), 'utf8');
    assert(griglia.includes('disabled={!m.pronta}'), 'le materie non pronte non devono essere cliccabili');
    assert(griglia.includes('aria-label={m.nome}') && griglia.includes('title={m.nome}'), 'ogni icona conserva il nome accessibile della materia');
    assert(app.includes('<GrigliaMaterie corso={corso}'), 'tutte le materie devono essere nella griglia');
    assert(app.includes("disabled={!corsoDisponibile(c)}") && app.includes("' · in arrivo'"), 'corsi in arrivo visibili ma non selezionabili');
    const piede = app.slice(app.indexOf('<div className="side-foot">'), app.indexOf('</aside>'));
    assert(!/Cerca|⌘K|setPalette/.test(piede), 'nella barra laterale non c\'è più il pulsante Cerca');
    assert(piede.indexOf('<InviaMateriale') >= 0 && piede.indexOf('<InviaMateriale') < piede.indexOf('Demo interattiva'), 'invito al materiale sopra la demo');
    assert(/target="_blank" rel="noopener noreferrer"/.test(app), 'il link WhatsApp si apre in una nuova scheda');
    assert(app.includes('<InviaMateriale corso={corso} classe="invia-materiale-pagina" />'), 'invito al materiale anche in Altro');
    assert(!/\{c\.universita\}<\/option>/.test(app), 'nell\'elenco dei corsi niente università');
    const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    assert(/\.materia-lista \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2,/.test(css), 'materie visibili in due colonne');
    assert(/\.materia-casella:focus-within \.materia-nome/.test(css), 'nome della materia visibile anche da tastiera');
  });

  console.log(`Corsi verificati: ${checks} controlli su configurazione, corso predefinito, filtro delle materie e backup (${CORSI.length} ${CORSI.length === 1 ? 'corso' : 'corsi'}).`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
