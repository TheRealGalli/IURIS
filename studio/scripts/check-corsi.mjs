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

  // Tracce d'esame (esame.json): le fonti indicano corsi veri che hanno quella materia, così ogni classe vede
  // prima le tracce del proprio docente e le altre come «di un'altra classe».
  let fontiEsame = 0;
  await check('tracce d\'esame e corsi', async () => {
    const { domandeEsame, delCorso } = await server.ssrLoadModule('/src/lib/esame.ts');
    const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
    for (const m of manifest.materie) {
      const dati = JSON.parse(fs.readFileSync(new URL(`../public/content/${m.slug}/corso.json`, import.meta.url), 'utf8'));
      if (!dati.esame) continue;
      const idx = indicizza(dati);
      for (const f of dati.esame.fonti) {
        fontiEsame++;
        assert(f.corsi.length > 0, `${m.slug}: la fonte ${f.id} non indica nessun corso`);
        for (const id of f.corsi) {
          const c = CORSI.find((x) => x.id === id);
          assert(c, `${m.slug}: la fonte ${f.id} cita il corso inesistente ${id}`);
          assert(c.materie.includes(m.slug), `${m.slug}: la fonte ${f.id} vale per ${id}, che non ha questa materia`);
          assert(domandeEsame(idx, id).mie.length > 0, `${m.slug}: nessuna domanda d'esame di ${f.docente} per ${id}`);
        }
      }
      for (const c of CORSI.filter((x) => x.materie.includes(m.slug))) {
        const { mie, altre } = domandeEsame(idx, c.id);
        const mieFonti = dati.esame.fonti.filter((f) => delCorso(f, c.id));
        assert.equal(mie.length > 0, mieFonti.length > 0, `${m.slug}/${c.id}: domande del docente del corso incoerenti con le fonti`);
        assert(!mie.some((q) => altre.includes(q)), `${m.slug}/${c.id}: una domanda non può essere sia del corso sia di un'altra classe`);
      }
    }
    const allena = fs.readFileSync(new URL('../src/views/Allena.tsx', import.meta.url), 'utf8');
    assert(allena.includes("k: 'docenti', t: 'Domande d\\'esame'") && allena.includes('esame.mie') && allena.includes('esame.altre'), 'Allenamento: filtro «Domande d\'esame», prima il docente del corso scelto');
    const comp = fs.readFileSync(new URL('../src/components/Esame.tsx', import.meta.url), 'utf8');
    assert(comp.includes("Chiesta all'esame (") && comp.includes("di un'altra classe"), 'badge «Chiesta all\'esame (prof. X)» e tracce «di un\'altra classe»');
  });

  await check('corso attuale', () => {
    const c = corsoDi('uniba-lmg-1-al');
    assert.equal(c.breve, 'LMG · I anno · A-L'); assert.equal(c.sigla, 'LMG · I anno'); assert.equal(c.lettere, 'A-L');
    assert.deepEqual(CORSI.map((x) => x.breve), ['LMG · I anno · A-L', 'LMG · I anno · M-Z', 'SSG · I anno']);
    assert.deepEqual(c.inArrivo.map((m) => m.nome), ['Istituzioni di diritto romano', 'Storia del diritto italiano']);
    assert.deepEqual(c.docenti, { 'filosofia-del-diritto': 'Antonio Incampo', 'diritto-romano': 'S.R. Alessandrì', 'diritto-costituzionale': 'A. Torre', 'diritto-privato': 'Michele Lobuono' });
    for (const x of CORSI) for (const s of Object.keys(x.docenti ?? {})) assert(x.materie.includes(s), `${x.id}: docente per una materia che il corso non ha: ${s}`);
    assert.deepEqual(c.materie, ['filosofia-del-diritto', 'diritto-romano', 'diritto-costituzionale', 'diritto-privato']);
    assert.equal(CORSO_PREDEFINITO.id, c.id, 'i dati esistenti devono ricadere in questo corso');
  });

  await check('dati precedenti e corso sconosciuto', async () => {
    assert.equal(corsoDi(undefined), CORSO_PREDEFINITO);
    assert.equal(corsoDi('corso-tolto'), CORSO_PREDEFINITO);
    assert(corsi.corsoDisponibile(CORSO_PREDEFINITO), 'il corso predefinito deve essere selezionabile');
    assert.deepEqual(CORSI.filter(corsi.corsoDisponibile).map((c) => c.id), ['uniba-lmg-1-al', 'uniba-lmg-1-mz', 'uniba-ssg-1'], 'le tre classi sono selezionabili');
    const ssg = corsoDi('uniba-ssg-1');
    assert.equal(ssg.id, 'uniba-ssg-1', 'SSG salvato resta SSG');
    assert.deepEqual(ssg.materie, ['filosofia-del-diritto-ssg', 'diritto-romano', 'diritto-costituzionale', 'diritto-privato'], 'SSG: filosofia propria, costituzionale, romano e privato condivisi');
    assert.equal(corsi.docenteDi(ssg, 'diritto-costituzionale'), 'Andrea Bonomi', 'costituzionale condiviso, docente del corso');
    assert.deepEqual(ssg.inArrivo.map((m) => m.nome), ['Storia del diritto italiano', 'Abilità informatiche per giuristi', 'Lingua inglese'], 'SSG: le altre materie del primo anno, in arrivo');
    assert.equal(corsi.docenteDi(ssg, 'diritto-romano'), 'Pia Starace', 'romano condiviso, docente del corso');
    const mz = corsoDi('uniba-lmg-1-mz');
    assert.equal(mz.id, 'uniba-lmg-1-mz', 'M-Z salvato resta M-Z');
    assert.deepEqual(mz.materie, ['filosofia-del-diritto-mz', 'diritto-romano', 'diritto-costituzionale', 'diritto-privato'], 'M-Z: filosofia propria, costituzionale, romano e privato condivisi');
    assert.equal(corsi.docenteDi(mz, 'diritto-costituzionale'), 'R.G. Rodio');
    for (const x of CORSI) assert(!x.materie.includes('diritto-costituzionale-martines'), `${x.id}: la materia Martines è confluita in diritto-costituzionale`);
    const { attiDelCorso } = await server.ssrLoadModule('/src/lib/materie-corso.ts');
    for (const x of CORSI) assert.equal(attiDelCorso(x.materie).costituzione?.slug, 'diritto-costituzionale', `${x.id}: Costituzione nella materia comune`);
    assert.equal(corsi.docenteDi(mz, 'diritto-privato'), 'Mauro Pennasilico');
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
    assert(griglia.includes('aria-label={m.nome}') && griglia.includes('createPortal('), 'ogni icona conserva il nome accessibile della materia');
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
    assert(/\.materia-lista \{[^}]*max-height: calc\(var\(--materia-h\) \* 2/.test(css) && /overflow-y: auto/.test(css), 'quattro materie visibili, le altre si scorrono');
    assert(griglia.includes('className="materia-nome"') && griglia.includes('onFocus={(e) => indica(m.id, e.currentTarget)}'), 'nome della materia visibile al passaggio e anche da tastiera');
    assert(new Set(['Storia del diritto romano', 'Istituzioni di diritto romano', 'Storia del diritto italiano', 'Abilità informatiche per giuristi', 'Lingua inglese', 'Diritto privato', 'Diritto costituzionale', 'Filosofia del diritto'].map((n) => griglia.match(/if \(n\.includes\('([^']+)'\)\) return '([^']+)'/g).map((r) => r.match(/includes\('([^']+)'\)\) return '([^']+)'/)).find((m) => n.toLocaleLowerCase('it').includes(m[1]))?.[2])).size === 8, 'ogni materia ha un simbolo diverso');
  });

  console.log(`Corsi verificati: ${checks} controlli su configurazione, corso predefinito, filtro delle materie, tracce d'esame (${fontiEsame} fonti) e backup (${CORSI.length} ${CORSI.length === 1 ? 'corso' : 'corsi'}).`);
} finally {
  await server?.close();
  if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
}
