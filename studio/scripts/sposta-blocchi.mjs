// Riporta in coda alla sezione precedente i blocchi iniziali che ne continuano l'argomento
// (letture-src/confini-sezioni.json). Testo e ID dei blocchi restano intatti; idempotente.
// Uso: node scripts/sposta-blocchi.mjs [--scrivi]   (da rilanciare dopo sezioni-letture.mjs --scrivi)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = fileURLToPath(new URL('../letture-src/', import.meta.url));
const scrivi = process.argv.includes('--scrivi');
const catalogo = JSON.parse(await readFile(path.join(source, 'catalogo.json'), 'utf8'));
const confini = JSON.parse(await readFile(path.join(source, 'confini-sezioni.json'), 'utf8'));
const RE = /<!-- blocco:([^\s]+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g;
const leggi = async (doc, id) => {
  const md = await readFile(path.join(source, doc, `${id}.md`), 'utf8');
  return { testa: md.slice(0, md.indexOf('<!-- blocco:')), blocchi: [...md.matchAll(RE)].map((m) => ({ id: m[1], pagina: Number(m[2]), testo: m[3].trim() })) };
};
const scrive = (doc, id, f) => writeFile(path.join(source, doc, `${id}.md`), `${f.testa}${f.blocchi.map((b) => `<!-- blocco:${b.id} pagina:${b.pagina} -->\n\n${b.testo}\n`).join('\n')}`);
let spostati = 0;
const SPECIALI = new Set(['avanti', 'verificati']);
for (const [docId, sezioni] of Object.entries(confini)) {
  if (docId.startsWith('_') || SPECIALI.has(docId)) continue;
  const doc = catalogo.find((d) => d.id === docId);
  if (!doc) throw new Error(`Documento sconosciuto: ${docId}`);
  for (const [secId, ids] of Object.entries(sezioni)) {
    const i = doc.sezioni.findIndex((s) => s.id === secId);
    if (i < 1) throw new Error(`${docId}/${secId}: sezione assente o senza precedente`);
    const prec = doc.sezioni[i - 1], sec = doc.sezioni[i];
    const a = await leggi(docId, prec.id), b = await leggi(docId, sec.id);
    const giaFatti = ids.filter((id) => a.blocchi.some((x) => x.id === id));
    if (giaFatti.length === ids.length) continue;
    if (giaFatti.length) throw new Error(`${docId}/${secId}: spostamento a metà (${giaFatti.join(', ')})`);
    const testa = b.blocchi.slice(0, ids.length).map((x) => x.id);
    if (testa.join() !== ids.join()) throw new Error(`${docId}/${secId}: i blocchi da spostare devono essere i primi della sezione (${testa.join(', ')})`);
    if (b.blocchi.length <= ids.length) throw new Error(`${docId}/${secId}: la sezione resterebbe vuota`);
    const mossi = b.blocchi.splice(0, ids.length);
    a.blocchi.push(...mossi);
    prec.a = Math.max(prec.a, ...mossi.map((x) => x.pagina));
    sec.da = Math.max(sec.da, b.blocchi[0].pagina);
    spostati += mossi.length;
    console.log(`${docId}: ${mossi.map((x) => x.id).join(', ')} → ${prec.id}`);
    if (scrivi) { await scrive(docId, prec.id, a); await scrive(docId, sec.id, b); }
  }
}
// «avanti»: gli ultimi blocchi di una sezione aprono l'argomento della successiva.
for (const [docId, sezioni] of Object.entries(confini.avanti ?? {})) {
  const doc = catalogo.find((d) => d.id === docId);
  if (!doc) throw new Error(`Documento sconosciuto: ${docId}`);
  for (const [secId, ids] of Object.entries(sezioni)) {
    const i = doc.sezioni.findIndex((s) => s.id === secId);
    if (i < 0 || i === doc.sezioni.length - 1) throw new Error(`${docId}/${secId}: sezione assente o senza successiva`);
    const sec = doc.sezioni[i], succ = doc.sezioni[i + 1];
    const a = await leggi(docId, sec.id), b = await leggi(docId, succ.id);
    const giaFatti = ids.filter((id) => b.blocchi.some((x) => x.id === id));
    if (giaFatti.length === ids.length) continue;
    if (giaFatti.length) throw new Error(`${docId}/${secId}: spostamento a metà (${giaFatti.join(', ')})`);
    const coda = a.blocchi.slice(-ids.length).map((x) => x.id);
    if (coda.join() !== ids.join()) throw new Error(`${docId}/${secId}: i blocchi da spostare devono essere gli ultimi della sezione (${coda.join(', ')})`);
    if (a.blocchi.length <= ids.length) throw new Error(`${docId}/${secId}: la sezione resterebbe vuota`);
    const mossi = a.blocchi.splice(-ids.length);
    b.blocchi.unshift(...mossi);
    succ.da = Math.min(succ.da, ...mossi.map((x) => x.pagina));
    sec.a = Math.min(sec.a, a.blocchi[a.blocchi.length - 1].pagina);
    spostati += mossi.length;
    console.log(`${docId}: ${mossi.map((x) => x.id).join(', ')} → ${succ.id}`);
    if (scrivi) { await scrive(docId, sec.id, a); await scrive(docId, succ.id, b); }
  }
}
if (scrivi && spostati) await writeFile(path.join(source, 'catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
console.log(`Blocchi riportati alla sezione precedente: ${spostati}${scrivi ? '' : ' (prova: aggiungi --scrivi)'}.`);
