// Segni degli Originali sostituiti (lib/migrazione-segni.ts): segni finti su frasi reali dei documenti vecchi
// (Martines, Bin-Pitruzzella e la dispensa di privato dalla storia git; gli appunti di Romano e le integrazioni delle
// unità 14 e 15 quando esiste `romano-iuris-v1`; i riassunti di Barberis e Schauer di Filosofia M-Z quando esiste
// `filosofia-mz-iuris-v1`; sbobinature e riassunto di Incampo di Filosofia SSG quando esiste `filosofia-ssg-iuris-v1`;
// gli appunti di Incampo, Moro e Cotta di Filosofia A-L quando esiste `filosofia-al-iuris-v1`)
// devono cadere
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
  async function campione(vecchio, nuovoId, sigla, quante = 300, scostamento = 0) {
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
      if (e.stato === 'migrato') { migrati++; if (Math.abs(e.segno.pagina - x.b.pagina - scostamento) <= 2) vicine++; } else if (e.stato === 'ricollocare') ricollocare++;
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

  // ---------- 6b. Romano: integrazioni dal Percorso (unità 14 e 15) → pp. 224–235 del testo IURIS ----------
  // Allineamento per lezione (stessi id): la sezione vecchia N (lezione u14-l1 … u15-l6) è la pagina 223 + N.
  const RI = 'romano-manuale-integrazioni-v1';
  const CASI_INTEGRAZIONI = [
    { doc: RI, cerca: 'La continuità passa attraverso il rapporto', atteso: 'maestro–allievo' },
    { doc: RI, cerca: 'Il caso pratico si risolve con un argomento filosofico', atteso: "argomento filosofico sull'identità" },
    { doc: RI, cerca: 'Paolo aggiunge, citando Sabino', atteso: 'causae coniectio' },
    { doc: RI, cerca: 'per porre fine alle', atteso: 'toglie valore alle note di Paolo e Ulpiano' },
    { doc: RI, cerca: 'Vinse Crasso.', atteso: 'Vinse Crasso', esatto: true },
    { doc: RI, cerca: 'il rasoio taglia la gola dello schiavo', parte: 'il rasoio taglia la gola dello schiavo', atteso: 'il rasoio taglia la gola dello schiavo', esatto: true },
    { doc: RI, cerca: 'Per Gaio dunque lo', atteso: 'due fondamenti' },
    { doc: RI, cerca: 'La finzione non inganna nessuno', atteso: 'La finzione non inganna nessuno' },
    { doc: RI, cerca: 'Ne segue che non ogni deliberazione è legge', atteso: 'non ogni deliberazione è legge' },
    { doc: RI, cerca: 'agli animali è isolata nel pensiero antico', atteso: 'isolata' },
    { doc: RI, cerca: 'per natura è equo che nessuno si arricchisca', atteso: 'condictio indebiti', due: true },
  ];
  if (catalogo.some((d) => d.id === RN)) {
    await check('Romano, unità 14 e 15', async () => {
      assert(existsSync(`${root}public/letture/${RN}/allineamento-${RI}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${RI} ${RN} --stesse-lezioni --soglia 40`);
      assert(!catalogo.some((d) => d.id === RI), 'le integrazioni non sono più un Originale a sé');
      const r = await campione(RI, RN, 'ri', 200);
      assert(r.migrati / r.n >= 0.85, `Romano, unità 14 e 15: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      const nv = versione(RN), testi = new Map(nv.blocchi.map((b) => [b.id, b]));
      const casiR = CASI_INTEGRAZIONI.map((c) => ({ ...c, segno: segnoSu(c) }));
      // anche un segno sugli appunti vecchi nello stesso progresso: le due coppie convivono senza doppioni
      const appunti = versione(RV).blocchi.find((b) => b.frasi.length && b.pagina === 40);
      const [a0, z0] = appunti.frasi[0], t0 = appunti.testo.slice(a0, z0);
      const segnoAppunti = { id: 'a1', pagina: appunti.pagina, testo: t0, tipo: 'sottolineato', colore: 'azzurro', creata: '2026-10-02T10:00:00.000Z', rettangoli: [],
        ancoreTesto: [{ edizione: 1, blocco: appunti.id, inizio: a0, fine: z0, citazione: t0, prefisso: '', suffisso: '' }] };
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog('diritto-romano'), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [RI]: { pagina: 7, segni: casiR.map((c) => c.segno) }, [RV]: { pagina: 40, segni: [segnoAppunti] } } }));
      await ms.migraSegniOriginali('diritto-romano');
      const q = leggi(prog('diritto-romano')), perId = new Map((q.originali[RN]?.segni ?? []).map((x) => [x.id, x]));
      assert.equal(perId.size, casiR.length + 1, 'Romano: segni delle integrazioni e degli appunti sul testo nuovo');
      assert(perId.has('rp-a1'), 'segno degli appunti migrato');
      assert.deepEqual(Object.keys(q.originali[RN].segniMigrati).sort(), [RI, RV].sort());
      for (const c of casiR) {
        const x = perId.get(`ri-${c.segno.id}`);
        assert(x, `${c.cerca}: segno nuovo presente`);
        assert.equal(x.tipo, c.segno.tipo); assert.equal(x.colore, c.segno.colore); assert.equal(x.creata, c.segno.creata);
        assert(!x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)), `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
        for (const a of x.ancoreTesto) assert.equal(testi.get(a.blocco)?.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
        const citazione = x.ancoreTesto.map((a) => a.citazione).join(' ');
        assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
        if (c.esatto) { assert.equal(x.ancoreTesto.length, 1); assert.equal(normale(x.ancoreTesto[0].citazione), normale(c.segno.testo), `solo il tratto: «${x.ancoreTesto[0].citazione}»`); esatti++; }
        assert.equal(x.pagina, c.segno.pagina + 223, `${c.cerca}: la sezione ${c.segno.pagina} delle integrazioni è la p. ${c.segno.pagina + 223}`);
        righe.push(`integrazioni sez. ${c.segno.pagina} → p. ${x.pagina} · ${citazione.slice(0, 70)}`); giusti++;
      }
      assert.equal(q.originali[RI].segni.length, casiR.length, 'segni vecchi conservati');
      const prima = JSON.stringify(q); await ms.migraSegniOriginali('diritto-romano');
      assert.equal(storage.getItem(prog('diritto-romano')), prima, 'Romano, unità 14 e 15: idempotente');
    });
  }

  // ---------- 7. Privato: dispensa Torrente–Schlesinger → testo IURIS ----------
  const PV = 'diritto-privato-torrente-dispense-v1', PN = 'privato-iuris-v1', DP = 'diritto-privato';
  // Casi controllati a mano (frase vecchia → parole che il segno nuovo deve contenere): riquadro decifrato, numeri,
  // nomi, latino, elenco, segno del vecchio lettore PDF, tratto esatto.
  const CASI_PRIVATO = [
    { doc: PV, cerca: 'il cod. del 1942 non consentiva il riconoscimento dei figli adulterini', atteso: 'Nel codice del 1942' },
    { doc: PV, cerca: 'L’assegno può essere emesso con la specifica indicazione del nome del beneficiario', atteso: 'emesso al portatore' },
    { doc: PV, cerca: 'A differenza dell’usufruttuario, l’enfiteuta può anche mutuare la destinazione del fondo', atteso: 'cambiare la destinazione del fondo' },
    { doc: PV, cerca: 'La legge in questione non si applica agli agenti di cambio', atteso: 'mediatori marittimi' },
    { doc: PV, cerca: 'la rappresentazione può aver luogo soltanto quando il chiamato', atteso: 'fratello o una sorella' },
    { doc: PV, cerca: 'Molto importante per i beni fungibili è ricordare', atteso: 'genus numquam perit' },
    { doc: PV, cerca: 'la risoluzione ha effetto solo per le prestazioni da eseguire', atteso: 'art. 1458 c.c.' },
    { doc: PV, cerca: 'Nell\'esempio fatto, il fornitore non potrà chiedere la risoluzione', atteso: 'aumento rilevante', pdf: true },
    { doc: PV, cerca: 'il pescatore che fa propri i pesci caduti nella rete', atteso: 'a titolo originario' },
  ];
  if (catalogo.some((d) => d.id === PN)) {
    await check('Privato', async () => {
      assert(existsSync(`${root}public/letture/${PN}/allineamento-${PV}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${PV} ${PN}`);
      const r = await campione(PV, PN, 'tp', 300);
      assert(r.migrati / r.n >= 0.85, `Privato: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      const nv = versione(PN), testi = new Map(nv.blocchi.map((b) => [b.id, b]));
      const casiP = CASI_PRIVATO.map((c) => ({ ...c, segno: segnoSu(c) }));
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(DP), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [PV]: { pagina: 3, segni: casiP.map((c) => c.segno) } } }));
      await ms.migraSegniOriginali(DP);
      const q = leggi(prog(DP)), perId = new Map((q.originali[PN]?.segni ?? []).map((x) => [x.id, x]));
      assert.equal(perId.size, casiP.length, 'Privato: tutti i segni sul testo nuovo');
      for (const c of casiP) {
        const x = perId.get(`tp-${c.segno.id}`);
        assert(x, `${c.cerca}: segno nuovo presente`);
        assert.equal(x.tipo, c.segno.tipo); assert.equal(x.colore, c.segno.colore); assert.equal(x.creata, c.segno.creata);
        assert(!x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)), `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
        for (const a of x.ancoreTesto) assert.equal(testi.get(a.blocco)?.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
        const citazione = x.ancoreTesto.map((a) => a.citazione).join(' ');
        assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
        assert(Math.abs(x.pagina - c.segno.pagina) <= 1, 'Privato: stessa numerazione (±1)');
        righe.push(`privato p. ${c.segno.pagina} → p. ${x.pagina} · ${citazione.slice(0, 70)}`); giusti++;
      }
      assert.equal(q.originali[PV].segni.length, casiP.length, 'segni vecchi conservati');
      const prima = JSON.stringify(q); await ms.migraSegniOriginali(DP);
      assert.equal(storage.getItem(prog(DP)), prima, 'Privato: idempotente');
    });
  }

  // ---------- 8. Filosofia M-Z: riassunti di Barberis e Schauer → testo IURIS (Schauer dalla p. 57) ----------
  const FB = 'filosofia-mz-barberis-v1', FS = 'filosofia-mz-schauer-v1', FN = 'filosofia-mz-iuris-v1', FM = 'filosofia-del-diritto-mz';
  const SCOSTAMENTO = { [FB]: 0, [FS]: 56 };
  const CASI_MZ = [
    { doc: FB, cerca: 'riscoperto dopo l\'anno mille a Bologna', atteso: 'ritrovato a Bologna dopo il Mille' },
    { doc: FB, cerca: 'noto come “Code Napoleon”', atteso: 'Code Napoléon' },
    { doc: FB, cerca: 'L\'autore che meglio illustra la filosofia del diritto delle origini', atteso: 'Immanuel Kant' },
    { doc: FB, cerca: 'Il terzo periodo va dalla “Teoria pura” del 1960', parte: 'Teoria generale delle norme', atteso: 'Teoria generale delle norme', esatto: true },
    { doc: FB, cerca: 'rappresentato da Axel Hägerström e da Ross', atteso: 'Axel Hägerström e Alf Ross' },
    { doc: FB, cerca: 'un certo Elmer Palmer', pdf: true, atteso: 'Elmer Palmer' },
    { doc: FB, cerca: 'il maggior esponente del giusrealismo italiano', atteso: 'Giovanni Tarello' },
    { doc: FS, cerca: 'Per Lord Coke', atteso: 'Lord Coke' },
    { doc: FS, cerca: 'Griswold v. Connecticut, deciso nel 1965', atteso: 'Griswold v. Connecticut, del 1965' },
    { doc: FS, cerca: 'nel caso Brandenburg v. Ohio', atteso: 'Brandenburg v. Ohio' },
    { doc: FS, cerca: 'Con Cicerone l’aequitas', atteso: "l'aequitas servì a temperare" },
    { doc: FS, cerca: 'Per Hutcheson e Frank questa immagine', atteso: 'Secondo Hutcheson e Frank' },
    { doc: FS, cerca: 'Per Fuller, può succedere che la formulazione', atteso: 'Secondo Fuller' },
    { doc: FS, cerca: 'che decide pochi casi, una visione siffatta', atteso: 'inefficace e insieme irrealistica' },
  ];
  if (catalogo.some((d) => d.id === FN)) {
    await check('Filosofia M-Z', async () => {
      assert(!catalogo.some((d) => d.id === FB || d.id === FS), 'Barberis e Schauer non sono più Originali a sé');
      for (const v of [FB, FS]) {
        assert(existsSync(`${root}public/letture/${FN}/allineamento-${v}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${v} ${FN}${SCOSTAMENTO[v] ? ` --scostamento ${SCOSTAMENTO[v]}` : ''}`);
        const t = JSON.parse(readFileSync(`${root}public/letture/${FN}/allineamento-${v}.json`, 'utf8'));
        assert.equal(t.scostamento ?? 0, SCOSTAMENTO[v], `${v}: scostamento delle pagine`);
        const r = await campione(v, FN, v === FB ? 'fb' : 'fs', 200, SCOSTAMENTO[v]);
        assert(r.migrati / r.n >= 0.85, `${v}: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      }
      const nv = versione(FN), testi = new Map(nv.blocchi.map((b) => [b.id, b]));
      const casiF = CASI_MZ.map((c) => ({ ...c, segno: segnoSu(c) }));
      // I due riassunti nello stesso progresso: convivono sul testo nuovo, senza doppioni.
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(FM), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [FS]: { pagina: 10, segni: casiF.filter((c) => c.doc === FS).map((c) => c.segno) },
          [FB]: { pagina: 4, segni: casiF.filter((c) => c.doc === FB).map((c) => c.segno) } } }));
      await ms.migraSegniOriginali(FM);
      const q = leggi(prog(FM)), perId = new Map((q.originali[FN]?.segni ?? []).map((x) => [x.id, x]));
      assert.equal(perId.size, casiF.length, 'Filosofia M-Z: tutti i segni sul testo nuovo');
      assert.deepEqual(Object.keys(q.originali[FN].segniMigrati).sort(), [FB, FS].sort());
      for (const c of casiF) {
        const x = perId.get(`${c.doc === FB ? 'fb' : 'fs'}-${c.segno.id}`);
        assert(x, `${c.cerca}: segno nuovo presente`);
        assert.equal(x.tipo, c.segno.tipo); assert.equal(x.colore, c.segno.colore); assert.equal(x.creata, c.segno.creata);
        assert(!x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)), `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
        for (const a of x.ancoreTesto) assert.equal(testi.get(a.blocco)?.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
        const citazione = x.ancoreTesto.map((a) => a.citazione).join(' ');
        assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
        if (c.esatto) { assert.equal(x.ancoreTesto.length, 1); assert.equal(normale(x.ancoreTesto[0].citazione), normale(c.segno.testo), `solo il tratto: «${x.ancoreTesto[0].citazione}»`); esatti++; }
        assert(Math.abs(x.pagina - c.segno.pagina - SCOSTAMENTO[c.doc]) <= 1, `${c.cerca}: p. ${c.segno.pagina} del vecchio → p. ${c.segno.pagina + SCOSTAMENTO[c.doc]} (±1), trovata p. ${x.pagina}`);
        righe.push(`${c.doc === FB ? 'Barberis' : 'Schauer'} p. ${c.segno.pagina} → p. ${x.pagina} · ${citazione.slice(0, 70)}`); giusti++;
      }
      assert.equal(q.originali[FB].segni.length + q.originali[FS].segni.length, casiF.length, 'segni vecchi conservati');
      const prima = JSON.stringify(q); await ms.migraSegniOriginali(FM);
      assert.equal(storage.getItem(prog(FM)), prima, 'Filosofia M-Z: idempotente');
      // Solo Schauer: la pagina di lettura passa alla numerazione nuova (p. 10 → p. 66).
      storage.clear(); await apriDiNuovo();
      const unico = casiF.find((c) => c.doc === FS).segno;
      storage.setItem(prog(FM), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [FS]: { pagina: 10, segni: [unico] } } }));
      await ms.migraSegniOriginali(FM);
      assert.equal(leggi(prog(FM)).originali[FN]?.pagina, 66, 'Schauer: pagina di lettura spostata di 56');
    });
  }

  // ---------- 9. Filosofia SSG: sbobinature e riassunto di Incampo (PDF) → testo IURIS (Incampo dalla p. 193) ----------
  const SL = 'filosofia-ssg-lezioni-v1', SI = 'filosofia-ssg-incampo-v1', SN = 'filosofia-ssg-iuris-v1', SM = 'filosofia-del-diritto-ssg';
  const SCOST_SSG = { [SL]: 0, [SI]: 192 };
  const CASI_SSG = [
    { doc: SL, cerca: 'nel 1903 formalizza, invece, il ragionamento', atteso: 'dà forma rigorosa al ragionamento' },
    { doc: SL, cerca: 'La figura di Antigone e Porzia nasce da un giurista italiano', parte: 'Tullio Ascarelli', atteso: 'Tullio Ascarelli', esatto: true },
    { doc: SL, cerca: 'Von Jhering racconta questo episodio', atteso: 'Danubio' },
    { doc: SL, cerca: 'due antropologi ungheresi che si recarono', atteso: 'Tonga' },
    { doc: SL, cerca: 'Qualche anno prima della pubblicazione di sorvegliare e punire', pdf: true, atteso: 'Jacques-Alain Miller' },
    { doc: SL, cerca: 'Tornando all’esempio del Monopoly', atteso: 'Monopoly' },
    { doc: SL, cerca: 'nasce il termine proprio post-moderno da un libro di', atteso: 'Lyotard' },
    { doc: SL, cerca: 'Grisù è un draghetto piccolino', atteso: 'Grisù' },
    { doc: SI, cerca: 'Esaminiamo una tesi di Amedeo Conte', atteso: 'Conte' },
    { doc: SI, cerca: 'Nella teoria generale del negozio giuridico di', atteso: 'Emilio Betti' },
    { doc: SI, cerca: 'Per Reinach ciò non è possibile perché contraddittorio', atteso: 'Reinach' },
    { doc: SI, cerca: 'chiama sintattica la parte della semiotica', atteso: 'Morris' },
    { doc: SI, cerca: 'È significativo un argomento del diritto penale canonico', atteso: 'diritto penale canonico' },
    { doc: SI, cerca: 'esprime una verità si analitica ma a posteriori', pdf: true, atteso: 'scritto per intero di mano dal testatore' },
  ];
  if (catalogo.some((d) => d.id === SN)) {
    await check('Filosofia SSG', async () => {
      assert(!catalogo.some((d) => d.id === SL || d.id === SI), 'sbobinature e Incampo non sono più Originali a sé');
      for (const v of [SL, SI]) {
        assert(existsSync(`${root}public/letture/${SN}/allineamento-${v}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${v} ${SN}${SCOST_SSG[v] ? ` --scostamento ${SCOST_SSG[v]}` : ''}`);
        const t = JSON.parse(readFileSync(`${root}public/letture/${SN}/allineamento-${v}.json`, 'utf8'));
        assert.equal(t.scostamento ?? 0, SCOST_SSG[v], `${v}: scostamento delle pagine`);
        const r = await campione(v, SN, v === SL ? 'sl' : 'si', 200, SCOST_SSG[v]);
        assert(r.migrati / r.n >= 0.85, `${v}: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      }
      const nv = versione(SN), testi = new Map(nv.blocchi.map((b) => [b.id, b]));
      const casiS = CASI_SSG.map((c) => ({ ...c, segno: segnoSu(c) }));
      // I due documenti nello stesso progresso: convivono sul testo nuovo, senza doppioni.
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(SM), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [SI]: { pagina: 12, segni: casiS.filter((c) => c.doc === SI).map((c) => c.segno) },
          [SL]: { pagina: 40, segni: casiS.filter((c) => c.doc === SL).map((c) => c.segno) } } }));
      await ms.migraSegniOriginali(SM);
      const q = leggi(prog(SM)), perId = new Map((q.originali[SN]?.segni ?? []).map((x) => [x.id, x]));
      assert.equal(perId.size, casiS.length, 'Filosofia SSG: tutti i segni sul testo nuovo');
      assert.deepEqual(Object.keys(q.originali[SN].segniMigrati).sort(), [SL, SI].sort());
      for (const c of casiS) {
        const x = perId.get(`${c.doc === SL ? 'sl' : 'si'}-${c.segno.id}`);
        assert(x, `${c.cerca}: segno nuovo presente`);
        assert.equal(x.tipo, c.segno.tipo); assert.equal(x.colore, c.segno.colore); assert.equal(x.creata, c.segno.creata);
        assert(!x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)), `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
        for (const a of x.ancoreTesto) assert.equal(testi.get(a.blocco)?.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
        const citazione = x.ancoreTesto.map((a) => a.citazione).join(' ');
        assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
        if (c.esatto) { assert.equal(x.ancoreTesto.length, 1); assert.equal(normale(x.ancoreTesto[0].citazione), normale(c.segno.testo), `solo il tratto: «${x.ancoreTesto[0].citazione}»`); esatti++; }
        assert(Math.abs(x.pagina - c.segno.pagina - SCOST_SSG[c.doc]) <= 1, `${c.cerca}: p. ${c.segno.pagina} del vecchio → p. ${c.segno.pagina + SCOST_SSG[c.doc]} (±1), trovata p. ${x.pagina}`);
        righe.push(`${c.doc === SL ? 'lezioni SSG' : 'Incampo SSG'} p. ${c.segno.pagina} → p. ${x.pagina} · ${citazione.slice(0, 70)}`); giusti++;
      }
      assert.equal(q.originali[SL].segni.length + q.originali[SI].segni.length, casiS.length, 'segni vecchi conservati');
      const prima = JSON.stringify(q); await ms.migraSegniOriginali(SM);
      assert.equal(storage.getItem(prog(SM)), prima, 'Filosofia SSG: idempotente');
      // Solo Incampo: la pagina di lettura passa alla numerazione nuova (p. 12 → p. 204).
      storage.clear(); await apriDiNuovo();
      const unico = casiS.find((c) => c.doc === SI).segno;
      storage.setItem(prog(SM), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [SI]: { pagina: 12, segni: [unico] } } }));
      await ms.migraSegniOriginali(SM);
      assert.equal(leggi(prog(SM)).originali[SN]?.pagina, 204, 'Incampo: pagina di lettura spostata di 192');
    });
  }

  // ---------- 10. Filosofia A-L: appunti su Incampo, Moro e Cotta (PDF) → testo IURIS (Moro dalla p. 101, Cotta dalla p. 132) ----------
  // La classe di chi usa l'app ogni giorno: oltre ai casi a mano, i segni del backup di prova (fixtures/segni-campione.json,
  // «stress»: segni veri sul vecchio lettore di Incampo e Moro) devono arrivare quasi tutti sulla frase giusta.
  const AI = 'filosofia-incampo-v1', AM = 'filosofia-moro-v1', AC = 'filosofia-cotta-v1', AN = 'filosofia-al-iuris-v1', AS = 'filosofia-del-diritto';
  const SCOST_AL = { [AI]: 0, [AM]: 100, [AC]: 131 };
  const SIGLA_AL = { [AI]: 'fi', [AM]: 'fm', [AC]: 'fc' };
  const NOME_AL = { [AI]: 'Incampo', [AM]: 'Moro', [AC]: 'Cotta' };
  const CASI_AL = [
    { doc: AI, cerca: 'Gustav Radbruch cita la sentenza del tribunale di prima istanza di Wiesbaden', atteso: 'Wiesbaden' },
    { doc: AI, cerca: 'nella Repubblica di Weimar (1923)', atteso: 'Weimar' },
    { doc: AI, cerca: 'Georges Kalinowski, afferma', atteso: 'Kalinowski' },
    { doc: AI, cerca: 'comunità pitagorica di Metaponto', atteso: 'Metaponto' },
    { doc: AI, cerca: 'Francesco Mantica, nelle sue Vaticanae lucubrationes', atteso: 'Mantica' },
    { doc: AI, cerca: 'Madonne di Lorenzo Lotto', parte: 'Lorenzo Lotto', atteso: 'Lorenzo Lotto', esatto: true },
    { doc: AI, cerca: 'Un racconto ipotetico ambientato al Polo Nord', pdf: true, atteso: 'Polo Nord' },
    { doc: AI, cerca: 'Tesi di Alf Ross', atteso: 'Ross' },
    { doc: AM, cerca: 'La partecipazione di Moro all\'Assemblea Costituente', atteso: 'Assemblea Costituente' },
    { doc: AM, cerca: 'Giuseppe Capograssi', atteso: 'Capograssi' },
    { doc: AM, cerca: 'una comunità umana universale che gli Stati costituiscono', atteso: 'comunità umana universale' },
    { doc: AM, cerca: 'principio della rivoluzione permanente, connaturata', pdf: true, atteso: 'rivoluzione permanente' },
    { doc: AC, cerca: 'Von Clausewitz affermava', atteso: 'Clausewitz' },
    { doc: AC, cerca: '“homo homini Deus”', atteso: 'homo homini Deus' },
    { doc: AC, cerca: 'associazione a delinquere o racket', atteso: 'racket' },
    { doc: AC, cerca: 'c.d. “legge di Hume”', atteso: 'Hume' },
  ];
  if (catalogo.some((d) => d.id === AN)) {
    await check('Filosofia A-L', async () => {
      assert(!catalogo.some((d) => [AI, AM, AC].includes(d.id)), 'Incampo, Moro e Cotta non sono più Originali a sé');
      for (const v of [AI, AM, AC]) {
        assert(existsSync(`${root}public/letture/${AN}/allineamento-${v}.json`), `manca la tabella: node scripts/allinea-originali.mjs ${v} ${AN}${SCOST_AL[v] ? ` --scostamento ${SCOST_AL[v]}` : ''}`);
        const t = JSON.parse(readFileSync(`${root}public/letture/${AN}/allineamento-${v}.json`, 'utf8'));
        assert.equal(t.scostamento ?? 0, SCOST_AL[v], `${v}: scostamento delle pagine`);
        const r = await campione(v, AN, SIGLA_AL[v], 200, SCOST_AL[v]);
        assert(r.migrati / r.n >= 0.9, `${v}: ${r.migrati}/${r.n} frasi con corrispondenza sicura`);
      }
      const nv = versione(AN), testi = new Map(nv.blocchi.map((b) => [b.id, b]));
      const casiA = CASI_AL.map((c) => ({ ...c, segno: segnoSu(c) }));
      // I tre documenti nello stesso progresso: convivono sul testo nuovo, senza doppioni.
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(AS), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: Object.fromEntries([AI, AM, AC].map((v) => [v, { pagina: 5, segni: casiA.filter((c) => c.doc === v).map((c) => c.segno) }])) }));
      await ms.migraSegniOriginali(AS);
      const q = leggi(prog(AS)), perId = new Map((q.originali[AN]?.segni ?? []).map((x) => [x.id, x]));
      assert.equal(perId.size, casiA.length, 'Filosofia A-L: tutti i segni sul testo nuovo');
      assert.deepEqual(Object.keys(q.originali[AN].segniMigrati).sort(), [AI, AM, AC].sort());
      for (const c of casiA) {
        const x = perId.get(`${SIGLA_AL[c.doc]}-${c.segno.id}`);
        assert(x, `${c.cerca}: segno nuovo presente`);
        assert.equal(x.tipo, c.segno.tipo); assert.equal(x.colore, c.segno.colore); assert.equal(x.creata, c.segno.creata);
        assert(!x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)), `${c.cerca}: atteso sul testo nuovo, è «da ricollocare»`);
        for (const a of x.ancoreTesto) assert.equal(testi.get(a.blocco)?.testo.slice(a.inizio, a.fine), a.citazione, 'ancora coerente con il textContent nuovo');
        const citazione = x.ancoreTesto.map((a) => a.citazione).join(' ');
        assert(normale(citazione).includes(normale(c.atteso)), `${c.cerca}: atteso «${c.atteso}», trovato «${citazione.slice(0, 160)}»`);
        if (c.esatto) { assert.equal(x.ancoreTesto.length, 1); assert.equal(normale(x.ancoreTesto[0].citazione), normale(c.segno.testo), `solo il tratto: «${x.ancoreTesto[0].citazione}»`); esatti++; }
        assert(Math.abs(x.pagina - c.segno.pagina - SCOST_AL[c.doc]) <= 1, `${c.cerca}: p. ${c.segno.pagina} del vecchio → p. ${c.segno.pagina + SCOST_AL[c.doc]} (±1), trovata p. ${x.pagina}`);
        righe.push(`${NOME_AL[c.doc]} A-L p. ${c.segno.pagina} → p. ${x.pagina} · ${citazione.slice(0, 70)}`); giusti++;
      }
      assert.equal([AI, AM, AC].reduce((n, v) => n + q.originali[v].segni.length, 0), casiA.length, 'segni vecchi conservati');
      const prima = JSON.stringify(q); await ms.migraSegniOriginali(AS);
      assert.equal(storage.getItem(prog(AS)), prima, 'Filosofia A-L: idempotente');
      // Solo Cotta: la pagina di lettura passa alla numerazione nuova (p. 5 → p. 136).
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(AS), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [AC]: { pagina: 5, segni: [casiA.find((c) => c.doc === AC).segno] } } }));
      await ms.migraSegniOriginali(AS);
      assert.equal(leggi(prog(AS)).originali[AN]?.pagina, 136, 'Cotta: pagina di lettura spostata di 131');
      // Segni del backup di prova (Incampo e Moro): quasi tutti sicuri, sulla frase che contiene il loro testo, a ±2 pagine.
      const stress = JSON.parse(readFileSync(new URL('./fixtures/segni-vecchi-al.json', import.meta.url), 'utf8')).stress;
      storage.clear(); await apriDiNuovo();
      storage.setItem(prog(AS), JSON.stringify({ versione: 1, nuovePerGiorno: 35, lezioni: {}, carte: {}, esiti: {}, giorni: {},
        originali: { [AI]: { pagina: 10, segni: stress[AI] }, [AM]: { pagina: 3, segni: stress[AM] } } }));
      await ms.migraSegniOriginali(AS);
      const sq = leggi(prog(AS)).originali[AN];
      for (const v of [AI, AM]) {
        const nuovi = sq.segni.filter((x) => x.id.startsWith(`${SIGLA_AL[v]}-`));
        assert.equal(nuovi.length, stress[v].length, `${v}: ogni segno del backup di prova ha il suo segno nuovo`);
        const sicuri = nuovi.filter((x) => !x.ancoreTesto.some((a) => a.blocco.endsWith(`-${ms.BLOCCO_DA_RICOLLOCARE}`)));
        const vicini = sicuri.filter((x) => { const s = stress[v].find((y) => `${SIGLA_AL[v]}-${y.id}` === x.id); return Math.abs(x.pagina - s.pagina - SCOST_AL[v]) <= 2; });
        assert(sicuri.length / nuovi.length >= 0.9, `${v}: segni del backup di prova sicuri ${sicuri.length}/${nuovi.length}`);
        assert.equal(vicini.length, sicuri.length, `${v}: segni del backup di prova entro 2 pagine`);
        misure.push({ vecchio: `${v} (backup di prova)`, n: nuovi.length, migrati: sicuri.length, ricollocare: nuovi.length - sicuri.length, vicine: vicini.length });
      }
    });
  }

  for (const r of righe) console.log(`  ${r}`);
  for (const m of misure) console.log(`  campione ${m.vecchio}: ${m.migrati}/${m.n} frasi con corrispondenza sicura (${(100 * m.migrati / m.n).toFixed(1)}%), ${m.ricollocare} da ricollocare; ${m.vicine} entro 2 pagine`);
  console.log(`Segni degli Originali migrati: ${checks.length} controlli, ${giusti} casi a mano (${esatti} sul tratto esatto)${catalogo.some((d) => d.id === RN) ? ', Romano compreso' : ' (Romano: in attesa di romano-iuris-v1)'}${catalogo.some((d) => d.id === PN) ? ', Privato compreso' : ''}${catalogo.some((d) => d.id === 'filosofia-mz-iuris-v1') ? ', Filosofia M-Z compresa' : ''}${catalogo.some((d) => d.id === 'filosofia-ssg-iuris-v1') ? ', Filosofia SSG compresa' : ''}${catalogo.some((d) => d.id === 'filosofia-al-iuris-v1') ? ', Filosofia A-L compresa' : ''}.`);
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
