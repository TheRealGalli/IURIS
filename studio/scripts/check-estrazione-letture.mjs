// Integrità dei contenuti estratti, separata dai test degli ancoraggi personali.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const docs = await read('src/lib/letture-catalogo.json');
const originali = await read('src/lib/originali-catalogo.json');
const report = await read('letture-src/estrazione-verifica.json');
const plain = (s) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id.replace(/-/g, ' ')).replace(/^#{1,6}\s+/gm, '');
const tokens = (s) => s.match(/[\p{L}\p{N}_]+/gu) ?? [];
let pages = 0, blocks = 0, sections = 0, pilot = 0;
for (const doc of docs) {
  const pdf = originali.find((d) => d.id === doc.id);
  const audit = report.documenti.find((d) => d.id === doc.id);
  assert(pdf && audit, 'una fonte dichiarata per ogni testo');
  assert.equal(doc.fonteSha256, pdf.sha256); assert.equal(doc.pagine, pdf.pagine);
  assert.equal(audit.coperturaToken, true);
  const known = new Set((await read(`public/content/${doc.materia}/corso.json`)).concetti.map((c) => c.id));
  const seen = new Set(), wordCount = new Map(), blockCount = new Map();
  let next = 1;
  for (const sec of doc.sezioni) {
    assert.equal(sec.da, next, 'sezioni contigue, senza pagine perse o duplicate');
    assert(sec.a >= sec.da && sec.a <= doc.pagine);
    next = sec.a + 1; sections++;
    assert.equal(sec.file, `letture/${doc.id}/${sec.id}.json`);
    const data = await read(`public/${sec.file}`);
    assert.equal(data.documento, doc.id); assert.equal(data.id, sec.id); assert.equal(data.edizione, doc.edizione);
    assert.equal(data.da, sec.da); assert.equal(data.a, sec.a);
    assert(data.blocchi.length > 0);
    for (const b of data.blocchi) {
      assert(!seen.has(b.id), 'ID del blocco unico nel documento'); seen.add(b.id);
      assert.match(b.id, /^p\d{3}-b\d{3}$/); assert.equal(Number(b.id.slice(1, 4)), b.pagina);
      assert(b.pagina >= sec.da && b.pagina <= sec.a);
      assert(b.markdown.trim()); assert(Array.isArray(b.concetti));
      for (const id of b.concetti) assert(known.has(id), `concetto esistente: ${id}`);
      if (!sec.pilota) assert.equal(b.notaRevisione, undefined, 'le altre sezioni restano semplici estratti');
      wordCount.set(b.pagina, (wordCount.get(b.pagina) ?? 0) + tokens(b.testoFonte ?? plain(b.markdown)).length);
      blockCount.set(b.pagina, (blockCount.get(b.pagina) ?? 0) + 1);
      blocks++;
    }
    if (sec.pilota) {
      pilot++;
      assert.equal(doc.id, 'filosofia-incampo-v1'); assert(['u01-l1', 'u01-l2'].includes(sec.lezione));
    }
  }
  assert.equal(next, doc.pagine + 1);
  for (const p of audit.pagineDettaglio) {
    assert.equal(p.coperturaToken, true);
    assert.equal(blockCount.get(p.pagina) ?? 0, p.blocchi, 'stesso numero di blocchi dopo la revisione');
    assert.equal(wordCount.get(p.pagina) ?? 0, p.parole, 'testo di fonte recuperabile per ogni pagina, comprese quelle rettificate');
  }
  assert.equal(seen.size, audit.blocchi);
  pages += doc.pagine;
}
assert.equal(docs.length, 4); assert.equal(pages, 384); assert.equal(pilot, 2);
const p1 = await read('public/letture/filosofia-incampo-v1/u01-l1.json');
const opening = p1.blocchi.find((b) => b.id === 'p001-b002');
assert.equal(plain(opening.markdown), 'A differenza delle altre scienze, che hanno un oggetto ben definito, la filosofia non possiede un contenuto determinato. La sua peculiarità non risiede nel suo oggetto, ma piuttosto nelle sue domande.', 'il passaggio del segno preesistente resta identico');
assert(p1.blocchi.some((b) => b.markdown.includes('Ἔστιν') && b.markdown.includes('ὂν')), 'citazione greca conservata');
assert(p1.blocchi.find((b) => b.id === 'p002-b010').markdown.includes('res cogitans'));
assert(p1.blocchi.find((b) => b.id === 'p001-b008').testoFonte.includes('non è'));
const p2 = await read('public/letture/filosofia-incampo-v1/u01-l2.json');
assert(p2.blocchi.find((b) => b.id === 'p006-b001').markdown.includes('nullum crimen sine lege'));
assert(p2.blocchi.find((b) => b.id === 'p005-b004').notaRevisione.includes('resta da verificare'));
console.log(`Estrazione verificata: ${docs.length} PDF, ${pages} pagine, ${sections} sezioni, ${blocks} blocchi; fonti recuperabili, greco e ID conservati, 2 sezioni pilota.`);
