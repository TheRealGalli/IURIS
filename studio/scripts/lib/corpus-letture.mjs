// Corpus delle letture come lo vede il lettore: HTML di marked, textContent e unità della mappa (DOM minimo).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { documento } from './mini-dom.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export async function apriCorpus() {
  const server = await createServer({ root, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
  const md = await server.ssrLoadModule('/src/lib/md.ts');
  const geo = await server.ssrLoadModule('/src/lib/mappa-geometrica.ts');
  const lib = await server.ssrLoadModule('/src/lib/letture.ts');
  const catalogo = JSON.parse(await readFile(`${root}src/lib/letture-catalogo.json`, 'utf8'));
  const concetti = new Map();
  const concettiDi = async (materia) => {
    if (!concetti.has(materia)) { const c = JSON.parse(await readFile(`${root}public/content/${materia}/corso.json`, 'utf8')); concetti.set(materia, new Map(c.concetti.map((x) => [x.id, x]))); }
    return concetti.get(materia);
  };
  /** Blocchi pronti (id, pagina, testo, html) di una sezione; `dir` permette di leggere un'istantanea precedente. */
  async function sezione(doc, sec, dir = `${root}public/`) {
    const s = JSON.parse(await readFile(`${dir}${sec.file}`, 'utf8'));
    const c = await concettiDi(doc.materia);
    return s.blocchi.map((b) => {
      const el = documento.createElement('div'); el.innerHTML = md.renderMd(b.markdown, c);
      return { id: b.id, pagina: b.pagina, testo: el.textContent, html: md.renderMd(b.markdown, c), concetti: b.concetti ?? [] };
    });
  }
  const unita = (blocchi) => blocchi.flatMap((b) => geo.strutturaBlocco(b, documento));
  return { server, md, geo, lib, catalogo, sezione, unita, chiudi: () => server.close() };
}
