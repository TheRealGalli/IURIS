// Segni degli Originali sostituiti (lib/migrazione-segni.ts): segni finti su frasi reali dei documenti vecchi
// (Martines e Bin-Pitruzzella dalla storia git; gli appunti di Romano quando esiste `romano-iuris-v1`) devono cadere
// sulla frase giusta del testo nuovo, con tipo e colore conservati; idempotenza; backup vecchio ripristinato; misura
// della quota di frasi vecchie con corrispondenza sicura su un campione.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { documento } from './lib/mini-dom.mjs';
import { apriVersione } from './lib/originale-versione.mjs';

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, String(v)); }
  removeItem(k) { this.values.delete(k); }
  clear() { this.values.clear(); }
}
const root = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const storage = new MemoryStorage();
const salvati = {};
for (const k of ['localStorage', 'document', 'fetch']) salvati[k] = Object.getOwnPropertyDescriptor(globalThis, k);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'document', { configurable: true, value: { ...documento, addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' } });
let richieste = 0, reteGiu = false;
Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (url) => {
  richieste++;
  const file = `${root}public/${String(url).replace(/^\/+/, '')}`;
  if (reteGiu || !existsSync(file)) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(file, 'utf8')) };
} });

const T = 'diritto-costituzionale', M = 'diritto-costituzionale-martines';
const MT = 'costituzionale-martines-v1', BP = 'costituzionale-bin-pitruzzella-v1', IU = 'costituzionale-iuris-v1';
const prog = (s) => `iuris:v1:prog:${s}`;
const leggi = (k) => JSON.parse(storage.getItem(k) ?? 'null');

// Casi controllati a mano: frase vecchia (pezzo unico nel testo vecchio) → parole che la frase nuova deve contenere.
// `pdf`: segno del vecchio lettore PDF (solo testo e pagina); `parte`: solo un tratto della frase; `due`: anche la
// frase dopo; `ricollocare`: contenuto che il testo nuovo non ha (o non con sicurezza).
const CASI = [
  // Martines: nomi, numeri, date
  { doc: MT, cerca: 'almeno 21 giudici,dei quali', atteso: 'con gli aggregati in maggioranza' },
  { doc: MT, cerca: 'Nei giudizi sulle accuse,il Collegio', atteso: "Nei giudizi d'accusa il collegio" },
  { doc: MT, cerca: 'a Roma, nel 2004 un trattato istitutivo', atteso: 'Nel 2004 i rappresentanti' },
  { doc: MT, cerca: 'nella Repubblica popolare cinese,nella Corea del Nord', atteso: 'Corea del Nord' },
  { doc: MT, cerca: 'sentenze dei tribunali militari in tempo di guerra', atteso: 'tribunali militari' },
  { doc: MT, cerca: 'a norma degli art.19 e seguenti del T.U.del 2000', atteso: 'artt. 19 e seguenti del TUEL' },
  { doc: MT, cerca: 'i pubblici impiegati sono al servizio esclusivo della Nazione', atteso: 'al servizio esclusivo della Nazione' },
  { doc: MT, cerca: 'per l’ammissione ai pubblici uffici e alle cariche elettive, parificare', atteso: "L'art. 51 Cost." },
  { doc: MT, cerca: 'di far eleggere direttamente dal popolo il Presidente della Repubblica', atteso: 'eleggere il Presidente direttamente dal popolo' },
  { doc: MT, cerca: 'dettando una disciplina diretta a tutelare i diritti del lavoratore', atteso: 'Statuto dei lavoratori' },
  { doc: MT, cerca: 'opinio iuris ac necessitatis, la norma consuetudinaria non esiste', atteso: 'la norma consuetudinaria non esiste' },
  { doc: MT, cerca: 'le confessioni religiose, la famiglia, la scuola, la comunità del lavoro', atteso: 'i partiti politici' },
  // Martines: frasi generiche
  { doc: MT, cerca: 'Essenza del diritto, a differenza delle altre regole sociali', atteso: 'il diritto ha come essenza' },
  { doc: MT, cerca: 'deve essere “adeguatamente motivata”', atteso: 'adeguatamente motivata' },
  { doc: MT, cerca: 'Sono regole sociali, ma presuppongono l’esistenza del gruppo', atteso: 'presuppongon' },
  { doc: MT, cerca: 'Dagli atti complessi, bisogna distinguere quelli collettivi', atteso: 'atti collettivi' },
  { doc: MT, cerca: 'Da qui la necessità di risalire dalle norme alla istituzione', atteso: "risalire dalle norme all'istituzione" },
  { doc: MT, cerca: 'Spetta quindi al Presidente assicurare il corretto svolgersi dei lavori', atteso: 'toglie la parola' },
  // Martines: tratto di frase, segno PDF, due frasi
  { doc: MT, cerca: 'è la fonte delle fonti', parte: 'fonte delle fonti', atteso: 'fonte delle fonti', esatto: true },
  { doc: MT, cerca: 'almeno 21 giudici,dei quali', pdf: true, atteso: 'con gli aggregati in maggioranza' },
  { doc: MT, cerca: 'Essenza del diritto, a differenza delle altre regole sociali', pdf: true, atteso: 'il diritto ha come essenza' },
  { doc: MT, cerca: 'Resta pertanto esclusa nel nostro sistema l’impugnativa diretta', atteso: 'ricorso diretto' },
  { doc: MT, cerca: 'Essenza del diritto, a differenza delle altre regole sociali', due: true, atteso: 'il diritto ha come essenza' },
  // Bin-Pitruzzella (per lezione)
  { doc: BP, cerca: 'concernenti lo Statuto speciale per il Trentino-Alto Adige', atteso: 'Trentino-Alto Adige' },
  { doc: BP, cerca: 'I giudici ordinari amministrano la giustizia civile e penale', atteso: 'organi giudicanti e organi requirenti' },
  { doc: BP, cerca: 'Ne fanno parte di diritto il primo presidente e il procuratore generale', atteso: 'primo presidente e il procuratore generale' },
  { doc: BP, cerca: 'I loro rapporti con lo Stato sono regolati per legge sulla base di intese', atteso: 'sulla base di intese' },
  { doc: BP, cerca: 'Ogni processo si svolge nel contraddittorio tra le parti', atteso: 'Ogni processo si svolge nel contraddittorio', esatto: true },
  { doc: BP, cerca: 'promuovere l\'azione disciplinare davanti all\'apposita sezione disciplinare', atteso: 'azione disciplinare' },
  { doc: BP, cerca: 'sono la cifra elettorale di ciascuna lista', atteso: '466', facoltativo: true },
  { doc: BP, cerca: 'Ciò che distingue l\'ipotesi di effetti diretti dall\'ipotesi Francovich', ricollocare: true },
  { doc: BP, cerca: 'questa non è Nutella', ricollocare: true },
];

let server, store, ms, al;
const checks = [];
async function check(nome, fn) { await fn(); checks.push(nome); }
const pausa = () => new Promise((r) => setTimeout(r, 0));

try {
  server = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  const md = await server.ssrLoadModule('/src/lib/md.ts');
  al = await server.ssrLoadModule('/src/lib/allineamento.ts');
  store = await server.ssrLoadModule('/src/lib/store.ts');
  ms = await server.ssrLoadModule('/src/lib/migrazione-segni.ts');
  const catalogo = JSON.parse(readFileSync(`${root}src/lib/letture-catalogo.json`, 'utf8'));
  const versioni = new Map();
  const versione = (id) => { if (!versioni.has(id)) versioni.set(id, apriVersione(id, { md, frasiDi: al.frasiDi })); return versioni.get(id); };

  /** Segno finto sul documento vecchio, come lo salvava il lettore (ancore sul textContent) o il lettore PDF. */
  let n = 0;
  function segnoSu(caso) {
    const { blocchi } = versione(caso.doc);
    const trovati = blocchi.filter((b) => b.testo.includes(caso.cerca));
    assert.equal(trovati.length, 1, `${caso.doc}: «${caso.cerca}» deve comparire una volta nel testo vecchio (${trovati.length})`);
    const b = trovati[0], pos = b.testo.indexOf(caso.cerca);
    let [i, f] = b.frasi.find(([a, z]) => a <= pos && pos < z);
    if (caso.due) { const k = b.frasi.findIndex(([a]) => a === i); if (b.frasi[k + 1]) f = b.frasi[k + 1][1]; }
    if (caso.parte) { i = b.testo.indexOf(caso.parte, pos); f = i + caso.parte.length; }
    const testo = b.testo.slice(i, f);
    const tipo = n % 2 ? 'sottolineato' : 'evidenziato', colore = ['giallo', 'verde', 'rosa', 'azzurro', 'viola', 'arancio'][n % 6];
    const id = `s${++n}`;
    const base = { id, pagina: b.pagina, testo, tipo, colore, creata: `2026-10-${String(1 + n % 28).padStart(2, '0')}T10:00:00.000Z` };
    if (caso.pdf) return { ...base, rettangoli: [{ x: 0.1, y: 0.2, w: 0.5, h: 0.02 }] };
    return { ...base, rettangoli: [], ancoreTesto: [{ edizione: 1, blocco: b.id, inizio: i, fine: f, citazione: testo, prefisso: b.testo.slice(Math.max(0, i - 40), i), suffisso: b.testo.slice(f, f + 40) }] };
  }
  const normale = (s) => s.normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').toLowerCase();

  // Testo nuovo come lo calcola l'app (per controllare le ancore create).
  const nuovo = versione(IU);
  const testoNuovo = new Map(nuovo.blocchi.map((b) => [b.id, b]));

  // ---------- 1. casi a mano ----------
  const casi = CASI.map((c) => ({ ...c, segno: segnoSu(c) }));
  const progressoVecchio = (doc) => ({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
    originali: { [doc]: { pagina: 12, segni: casi.filter((c) => c.doc === doc).map((c) => c.segno) } } });
  const MIGRAZIONE = JSON.parse(readFileSync(`${repo}Diritto Costituzionale/05 - Contenuti/migrazione.json`, 'utf8'));

  storage.clear();
  storage.setItem(prog(T), JSON.stringify({ ...progressoVecchio(BP), versioneContenuto: 2,
    originali: { ...progressoVecchio(BP).originali, ...progressoVecchio(MT).originali } }));
  const res = await ms.migraSegniOriginali(T);
  const p = leggi(prog(T)), lettura = p.originali[IU];
  let giusti = 0, esatti = 0;
  const righe = [];
  await check('casi a mano', async () => {
    assert(lettura, 'lettura del documento nuovo creata');
    const perId = new Map(lettura.segni.map((s) => [s.id, s]));
    for (const c of casi) {
      const sigla = c.doc === MT ? 'mt' : 'bp';
      const s = perId.get(`${sigla}-${c.segno.id}`);
      assert(s, `${c.cerca}: segno nuovo presente`);
      assert.equal(s.tipo, c.segno.tipo); assert.equal(s.colore, c.segno.colore); assert.equal(s.creata, c.segno.creata);
      assert(s.ancoreTesto?.length, 'segno sul testo');
      const ricollocato = s.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`));
      if (c.ricollocare) {
        assert(ricollocato, `${c.cerca}: atteso «da ricollocare»`);
        assert.equal(s.ancoreTesto[0].citazione, c.segno.ancoreTesto?.[0]?.citazione ?? c.segno.testo, 'la citazione vecchia resta');
        righe.push(`ricollocato · ${c.cerca.slice(0, 40)}`); giusti++; continue;
      }
      if (ricollocato && c.facoltativo) { righe.push(`(facoltativo, ricollocato) · ${c.cerca.slice(0, 40)}`); giusti++; continue; }
      assert(!ricollocato, `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
      for (const a of s.ancoreTesto) {
        const b = testoNuovo.get(a.blocco);
        assert(b, `${a.blocco} esiste nel testo nuovo`);
        assert.equal(b.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
      }
      const citazione = s.ancoreTesto.map((a) => a.citazione).join(' ');
      assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
      if (c.esatto) { assert.equal(s.ancoreTesto.length, 1); assert(normale(s.ancoreTesto[0].citazione) === normale(c.segno.testo), `solo il tratto: «${s.ancoreTesto[0].citazione}»`); esatti++; }
      if (c.doc === MT) assert(Math.abs(s.pagina - c.segno.pagina) <= 2, 'Martines: stessa pagina (±2)');
      righe.push(`p. ${c.segno.pagina} → p. ${s.pagina} · ${citazione.slice(0, 70)}`); giusti++;
    }
    assert.equal(giusti, casi.length);
    // il resoconto conta tutti i segni
    const tot = res.reduce((x, r) => x + r.migrati + r.ricollocare + r.persi, 0);
    assert.equal(tot, casi.length);
  });

  // ---------- 2. idempotenza e dati vecchi conservati ----------
  await check('idempotenza', async () => {
    const prima = storage.getItem(prog(T));
    await ms.migraSegniOriginali(T);
    assert.equal(storage.getItem(prog(T)), prima, 'seconda esecuzione: nulla cambia');
    const q = leggi(prog(T));
    assert.equal(q.originali[MT].segni.length, casi.filter((c) => c.doc === MT).length, 'segni vecchi Martines conservati');
    assert.equal(q.originali[BP].segni.length, casi.filter((c) => c.doc === BP).length, 'segni vecchi A-L conservati');
    // Un segno migrato cancellato da chi studia non torna.
    const via = q.originali[IU].segni[0].id;
    q.originali[IU].segni = q.originali[IU].segni.slice(1);
    storage.setItem(prog(T), JSON.stringify(q));
    await apriDiNuovo();
    await ms.migraSegniOriginali(T);
    assert(!leggi(prog(T)).originali[IU].segni.some((s) => s.id === via), 'segno cancellato non ricreato');
    // Annulla non toglie i segni migrati: la cronologia è fissata.
    assert.deepEqual(leggi(prog(T)).originali[IU].storiaSegni, { indietro: [], avanti: [] });
  });

  // ---------- 3. senza tabella o con testo nuovo cambiato: si rimanda ----------
  await check('rinvio senza rete', async () => {
    storage.clear();
    storage.setItem(prog(T), JSON.stringify({ ...progressoVecchio(MT), versioneContenuto: 2 }));
    await apriDiNuovo();
    reteGiu = true;
    await ms.migraSegniOriginali(T);
    reteGiu = false;
    assert.equal(leggi(prog(T)).originali[IU], undefined, 'senza tabella nulla cambia');
    await ms.migraSegniOriginali(T);
    assert(leggi(prog(T)).originali[IU]?.segni.length, 'con la tabella i segni arrivano');
  });

  // ---------- 4. backup vecchio (prima della materia unica) ripristinato ----------
  await check('backup vecchio', async () => {
    storage.clear();
    await apriDiNuovo();
    store.dopoOgniMigrazione(() => { void ms.migraSegniOriginali(); });
    store.registraMigrazione(T, MIGRAZIONE);
    const backup = JSON.stringify({ formato: 'iuris-backup', versione: 1, esportato: '2026-11-01T10:00:00.000Z',
      materie: { [T]: progressoVecchio(BP), [M]: progressoVecchio(MT) }, preferenze: { materia: T }, sessioni: {}, altriDati: {} });
    store.importaTutto(backup);
    await pausa();
    await ms.migraSegniOriginali();
    const q = leggi(prog(T));
    assert.equal(storage.getItem(prog(M)), null, 'Martines fuso nella materia unica');
    assert.equal(q.originali[IU].segni.length, casi.length, 'tutti i segni (A-L e Martines) sul testo nuovo');
    assert.equal(Object.keys(q.originali[IU].segniMigrati).length, 2);
    // Il backup nuovo si ripristina e si convalida (campo segniMigrati compreso), senza doppioni.
    const nuovoBackup = store.esportaTutto();
    store.importaTutto(nuovoBackup);
    await pausa(); await ms.migraSegniOriginali();
    assert.equal(leggi(prog(T)).originali[IU].segni.length, casi.length, 'nessun doppione');
  });

  // ---------- 5. precisione su un campione ----------
  const misure = [];
  async function campione(vecchio, nuovoId, sigla, quante = 300) {
    const doc = catalogo.find((d) => d.id === nuovoId);
    const t = JSON.parse(readFileSync(`${root}public/letture/${nuovoId}/allineamento-${vecchio}.json`, 'utf8'));
    assert.equal(t.fonteNuovo, doc.fonteSha256, `${vecchio}: tabella fatta sul testo nuovo attuale`);
    const tab = ms.preparaTabella(t);
    const nv = versione(nuovoId), testi = new Map(nv.blocchi.map((b) => [b.id, { id: b.id, pagina: b.pagina, testo: b.testo }]));
    const frasi = versione(vecchio).blocchi.flatMap((b) => b.frasi.map(([i, f]) => ({ b, i, f })))
      .filter((x) => al.parolePiene(x.b.testo.slice(x.i, x.f)).length >= 5);
    let seme = 7; const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;
    const scelte = [...frasi].sort(() => caso() - 0.5).slice(0, quante);
    let migrati = 0, ricollocare = 0, vicine = 0;
    for (const x of scelte) {
      const testo = x.b.testo.slice(x.i, x.f);
      const s = { id: 'c', pagina: x.b.pagina, testo, tipo: 'evidenziato', colore: 'giallo', creata: '2026-10-01T10:00:00.000Z', rettangoli: [],
        ancoreTesto: [{ edizione: 1, blocco: x.b.id, inizio: x.i, fine: x.f, citazione: testo, prefisso: '', suffisso: '' }] };
      const e = ms.migraSegno(s, tab, testi, doc.edizione, sigla, doc.pagine);
      if (e.stato === 'migrato') { migrati++; if (Math.abs(e.segno.pagina - x.b.pagina) <= 2) vicine++; } else if (e.stato === 'ricollocare') ricollocare++;
    }
    misure.push({ vecchio, n: scelte.length, migrati, ricollocare, vicine });
    return { migrati, n: scelte.length };
  }
  await check('campione Martines', async () => { const r = await campione(MT, IU, 'mt'); assert(r.migrati / r.n >= 0.85, `Martines: ${r.migrati}/${r.n}`); });
  await check('campione Bin-Pitruzzella', async () => { const r = await campione(BP, IU, 'bp'); assert(r.migrati / r.n >= 0.08, `Bin-Pitruzzella: ${r.migrati}/${r.n}`); });

  // ---------- 6. Romano, quando c'è il testo nuovo ----------
  const RV = 'romano-pennacchio-2021-22-v1', RN = 'romano-iuris-v1';
  if (catalogo.some((d) => d.id === RN)) {
    await check('Romano', async () => {
      assert(existsSync(`${root}public/letture/${RN}/allineamento-${RV}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${RV} ${RN}`);
      const r = await campione(RV, RN, 'rp', 200);
      assert(r.migrati / r.n >= 0.7, `Romano: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      // giro completo nello store con segni veri degli appunti
      const vecchi = versione(RV).blocchi.filter((b) => b.frasi.length).filter((_, i) => i % 97 === 3).slice(0, 12);
      const segni = vecchi.map((b, i) => { const [a, z] = b.frasi[0]; const testo = b.testo.slice(a, z);
        return { id: `r${i}`, pagina: b.pagina, testo, tipo: 'evidenziato', colore: 'verde', creata: '2026-10-01T10:00:00.000Z', rettangoli: [],
          ancoreTesto: [{ edizione: 1, blocco: b.id, inizio: a, fine: z, citazione: testo, prefisso: '', suffisso: '' }] }; });
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog('diritto-romano'), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {}, originali: { [RV]: { pagina: 1, segni } } }));
      await ms.migraSegniOriginali('diritto-romano');
      const q = leggi(prog('diritto-romano'));
      assert.equal(q.originali[RN]?.segni.length, segni.length);
      assert(q.originali[RN].segni.every((s) => s.colore === 'verde' && s.tipo === 'evidenziato'));
      const prima = JSON.stringify(q); await ms.migraSegniOriginali('diritto-romano');
      assert.equal(storage.getItem(prog('diritto-romano')), prima, 'Romano: idempotente');
    });
  }

  for (const r of righe) console.log(`  ${r}`);
  for (const m of misure) console.log(`  campione ${m.vecchio}: ${m.migrati}/${m.n} frasi con corrispondenza sicura (${(100 * m.migrati / m.n).toFixed(1)}%), ${m.ricollocare} da ricollocare; ${m.vicine} entro 2 pagine`);
  console.log(`Segni degli Originali migrati: ${checks.length} controlli, ${giusti} casi a mano (${esatti} sul tratto esatto)${catalogo.some((d) => d.id === RN) ? ', Romano compreso' : ' (Romano: in attesa di romano-iuris-v1)'}.`);
} finally {
  await server?.close();
  for (const [k, d] of Object.entries(salvati)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; }
}

/** Nuova «apertura» dell'app: moduli ricaricati, così la memoria dello store riparte dall'archivio. */
async function apriDiNuovo() {
  const nuovo = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  await server.close();
  server = nuovo;
  store = await server.ssrLoadModule('/src/lib/store.ts');
  ms = await server.ssrLoadModule('/src/lib/migrazione-segni.ts');
}
