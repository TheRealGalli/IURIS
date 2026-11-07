// Geometria reale della mappa personale, senza aprire browser o server.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { graphTextWidth } from '../src/lib/graph-geometry.mjs';

const sorgente = await readFile(new URL('../src/components/MappaPersonale.tsx', import.meta.url), 'utf8');
const inizio = sorgente.indexOf('const PER_PAGINA ='), fine = sorgente.indexOf('\nfunction MappaPersonale(');
assert(inizio >= 0 && fine > inizio, 'helper di layout disponibile');
const modulo = `import { graphLabelLines, graphTextWidth } from ${JSON.stringify(new URL('../src/lib/graph-geometry.mjs', import.meta.url).href)};\n${sorgente.slice(inizio, fine)}`;
const js = ts.transpileModule(modulo, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { layoutMappaPersonale, ordinaPassaggiMappa } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const passaggio = (i, sezione = 'l1', concetti = [{ id: 'diritto', nome: 'Diritto' }]) => ({ id: `s${i}`, documento: 'incampo', sezione,
  blocco: `b${i}`, titolo: `Lezione ${sezione}`, testo: `Passaggio ${i}: una spiegazione sul diritto e sulle sue forme.`, tipo: i % 2 ? 'sottolineato' : 'evidenziato', colore: 'giallo', concetti });
const noOverlap = (nodi, larghezza, altezza) => {
  for (let i = 0; i < nodi.length; i++) for (let j = i + 1; j < nodi.length; j++) {
    const a = nodi[i], b = nodi[j];
    assert(a.x + larghezza <= b.x || b.x + larghezza <= a.x || a.y + altezza <= b.y || b.y + altezza <= a.y, 'nodi senza sovrapposizione');
  }
};
let checks = 0;
{
  const dati = Array.from({ length: 20 }, (_, i) => passaggio(i, i % 2 ? 'l2' : 'l1'));
  const snapshot = structuredClone(dati), m = layoutMappaPersonale(dati);
  noOverlap(m.passaggi, 370, 112); noOverlap(m.sezioni, 240, 90); noOverlap(m.concetti, 232, 60);
  assert.equal(m.passaggi.length, 20); assert.equal(m.sezioni.length, 2);
  assert.deepEqual(layoutMappaPersonale(dati), m, 'stesso input, stesso layout');
  assert.deepEqual(dati, snapshot, 'nessuna mutazione dei segni ricevuti'); checks++;
}
{
  const senza = passaggio('solo', 'l1', []), condiviso = { id: 'diritto', nome: 'Diritto' };
  const m = layoutMappaPersonale([senza, passaggio(1, 'l1', [condiviso, condiviso]), passaggio(2, 'l2', [condiviso])]);
  assert.equal(m.passaggi.length, 3, 'il segno senza concetti resta nella mappa');
  assert.equal(m.concetti.length, 1); assert.equal(m.concetti[0].passaggi.size, 2, 'concetto condiviso, collegamenti non duplicati');
  assert(m.sezioni[0].passaggi.has(m.passaggi[0].key)); checks++;
}
{
  const testo = 'MW@%'.repeat(100) + ' ὂν ᾗ ὄν '.repeat(60);
  const p = { ...passaggio(1, 'l1', [{ id: 'lungo', nome: testo }]), titolo: testo, testo };
  const m = layoutMappaPersonale([p]);
  for (const n of m.passaggi) { assert(n.righe.length <= 3); for (const r of n.righe) assert(graphTextWidth(r, 13) <= 338); }
  for (const n of m.sezioni) { assert(n.righe.length <= 3); for (const r of n.righe) assert(graphTextWidth(r, 14) <= 216); }
  for (const n of m.concetti) { assert(n.righe.length <= 2); for (const r of n.righe) assert(graphTextWidth(r, 13) <= 204); }
  assert.equal(m.passaggi[0].passaggio.testo, testo, 'l’anteprima non modifica il testo integrale'); checks++;
}
{
  const concetti = Array.from({ length: 80 }, (_, i) => ({ id: `c${i}`, nome: `Concetto ${i}` }));
  const p = passaggio(1, 'l1', concetti), m = layoutMappaPersonale([p]);
  assert.equal(m.totaleConcetti, 80); assert.equal(m.concetti.length, 36);
  assert.equal(m.passaggi[0].passaggio.concetti.length, 80, 'tutti i concetti restano disponibili nel dettaglio');
  noOverlap(m.concetti, 232, 60);
  for (const n of [...m.passaggi, ...m.concetti, ...m.sezioni]) assert(n.x >= 0 && n.y >= 0 && n.y < m.altezza);
  checks++;
}
{
  // Segnati in ordine sparso: la mappa segue il testo (documento, sezione, blocco, offset), non il momento del segno.
  const p = (id, sezione, ordine, creata) => ({ ...passaggio(id, sezione), ordine, creata });
  const segnati = [p('storico', 'l2', [0, 1, 3, 2, 40, 0, 0], '2026-11-07T10:00:00Z'), p('significati', 'l1', [0, 0, 1, 4, 10, 0, 0], '2026-11-07T10:05:00Z'),
    p('fine', 'l1', [0, 0, 2, 0, 5, 0, 0], '2026-11-07T09:00:00Z'), p('inizio', 'l1', [0, 0, 1, 4, 2, 0, 0], '2026-11-07T11:00:00Z'), p('altro-doc', 'x', [1, 0, 1, 0, 0, 0, 0], '2026-11-07T08:00:00Z')];
  const m = layoutMappaPersonale(segnati);
  assert.deepEqual(m.passaggi.map((n) => n.passaggio.id), ['sinizio', 'ssignificati', 'sfine', 'sstorico', 'saltro-doc'], 'passaggi nell’ordine del testo');
  assert.deepEqual(m.sezioni.map((s) => s.titolo), ['Lezione l1', 'Lezione l2', 'Lezione x'], 'sezioni nell’ordine del testo');
  for (let i = 1; i < m.passaggi.length; i++) assert(m.passaggi[i].y > m.passaggi[i - 1].y);
  const stessi = [p('b', 'l1', [0, 0, 1, 1, 0, 0, 0], '2026-11-07T10:00:00Z'), p('a', 'l1', [0, 0, 1, 1, 0, 0, 0], '2026-11-07T09:00:00Z'), { ...passaggio('z', 'l9') }];
  assert.deepEqual(ordinaPassaggiMappa(stessi).map((x) => x.id), ['sz', 'sa', 'sb'], 'a parità di posizione il più vecchio; senza posizione resta in testa');
  assert.deepEqual(segnati.map((x) => x.id), ['sstorico', 'ssignificati', 'sfine', 'sinizio', 'saltro-doc'], 'nessuna mutazione dell’array ricevuto');
  const molti = Array.from({ length: 50 }, (_, i) => p(`m${i}`, 'l1', [0, 0, i, 0, 0, 0, 0], '2026-11-07T10:00:00Z'));
  molti.forEach((x, i) => { x.concetti = [{ id: `raro${i}`, nome: `Raro ${i}` }, ...(i % 2 ? [{ id: 'frequente', nome: 'Frequente' }] : [])]; });
  molti[49].concetti.push({ id: 'frequente', nome: 'Frequente' });
  const mm = layoutMappaPersonale(molti);
  assert(mm.concetti.some((c) => c.id === 'frequente'), 'il concetto più ricorrente resta visibile anche se oltre il limite');
  for (let i = 1; i < mm.concetti.length; i++) assert(mm.concetti[i].y > mm.concetti[i - 1].y); checks++;
}
{
  // Ordine dei segni salvati (pannello Segni e chiave della mappa).
  const src = await readFile(new URL('../src/lib/ordine-segni.ts', import.meta.url), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  const { ordinaSegniNelTesto, posizioneSegno } = await import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`);
  const segno = (id, pagina, ancore, creata, rettangoli = []) => ({ id, pagina, testo: id, tipo: 'evidenziato', colore: 'giallo', creata, rettangoli, ancoreTesto: ancore });
  const a = (blocco, inizio) => ({ edizione: 1, blocco, inizio, fine: inizio + 5, citazione: 'x', prefisso: '', suffisso: '' });
  const segni = [segno('dopo', 1, [a('p001-b003', 0)], '2026-01-01'), segno('prima', 1, [a('p001-b001', 30)], '2026-01-03'),
    segno('primissima', 1, [a('p001-b001', 2)], '2026-01-04'), segno('pag2', 2, [a('p002-b001', 0)], '2025-01-01'),
    segno('pdf-basso', 3, undefined, '2025-01-01', [{ x: .1, y: .8, w: .2, h: .02 }]), segno('pdf-alto', 3, undefined, '2026-01-01', [{ x: .5, y: .2, w: .2, h: .02 }])];
  assert.deepEqual(ordinaSegniNelTesto(segni).map((s) => s.id), ['primissima', 'prima', 'dopo', 'pag2', 'pdf-alto', 'pdf-basso']);
  const manuale = [segno('m2', 1, [a('manuale-u14-p001-sintesi', 0)], '2025'), segno('m1', 1, [a('manuale-u14-p001-nota-fonte', 9)], '2026')];
  const indice = new Map([['manuale-u14-p001-nota-fonte', 0], ['manuale-u14-p001-sintesi', 1]]);
  assert.deepEqual(ordinaSegniNelTesto(manuale, (id) => indice.get(id)).map((s) => s.id), ['m1', 'm2'], 'blocchi senza numero: ordine del testo caricato');
  assert.deepEqual(posizioneSegno(segno('multi', 1, [a('p001-b004', 0), a('p001-b002', 7)], '2026')).slice(0, 3), [1, 2, 7], 'conta il punto in cui il segno comincia');
  checks++;
}
console.log(`Mappa personale verificata: ${checks} scenari su layout, ordine del testo, concetti condivisi, passaggi senza concetti e testi lunghi.`);
