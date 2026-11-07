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
const { layoutMappaPersonale } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
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
console.log(`Mappa personale verificata: ${checks} scenari su layout, concetti condivisi, passaggi senza concetti e testi lunghi.`);
