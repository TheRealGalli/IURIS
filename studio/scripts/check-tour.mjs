// Verifica l'isolamento reale del tour, inclusi cache, quota, sessioni e backup.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
try {
  const { ArchivioTemporaneo, archivio, inDemo } = await server.ssrLoadModule('/src/lib/archivio.ts');
  const disk = new ArchivioTemporaneo();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: disk });
  const store = await server.ssrLoadModule('/src/lib/store.ts');
  const srs = await server.ssrLoadModule('/src/lib/srs.ts');
  const { originaliMateria } = await server.ssrLoadModule('/src/lib/originali.ts');
  const snap = () => { const b = JSON.parse(store.esportaTutto()); delete b.esportato; return b; };
  const bytes = () => Array.from({ length: disk.length }, (_, i) => [disk.key(i), disk.getItem(disk.key(i))]);
  const doc = originaliMateria('diritto-romano')[0];
  store.scriviPref({ materia: 'diritto-romano', tema: 'scuro', voce: true });
  store.segnaStudiata('diritto-romano', 'personale', true, ['vera']);
  const q = { id: 'vera', tipo: 'flashcard', domanda: 'D', risposta: 'R', lezione: 'personale', unita: 'u1', livello: 'base' };
  archivio().setItem('iuris:v1:sessione:diritto-romano', JSON.stringify({ origine: 'modo=libero', quando: new Date().toISOString(), s: { titolo: 'Quiz personale', domande: [q], registra: true }, coda: [q], i: 0, voti: [] }));
  archivio().setItem('altra-app', 'non modificare');
  const reale = snap(), prima = bytes();
  store.iniziaDemo('filosofia-del-diritto');
  assert(inDemo()); assert.equal(store.leggiPref().materia, 'filosofia-del-diritto'); assert.equal(store.leggiPref().voce, false);
  assert.deepEqual(JSON.parse(store.esporta('diritto-romano')).progresso.lezioni, {});
  store.segnaStudiata('diritto-romano', 'dimostrativa', true, ['demo-q']);
  srs.registraRisposta('diritto-romano', 'demo-q', 3);
  store.aggiungiSegnoOriginale(doc.materia, doc, { pagina: 2, testo: 'solo nella visita', rettangoli: [{ x: .1, y: .1, w: .2, h: .1 }], tipo: 'evidenziato', colore: 'rosa' });
  archivio().setItem('iuris:v1:sessione:diritto-romano', 'quiz di prova');
  assert.equal(archivio().getItem('altra-app'), null);
  assert.deepEqual(bytes(), prima);
  store.finisciDemo();
  assert(!inDemo()); assert.equal(archivio(), disk); assert.deepEqual(snap(), reale); assert.deepEqual(bytes(), prima);
  // Cache in memoria non persistita: entrare nel tour non deve perderla.
  const setter = disk.setItem; disk.setItem = () => { throw new Error('quota'); };
  store.segnaStudiata('diritto-romano', 'solo-memoria', true, []); disk.setItem = setter;
  const conCache = snap();
  store.iniziaDemo('diritto-romano'); store.iniziaDemo('filosofia-del-diritto');
  assert.equal(store.leggiPref().materia, 'diritto-romano');
  store.scriviPref({ tema: 'chiaro' }); store.finisciDemo(); store.finisciDemo();
  assert.deepEqual(snap(), conCache); assert.equal(store.leggiPref().tema, 'scuro');
  // Ogni nuova visita parte senza i segni e i quiz della precedente.
  store.iniziaDemo('diritto-romano');
  assert.equal(archivio().getItem('iuris:v1:sessione:diritto-romano'), null);
  assert.equal(store.riepilogoBackup().segni, 0); store.finisciDemo();
  console.log('Tour verificato: scritture e quiz isolati, segni temporanei, preferenze e cache ripristinate, visite ripetibili; archivio personale invariato.');
} finally { await server.close(); }
