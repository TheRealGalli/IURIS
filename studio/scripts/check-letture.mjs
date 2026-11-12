// Ancoraggi e archivio reali, su storage di prova: nessun progresso personale viene usato.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const values = new Map();
let pieno = false;
const storage = {
  get length() { return values.size; }, key: (i) => [...values.keys()][i] ?? null,
  getItem: (k) => values.get(k) ?? null,
  setItem(k, v) { if (pieno) throw new Error('QuotaExceededError'); values.set(k, String(v)); },
  removeItem: (k) => values.delete(k),
};
const originale = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
let server, lib, store, originali;
const start = async () => {
  await server?.close();
  server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  lib = await server.ssrLoadModule('/src/lib/letture.ts');
  store = await server.ssrLoadModule('/src/lib/store.ts');
  originali = await server.ssrLoadModule('/src/lib/originali.ts');
};
const vuoto = () => ({ versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: 25 });
const blocco = (testo, pagina = 1, id = `p${String(pagina).padStart(3, '0')}-b001`) => ({ id, pagina, testo, concetti: ['dovere-giuridico'] });
const legacy = (testo, pagina = 1) => ({ id: 'segno-pdf-preesistente', pagina, testo, rettangoli: [{ x: .12, y: .2, w: .6, h: .018 }], tipo: 'evidenziato', colore: 'giallo', creata: '2026-11-07T10:00:00Z' });
const read = (slug) => JSON.parse(store.esporta(slug)).progresso;
const deepFreeze = (v) => { if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); } return v; };
let checks = 0;
const check = async (name, fn) => { try { await fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; } };

try {
  await start();
  await check('Il segno PDF viene proiettato senza migrazione, copia o modifica', () => {
    const s = deepFreeze(legacy('A differenza delle altre scienze, la filosofia non possiede un contenuto determinato.'));
    const prima = structuredClone(s), b = blocco(s.testo);
    const p = lib.proiettaSegnoTesto(s, [b], 1, { da: 1, a: 3 });
    assert.equal(p.stato, 'proiettato'); assert.equal(p.origine, 'pdf'); assert.equal(p.ancore.length, 1);
    assert.equal(b.testo.slice(p.ancore[0].inizio, p.ancore[0].fine), s.testo);
    assert.deepEqual(s, prima);
  });
  await check('Whitespace, sillabazione PDF, soft hyphen e Unicode composto conservano gli offset DOM', () => {
    const b = blocco('Il dovere giuridico è una relazione.');
    const s = legacy('Il dovere  giuri-\ndico e\u0300 una\u00ad relazione.');
    const p = lib.proiettaSegnoTesto(s, [b], 1);
    assert.equal(p.stato, 'proiettato'); assert.equal(p.ancore[0].citazione, b.testo);
    assert.equal(p.ancore[0].fine, b.testo.length);
    const composito = blocco('La realtà e\u0300 complessa.');
    const q = lib.proiettaSegnoTesto(legacy('è complessa'), [composito], 1);
    assert.equal(q.stato, 'proiettato');
    assert.equal(composito.testo.slice(q.ancore[0].inizio, q.ancore[0].fine), 'e\u0300 complessa');
  });
  await check('Una citazione ripetuta resta da verificare, senza selezione arbitraria', () => {
    const p = lib.proiettaSegnoTesto(legacy('diritto'), [blocco('Il diritto incontra il diritto.')], 1);
    assert.equal(p.stato, 'da-verificare'); assert.deepEqual(p.ancore, []);
  });
  await check('La ricerca dei vecchi segni è limitata alla pagina candidata', () => {
    const b1 = blocco('Libertà e dovere.'), b2 = blocco('Libertà e dovere.', 2);
    const p = lib.proiettaSegnoTesto(legacy('Libertà', 2), [b1, b2], 1);
    assert.equal(p.stato, 'proiettato'); assert.equal(p.ancore[0].blocco, b2.id);
    assert.equal(lib.proiettaSegnoTesto(legacy('Libertà', 9), [b1, b2], 1, { da: 1, a: 3 }).stato, 'fuori-sezione');
  });
  await check('Una selezione PDF su più paragrafi produce ancore separate sulla stessa pagina', () => {
    const blocchi = [blocco('Prima parte.', 1, 'p001-b001'), blocco('Seconda parte.', 1, 'p001-b002')];
    const p = lib.proiettaSegnoTesto(legacy('Prima parte.\nSeconda parte.'), blocchi, 1);
    assert.equal(p.stato, 'proiettato'); assert.deepEqual(p.ancore.map((a) => a.citazione), ['Prima parte.', 'Seconda parte.']);
  });
  await check('Ancore testuali e contesto ritrovano una citazione dopo uno spostamento verificabile', () => {
    const b = blocco('Prima diritto uno. Seconda diritto due.');
    const i = b.testo.lastIndexOf('diritto'), ancora = lib.creaAncoraTesto(b, i, i + 7, 1);
    const segno = { ...legacy('diritto'), rettangoli: [], ancoreTesto: [ancora] };
    const p = lib.proiettaSegnoTesto(segno, [b], 1);
    assert.equal(p.stato, 'proiettato'); assert.equal(p.ancore[0].inizio, i);
    const nuovo = { ...b, testo: `Nota iniziale. ${b.testo}` };
    const q = lib.proiettaSegnoTesto(segno, [nuovo], 2);
    assert.equal(q.stato, 'proiettato'); assert.equal(q.ancore[0].inizio, nuovo.testo.lastIndexOf('diritto'));
  });
  await check('Testo rettificato o blocco mancante non spostano automaticamente un vecchio segno', () => {
    const b = blocco('Il diritto non è il dovere giuridico.');
    const ancora = lib.creaAncoraTesto(b, 0, b.testo.length, 1);
    const s = { ...legacy(b.testo), rettangoli: [], ancoreTesto: [ancora] };
    assert.equal(lib.proiettaSegnoTesto(s, [{ ...b, testo: 'Il diritto è il dovere giuridico.', testoFonte: b.testo }], 2).stato, 'da-verificare');
    assert.equal(lib.proiettaSegnoTesto(s, [{ ...b, id: 'p001-b002' }], 1).stato, 'da-verificare');
  });
  await check('Un a capo aggiunto dopo (elenco, freccia) non fa perdere il segno: stesse parole, solo impaginazione', () => {
    const b = blocco('Le fonti primarie: Sono quelle. - Parliamo per esempio di epigrafi. > Tutto quel materiale.');
    const i = b.testo.indexOf('- Parliamo'), ancora = lib.creaAncoraTesto(b, i, b.testo.indexOf('epigrafi.') + 9, 1);
    const s = { ...legacy(ancora.citazione), rettangoli: [], ancoreTesto: [ancora] };
    const nuovo = { ...b, testo: 'Le fonti primarie: Sono quelle.\nParliamo per esempio di epigrafi.\n\n→ Tutto quel materiale.' };
    const p = lib.proiettaSegnoTesto(s, [nuovo], 1);
    assert.equal(p.stato, 'proiettato'); assert.equal(p.ancore[0].citazione, 'Parliamo per esempio di epigrafi.');
    const doppio = { ...b, testo: 'Parliamo per esempio di epigrafi. Ancora: Parliamo per esempio di epigrafi.' };
    assert.equal(lib.proiettaSegnoTesto(s, [doppio], 1).stato, 'da-verificare', 'ambiguo: resta da verificare');
  });
  await check('Un punto numerato scritto in linea che diventa voce d’elenco (il numero esce dal testo) conserva il segno', () => {
    const b = blocco('3- Diritto comune: un corpo di dottrine. 4- Diritto romano come pandettistica: in Germania nel 18 sec. 5- Diritto romano come romanistico: studio storico.');
    const i = b.testo.indexOf('4- Diritto'), ancora = lib.creaAncoraTesto(b, i, b.testo.indexOf('18 sec.') + 7, 1);
    const s = { ...legacy(ancora.citazione), rettangoli: [], ancoreTesto: [ancora] };
    const nuovo = { ...b, testo: 'Diritto comune: un corpo di dottrine.\nDiritto romano come pandettistica: in Germania nel 18 sec.\nDiritto romano come romanistico: studio storico.' };
    const p = lib.proiettaSegnoTesto(s, [nuovo], 1);
    assert.equal(p.stato, 'proiettato'); assert.equal(p.ancore[0].citazione, 'Diritto romano come pandettistica: in Germania nel 18 sec.');
    // Blocco cambiato del tutto: la mappa cerca la citazione (o il suo tratto più lungo) in tutta la sezione.
    const altrove = { id: 'p001-b009', pagina: 1, testo: 'Premessa. Diritto romano come pandettistica: in Germania nel 18 sec. con altre parole.' };
    const r = lib.ritrovaNellaSezione(ancora.citazione, [nuovo, altrove].slice(1), 1);
    assert.equal(r[0].blocco, 'p001-b009');
    assert.equal(lib.ritrovaNellaSezione('parole che non ci sono da nessuna parte del testo', [nuovo], 1), null);
  });
  await check('Le parti di un segno in un’altra sezione restano conservate e vengono riconosciute', () => {
    const a = blocco('Prima pagina.', 1), b = blocco('Quarta pagina.', 4);
    const s = { ...legacy('Prima pagina. Quarta pagina.'), rettangoli: [], ancoreTesto: [lib.creaAncoraTesto(a, 0, a.testo.length, 1), lib.creaAncoraTesto(b, 0, b.testo.length, 1)] };
    const p = lib.proiettaSegnoTesto(s, [a], 1, { da: 1, a: 3 });
    assert.equal(p.stato, 'proiettato'); assert.equal(p.parziale, true); assert.equal(p.ancore.length, 1);
    const q = lib.proiettaSegnoTesto(s, [b], 1, { da: 4, a: 6 });
    assert.equal(q.stato, 'proiettato'); assert.equal(q.ancore[0].blocco, b.id);
  });
  await check('Pagina divisa fra due sezioni: il segno della prima è fuori sezione nella seconda, non da verificare', () => {
    const a = blocco('Fine della lezione precedente.', 6, 'p006-b003'), b = blocco('Inizio della lezione.', 6, 'p006-b014');
    const s = { ...legacy(a.testo, 6), rettangoli: [], ancoreTesto: [lib.creaAncoraTesto(a, 0, a.testo.length, 1)] };
    const altrove = (id) => id < 'p006-b014';
    assert.equal(lib.proiettaSegnoTesto(s, [b], 1, { da: 6, a: 7 }).stato, 'da-verificare', 'senza confini noti resta da verificare');
    assert.equal(lib.proiettaSegnoTesto(s, [b], 1, { da: 6, a: 7 }, altrove).stato, 'fuori-sezione');
    assert.equal(lib.proiettaSegniTesto([s], [a], 1, { da: 5, a: 6 }, (id) => id >= 'p006-b014')[0].stato, 'proiettato');
    // un blocco della sezione che manca davvero resta da verificare
    assert.equal(lib.proiettaSegnoTesto({ ...s, ancoreTesto: [{ ...s.ancoreTesto[0], blocco: 'p006-b020' }] }, [b], 1, { da: 6, a: 7 }, altrove).stato, 'da-verificare');
  });
  await check('Intersezione della gomma e concetti di contesto ignorano bordi e segni non risolti', () => {
    const b = blocco('Dovere giuridico e relazione.'), a = lib.creaAncoraTesto(b, 0, 15, 1);
    const s = { ...legacy(a.citazione), rettangoli: [], ancoreTesto: [a] };
    const pp = lib.proiettaSegniTesto([s, { ...legacy('assente'), id: 'da-verificare' }], [b], 1);
    assert.deepEqual(lib.idsSegniNellaSelezioneTesto(pp, [lib.creaAncoraTesto(b, 1, 5, 1)]), [s.id]);
    assert.deepEqual(lib.idsSegniNellaSelezioneTesto(pp, [lib.creaAncoraTesto(b, 15, 20, 1)]), []);
    assert.deepEqual(lib.concettiDelPassaggio(pp[0], [b]), ['dovere-giuridico']);
  });
  const doc = originali.originaliMateria('filosofia-del-diritto')[0], slug = doc.materia;
  const b = blocco('Il dovere giuridico è una relazione.');
  const ancora = lib.creaAncoraTesto(b, 3, 18, 1);
  const nuovoSegno = () => ({ pagina: 1, testo: ancora.citazione, tipo: 'sottolineato', colore: 'rosa', ancoreTesto: [structuredClone(ancora)] });
  let oldId, newId, prima;
  await check('Vecchi segni e nuove ancore condividono archivio e cronologia senza duplicati', () => {
    store.importa(slug, JSON.stringify(vuoto()));
    oldId = store.aggiungiSegnoOriginale(slug, doc, { ...legacy(b.testo), id: undefined, creata: undefined }).id;
    const pdf = structuredClone(read(slug).originali[doc.id].segni[0]);
    const input = nuovoSegno(); newId = store.aggiungiSegnoTestoOriginale(slug, doc, input).id;
    input.ancoreTesto[0].citazione = 'input modificato';
    store.salvaSezioneTestoOriginale(slug, doc, 'u01-l1', 'p001-b001');
    const lettura = read(slug).originali[doc.id];
    assert.equal(lettura.segni.length, 2); assert.deepEqual(lettura.segni[0], pdf);
    assert.equal(lettura.segni[1].ancoreTesto[0].citazione, ancora.citazione);
    assert.equal(lettura.sezioneTesto, 'u01-l1'); assert.equal(lettura.bloccoTesto, 'p001-b001'); assert.equal(lettura.segni[1].rettangoli.length, 0);
    prima = lettura;
  });
  await check('Il bookmark conserva il paragrafo nella stessa sezione e lo azzera cambiando sezione', () => {
    store.salvaSezioneTestoOriginale(slug, doc, 'u01-l1');
    assert.equal(read(slug).originali[doc.id].bloccoTesto, 'p001-b001');
    store.salvaSezioneTestoOriginale(slug, doc, 'u01-l2');
    assert.equal(read(slug).originali[doc.id].bloccoTesto, undefined);
    store.salvaSezioneTestoOriginale(slug, doc, 'u01-l1', 'p001-b001');
    assert.equal(read(slug).originali[doc.id].bloccoTesto, 'p001-b001');
  });
  await check('La gomma mista cancella PDF proiettati e segni HTML con un solo Undo', () => {
    assert.deepEqual(store.rimuoviSegniOriginali(slug, doc, [oldId, newId, newId]), { rimossi: 2, salvato: true });
    assert.equal(read(slug).originali[doc.id].segni.length, 0);
    assert.equal(store.annullaSegnoOriginale(slug, doc).eseguito, true);
    assert.deepEqual(read(slug).originali[doc.id].segni, prima.segni);
    assert.equal(store.ripristinaSegnoOriginale(slug, doc).eseguito, true);
    assert.equal(read(slug).originali[doc.id].segni.length, 0);
    assert.equal(read(slug).originali[doc.id].sezioneTesto, 'u01-l1');
    assert.equal(store.annullaSegnoOriginale(slug, doc).eseguito, true);
  });
  await check('Il backup totale conserva ancore, bookmark, segni PDF e gomma annullabile', async () => {
    store.rimuoviSegniOriginali(slug, doc, [oldId, newId]);
    const backup = store.esportaTutto();
    assert.equal(store.ispezionaBackup(backup).segni, 0);
    values.clear(); await start(); store.importaTutto(backup);
    assert.equal(store.annullaSegnoOriginale(slug, doc).eseguito, true);
    assert.deepEqual(read(slug).originali[doc.id].segni, prima.segni);
    assert.equal(read(slug).originali[doc.id].sezioneTesto, 'u01-l1');
    const atteso = read(slug); await start(); assert.deepEqual(read(slug), atteso);
  });
  await check('Ancore invalide e rettangoli vuoti senza ancore non entrano nell’archivio', () => {
    const prima = read(slug), json = store.esportaTutto(), disk = [...values];
    assert.throws(() => store.aggiungiSegnoTestoOriginale(slug, doc, { ...nuovoSegno(), ancoreTesto: [] }));
    assert.throws(() => store.aggiungiSegnoTestoOriginale(slug, doc, { ...nuovoSegno(), ancoreTesto: [{ ...ancora, fine: ancora.fine + 1 }] }));
    const bad = JSON.parse(json), l = bad.materie[slug].originali[doc.id];
    l.segni[1].ancoreTesto[0].citazione = 'non corrisponde';
    assert.throws(() => store.importaTutto(JSON.stringify(bad)));
    const vuoto = JSON.parse(json); vuoto.materie[slug].originali[doc.id].segni[0].rettangoli = [];
    assert.throws(() => store.importaTutto(JSON.stringify(vuoto)));
    assert.throws(() => store.salvaSezioneTestoOriginale(slug, doc, '../altra-sezione'));
    assert.deepEqual(read(slug), prima); assert.deepEqual([...values], disk);
  });
  await check('La cronologia importata confronta anche le ancore del testo', () => {
    const b = JSON.parse(store.esportaTutto()), l = b.materie[slug].originali[doc.id];
    const azione = l.storiaSegni.indietro.find((a) => a.tipo === 'aggiungi' && a.segno.id === newId);
    azione.segno.ancoreTesto[0].prefisso = 'contesto modificato';
    assert.throws(() => store.importaTutto(JSON.stringify(b)), /cronologia incoerente/);
  });
  await check('Quota piena conserva ancore recuperabili in memoria e segnala il mancato salvataggio', () => {
    const disk = values.get(`iuris:v1:prog:${slug}`);
    pieno = true;
    const esito = store.aggiungiSegnoTestoOriginale(slug, doc, nuovoSegno());
    assert.equal(esito.salvato, false); assert.equal(values.get(`iuris:v1:prog:${slug}`), disk);
    assert(JSON.parse(store.esportaTutto()).materie[slug].originali[doc.id].segni.some((s) => s.id === esito.id));
    pieno = false; assert.equal(store.salvaSezioneTestoOriginale(slug, doc, 'u01-l2'), true);
    assert.equal(JSON.parse(values.get(`iuris:v1:prog:${slug}`)).originali[doc.id].sezioneTesto, 'u01-l2');
  });
  await check('Studiata è un solo stato tra Percorso e Originali, anche per sezioni con più lezioni', () => {
    const materia = 'prova-studio', sezione = { lezione: 'u01-l1', lezioni: ['u01-l1', 'u01-l2'] };
    assert.deepEqual(lib.lezioniSezione(sezione), ['u01-l1', 'u01-l2']);
    store.segnaStudiata(materia, 'u01-l1', true);
    let stato = lib.statoStudioSezione(sezione, read(materia).lezioni);
    assert.equal(stato.studiata, false); assert.equal(stato.parziale, true);
    for (const id of stato.ids) store.segnaStudiata(materia, id, true);
    stato = lib.statoStudioSezione(sezione, read(materia).lezioni);
    assert.equal(stato.studiata, true); assert.deepEqual(Object.keys(read(materia).lezioni).sort(), ['u01-l1', 'u01-l2']);
    assert.equal(lib.statoStudioSezione({ lezione: 'u01-l1' }, read(materia).lezioni).studiata, true);
    store.segnaStudiata(materia, 'u01-l2', false);
    assert.equal(lib.statoStudioSezione(sezione, read(materia).lezioni).studiata, false);
    assert.equal(lib.statoStudioSezione({}, read(materia).lezioni).studiata, false);
    assert.deepEqual(lib.lezioniSezione({ lezione: 'u14-l1', soloTitolo: true }), []);
  });
  console.log(`Letture verificate: ${checks} scenari su proiezione conservativa, ancore, cronologia, backup e persistenza.`);
} finally {
  await server?.close();
  if (originale) Object.defineProperty(globalThis, 'localStorage', originale); else delete globalThis.localStorage;
}
