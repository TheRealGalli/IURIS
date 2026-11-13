// Menu desktop e navigazione concorrente: browser e progressi di prova separati da quelli personali.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const tipi = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
let base = process.env.IURIS_BASE;
if (!base) {
  assert(fs.existsSync(path.join(root, 'index.html')), 'Eseguire prima la build.');
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': tipi[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
}
const errori = [];
let controlli = 0;
const verifica = (ok, messaggio) => { controlli++; if (!ok) errori.push(messaggio); };
const materia = (p, nome) => p.locator('.side').getByRole('button', { name: nome, exact: true });
const titolo = (p) => p.locator('main h1').first();
const pronto = (p) => p.waitForFunction(() => document.querySelector('main h1') && !document.querySelector('main .empty.faint'));
const misure = (p) => p.evaluate(() => {
  const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
  const studio = document.querySelector('.side-studio');
  return { demo: box('.side .demo-link'), backup: box('.side .nav-archivio'), altezza: innerHeight,
    studioVisibile: studio.scrollHeight <= studio.clientHeight + 1 };
});

for (const [nome, motore] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await motore.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('iuris:v1:pref', JSON.stringify({ materia: 'diritto-romano', corso: 'uniba-lmg-1-al' })));
  const p = await ctx.newPage();
  const pagina = [];
  const primaErrori = errori.length;
  p.on('pageerror', (e) => pagina.push(e.message));
  let libera = () => {};
  let liberaMappa = () => {};
  try {
    // La mappa può essere ancora in scaricamento mentre si è già passati ad altre sezioni.
    const attesaMappa = new Promise((r) => { liberaMappa = r; });
    const fileMappa = /\/(?:src\/views\/Mappa\.tsx|assets\/Mappa-[^/]+\.js)(?:\?|$)/;
    await p.route(fileMappa, async (route) => {
      const response = await route.fetch(); await attesaMappa; await route.fulfill({ response });
    });
    await p.goto(base); await pronto(p);
    // Una risposta lenta della prima materia arriva dopo quella già scelta nel frattempo.
    let richiesta;
    const iniziata = new Promise((r) => { richiesta = r; });
    const attesa = new Promise((r) => { libera = r; });
    await p.route('**/content/diritto-privato/corso.json', async (route) => {
      const response = await route.fetch(); richiesta(); await attesa; await route.fulfill({ response });
    });
    await materia(p, 'Istituzioni di diritto privato').click(); await iniziata;
    verifica(await p.locator('.side .nav a[href="#/percorso"]').count() === 1, `${nome}: Studio scompare durante il caricamento`);
    await materia(p, 'Diritto costituzionale').click(); await pronto(p);
    const prima = await titolo(p).innerText();
    const ricevuta = p.waitForResponse((r) => r.url().endsWith('/content/diritto-privato/corso.json'));
    libera(); await ricevuta; await p.waitForTimeout(100);
    verifica((await titolo(p).innerText()) === prima && /costituzionale/i.test(prima), `${nome}: una risposta precedente sostituisce la materia attuale`);
    await p.unroute('**/content/diritto-privato/corso.json');

    // Cambi ripetuti senza attendere il contenuto, con la prima mappa ancora sospesa.
    for (let giro = 0; giro < 4; giro++) for (const sezione of ['mappa', 'originali', 'percorso', 'allena', 'cronologia', 'glossario', 'norme', 'progressi']) {
      await p.locator(`.side .nav a[href="#/${sezione}"]`).click();
      verifica(await p.locator('.side .nav a[href="#/percorso"]').count() === 1, `${nome}: Studio sparito durante il cambio rapido`);
    }
    await pronto(p);
    const mappaRicevuta = p.waitForResponse((r) => fileMappa.test(r.url()));
    liberaMappa(); await mappaRicevuta; await p.waitForTimeout(100);
    verifica((await titolo(p).innerText()) === 'Progressi', `${nome}: la vista scaricata in ritardo sostituisce l'ultima sezione scelta`);

    // Geometria del piede: identica con otto o nove sezioni e nelle pagine a tutta altezza.
    for (const altezza of [600, 720, 900]) {
      await p.setViewportSize({ width: 1280, height: altezza });
      let y;
      for (const nomeMateria of ['Storia del diritto romano', 'Diritto costituzionale', 'Istituzioni di diritto privato']) {
        await materia(p, nomeMateria).click(); await pronto(p);
        for (const sezione of ['percorso', 'originali', 'mappa', 'progressi', 'backup']) {
          await p.locator(`.side a[href="#/${sezione}"]`).click(); await pronto(p);
          const m = await misure(p);
          verifica(m.demo.bottom <= altezza && m.demo.top > 0, `${nome}/${altezza}/${nomeMateria}/${sezione}: Demo fuori schermo`);
          verifica(m.demo.top - m.backup.bottom >= 0 && m.demo.top - m.backup.bottom <= 12, `${nome}/${altezza}: Demo distante da Backup`);
          y ??= m.demo.bottom;
          verifica(Math.abs(m.demo.bottom - y) <= 1, `${nome}/${altezza}: il piede si sposta cambiando pagina o materia`);
          if (altezza >= 720) verifica(m.studioVisibile, `${nome}/${altezza}/${nomeMateria}: le sezioni richiedono scorrimento in una finestra normale`);
        }
      }
    }

    verifica(pagina.length === 0, `${nome}: errori nel browser: ${pagina.join('; ')}`);
    console.log(`${nome}: ${errori.length === primaErrori ? 'navigazione rapida, risposte fuori ordine e piede desktop verificati' : `${errori.length - primaErrori} problemi rilevati`}.`);
  } finally { libera(); liberaMappa(); await ctx.close(); await browser.close(); }
}
await new Promise((r) => server ? server.close(r) : r());
assert.deepEqual(errori, [], errori.join('\n'));
console.log(`Navigazione verificata: ${controlli} controlli su due browser, tre altezze desktop e tre materie.`);
