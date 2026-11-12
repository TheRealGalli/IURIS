// Integrità dei contenuti estratti, separata dai test degli ancoraggi personali.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { documento } from './lib/mini-dom.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const docs = await read('src/lib/letture-catalogo.json');
const originali = await read('src/lib/originali-catalogo.json');
const report = await read('letture-src/estrazione-verifica.json');
const senzaLink = (s) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id.replace(/-/g, ' '));
const plain = (s) => senzaLink(s).replace(/^#{1,6}\s+/gm, '');
const tokens = (s) => s.match(/[\p{L}\p{N}_]+/gu) ?? [];
let pages = 0, blocks = 0, sections = 0, pilot = 0;
let soloTesto = 0;
// Testi scritti da IURIS (testoMarkdown nel catalogo): misure dell'impaginazione per documento.
const iuris = new Map();
const titoliFonte = new Map();
const lezioniCorso = new Map();
for (const doc of docs) {
  const pdf = originali.find((d) => d.id === doc.id);
  const audit = report.documenti.find((d) => d.id === doc.id);
  assert(pdf && audit, 'una fonte dichiarata per ogni testo');
  assert.equal(doc.fonteSha256, pdf.sha256); assert.equal(doc.pagine, pdf.pagine);
  if (pdf.testoFonte) {
    // Documento solo testo: nessun PDF pubblicato, l'impronta è quella del testo ripulito in letture-src.
    assert(!pdf.file, `${doc.id}: un documento solo testo non dichiara un PDF`);
    const testo = await readFile(path.join(root, 'letture-src', pdf.testoFonte));
    assert.equal(createHash('sha256').update(testo).digest('hex'), pdf.sha256, `${doc.id}: testo cambiato senza aggiornare il catalogo`);
    assert(!/@|studocu|scaricato da|downloaded by/i.test(testo.toString('utf8')), `${doc.id}: nessun dato di chi ha scaricato il file`);
    if (pdf.testoMarkdown) titoliFonte.set(doc.id, (testo.toString('utf8').match(/^#{1,6} /gm) ?? []).length);
    soloTesto++;
  }
  assert.equal(audit.coperturaToken, true);
  const corso = await read(`public/content/${doc.materia}/corso.json`);
  const known = new Set(corso.concetti.map((c) => c.id));
  const lezioni = new Set(corso.unita.flatMap((u) => u.lezioni.map((l) => l.id)));
  const seen = new Set(), wordCount = new Map(), blockCount = new Map();
  let next = 1;
  for (const sec of doc.sezioni) {
    // Una pagina può essere condivisa con la precedente solo se la sezione dice da quale blocco comincia.
    assert.equal(sec.da, sec.primo ? Math.min(next, sec.da) : next, 'sezioni contigue, senza pagine perse o duplicate');
    if (sec.primo) assert(sec.da === next - 1 && Number(sec.primo.slice(1, 4)) === sec.da, `pagina condivisa senza buchi: ${doc.id}/${sec.id}`);
    assert(sec.a >= sec.da && sec.a <= doc.pagine);
    next = sec.a + 1; sections++;
    assert.equal(sec.file, `letture/${doc.id}/${sec.id}.json`);
    const data = await read(`public/${sec.file}`);
    // La copertura della fonte da sola non rileva una pagina intera fusa in un capoverso.
    // Per i testi IURIS (già in Markdown: costituzionale, romano) controlliamo anche il testo pubblicato
    // e gli elementi che vede chi legge: titoli distinti, capoversi brevi, nessuna parola persa.
    const baseIuris = pdf.testoMarkdown
      ? new Map([...(await readFile(path.join(root, 'letture-src', doc.id, `${sec.id}.md`), 'utf8'))
        .matchAll(/<!-- blocco:([^\s]+) pagina:\d+ -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g)]
        .map((m) => [m[1], m[2].trim()])) : null;
    assert.equal(data.documento, doc.id); assert.equal(data.id, sec.id); assert.equal(data.edizione, doc.edizione);
    assert.equal(data.da, sec.da); assert.equal(data.a, sec.a);
    assert.equal(!!data.soloTitolo, !!sec.soloTitolo);
    assert(data.blocchi.length > 0);
    // Testi IURIS di romano, privato e filosofia A-L, M-Z e SSG: ogni sezione si apre con il titolo della sua lezione (confini-sezioni.json).
    if (['romano-iuris-v1', 'privato-iuris-v1', 'filosofia-al-iuris-v1', 'filosofia-mz-iuris-v1', 'filosofia-ssg-iuris-v1'].includes(doc.id)) assert.match(data.blocchi[0].markdown, /^#{2,3} /, `${doc.id}/${sec.id}: la sezione deve cominciare con un titolo`);
    for (const b of data.blocchi) {
      assert(!seen.has(b.id), 'ID del blocco unico nel documento'); seen.add(b.id);
      assert.match(b.id, /^p\d{3}-b\d{3}$/); assert.equal(Number(b.id.slice(1, 4)), b.pagina);
      assert(b.pagina >= sec.da && b.pagina <= sec.a);
      assert(b.markdown.trim()); assert(Array.isArray(b.concetti));
      if (baseIuris) {
        assert.deepEqual(tokens(plain(b.markdown).replace(/<[^>]+>/g, '')), tokens(plain(baseIuris.get(b.id) ?? '')),
          `${doc.id}/${b.id}: l'impaginazione conserva tutte le parole della fonte, nello stesso ordine`);
        const html = documento.createElement('div'); html.innerHTML = marked.parse(senzaLink(b.markdown));
        if (!iuris.has(doc.id)) iuris.set(doc.id, { titoli: 0, tabelle: 0, capoversi: 0, voci: 0, parole: [] });
        const m = iuris.get(doc.id);
        const visita = (n) => {
          if (/^H[1-6]$/.test(n.tagName ?? '')) m.titoli++;
          if (n.tagName === 'TABLE') m.tabelle++;
          if (n.tagName === 'P' || (n.tagName === 'LI' && !n.children.some((c) => c.tagName === 'P'))) {
            const parole = n.textContent.trim().split(/\s+/).filter(Boolean).length;
            assert(parole > 0 && parole <= 200, `${doc.id}/${b.id}: capoverso o voce d'elenco vuota o troppo lunga (${parole} parole)`);
            if (n.tagName === 'P') { m.capoversi++; m.parole.push(parole); } else m.voci++;
          }
          for (const c of n.children ?? []) visita(c);
        };
        visita(html);
      }
      for (const id of b.concetti) assert(known.has(id), `concetto esistente: ${id}`);
      if (!sec.revisionata) assert.equal(b.notaRevisione, undefined, 'le sezioni non revisionate restano semplici estratti');
      if (!sec.revisionata) assert(!b.markdown.includes('[['), 'collegamenti solo nelle sezioni revisionate');
      wordCount.set(b.pagina, (wordCount.get(b.pagina) ?? 0) + tokens(b.testoFonte ?? plain(b.markdown)).length);
      blockCount.set(b.pagina, (blockCount.get(b.pagina) ?? 0) + 1);
      blocks++;
    }
    for (const l of sec.lezioni ?? (sec.lezione ? [sec.lezione] : [])) {
      assert(lezioni.has(l), `lezione esistente: ${l}`);
      if (!sec.soloTitolo) {
        assert(!lezioniCorso.has(`${doc.materia}:${l}`), `una sola sezione per lezione: ${l}`);
        lezioniCorso.set(`${doc.materia}:${l}`, sec.id);
      }
    }
    if (sec.revisionata) pilot++;
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
assert.equal(docs.length, 6); assert.equal(pages, 1254); assert.equal(soloTesto, 6); assert(pilot >= 2);
assert(!docs.some((d) => d.id === 'romano-manuale-integrazioni-v1'), 'Romano: un solo testo, le unità 14 e 15 sono nel testo IURIS');
assert.deepEqual(docs.filter((d) => d.materia === 'filosofia-del-diritto').map((d) => d.id), ['filosofia-al-iuris-v1'], 'Filosofia A-L: un solo testo (Incampo pp. 1–100, Moro pp. 101–131, Cotta pp. 132–161)');
assert.deepEqual(docs.filter((d) => d.materia === 'filosofia-del-diritto-mz').map((d) => d.id), ['filosofia-mz-iuris-v1'], 'Filosofia M-Z: un solo testo (Barberis pp. 1–56, Schauer pp. 57–132)');
assert.deepEqual(docs.filter((d) => d.materia === 'filosofia-del-diritto-ssg').map((d) => d.id), ['filosofia-ssg-iuris-v1'], 'Filosofia SSG: un solo testo (lezioni del corso pp. 1–192, Incampo pp. 193–221)');
assert.equal(originali.filter((d) => d.file).length, 0, 'nessun PDF pubblicato: tutti gli Originali sono testi IURIS');
// Soglie minime per testo IURIS: titoli distinti dal corpo, capoversi e voci separati, mediana breve.
// Costituzionale: 1.297 titoli, 6 tabelle, ~4.080 capoversi e voci. Romano: vedi piani/fase-romano/originali.md.
// Privato: vedi piani/fase-privato/originali.md. Filosofia A-L, M-Z e SSG: piani/fase-filosofie/originali-al.md, originali-mz.md e originali-ssg.md.
const SOGLIE_IURIS = {
  'costituzionale-iuris-v1': { titoli: 1200, tabelle: 5, capoversiEVoci: 3500, mediana: 80 },
  'romano-iuris-v1': { titoli: 650, tabelle: 1, capoversiEVoci: 2800, mediana: 60 },
  'privato-iuris-v1': { titoli: 900, tabelle: 2, capoversiEVoci: 3600, mediana: 60 },
  'filosofia-al-iuris-v1': { titoli: 450, tabelle: 1, capoversiEVoci: 1900, mediana: 60 },
  'filosofia-mz-iuris-v1': { titoli: 250, tabelle: 0, capoversiEVoci: 1100, mediana: 60 },
  'filosofia-ssg-iuris-v1': { titoli: 600, tabelle: 0, capoversiEVoci: 1600, mediana: 60 },
};
assert.deepEqual([...iuris.keys()].sort(), Object.keys(SOGLIE_IURIS).sort(), 'testi IURIS attesi: costituzionale, romano, privato, filosofia A-L, M-Z e SSG');
const misureIuris = [];
for (const [id, m] of iuris) {
  const s = SOGLIE_IURIS[id];
  const mediana = m.parole.sort((x, y) => x - y)[Math.floor(m.parole.length / 2)];
  assert.equal(m.titoli, titoliFonte.get(id), `${id}: ogni titolo «#» del testo resta un titolo nel testo pubblicato`);
  assert(m.titoli >= s.titoli, `${id}: i titoli «###» devono restare distinti dal corpo del testo (${m.titoli})`);
  assert(m.tabelle >= s.tabelle, `${id}: le tabelle restano tabelle`);
  assert(m.capoversi + m.voci >= s.capoversiEVoci && mediana <= s.mediana, `${id}: capoversi separati (${m.capoversi + m.voci}, mediana ${mediana} parole)`);
  misureIuris.push(`${id}: ${m.titoli} titoli, ${m.tabelle} tabelle, ${m.capoversi} capoversi e ${m.voci} voci d'elenco (mediana dei capoversi ${mediana} parole)`);
}
for (const materia of ['diritto-romano', 'filosofia-del-diritto', 'filosofia-del-diritto-ssg', 'diritto-costituzionale', 'diritto-privato', 'filosofia-del-diritto-mz']) {
  const corso = await read(`public/content/${materia}/corso.json`);
  for (const l of corso.unita.flatMap((u) => u.lezioni)) assert(lezioniCorso.has(`${materia}:${l.id}`), `testo completo accessibile per ${materia}/${l.id}`);
}
// Filosofia A-L (filosofia-al-iuris-v1), il testo di chi usa l'app ogni giorno: apertura identica alla fonte, greco,
// latino e collegamenti al glossario conservati.
const testoAl = await readFile(path.join(root, 'letture-src/testi/filosofia-al-iuris.txt'), 'utf8');
const p1 = await read('public/letture/filosofia-al-iuris-v1/u01-l1.json');
assert.equal(p1.blocchi[0].markdown, '## Filosofia del diritto', 'Filosofia A-L: la prima sezione si apre con il titolo del testo');
const opening = p1.blocchi.find((b) => b.id === 'p001-b006');
const rigaApertura = testoAl.split('\n').find((r) => r.startsWith('Ogni scienza si riconosce dal suo oggetto'));
assert(rigaApertura && plain(opening.markdown) === rigaApertura, 'il capoverso di apertura resta identico alla fonte');
const greco = p1.blocchi.find((b) => b.id === 'p001-b007');
assert(greco.markdown.includes('Ἔστιν ἐπιστήμη τις ἣ θεωρεῖ τὸ ὂν ᾗ ὂν'), 'citazione greca conservata');
assert(greco.markdown.includes('[[aristotele|Aristotele]]'), 'collegamenti al glossario di Filosofia A-L');
assert(p1.blocchi.find((b) => b.id === 'p002-b012').markdown.includes('res cogitans'));
const p2 = await read('public/letture/filosofia-al-iuris-v1/u01-l2.json');
assert(p2.blocchi.find((b) => b.id === 'p006-b001').markdown.includes('nullum crimen sine lege'));
console.log(`Estrazione verificata: ${originali.filter((d) => d.file).length} PDF e ${soloTesto} testi senza PDF, ${pages} pagine originali; ${sections} sezioni, ${blocks} blocchi, copertura di ${lezioniCorso.size} lezioni; fonti, greco e ID conservati.`);
console.log(`Impaginazione dei testi IURIS verificata (nessun capoverso o voce oltre 200 parole, testo integrale conservato): ${misureIuris.join('; ')}.`);
