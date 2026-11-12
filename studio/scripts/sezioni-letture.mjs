// Riorganizza gli estratti in sezioni per lezione del Percorso. Sposta i blocchi
// senza toccarne il testo né gli ID: le revisioni restano in revisioni.json.
// Uso: node scripts/sezioni-letture.mjs [--scrivi] [--solo ID ...]
// Con --solo tocca solo i documenti indicati: quelli già revisionati hanno confini ritoccati a mano
// (confini-sezioni.json, sposta-blocchi.mjs) e non vanno ricalcolati.
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'letture-src');
const scrivi = process.argv.includes('--scrivi');
const solo = process.argv.flatMap((a, i, all) => (all[i - 1] === '--solo' ? [a] : []));
const catalogo = JSON.parse(await readFile(path.join(source, 'catalogo.json'), 'utf8'));
const APPENDICI = {
  'costituzionale-bin-pitruzzella-v1': [
    { id: 'appendice-errata', titolo: 'Errata corrige della VII edizione', da: 172 },
    { id: 'appendice-domande', titolo: 'Domande e risposte', da: 173 },
    { id: 'appendice-costituzione', titolo: 'Testo della Costituzione (versione dell’epoca)', da: 205 },
  ],
};
const FONTE = { 'filosofia-incampo-v1': 'incampo', 'filosofia-moro-v1': 'moro', 'filosofia-cotta-v1': 'cotta',
  'filosofia-ssg-lezioni-v1': 'lezioni', 'filosofia-ssg-incampo-v1': 'incampo',
  'filosofia-mz-barberis-v1': 'barberis', 'filosofia-mz-schauer-v1': 'schauer' };

for (const doc of catalogo) {
  if (solo.length && !solo.includes(doc.id)) continue;
  if (doc.tipoFonte === 'manuale-ricostruito') continue; // Il testo viene direttamente dal Percorso durante sync-letture.
  const corso = JSON.parse(await readFile(path.join(root, 'public/content', doc.materia, 'corso.json'), 'utf8'));
  const lezioni = corso.unita.filter((u) => !FONTE[doc.id] || u.fonte === FONTE[doc.id])
    .flatMap((u) => u.lezioni.map((l) => ({ id: l.id, titolo: l.titolo, da: l.pagine?.[0], a: l.pagine?.[1] ?? l.pagine?.[0] })))
    .filter((l) => Number.isInteger(l.da) && l.da >= 1 && l.da <= doc.pagine)
    .sort((x, y) => x.da - y.da);
  // Una sezione per pagina d'inizio: le lezioni che iniziano sulla stessa pagina la condividono,
  // le pagine di soli titoli restano alla lezione precedente.
  const sezioni = [];
  for (const l of lezioni) {
    const prec = sezioni[sezioni.length - 1];
    if (prec && prec.da === l.da) { prec.lezioni.push(l.id); continue; }
    sezioni.push({ id: l.id, titolo: l.titolo, da: sezioni.length ? l.da : 1, lezione: l.id, lezioni: [l.id] });
  }
  // Pagine in fondo al PDF che non appartengono a nessuna lezione (appendici): sezioni proprie, senza lezione.
  for (const ap of APPENDICI[doc.id] ?? []) sezioni.push({ ...ap, lezioni: [] });
  for (let i = 0; i < sezioni.length; i++) sezioni[i].a = i < sezioni.length - 1 ? sezioni[i + 1].da - 1 : doc.pagine;
  // Blocchi esistenti, nell'ordine dei file attuali.
  const blocchi = [];
  for (const sec of doc.sezioni) {
    const md = await readFile(path.join(source, doc.id, `${sec.id}.md`), 'utf8');
    for (const m of md.matchAll(/<!-- blocco:([^\s]+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g)) blocchi.push({ id: m[1], pagina: Number(m[2]), testo: m[3].trim() });
  }
  const nuove = sezioni.map((s) => ({ id: s.id, titolo: s.titolo, da: s.da, a: s.a, ...(s.lezione ? { lezione: s.lezione } : {}),
    ...(s.lezioni.length > 1 ? { lezioni: s.lezioni } : {}), revisionata: true, file: `letture/${doc.id}/${s.id}.json`,
    ...(doc.sezioni.find((p) => p.id === s.id)?.soloTitolo ? { soloTitolo: true, integrazione: doc.sezioni.find((p) => p.id === s.id).integrazione } : {}) }));
  let usati = 0;
  const testi = nuove.map((s) => {
    const parte = blocchi.filter((b) => b.pagina >= s.da && b.pagina <= s.a); usati += parte.length;
    return `<!-- documento:${doc.id} edizione:${doc.edizione} sezione:${s.id} -->\n\n${parte.map((b) => `<!-- blocco:${b.id} pagina:${b.pagina} -->\n\n${b.testo}\n`).join('\n')}`;
  });
  if (usati !== blocchi.length) throw new Error(`Blocchi persi in ${doc.id}: ${usati}/${blocchi.length}`);
  console.log(doc.id, nuove.map((s) => `${s.id}:${s.da}-${s.a}${s.lezioni ? '+' + s.lezioni.slice(1).join(',') : ''}`).join(' '));
  if (!scrivi) continue;
  const vecchi = (await readdir(path.join(source, doc.id))).filter((f) => f.endsWith('.md'));
  for (const f of vecchi) await rm(path.join(source, doc.id, f));
  await rm(path.join(root, 'public/letture', doc.id), { recursive: true, force: true });
  for (let i = 0; i < nuove.length; i++) await writeFile(path.join(source, doc.id, `${nuove[i].id}.md`), testi[i]);
  doc.sezioni = nuove;
}
if (scrivi) await writeFile(path.join(source, 'catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
