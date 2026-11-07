// Genera i segni di prova sul testo pubblicato ADESSO: servono a verificare che le revisioni successive
// (a capo, elenchi, titoli) non facciano perdere nessun segno. Da rilanciare solo prima di una nuova tornata.
// node scripts/genera-segni-campione.mjs [file-stress.json]
import { readFile, writeFile } from 'node:fs/promises';
import { apriCorpus } from './lib/corpus-letture.mjs';

const C = await apriCorpus();
const out = { generato: new Date().toISOString().slice(0, 10), documenti: {} };
let n = 0;
for (const doc of C.catalogo) {
  if (doc.tipoFonte) continue;
  const segni = [];
  for (const sec of doc.sezioni) {
    const blocchi = await C.sezione(doc, sec);
    for (const b of blocchi) {
      const t = b.testo, prese = [];
      // Una frase centrale per blocco.
      if (t.length >= 40) { const a = Math.floor(t.length * 0.3), z = Math.min(t.length, a + 90); prese.push([a, z]); }
      // Ogni punto numerato scritto in linea («4- Diritto romano come…»): proprio quelli che le revisioni trasformano in voci.
      for (const m of t.matchAll(/(^|\s)(\d{1,2}|[a-h])[-–)]\s+(?=\p{Lu})/gu)) { const a = m.index + m[1].length; prese.push([a, Math.min(t.length, a + 80)]); }
      // Testo diviso da « - » usato come elenco.
      for (const m of t.matchAll(/[.:;] - (?=\p{Lu})/gu)) { const a = m.index; prese.push([a, Math.min(t.length, a + 70)]); }
      for (const [a, z] of prese) {
        const ancora = C.lib.creaAncoraTesto(b, a, z, doc.edizione);
        if (ancora) segni.push({ id: `c${++n}`, pagina: b.pagina, testo: ancora.citazione, tipo: 'evidenziato', colore: 'giallo', rettangoli: [], creata: '2026-11-07T22:00:00Z', ancoreTesto: [ancora] });
      }
    }
  }
  out.documenti[doc.id] = segni;
}
if (process.argv[2]) {
  // Segni del backup di prova (generati in passato sul testo di allora): conservati come secondo campione.
  const b = JSON.parse(await readFile(process.argv[2], 'utf8'));
  out.stress = {};
  for (const m of Object.values(b.materie)) for (const [doc, o] of Object.entries(m.originali ?? {})) out.stress[doc] = (o.segni ?? []).map(({ rettangoli, ...s }) => ({ ...s, rettangoli: [] }));
}
await writeFile(new URL('./fixtures/segni-campione.json', import.meta.url), JSON.stringify(out));
console.log(`Segni di prova: ${n} sul testo attuale${out.stress ? `, ${Object.values(out.stress).flat().length} dal backup di prova` : ''}.`);
await C.chiudi();
