// Linea del tempo della Cronologia: gli eventi dello stesso anno condividono pallino ed etichetta solo se correlati;
// quelli indipendenti hanno ciascuno il proprio, senza sovrapporsi. Prova casi costruiti a mano e tutte le materie.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { correlati, disponiEtichette, frequenzaVoci, gruppiCorrelati, puntiScala } from '../src/lib/cronologia-striscia.mjs';

// stessi valori di src/views/Cronologia.tsx (PC e touch)
const K = 4, BORDO = 40, DISTACCO = 8, PASSO = 14;
const FORMATI = [{ nome: 'PC', maxCorsie: 6, etichettaW: 168 }, { nome: 'touch', maxCorsie: 3, etichettaW: 148 }];

const ev = (id, anno, titolo, concetti = [], descrizione = '') => ({ id, anno, data: String(anno), titolo, descrizione, tipo: 'legge', concetti });

function disponi(eventi, formato, tutti = eventi) {
  const { A, X } = puntiScala(tutti.map((e) => e.anno), K);
  const indice = new Map(A.map((a, i) => [a, i]));
  const freq = frequenzaVoci(tutti);
  const ordinati = [...eventi].sort((a, b) => a.anno - b.anno);
  return { ...disponiEtichette(ordinati, X, indice, { bordo: BORDO, etichettaW: formato.etichettaW, maxCorsie: formato.maxCorsie, freq }), freq, ordinati };
}

/** Nessuna etichetta sopra un'altra della stessa riga, nessun pallino sopra un altro, ogni evento una sola volta */
function controllaDisposizione({ etichette, corsie, freq, ordinati }, formato, contesto) {
  assert(corsie <= formato.maxCorsie, `${contesto}: ${corsie} righe di etichette, massimo ${formato.maxCorsie}`);
  const visti = new Map();
  for (const g of etichette) for (const e of g.eventi) {
    assert(!visti.has(e.id), `${contesto}: evento ${e.id} in due etichette`);
    visti.set(e.id, g);
    assert.equal(e.anno, g.eventi[0].anno, `${contesto}: ${e.id} raggruppato con un evento di un altro anno`);
  }
  assert.equal(visti.size, ordinati.length, `${contesto}: eventi persi nella striscia`);
  for (let i = 1; i < etichette.length; i++) {
    assert(etichette[i].x - etichette[i - 1].x >= PASSO - 1e-6,
      `${contesto}: pallini sovrapposti (${etichette[i - 1].eventi[0].id}, ${etichette[i].eventi[0].id})`);
  }
  const perCorsia = new Map();
  for (const g of etichette) perCorsia.set(g.corsia, [...(perCorsia.get(g.corsia) ?? []), g]);
  for (const [c, lista] of perCorsia) {
    lista.sort((a, b) => a.x - b.x);
    for (let i = 1; i < lista.length; i++) {
      assert(lista[i].x >= lista[i - 1].x + formato.etichettaW + DISTACCO - 1e-6,
        `${contesto}: etichette sovrapposte nella riga ${c} (${lista[i - 1].eventi[0].id}, ${lista[i].eventi[0].id})`);
    }
  }
  // gruppi = eventi correlati: dentro un gruppo ognuno è legato ad almeno un altro, fra gruppi dello stesso anno nessun legame
  for (const g of etichette) {
    if (g.eventi.length > 1) for (const e of g.eventi) {
      assert(g.eventi.some((f) => f !== e && correlati(e, f, freq)), `${contesto}: ${e.id} unito senza legami nel suo gruppo`);
    }
  }
  for (let i = 0; i < etichette.length; i++) for (let j = i + 1; j < etichette.length; j++) {
    const a = etichette[i], b = etichette[j];
    if (a.eventi[0].anno !== b.eventi[0].anno) continue;
    for (const e of a.eventi) for (const f of b.eventi) assert(!correlati(e, f, freq), `${contesto}: ${e.id} e ${f.id} correlati ma separati`);
  }
}

// 1. Stesso anno, eventi indipendenti → etichette e pallini separati; eventi correlati → uniti
{
  const altri = [ev('x1', 1990, 'Altro fatto', ['unione-europea']), ev('x2', 1995, 'Altro ancora', ['unione-europea']),
    ev('x3', 2010, 'Ancora', ['unione-europea']), ev('x4', 2012, 'E ancora', ['unione-europea'])];
  const casi = [
    ev('a', 2007, 'Firma del Trattato di Lisbona', ['trattato-di-lisbona', 'unione-europea']),
    ev('b', 2007, 'Sentenze n. 103 e 104/2007 sullo spoil system', ['spoil-system']),
    ev('c', 2007, 'Sentenze 348 e 349/2007', ['norma-interposta']),
    ev('d', 2007, 'Sentenze n. 348 e 349/2007 sulla CEDU', ['cedu']),                       // stesso atto di c
    ev('e', 2007, 'Legge sull’ordinamento giudiziario', ['csm', 'magistratura']),
    ev('f', 2007, 'Riforma del CSM', ['csm'], 'Attua la legge sull’ordinamento giudiziario.'), // voce specifica in comune con e
    ev('g', 2007, 'Abolita la pena di morte', ['diritti-inviolabili']),
    ev('h', 2007, 'Pratiche commerciali scorrette', ['unione-europea']),                   // voce generica: resta da sola
  ];
  const freq = frequenzaVoci([...casi, ...altri]);
  const gruppi = gruppiCorrelati(casi, freq).map((g) => g.map((e) => e.id).join('+'));
  assert.deepEqual(gruppi, ['a', 'b', 'c+d', 'e+f', 'g', 'h'], `Raggruppamento del 2007 inatteso: ${gruppi.join(' | ')}`);
  for (const formato of FORMATI) {
    const r = disponi(casi, formato, [...casi, ...altri]);
    assert.equal(r.etichette.length, 6, `${formato.nome}: sei fatti indipendenti, sei etichette`);
    controllaDisposizione(r, formato, `caso 2007 (${formato.nome})`);
  }
  // titolo dell'uno richiamato nella descrizione dell'altro (lo stesso giorno di voto)
  const a = ev('r', 1946, 'Referendum istituzionale ed elezione della Costituente', ['referendum-istituzionale']);
  const b = ev('v', 1946, 'Primo voto delle donne', ['elettorato-attivo'], "Con il referendum istituzionale e l'elezione dell'Assemblea costituente le donne votano per la prima volta.");
  assert(correlati(a, b, frequenzaVoci([a, b])), 'Un evento che richiama il titolo di un altro va unito a quello');
  // stesso giorno ma fatti diversi: separati
  const c = { ...ev('ceca', 2002, 'Cessazione della CECA', ['unione-europea'], 'Scade il Trattato di Parigi.'), data: '23 luglio 2002' };
  const d = { ...ev('msg', 2002, 'Messaggio sul pluralismo', ['pluralismo-informazione'], 'Messaggio alle Camere (art. 87).'), data: '23 luglio 2002' };
  assert(!correlati(c, d, frequenzaVoci([c, d, ...altri])), 'Due fatti diversi dello stesso giorno non vanno uniti');
}

// 2. Anno affollato con poche righe: la striscia si allarga, nessuna sovrapposizione
{
  const temi = ['CNEL', 'estradizione', 'apologia', 'irretroattività', 'Alta Corte', 'regolamenti', 'Trattati', 'stampa', 'cinema', 'sciopero', 'famiglia', 'scuola'];
  const molti = temi.map((t, i) => ev(`m${i}`, 1957, `Atto su ${t}`, [`voce-${i}`]));
  const vicini = [ev('p', 1956, 'Prima', ['p']), ev('q', 1958, 'Dopo', ['q']), ev('r', 1959, 'Dopo ancora', ['r'])];
  for (const formato of FORMATI) {
    const r = disponi([...molti, ...vicini], formato);
    assert.equal(r.etichette.length, 15, `${formato.nome}: quindici fatti indipendenti, quindici etichette`);
    controllaDisposizione(r, formato, `anno affollato (${formato.nome})`);
  }
}

// 3. Tutte le materie generate
const base = fileURLToPath(new URL('../public/content/', import.meta.url));
let materie = 0, stessoAnnoSeparati = 0;
const t0 = performance.now();
for (const slug of fs.readdirSync(base)) {
  const file = `${base}${slug}/corso.json`;
  if (!fs.existsSync(file)) continue;
  const eventi = JSON.parse(fs.readFileSync(file, 'utf8')).eventi;
  const periodi = eventi.filter((e) => e.tipo === 'periodo' && e.annoFine != null).sort((a, b) => a.anno - b.anno);
  const inizio = periodi[0]?.anno ?? -Infinity;
  const striscia = eventi.filter((e) => e.tipo !== 'periodo' && e.anno >= inizio);
  // stesso titolo due volte nella stessa materia = doppione rimasto (va unito sotto un solo id)
  const titoli = new Map();
  for (const e of eventi) {
    const k = `${e.anno}|${e.titolo.toLowerCase().replace(/\bn\.\s*/g, '')}`;
    assert(!titoli.has(k), `${slug}: evento doppio «${e.titolo}» (${titoli.get(k)}, ${e.id})`);
    titoli.set(k, e.id);
  }
  for (const formato of FORMATI) {
    const { A, X } = puntiScala([...striscia.map((e) => e.anno), ...periodi.flatMap((p) => [p.anno, p.annoFine])], K);
    const indice = new Map(A.map((a, i) => [a, i]));
    const freq = frequenzaVoci(eventi);
    const ordinati = [...striscia].sort((a, b) => a.anno - b.anno);
    const r = disponiEtichette(ordinati, X, indice, { bordo: BORDO, etichettaW: formato.etichettaW, maxCorsie: formato.maxCorsie, freq });
    controllaDisposizione({ ...r, freq, ordinati }, formato, `${slug} (${formato.nome})`);
    const anni = new Map();
    for (const g of r.etichette) anni.set(g.eventi[0].anno, (anni.get(g.eventi[0].anno) ?? 0) + 1);
    if (formato.nome === 'PC') stessoAnnoSeparati += [...anni.values()].filter((n) => n > 1).length;
    if (slug === 'diritto-costituzionale' && formato.nome === 'PC') {
      const del2007 = r.etichette.filter((g) => g.eventi[0].anno === 2007);
      assert(del2007.length >= 5, `costituzionale 2007: ${del2007.length} etichette, attese separate per i fatti indipendenti`);
    }
  }
  materie++;
}
const ms = performance.now() - t0;
assert(materie >= 5, `Materie con cronologia trovate: ${materie}`);
assert(ms < 1500, `Disposizione della cronologia lenta: ${ms.toFixed(0)} ms`);
console.log(`check-cronologia: ok (${materie} materie, ${stessoAnnoSeparati} anni con fatti separati, ${ms.toFixed(0)} ms)`);
