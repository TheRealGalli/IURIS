// Sezioni ben «impacchettate»: nessuna sezione comincia a metà frase o a metà elenco, nessuna finisce
// su un elenco annunciato, e i numeri degli elenchi proseguono da un blocco all'altro.
// Eccezioni verificate a mano: letture-src/confini-sezioni.json («verificati»).
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const json = async (p) => JSON.parse(await readFile(new URL(p, root), 'utf8'));
const catalogo = await json('src/lib/letture-catalogo.json');
const { verificati = {} } = await json('letture-src/confini-sezioni.json');
const piano = (s) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, l) => l || id).replace(/<\/?sup>/g, '').replace(/\*\*/g, '').trim();
const problemi = [];
let sezioni = 0;
for (const doc of catalogo) {
  for (const [i, sec] of doc.sezioni.entries()) {
    if (sec.soloTitolo) continue;
    const { blocchi } = await json(`public/${sec.file}`); sezioni++;
    const segnala = (tipo, b, testo) => { if (!verificati[doc.id]?.[sec.id]?.includes(b.id)) problemi.push(`${doc.id}/${sec.id} ${b.id}: ${tipo} «${testo.slice(0, 70)}»`); };
    const inizio = piano(blocchi[0].markdown);
    if (i > 0 && /^\p{Ll}/u.test(inizio)) segnala('comincia a metà frase', blocchi[0], inizio);
    const n = /^(\d{1,2})[.)-] /.exec(inizio);
    if (i > 0 && n && Number(n[1]) > 1 && !/^#/.test(blocchi[0].markdown)) segnala(`comincia dalla voce ${n[1]} di un elenco`, blocchi[0], inizio);
    const fine = piano(blocchi[blocchi.length - 1].markdown);
    if (i < doc.sezioni.length - 1 && /:$/.test(fine)) segnala('finisce annunciando un elenco', blocchi[blocchi.length - 1], fine.slice(-70));
    // Elenco numerato: la stessa voce ripetuta in blocchi consecutivi («1. … 1. …»).
    for (let j = 1; j < blocchi.length; j++) {
      const voci = (md) => [...md.matchAll(/^(\d{1,2})\. /gm)].map((m) => Number(m[1]));
      const prima = voci(blocchi[j - 1].markdown).pop(), dopo = voci(blocchi[j].markdown)[0];
      if (prima !== undefined && dopo !== undefined && /^\d{1,2}\. /.test(blocchi[j].markdown) && dopo === prima) segnala(`ripete la voce ${dopo}`, blocchi[j], piano(blocchi[j].markdown));
    }
  }
}
// Gli spostamenti decisi a mano sono applicati: ogni blocco sta nella sezione giusta.
const confini = await json('letture-src/confini-sezioni.json');
const sezioneDi = async (doc, id) => (await json(`public/${doc.sezioni.find((s) => s.id === id).file}`)).blocchi.map((b) => b.id);
for (const [docId, voci] of Object.entries(confini)) {
  if (docId.startsWith('_') || docId === 'verificati') continue;
  const avanti = docId === 'avanti';
  for (const [dId, sezioniDoc] of Object.entries(avanti ? voci : { [docId]: voci })) {
    const doc = catalogo.find((d) => d.id === dId);
    for (const [secId, ids] of Object.entries(sezioniDoc)) {
      const i = doc.sezioni.findIndex((s) => s.id === secId), dest = doc.sezioni[avanti ? i + 1 : i - 1];
      const presenti = await sezioneDi(doc, dest.id);
      for (const id of ids) assert(presenti.includes(id), `${dId}/${id} deve stare in ${dest.id}: node scripts/sposta-blocchi.mjs --scrivi`);
    }
  }
}
// Il lettore conserva il numero di partenza degli elenchi spezzati su più blocchi («6. …»).
const client = await readFile(new URL('src/lib/letture-client.ts', root), 'utf8');
assert(/el\.tagName === 'OL' && nome === 'start'/.test(client), 'il lettore deve conservare <ol start>');
if (problemi.length) { console.error(problemi.join('\n')); process.exit(1); }
console.log(`Confini delle letture verificati: ${sezioni} sezioni, nessuna spezzata a metà frase o elenco, numerazione continua.`);
