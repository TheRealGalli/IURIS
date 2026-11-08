#!/usr/bin/env node
/**
 * Controllo responsive sulla build (dist/): iPhone, Android e iPad, in verticale e in orizzontale,
 * con WebKit (il motore di Safari su iOS e iPadOS) e Chromium.
 *
 * Per ogni dispositivo e sezione: nessuno sbordo orizzontale, nessun errore in pagina, campi a 16px
 * (niente zoom automatico di iOS), bersagli touch adeguati, barra in basso o barra laterale secondo la larghezza.
 * Flussi: segnare un passaggio col dito (selezione + Salva) e con Apple Pencil, fogli dal basso sul telefono,
 * selettore dei colori, mappa con gesti touch, pagina Altro, movimento ridotto.
 *
 * Browser: `npx playwright install chromium webkit` (in CI anche `--with-deps`).
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Manca dist/: esegui prima npm run build.');

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPI[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const DISPOSITIVI = [
  ['webkit', 'iPhone SE'], ['webkit', 'iPhone SE (3rd gen)'], ['webkit', 'iPhone 15 Pro'],
  ['webkit', 'iPad Mini'], ['webkit', 'iPad Mini landscape'], ['webkit', 'iPad Pro 11'], ['webkit', 'iPad Pro 11 landscape'],
  ['chromium', 'Pixel 7'], ['chromium', 'iPhone SE'], ['chromium', 'iPad Mini'],
].filter(([, d]) => devices[d]);
const ROTTE = ['/', '/percorso', '/lezione/u01-l1', '/originali', '/allena', '/mappa', '/cronologia', '/glossario', '/concetto/ab-urbe-condita', '/progressi', '/backup', '/altro'];
const SOLO = process.env.DISPOSITIVI?.split(',');

const motori = { webkit, chromium };
let browser = {};
async function avvia(nome) {
  if (browser[nome]) return browser[nome];
  try { return (browser[nome] = await motori[nome].launch()); }
  catch (e) { throw new Error(`${nome} non è installato per Playwright: esegui «npx playwright install chromium webkit».\n${e.message.split('\n')[0]}`); }
}

/** Misure fatte nella pagina: sbordi, campi, bersagli, layout. */
function misura(vw) {
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const sbordi = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right <= vw + 1 && r.left >= -1) continue;
    let tagliato = false;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) { tagliato = true; break; }
    if (!tagliato && getComputedStyle(e).position !== 'fixed') sbordi.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${Math.round(r.left)}→${Math.round(r.right)}`);
  }
  const campi = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea')]
    .filter(vis).map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]).filter(([, f]) => f < 16).map(([e, f]) => `${e.tagName.toLowerCase()}.${e.className.split(' ')[0]} ${f}px`);
  // Bersagli: pulsanti e voci di navigazione almeno 40px (44 con l'area estesa), chip cliccabili almeno 36px.
  const piccoli = [];
  for (const e of document.querySelectorAll('.btn, .tabbar a, .nav a, .materia-btn, .select, .input, .corso-switch, .lettura-attrezzi button')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect();
    const min = e.matches('.originali-colore') ? 30 : 40;
    if (r.height < min - 0.5 || r.width < min - 0.5) piccoli.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} ${Math.round(r.width)}×${Math.round(r.height)} «${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}»`);
  }
  for (const e of document.querySelectorAll('button.chip, a.chip')) { if (vis(e) && e.getBoundingClientRect().height < 35.5) piccoli.push(`chip «${e.textContent.trim().slice(0, 20)}»`); }
  const visibile = (s) => { const e = document.querySelector(s); return !!e && vis(e); };
  return {
    larghezza: Math.max(document.documentElement.scrollWidth, innerWidth), sbordi: sbordi.slice(0, 5), campi, piccoli: piccoli.slice(0, 6),
    tabbar: visibile('.tabbar'), side: visibile('.side'), extra: document.querySelectorAll('.tabbar .tab-extra').length && visibile('.tabbar .tab-extra'),
  };
}

const vaiA = async (p, r) => {
  await p.evaluate((h) => { location.hash = h; }, `#${r}`);
  await p.waitForFunction(() => document.querySelector('.main') && !document.querySelector('.main .empty.faint'), null, { timeout: 15000 });
  if (r === '/originali') await p.waitForSelector('[data-lettura-block] p, [data-lettura-block] li', { timeout: 15000 });
  if (r === '/mappa') await p.waitForSelector('.map-shell, .mg-finestra', { timeout: 15000 });
  await p.waitForTimeout(120);
};

/** Seleziona (come farebbe il dito) un tratto del primo paragrafo lungo. */
const selezionaCol = (p) => p.evaluate(() => {
  const el = [...document.querySelectorAll('[data-lettura-block] p, [data-lettura-block] li')].find((x) => (x.textContent?.length ?? 0) > 80);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const t = w.nextNode();
  el.scrollIntoView({ block: 'center' });
  getSelection().setBaseAndExtent(t, 0, t, Math.min(40, t.length));
});
const segniInPagina = (p) => p.evaluate(() => new Set([...document.querySelectorAll('.lettura-segno')].map((x) => x.dataset.segno ?? x.className + x.textContent)).size);

let controlli = 0;
const errori = [];
try {
  for (const [motore, nome] of DISPOSITIVI) {
    if (SOLO && !SOLO.includes(nome)) continue;
    const d = devices[nome], vw = d.viewport.width, b = await avvia(motore);
    const etichetta = `${nome} (${motore}, ${vw}×${d.viewport.height})`;
    const ctx = await b.newContext({ ...d, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('iuris-test')) { localStorage.setItem('iuris:v1:pref', JSON.stringify({ materia: 'diritto-romano' })); sessionStorage.setItem('iuris-test', '1'); } });
    const p = await ctx.newPage(); const pagina = [];
    p.on('pageerror', (e) => pagina.push(e.message));
    await p.goto(BASE + '#/'); await p.waitForSelector('.main', { timeout: 20000 });
    for (const r of ROTTE) {
      await vaiA(p, r);
      const m = await p.evaluate(misura, vw);
      const dove = `${etichetta} ${r}`;
      if (m.larghezza > vw + 1 || m.sbordi.length) errori.push(`${dove}: sborda in orizzontale (${m.larghezza}px su ${vw}) ${m.sbordi.join(' | ')}`);
      if (m.campi.length) errori.push(`${dove}: campi sotto i 16px (zoom di iOS): ${m.campi.join(', ')}`);
      if (m.piccoli.length) errori.push(`${dove}: bersagli touch troppo piccoli: ${m.piccoli.join(' | ')}`);
      if (vw <= 860 && (!m.tabbar || m.side)) errori.push(`${dove}: sotto 861px servono la barra in basso e niente barra laterale`);
      if (vw > 860 && (!m.side || m.tabbar)) errori.push(`${dove}: da 861px serve la barra laterale`);
      if (vw >= 700 && vw <= 860 && !m.extra) errori.push(`${dove}: su iPad in verticale la barra in basso deve mostrare tutte le sezioni`);
      controlli += 6;
    }

    // Segnare col dito: selezione nativa, poi «Salva» nella barra degli strumenti.
    await vaiA(p, '/originali');
    const prima = await segniInPagina(p);
    await selezionaCol(p);
    await p.waitForFunction(() => !document.querySelector('.lettura-salva')?.disabled, null, { timeout: 5000 });
    const avviso = await p.textContent('.originali-feedback');
    if (!/tocca Salva/.test(avviso ?? '')) errori.push(`${etichetta}: con il touch il messaggio deve dire «tocca Salva» (ora: «${avviso}»)`);
    await p.tap('.lettura-salva');
    await p.waitForFunction(() => /Segno salvato/.test(document.querySelector('.originali-feedback')?.textContent ?? ''), null, { timeout: 5000 })
      .catch(() => errori.push(`${etichetta}: il segno fatto col dito non è stato salvato`));
    if ((await segniInPagina(p)) <= prima) errori.push(`${etichetta}: il segno salvato non compare nel testo`);
    controlli += 3;

    // Barra degli strumenti: sotto i 861px fluttua in basso, sopra la barra delle sezioni e dentro lo schermo.
    if (vw <= 860) {
      const barra = await p.evaluate(() => {
        const a = document.querySelector('.lettura-attrezzi').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect();
        return { sopra: a.bottom <= t.top + 1, dentro: a.left >= 0 && a.right <= innerWidth, fissa: getComputedStyle(document.querySelector('.lettura-attrezzi')).position === 'fixed' };
      });
      if (!barra.fissa || !barra.sopra || !barra.dentro) errori.push(`${etichetta}: barra degli strumenti fuori posto ${JSON.stringify(barra)}`);
      controlli++;
    }
    // Telefono: i colori si aprono da un solo pulsante.
    if (vw <= 560) {
      await p.tap('.lettura-colore-attivo');
      await p.tap('.originali-colori.aperti .originali-colore.verde');
      const ok = await p.evaluate(() => document.querySelector('.lettura')?.dataset.colore === 'verde' && !document.querySelector('.originali-colori.aperti'));
      if (!ok) errori.push(`${etichetta}: il pulsante dei colori non sceglie il colore o non si richiude`);
      controlli++;
    }
    // Pannelli secondari: foglio dal basso, con la barra degli strumenti nascosta.
    if (vw <= 860) {
      await p.tap('button[aria-label^="Segni salvati"]');
      await p.waitForSelector('.lettura-pannello'); await p.waitForTimeout(350); // fine dell'animazione del foglio
      const foglio = await p.evaluate(() => {
        const s = document.querySelector('.lettura-pannello')?.getBoundingClientRect(), l = document.querySelector('.lettura-layout').getBoundingClientRect();
        return s && { basso: Math.abs(s.bottom - l.bottom) < 2, largo: s.width >= l.width - 1, attrezzi: getComputedStyle(document.querySelector('.lettura-attrezzi')).display };
      });
      if (!foglio?.basso || !foglio.largo || foglio.attrezzi !== 'none') errori.push(`${etichetta}: il pannello non si apre come foglio dal basso ${JSON.stringify(foglio)}`);
      await p.tap('button[aria-label="Chiudi pannello"]');
      controlli++;
    }
    // Apple Pencil (iPad): passare sul testo seleziona e salva al distacco della punta.
    if (/iPad/.test(nome)) {
      const primaPenna = await segniInPagina(p);
      await p.evaluate(async () => {
        const el = [...document.querySelectorAll('[data-lettura-block] p, [data-lettura-block] li')].filter((x) => (x.textContent?.length ?? 0) > 120)[1];
        el.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 50));
        const r = el.getBoundingClientRect(), y = r.top + 12, opz = (x, tipo) => ({ bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'pen', isPrimary: true, button: tipo === 'pointermove' ? -1 : 0, buttons: tipo === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
        const t = document.elementFromPoint(r.left + 6, y);
        t.dispatchEvent(new PointerEvent('pointerdown', opz(r.left + 6, 'pointerdown')));
        for (let i = 1; i <= 8; i++) { t.dispatchEvent(new PointerEvent('pointermove', opz(r.left + 6 + (r.width * 0.6) * i / 8, 'pointermove'))); await new Promise((q) => setTimeout(q, 16)); }
        t.dispatchEvent(new PointerEvent('pointerup', opz(r.left + 6 + r.width * 0.6, 'pointerup')));
      });
      await p.waitForFunction(() => /Segno salvato/.test(document.querySelector('.originali-feedback')?.textContent ?? ''), null, { timeout: 5000 })
        .catch(() => errori.push(`${etichetta}: il segno fatto con Apple Pencil non è stato salvato`));
      if ((await segniInPagina(p)) <= primaPenna) errori.push(`${etichetta}: il segno fatto con Apple Pencil non compare nel testo`);
      controlli += 2;
    }

    // Mappe: gesti touch gestiti dallo zoom (niente scorrimento della pagina dentro la finestra), finestra nello schermo.
    await vaiA(p, '/mappa');
    const mappa = await p.evaluate(() => {
      const f = document.querySelector('.mg-finestra') ?? document.querySelector('.map-shell > svg'); const r = f.getBoundingClientRect();
      return { touch: getComputedStyle(f).touchAction, dentro: r.left >= -1 && r.right <= innerWidth + 1, alta: r.height <= innerHeight };
    });
    if (mappa.touch !== 'none' || !mappa.dentro || !mappa.alta) errori.push(`${etichetta}: mappa non adatta al touch ${JSON.stringify(mappa)}`);
    controlli++;

    // Altro: corso e invito WhatsApp raggiungibili anche senza barra laterale.
    await vaiA(p, '/altro');
    if (!(await p.isVisible('.corso-switch-pagina')) || !(await p.isVisible('.invia-materiale-pagina'))) errori.push(`${etichetta}: in Altro mancano il corso o l'invito WhatsApp`);
    controlli++;

    if (pagina.length) errori.push(`${etichetta}: errori in pagina: ${[...new Set(pagina)].slice(0, 3).join(' | ')}`);
    controlli++;
    await ctx.close();
  }

  // Movimento ridotto: transizioni e animazioni azzerate.
  const b = await avvia('webkit');
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro'], reducedMotion: 'reduce', serviceWorkers: 'block' });
  const p = await ctx.newPage(); await p.goto(BASE + '#/'); await p.waitForSelector('.btn');
  const durata = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.btn')).transitionDuration));
  if (!(durata < 0.01)) errori.push(`movimento ridotto non rispettato (transizione ${durata}s)`);
  controlli++;
  await ctx.close();
} finally {
  for (const b of Object.values(browser)) await b.close();
  server.close();
}

if (errori.length) {
  console.error(`Responsive: ${errori.length} problemi\n- ${errori.join('\n- ')}`);
  process.exit(1);
}
console.log(`Responsive verificato: ${controlli} controlli su ${DISPOSITIVI.filter(([, d]) => !SOLO || SOLO.includes(d)).length} dispositivi (WebKit e Chromium), nessuno sbordo, campi a 16px, touch e Apple Pencil.`);
