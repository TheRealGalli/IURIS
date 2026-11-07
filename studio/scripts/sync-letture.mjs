// Pubblica gli estratti Markdown e le revisioni puntuali; nessun PDF viene modificato.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'letture-src');
const catalogo = JSON.parse(await readFile(path.join(source, 'catalogo.json'), 'utf8'));
const revisioni = JSON.parse(await readFile(path.join(source, 'revisioni.json'), 'utf8'));
const links = JSON.parse(await readFile(path.join(source, 'glossario-pilota.json'), 'utf8'));
const fonti = JSON.parse(await readFile(path.join(source, 'fonti-pilota.json'), 'utf8'));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const piano = (s) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id.replace(/-/g, ' ')).replace(/^#{1,6}\s+/gm, '');
const escRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let totale = 0;

for (const doc of catalogo) {
  const outdir = path.join(root, 'public/letture', doc.id);
  await mkdir(outdir, { recursive: true });
  const courseFile = path.join(root, 'public/content', doc.materia, 'corso.json');
  const corso = JSON.parse(await readFile(courseFile, 'utf8'));
  const known = new Set(corso.concetti.map((c) => c.id));
  if (doc.sezioni.some((s) => s.pilota)) doc.fonti = fonti;
  for (const sec of doc.sezioni) {
    const md = await readFile(path.join(source, doc.id, `${sec.id}.md`), 'utf8');
    const matches = [...md.matchAll(/<!-- blocco:([^\s]+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g)];
    const blocchi = matches.map((m) => {
      const id = m[1], pagina = Number(m[2]), originale = m[3].trim();
      let markdown = originale;
      const override = revisioni[doc.id]?.[id];
      if (override) {
        if (override.baseSha256 && override.baseSha256 !== sha(originale)) throw new Error(`Base modificata, verificare la revisione ${doc.id}/${id}`);
        for (const correzione of override.sostituzioni ?? []) {
          if (!markdown.includes(correzione.da)) throw new Error(`Correzione non applicabile: ${doc.id}/${id}`);
          markdown = markdown.replace(correzione.da, correzione.a);
        }
        if (override.markdown !== undefined) markdown = override.markdown;
      }
      // Solo il pilota revisionato riceve collegamenti automatici approvati.
      if (sec.pilota) for (const entry of links) {
        if (!known.has(entry.id)) throw new Error(`Concetto inesistente: ${entry.id}`);
        for (const label of entry.etichette) {
          const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escRegex(label)}(?![\\p{L}\\p{N}_])`, 'iu');
          const parts = markdown.split(/(\[\[[\s\S]*?\]\])/g);
          let linked = false;
          markdown = parts.map((part) => {
            if (linked || part.startsWith('[[')) return part;
            return part.replace(re, (text) => { linked = true; return `[[${entry.id}|${text}]]`; });
          }).join('');
          if (linked) break;
        }
      }
      const concetti = [...new Set([...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((x) => x[1]))];
      for (const id of concetti) if (!known.has(id)) throw new Error(`Collegamento non valido: ${id}`);
      return { id, pagina, markdown, concetti,
        ...(piano(originale) !== piano(markdown) ? { testoFonte: piano(originale) } : {}),
        ...(override?.notaRevisione ? { notaRevisione: override.notaRevisione } : {}) };
    });
    if (!blocchi.length) throw new Error(`Sezione senza blocchi: ${doc.id}/${sec.id}`);
    const file = { documento: doc.id, edizione: doc.edizione, id: sec.id, titolo: sec.titolo, da: sec.da, a: sec.a,
      ...(sec.lezione ? { lezione: sec.lezione } : {}), ...(sec.pilota ? { pilota: true } : {}), blocchi };
    await writeFile(path.join(root, 'public', sec.file), `${JSON.stringify(file, null, 2)}\n`);
    totale += blocchi.length;
  }
}
await writeFile(path.join(root, 'src/lib/letture-catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
console.log(`Letture pubblicate: ${catalogo.length} documenti, ${catalogo.reduce((n, d) => n + d.pagine, 0)} pagine, ${totale} blocchi.`);
