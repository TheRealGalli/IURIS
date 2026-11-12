// Blocchi di un Originale con il loro textContent (come nel lettore): dal repository o, per un documento già tolto,
// dalla storia git (ultima versione presente o `commit`). Usato da allinea-originali.mjs e check-segni-migrati.mjs.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { documento as dom } from './mini-dom.mjs';

const studio = fileURLToPath(new URL('../../', import.meta.url));
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });

/** `md` = modulo src/lib/md.ts (renderMd), `frasiDi` facoltativo per dividere in frasi. */
export function apriVersione(id, { md, frasiDi, commit } = {}) {
  const catalogo = JSON.parse(readFileSync(`${studio}src/lib/letture-catalogo.json`, 'utf8'));
  let doc = catalogo.find((d) => d.id === id), leggi, origine = 'repository attuale';
  if (doc && existsSync(`${studio}public/letture/${id}`) && !commit) {
    leggi = (file) => readFileSync(`${studio}public/${file}`, 'utf8');
  } else {
    let rev = commit;
    if (!rev) {
      const ultimo = git('rev-list', '-1', 'HEAD', '--', `studio/public/letture/${id}`).trim();
      if (!ultimo) throw new Error(`${id}: non trovato neppure nella storia git`);
      rev = git('ls-tree', '--name-only', ultimo, `studio/public/letture/${id}/`).trim() ? ultimo : `${ultimo}^`;
    }
    rev = git('rev-parse', '--short', rev).trim();
    doc = JSON.parse(git('show', `${rev}:studio/src/lib/letture-catalogo.json`)).find((d) => d.id === id);
    if (!doc) throw new Error(`${id} assente dal catalogo del commit ${rev}`);
    leggi = (file) => git('show', `${rev}:studio/public/${file}`);
    origine = `storia git, commit ${rev}`;
  }
  const testoDi = (markdown) => { const d = dom.createElement('div'); d.innerHTML = md.renderMd(markdown); return d.textContent; };
  const visti = new Set(), blocchi = [];
  doc.sezioni.forEach((sec, si) => {
    const s = JSON.parse(leggi(sec.file));
    for (const b of s.blocchi) {
      if (visti.has(b.id)) continue; visti.add(b.id);
      const testo = testoDi(b.markdown);
      blocchi.push({ id: b.id, pagina: b.pagina, sezione: si, lezione: sec.lezione ?? sec.id,
        lezioni: [...new Set([sec.lezione, ...(sec.lezioni ?? [])].filter(Boolean))], testo, frasi: frasiDi ? frasiDi(testo) : undefined });
    }
  });
  return { doc, blocchi, origine };
}
