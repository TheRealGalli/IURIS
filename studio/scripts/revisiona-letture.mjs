// Aggiunge revisioni puntuali a letture-src/revisioni.json senza toccare gli estratti.
// node scripts/revisiona-letture.mjs cerca <documento> "<testo>"   → mostra i blocchi che lo contengono
// node scripts/revisiona-letture.mjs applica <file.json>             → registra le voci, con hash del blocco
// Voce: { doc, da, a?, cerca?, blocco?, tutte?, nota?, markdown? }: «cerca» (o «da») deve individuare un solo blocco.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = fileURLToPath(new URL('../letture-src/', import.meta.url));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const cache = new Map();
async function blocchi(doc) {
  if (cache.has(doc)) return cache.get(doc);
  const out = [];
  for (const f of (await readdir(path.join(source, doc))).filter((f) => f.endsWith('.md')).sort()) {
    const md = await readFile(path.join(source, doc, f), 'utf8');
    for (const m of md.matchAll(/<!-- blocco:([^\s]+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g)) out.push({ id: m[1], pagina: Number(m[2]), testo: m[3].trim(), file: f });
  }
  cache.set(doc, out); return out;
}
const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'cerca') {
  for (const b of (await blocchi(a1)).filter((b) => b.testo.includes(a2))) console.log(`[${b.id} ${b.file}]\n${b.testo}\n`);
} else if (cmd === 'applica') {
  const file = path.join(source, 'revisioni.json'), revisioni = JSON.parse(await readFile(file, 'utf8'));
  const voci = JSON.parse(await readFile(a1, 'utf8'));
  let n = 0;
  for (const v of voci) {
    const tutti = await blocchi(v.doc), chiave = v.cerca ?? v.da;
    const trovati = v.blocco ? tutti.filter((b) => b.id === v.blocco) : tutti.filter((b) => b.testo.includes(chiave));
    if (trovati.length !== 1) throw new Error(`${v.doc}: «${chiave}» individua ${trovati.length} blocchi${trovati.length ? ' (' + trovati.map((b) => b.id).join(', ') + ')' : ''}`);
    const b = trovati[0], doc = (revisioni[v.doc] ??= {});
    const r = (doc[b.id] ??= { baseSha256: sha(b.testo) });
    if (r.baseSha256 !== sha(b.testo)) throw new Error(`Base diversa per ${v.doc}/${b.id}`);
    if (v.a !== undefined && v.da !== undefined) {
      r.sostituzioni ??= [];
      if (!r.sostituzioni.some((s) => s.da === v.da && s.a === v.a)) r.sostituzioni.push({ da: v.da, a: v.a, ...(v.tutte ? { tutte: true } : {}) });
    }
    if (v.markdown !== undefined) r.markdown = v.markdown;
    if (v.nota && !(r.notaRevisione ?? '').includes(v.nota)) r.notaRevisione = r.notaRevisione ? `${r.notaRevisione} ${v.nota}` : v.nota;
    n++;
  }
  await writeFile(file, `${JSON.stringify(revisioni, null, 2)}\n`);
  console.log(`Revisioni registrate: ${n}.`);
}
