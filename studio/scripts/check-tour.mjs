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
  // Tappe: dall'inizio alla fine, senza menu per saltare; sul touch una tappa ponte prima di ogni cambio di sezione
  // dal Menu; sul telefono niente Mappa nel lettore; testi brevi per il touch; le funzioni assenti si saltano.
  const fs = await import('node:fs');
  const sorgente = fs.readFileSync(new URL('../src/components/Tour.tsx', import.meta.url), 'utf8');
  assert(!/<select/.test(sorgente), 'Il tour non deve avere il menu per scegliere la sezione');
  const { passiTour, MENU_TOUCH } = await server.ssrLoadModule('/src/lib/tour-passi.ts');
  const lezioni = [{ id: 'u01-l1', unita: 'u01', titolo: 'L', sintesi: 'Uguaglianza (art. 3 Cost.).' }, { id: 'u01-l2', unita: 'u01', titolo: 'M', sintesi: 'Niente' }];
  const finto = (extra = {}) => ({
    corso: { materia: { slug: 'filosofia-del-diritto', nome: 'Filosofia del diritto' }, concetti: [{ id: 'c1' }], domande: extra.esame ? [{ id: 'q', esame: ['f'] }] : [] },
    lezioni, lezioneById: new Map(lezioni.map((l) => [l.id, l])),
    traccePerLezione: new Map(extra.esame ? [['u01-l2', [{ id: 't', fonte: 'f' }]]] : []),
    schedeInverse: extra.inverse ? [{ id: 'i', inversa: 'c1' }] : [],
  });
  const atti = { costituzione: { slug: 'diritto-costituzionale', inCorso: true }, codice: { slug: 'diritto-privato', inCorso: true } };
  const pc = passiTour(finto({ esame: true, inverse: true }), { touch: false, telefono: false, atti });
  const tel = passiTour(finto({ esame: true, inverse: true }), { touch: true, telefono: true, atti });
  const ipad = passiTour(finto({ esame: true, inverse: true }), { touch: true, telefono: false, atti });
  for (const passi of [pc, tel, ipad]) assert.equal(new Set(passi.map((x) => x.id)).size, passi.length, 'id delle tappe ripetuti');
  for (const id of ['esame-lezione', 'esame-allena', 'inverse', 'citazione', 'articolo', 'personale']) assert(pc.some((x) => x.id === id), `manca la tappa ${id}`);
  assert(!pc.some((x) => x.ponte), 'tappe ponte sul PC');
  assert(pc.some((x) => x.id === 'mappa-lettura') && ipad.some((x) => x.id === 'mappa-lettura'), 'su PC e iPad resta la mappa nel lettore');
  assert(!tel.some((x) => x.id === 'mappa-lettura'), 'sul telefono la mappa non sta nel lettore');
  for (const passi of [tel, ipad]) passi.forEach((x, i) => {
    const prima = passi[i - 1];
    if (prima && !x.ponte && prima.sezione !== x.sezione && !x.dallaPagina) assert(false, `cambio di sezione senza tappa ponte prima di «${x.id}»`);
    if (x.ponte) assert(x.target === MENU_TOUCH && passi[i + 1]?.sezione === x.sezione, `tappa ponte ${x.id} non indica il Menu della sezione che segue`);
    const testo = x.touch ?? x.testo;
    assert(testo.length <= 170, `testo per il touch troppo lungo (${testo.length}) in «${x.id}»`);
    assert(((x.titoloTouch ?? x.titolo).length) <= 60, `titolo troppo lungo in «${x.id}»`);
  });
  // la materia attiva non cita articoli e non ha l'atto: la tappa porta nella materia della Costituzione
  const senza = finto(); senza.lezioni = lezioni.map((l) => ({ ...l, sintesi: 'nulla' }));
  const cit = passiTour(senza, { touch: false, telefono: false, atti }).find((x) => x.id === 'citazione');
  assert.equal(cit.materia, 'diritto-costituzionale');
  // funzioni assenti: le tappe si saltano
  const nude = passiTour(finto(), { touch: false, telefono: false, atti: {} });
  for (const id of ['esame-lezione', 'esame-allena', 'inverse']) assert(!nude.some((x) => x.id === id), `tappa ${id} senza la funzione`);
  assert.equal(nude.find((x) => x.id === 'citazione')?.materia, 'filosofia-del-diritto', 'la citazione resta nella materia che la contiene');
  console.log(`Tour verificato: scritture e quiz isolati, segni temporanei, preferenze e cache ripristinate, visite ripetibili; archivio personale invariato; ${pc.length} tappe su PC, ${tel.length} sul telefono (con le tappe ponte), nessun menu per saltare.`);
} finally { await server.close(); }
