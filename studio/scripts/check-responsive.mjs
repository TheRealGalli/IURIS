#!/usr/bin/env node
/**
 * Controllo responsive sulla build (dist/): iPhone, Android e iPad, in verticale e in orizzontale,
 * con WebKit (il motore di Safari su iOS e iPadOS) e Chromium.
 *
 * Per ogni dispositivo e sezione: nessuno sbordo orizzontale, nessun errore in pagina, campi a 16px
 * (niente zoom automatico di iOS), bersagli touch adeguati, barra in basso o barra laterale secondo la larghezza.
 * Flussi: segnare un passaggio col dito (selezione + tocco esterno) e con Apple Pencil, fogli dal basso sul telefono,
 * selettore dei colori, mappa con gesti touch, pagina Altro, movimento ridotto.
 *
 * Solo data esame: `SOLO_ESAME=1 DISPOSITIVI='iPhone 16,iPad Pro 11' npm run check:responsive`.
 * Solo lettore: `SOLO_LETTORE=1 DISPOSITIVI='iPhone 16,iPad Pro 11' npm run check:responsive`.
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
  ['webkit', 'iPhone SE'], ['webkit', 'iPhone SE (3rd gen)'], ['webkit', 'iPhone 15 Pro'], ['webkit', 'iPhone 16'],
  ['webkit', 'iPad Mini'], ['webkit', 'iPad Mini landscape'], ['webkit', 'iPad Pro 11'], ['webkit', 'iPad Pro 11 landscape'],
  ['chromium', 'Pixel 7'], ['chromium', 'iPhone SE'], ['chromium', 'iPad Mini'],
].filter(([, d]) => devices[d]);
const ROTTE = ['/', '/percorso', '/lezione/u01-l1', '/originali', '/allena', '/mappa', '/mappa?grafo=1', '/mappa?personale=1', '/cronologia', '/glossario', '/concetto/ab-urbe-condita', '/progressi', '/backup', '/altro'];
const SOLO = process.env.DISPOSITIVI?.split(',');
const SOLO_LETTORE = process.env.SOLO_LETTORE === '1';
const SOLO_ESAME = process.env.SOLO_ESAME === '1';

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
  for (const e of document.querySelectorAll('.btn, .mobile-header button, .mobile-tabs a, .mobile-tabs button, .mobile-map-dock button, .mobile-menu-grid a, .mobile-subjects button, .tabbar a, .nav a, .materia-btn, .select, .input, .corso-switch, .lettura-attrezzi button')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect();
    const min = e.matches('.originali-colore') ? 30 : 40;
    if (r.height < min - 0.5 || r.width < min - 0.5) piccoli.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} ${Math.round(r.width)}×${Math.round(r.height)} «${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}»`);
  }
  for (const e of document.querySelectorAll('button.chip, a.chip')) { if (vis(e) && e.getBoundingClientRect().height < 35.5) piccoli.push(`chip «${e.textContent.trim().slice(0, 20)}»`); }
  // Testo che esce dal proprio pulsante (come «Fonte e comandi» su iPhone): conta solo il testo davvero visibile,
  // non quello accorciato con i puntini di sospensione.
  const tagliati = [];
  for (const e of document.querySelectorAll('button, .btn, a.chip, .mobile-tabs a')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect(); let fuori = 0;
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let t; (t = w.nextNode());) {
      if (!t.textContent.trim() || getComputedStyle(t.parentElement).textOverflow === 'ellipsis') continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const q of rg.getClientRects()) if (q.width) fuori = Math.max(fuori, q.right - r.right, r.left - q.left);
    }
    if (fuori > 1.5) tagliati.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} «${(e.textContent || '').trim().slice(0, 24)}» +${Math.round(fuori)}px`);
  }
  const visibile = (s) => { const e = document.querySelector(s); return !!e && vis(e); };
  return {
    larghezza: Math.max(document.documentElement.scrollWidth, innerWidth), sbordi: sbordi.slice(0, 5), campi, piccoli: piccoli.slice(0, 6), tagliati: tagliati.slice(0, 6),
    tabbar: visibile('.mobile-tabs'), side: visibile('.side'), compact: matchMedia('(max-width: 860px), (max-width: 1280px) and (pointer: coarse)').matches,
  };
}

const vaiA = async (p, r) => {
  await p.evaluate((h) => { location.hash = h; }, `#${r}`);
  await p.waitForFunction(() => document.querySelector('.main') && !document.querySelector('.main .empty.faint'), null, { timeout: 15000 });
  if (r === '/originali') await p.waitForSelector('[data-lettura-block] p, [data-lettura-block] li', { timeout: 15000 });
  if (r.startsWith('/mappa')) await p.waitForSelector('.map-shell, .mg-finestra, .mg-vuota', { timeout: 15000 });
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
    if (!SOLO_LETTORE) {
      // Data dell'esame: un solo selettore su ogni dispositivo. Si salva alla scelta del giorno, mai girando i mesi.
      const apriData = p.locator('.hero-main [data-scelta-data]');
      await apriData.waitFor();
      assert.equal(await p.locator('.hero-main input[type="date"]').count(), 0, `${etichetta}: niente più campo data nativo`);
      const date = await p.evaluate(() => {
        const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const oggi = new Date(), ieri = new Date(), futura = new Date(oggi.getFullYear(), oggi.getMonth() + 3, 15), alternativa = new Date(oggi.getFullYear(), oggi.getMonth() + 4, 20);
        ieri.setDate(oggi.getDate() - 1);
        return { oggi: iso(oggi), ieri: iso(ieri), futura: iso(futura), alternativa: iso(alternativa) };
      });
      const salvata = () => p.evaluate(() => JSON.parse(localStorage.getItem('iuris:v1:prog:diritto-romano') ?? '{}').esame);
      const tocca = (l) => (d.hasTouch ? l.tap() : l.click());
      const avanti = p.locator('.sd-pop').getByRole('button', { name: 'Mese successivo', exact: true });
      await tocca(apriData);
      const riquadro = p.locator('.sd-pop');
      await riquadro.waitFor();
      // si misura a animazione d'entrata finita (fade-in sposta di 4px durante la comparsa)
      await riquadro.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
      const box = await riquadro.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= vw + 1 && box.y >= 0 && box.y + box.height <= d.viewport.height + 1, `${etichetta}: calendario fuori dallo schermo (${JSON.stringify(box)} in ${vw}×${d.viewport.height})`);
      if (d.hasTouch) for (const g of await riquadro.locator('.sd-g').all().then((x) => x.slice(0, 7))) {
        const r = await g.boundingBox(); assert(r.width >= 36 && r.height >= 36, `${etichetta}: giorni troppo piccoli da toccare (${Math.round(r.width)}×${Math.round(r.height)})`);
      }
      assert.equal(await riquadro.locator(`[data-date="${date.oggi}"]`).evaluate((el) => el === document.activeElement), true, `${etichetta}: all'apertura il fuoco va su oggi`);
      if (await riquadro.locator(`[data-date="${date.ieri}"]`).count()) assert(await riquadro.locator(`[data-date="${date.ieri}"]`).isDisabled(), `${etichetta}: i giorni passati non si scelgono`);
      // girare i mesi non salva niente
      for (let k = 0; k < 3; k++) await tocca(avanti);
      assert.equal(await salvata(), undefined, `${etichetta}: girare il mese ha salvato una data`);
      // nemmeno chiudere senza scegliere
      await tocca(p.getByRole('button', { name: 'Annulla', exact: true }));
      assert.equal(await riquadro.count(), 0); assert.equal(await salvata(), undefined, `${etichetta}: Annulla ha salvato una data`);
      await tocca(apriData);
      for (let k = 0; k < 3; k++) await tocca(avanti);
      await tocca(riquadro.locator(`[data-date="${date.futura}"]`));
      assert.equal(await salvata(), date.futura, `${etichetta}: data finale diversa da quella scelta`);
      assert.equal(await riquadro.count(), 0, `${etichetta}: il calendario resta aperto dopo la scelta`);
      await p.reload(); await p.waitForSelector('.hero-main');
      assert.equal(await salvata(), date.futura, `${etichetta}: data persa dopo il ricaricamento`);
      const cambia = p.locator('.hero-main').getByRole('button', { name: /^Cambia/ });
      await tocca(cambia);
      assert.equal(await riquadro.locator('.sd-g.on').getAttribute('data-date'), date.futura, `${etichetta}: il calendario non si apre sulla data salvata`);
      await tocca(avanti);
      assert.equal(await salvata(), date.futura, `${etichetta}: girare il mese ha cambiato la data salvata`);
      await p.keyboard.press('Escape');
      await riquadro.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
      assert.equal(await riquadro.count(), 0, `${etichetta}: Esc non chiude il calendario`); assert.equal(await salvata(), date.futura, `${etichetta}: Esc ha modificato la data salvata`);
      // tastiera: frecce e Pag↓ spostano soltanto, Invio sceglie
      await tocca(cambia);
      await p.keyboard.press('PageDown'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowDown');
      assert.equal(await salvata(), date.futura, `${etichetta}: le frecce hanno cambiato la data salvata`);
      const sulFuoco = await p.evaluate(() => document.activeElement?.getAttribute('data-date'));
      assert(sulFuoco && sulFuoco !== date.futura, `${etichetta}: le frecce non spostano il giorno`);
      await p.keyboard.press('Enter');
      assert.equal(await salvata(), sulFuoco, `${etichetta}: Invio non ha scelto il giorno indicato`);
      await tocca(cambia);
      await tocca(p.getByRole('button', { name: 'Rimuovi data', exact: true }));
      assert.equal(await salvata(), undefined);
      await apriData.waitFor();
      assert.deepEqual(pagina, []);
      controlli += 14;
      if (SOLO_ESAME) {
        await ctx.close(); console.log(`Data esame verificata: ${etichetta}`);
        continue;
      }
    }
    for (const r of SOLO_LETTORE ? ['/originali'] : ROTTE) {
      await vaiA(p, r);
      const m = await p.evaluate(misura, vw);
      const dove = `${etichetta} ${r}`;
      if (m.larghezza > vw + 1 || m.sbordi.length) errori.push(`${dove}: sborda in orizzontale (${m.larghezza}px su ${vw}) ${m.sbordi.join(' | ')}`);
      if (m.campi.length) errori.push(`${dove}: campi sotto i 16px (zoom di iOS): ${m.campi.join(', ')}`);
      if (m.piccoli.length) errori.push(`${dove}: bersagli touch troppo piccoli: ${m.piccoli.join(' | ')}`);
      if (m.tagliati.length) errori.push(`${dove}: testo che esce dai pulsanti: ${m.tagliati.join(' | ')}`);
      if (m.compact && (m.side || !m.tabbar)) errori.push(`${dove}: navigazione mobile errata (menu compatto, barra a due voci in tutte le sezioni)`);
      if (!m.compact && (!m.side || m.tabbar)) errori.push(`${dove}: desktop senza la barra laterale`);
      controlli += 6;
    }

    if (!SOLO_LETTORE) {
    // Corso e materia sono nel menu, accessibile dalla barra compatta.
    await vaiA(p, '/');
    await p.tap('.mobile-tabs button[aria-label="Apri menu"]');
    await p.tap('.mobile-course-card');
    await p.waitForSelector('.mobile-navigation-sheet');
    if (!(await p.isVisible('.mobile-navigation-sheet select[aria-label="Corso di studio"]')) || await p.locator('.mobile-subjects button[aria-pressed]').count() < 2) errori.push(`${etichetta}: corso o materie non raggiungibili dal menu`);
    await p.tap('button[aria-label="Chiudi corso e materie"]');
    await p.locator('.mobile-tabs button[aria-label="Apri menu"]').tap();
    if (await p.locator('.mobile-menu-grid a').count() !== 8 || !(await p.isVisible('.mobile-menu-utilities a[href="#/backup"]'))) errori.push(`${etichetta}: nel menu mancano sezioni o backup`);
    await p.tap('.mobile-menu-grid a[href="#/originali"]');
    await p.waitForSelector('[data-lettura-block]');
    controlli += 2;

    }

    // Selezione nativa, scelta del colore e conferma con un tocco esterno.
    await vaiA(p, '/originali');
    const prima = await segniInPagina(p);
    await selezionaCol(p);
    await p.waitForFunction(() => document.querySelector('.lettura')?.dataset.bozza === 'true', null, { timeout: 5000 });
    const avviso = await p.textContent('.originali-feedback');
    if (!/Tocca fuori/.test(avviso ?? '')) errori.push(`${etichetta}: manca l'indicazione del salvataggio al tocco`);
    if (await p.locator('.lettura-salva').count()) errori.push(`${etichetta}: sul touch non deve comparire il tasto Salva`);
    await p.tap('.lettura-colore-attivo');
    await p.tap('.originali-colori.aperti .originali-colore.rosa');
    if (await segniInPagina(p) !== prima) errori.push(`${etichetta}: scegliere il colore non deve confermare il segno`);
    // Uno scorrimento con il dito non è una conferma.
    await p.evaluate(() => {
      const el = document.querySelector('.lettura-viewport'), r = el.getBoundingClientRect();
      const options = (y) => ({ bubbles: true, pointerId: 31, pointerType: 'touch', isPrimary: true, button: 0, clientX: r.left + 6, clientY: r.top + y });
      el.dispatchEvent(new PointerEvent('pointerdown', options(15)));
      el.dispatchEvent(new PointerEvent('pointermove', options(65)));
      el.dispatchEvent(new PointerEvent('pointerup', options(65)));
    });
    if (await segniInPagina(p) !== prima) errori.push(`${etichetta}: lo scorrimento ha confermato il segno`);
    const toccaFuori = async () => {
      const r = await p.locator('.lettura-viewport').boundingBox();
      await p.touchscreen.tap(r.x + 6, r.y + 12);
    };
    await toccaFuori();
    await p.waitForFunction(() => /Segno salvato/.test(document.querySelector('.originali-feedback')?.textContent ?? ''), null, { timeout: 5000 });
    const rosaSalvato = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('iuris:v1:prog:diritto-romano') ?? '{}').originali ?? {}).some(d => d.segni?.some(s => s.colore === 'rosa')));
    if ((await segniInPagina(p)) !== prima + 1 || !rosaSalvato) errori.push(`${etichetta}: il tocco esterno non ha salvato un unico segno rosa`);
    await toccaFuori();
    if (await segniInPagina(p) !== prima + 1) errori.push(`${etichetta}: un secondo tocco ha duplicato il segno`);
    await p.tap('button[aria-label="Annulla ultima modifica ai segni"]');
    if (await segniInPagina(p) !== prima) errori.push(`${etichetta}: Annulla non recupera il salvataggio al tocco`);
    if (await p.isVisible('button[aria-label="Ripristina modifica ai segni"]')) await p.tap('button[aria-label="Ripristina modifica ai segni"]');
    else {
      await p.tap('.mobile-reader-choose'); await p.tap('button[aria-label="Fonti e scorciatoie"]');
      await p.tap('[data-mobile-redo]'); await p.tap('button[aria-label="Chiudi pannello"]');
    }
    if (await segniInPagina(p) !== prima + 1) errori.push(`${etichetta}: Ripristina non recupera il segno`);
    await p.reload();
    await p.waitForSelector('.lettura-segno', { state: 'attached', timeout: 8000 });
    if (await segniInPagina(p) !== prima + 1) errori.push(`${etichetta}: il segno non persiste dopo il ricaricamento`);
    controlli += 8;

    const barra = await p.evaluate(() => {
      const a = document.querySelector('.lettura-attrezzi').getBoundingClientRect(), v = document.querySelector('.lettura-viewport').getBoundingClientRect();
      return { alto: a.bottom <= v.top + 1 && a.height < 100, dentro: a.left >= 0 && a.right <= innerWidth, menu: !!document.querySelector('.mobile-tabs') };
    });
    if (!barra.alto || !barra.dentro || !barra.menu) errori.push(`${etichetta}: strumenti in alto o menu in basso fuori posto ${JSON.stringify(barra)}`);
    controlli++;
    // Telefono: i colori si aprono da un solo pulsante.
    if (vw <= 560) {
      await p.tap('.lettura-colore-attivo');
      await p.tap('.originali-colori.aperti .originali-colore.verde');
      const ok = await p.evaluate(() => document.querySelector('.lettura')?.dataset.colore === 'verde' && !document.querySelector('.originali-colori.aperti'));
      if (!ok) errori.push(`${etichetta}: il pulsante dei colori non sceglie il colore o non si richiude`);
      controlli++;
    }
    // Pannelli secondari: foglio dal basso, con la barra degli strumenti stabile in alto.
    if (await p.locator('.shell-mobile').count()) {
      await p.tap('.mobile-reader-choose');
      await p.tap('button[aria-label^="Segni salvati"]');
      await p.waitForSelector('.lettura-pannello'); await p.waitForTimeout(350); // fine dell'animazione del foglio
      const foglio = await p.evaluate(() => {
        const s = document.querySelector('.lettura-pannello')?.getBoundingClientRect(), l = document.querySelector('.lettura-layout').getBoundingClientRect();
        return s && { basso: Math.abs(s.bottom - l.bottom) < 2, largo: s.width >= l.width - 1, attrezzi: getComputedStyle(document.querySelector('.lettura-attrezzi')).display };
      });
      if (!foglio?.basso || !foglio.largo || foglio.attrezzi !== 'flex') errori.push(`${etichetta}: il pannello non si apre come foglio dal basso ${JSON.stringify(foglio)}`);
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

    await p.tap('.mobile-reader-choose');
    const altroDoc = await p.locator('.mobile-reader-sheet select[aria-label="Scegli il documento originale"] option').last().getAttribute('value');
    await p.selectOption('.mobile-reader-sheet select[aria-label="Scegli il documento originale"]', altroDoc);
    await p.waitForSelector('.mobile-reader-sheet select[aria-label="Sezione del testo"]');
    const sezioni = await p.locator('.mobile-reader-sheet select[aria-label="Sezione del testo"] option').all();
    if (sezioni.length > 1) await p.selectOption('.mobile-reader-sheet select[aria-label="Sezione del testo"]', await sezioni[1].getAttribute('value'));
    else await p.tap('button[aria-label="Chiudi testo e sezione"]');
    await p.waitForSelector('[data-lettura-block]');
    controlli++;

    if (!SOLO_LETTORE) {
    await p.tap('.mobile-reader-choose');
    await p.selectOption('.mobile-reader-sheet select[aria-label="Scegli il documento originale"]', { index: 0 });
    const foglioTesto = await p.evaluate(misura, vw);
    if (foglioTesto.tagliati.length || foglioTesto.sbordi.length) errori.push(`${etichetta}: pulsanti del foglio Testo e sezione fuori misura ${JSON.stringify(foglioTesto.tagliati)}`);
    await p.tap('button[aria-label="Chiudi testo e sezione"]');
    controlli++;
    // Mappe: gesti touch gestiti dallo zoom (niente scorrimento della pagina dentro la finestra), finestra nello schermo.
    await vaiA(p, '/mappa');
    const mappa = await p.evaluate(() => {
      const f = document.querySelector('.mg-finestra') ?? document.querySelector('.map-shell > svg'); const r = f.getBoundingClientRect();
      return { touch: getComputedStyle(f).touchAction, dentro: r.left >= -1 && r.right <= innerWidth + 1, alta: r.height <= innerHeight };
    });
    if (mappa.touch !== 'none' || !mappa.dentro || !mappa.alta) errori.push(`${etichetta}: mappa non adatta al touch ${JSON.stringify(mappa)}`);
    controlli++;

    for (const r of ['/mappa', '/mappa?grafo=1']) {
      await vaiA(p, r);
      const spazio = await p.evaluate(() => {
        const r = document.querySelector('.map-shell > svg').getBoundingClientRect();
        return { ratio: r.height / innerHeight, coperta: !!document.querySelector('.map-tools'), menu: !!document.querySelector('.mobile-tabs'), dock: !!document.querySelector('.mobile-map-dock') };
      });
      if (spazio.ratio < .60 || spazio.coperta || spazio.dock || !spazio.menu) errori.push(`${etichetta} ${r}: mappa coperta dai comandi ${JSON.stringify(spazio)}`);
      await p.tap('.mobile-map-filters');
      await p.waitForSelector('.mobile-map-sheet');
      const m = await p.evaluate(misura, vw);
      if (m.sbordi.length || m.campi.length || m.piccoli.length || m.tagliati.length) errori.push(`${etichetta}: strumenti mappa non adatti al touch ${JSON.stringify(m)}`);
      await p.tap('button[aria-label="Chiudi strumenti mappa"]');
      controlli += 2;
    }
    // Per unità: nessuna barra sopra la mappa, l'unità si sceglie dal foglio degli strumenti.
    await vaiA(p, '/mappa');
    if (await p.locator('.map-page-header select').count()) errori.push(`${etichetta}: la scelta dell'unità deve stare negli strumenti, non sopra la mappa`);
    await p.tap('.mobile-map-filters');
    if (!(await p.isVisible('.mobile-map-sheet select[aria-label="Scegli l’unità della mappa"]'))) errori.push(`${etichetta}: manca la scelta dell'unità negli strumenti`);
    await p.tap('button[aria-label="Chiudi strumenti mappa"]');
    // Collegamenti: il concetto scelto è una scheda compatta in basso a sinistra; Dettagli apre il foglio.
    await vaiA(p, '/mappa?grafo=1&c=ab-urbe-condita');
    await p.waitForSelector('.map-node-card');
    const scheda = await p.evaluate(() => {
      const c = document.querySelector('.map-node-card').getBoundingClientRect(), t = document.querySelector('.mobile-tabs').getBoundingClientRect();
      const sovrapposta = !(c.right <= t.left || c.left >= t.right || c.bottom <= t.top || c.top >= t.bottom);
      return { sovrapposta, dentro: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight, alta: c.height, nome: document.querySelector('.map-node-card b').scrollWidth > 40 };
    });
    if (scheda.sovrapposta || !scheda.dentro || scheda.alta > 80) errori.push(`${etichetta}: scheda del concetto fuori posto ${JSON.stringify(scheda)}`);
    await p.tap('.map-node-card-main');
    await p.waitForSelector('.map-detail-sheet .map-panel-sheet');
    await p.tap('.map-detail-sheet .mobile-sheet-header button');
    controlli += 3;
    await vaiA(p, '/mappa?personale=1');
    await p.waitForSelector('.mobile-geo-toolbar');
    if (!(await p.isVisible('.mg-fasce .mg-scheda, .mg-vuota'))) errori.push(`${etichetta}: la mappa personale deve aprirsi nelle schede compatte`);
    await p.tap('button[aria-label="Visualizza mappa personale"]');
    await p.waitForSelector('.mobile-geo-sheet');
    await p.tap('button[aria-label="Chiudi mappa personale"]');
    controlli++;

    // Quiz: scelta modalità e opzioni in due fogli, senza lunghe griglie iniziali.
    await vaiA(p, '/allena');
    await p.tap('.mobile-training-choice');
    await p.locator('.mobile-training-sheet .setup-opt').filter({ hasText: 'Quiz libero' }).tap();
    await p.tap('.mobile-training-filters');
    await p.waitForSelector('.mobile-training-sheet');
    await p.locator('.mobile-training-sheet .chip').filter({ hasText: /^10$/ }).tap();
    await p.locator('.mobile-training-sheet .mobile-map-done').tap();
    if (!/10 domande/.test(await p.textContent('.mobile-training-filters'))) errori.push(`${etichetta}: quantità del quiz non aggiornata`);
    controlli++;

    // Glossario: ricerca e filtri funzionano senza coprire l'elenco di termini.
    await vaiA(p, '/glossario');
    await p.fill('input[aria-label="Cerca nel glossario"]', 'imperium');
    if (!(await p.locator('.term').count())) errori.push(`${etichetta}: ricerca glossario senza risultati`);
    await p.tap('.mobile-glossary-filters');
    await p.waitForSelector('.mobile-glossary-sheet');
    await p.tap('.mobile-glossary-sheet .mobile-map-done');
    controlli++;

    // Altro: corso e invito WhatsApp raggiungibili anche senza barra laterale.
    await vaiA(p, '/altro');
    if (!(await p.isVisible('.corso-switch-pagina')) || !(await p.isVisible('.invia-materiale-pagina'))) errori.push(`${etichetta}: in Altro mancano il corso o l'invito WhatsApp`);
    controlli++;

    }

    if (pagina.length) errori.push(`${etichetta}: errori in pagina: ${[...new Set(pagina)].slice(0, 3).join(' | ')}`);
    controlli++;
    await ctx.close();
    console.log(`Verificato ${etichetta}`);
  }

  // Movimento ridotto: transizioni e animazioni azzerate.
  const b = await avvia('webkit');
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro'], reducedMotion: 'reduce', serviceWorkers: 'block' });
  const p = await ctx.newPage(); await p.goto(BASE + '#/'); await p.waitForSelector('.main .btn');
  const durata = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.main .btn')).transitionDuration));
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
