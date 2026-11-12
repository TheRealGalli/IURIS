#!/usr/bin/env node
/**
 * Mappa personale nel browser (dist/): ~300 segni di prova per ognuno dei sei testi IURIS, Chromium e WebKit,
 * PC 1366×860, iPad Pro 11 e iPhone 16, tema chiaro e scuro.
 *
 * Controlla il layout a fasce: le schede della stessa sezione stanno sulla stessa riga (a capo dopo 3–4), titoli
 * leggibili anche con «Adatta», schede compatte che mostrano tutto al passaggio (o al primo tocco), collegamenti spenti
 * di base e accesi solo al passaggio su una scheda o su un concetto, nessuna etichetta sopra una scheda, interruttore
 * «Mostra tutti i collegamenti», pannello della mappa nel lettore, tempi di disegno.
 *
 * `FOTO=<cartella>` salva una schermata per materia (e una con un collegamento acceso); `PREFISSO=prima` con
 * `SOLO_FOTO=1` serve a fotografare una build precedente senza controlli. `DIST=<cartella>` sceglie la build.
 * `CONFIG=pc-chromium,ipad` limita le configurazioni; `MATERIE=diritto-romano,…` le materie.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';
import { segniMappa } from './lib/segni-mappa.mjs';

const qui = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.DIST ?? path.join(qui, '..', 'dist'));
assert.ok(fs.existsSync(path.join(root, 'index.html')), `Manca ${root}/index.html: esegui prima la build.`);
const FOTO = process.env.FOTO ? path.resolve(process.env.FOTO) : '';
const PREFISSO = process.env.PREFISSO ?? 'dopo';
const SOLO_FOTO = process.env.SOLO_FOTO === '1';
if (FOTO) fs.mkdirSync(FOTO, { recursive: true });

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

const CORSO = { 'diritto-romano': 'uniba-lmg-1-al', 'diritto-privato': 'uniba-lmg-1-al', 'diritto-costituzionale': 'uniba-lmg-1-al', 'filosofia-del-diritto': 'uniba-lmg-1-al', 'filosofia-del-diritto-mz': 'uniba-lmg-1-mz', 'filosofia-del-diritto-ssg': 'uniba-ssg-1' };
const CONFIG = [
  { id: 'pc-chromium', motore: chromium, opz: { viewport: { width: 1366, height: 860 } }, pc: true },
  { id: 'pc-webkit', motore: webkit, opz: { viewport: { width: 1366, height: 860 } }, pc: true },
  { id: 'ipad', motore: webkit, opz: { ...devices['iPad Pro 11 landscape'] }, touch: true },
  { id: 'telefono', motore: webkit, opz: { ...devices['iPhone 16'] }, touch: true, telefono: true },
].filter((c) => !process.env.CONFIG || process.env.CONFIG.split(',').includes(c.id));

const tutti = await segniMappa();
const documenti = Object.entries(tutti).filter(([, d]) => !process.env.MATERIE || process.env.MATERIE.split(',').includes(d.materia));
assert.equal(Object.keys(tutti).length, 6, 'sei testi IURIS con segni di prova');
for (const [id, d] of Object.entries(tutti)) assert(d.segni.length >= 280, `${id}: segni di prova ${d.segni.length}`);

// Caso denso: 300 segni, ogni frase delle tre lezioni più lunghe di Romano (circa 100 parti segnate per lezione).
const denso = process.env.MATERIE && !process.env.MATERIE.includes('diritto-romano') ? null : (await segniMappa({ densi: 3, perDensa: 100, solo: ['romano-iuris-v1'] }))['romano-iuris-v1'];
const errori = [], tempi = [];
let controlli = 0;
const verifica = (ok, msg) => { controlli++; if (!ok) errori.push(msg); };

/** Misure del layout nella pagina: righe di schede, schede compatte, collegamenti, etichette. */
const misuraLayout = () => {
  const r = (e) => e.getBoundingClientRect();
  const schede = [...document.querySelectorAll('.mg-scheda')];
  const righe = [...document.querySelectorAll('.mg-schede')].map((g) => {
    const s = [...g.children].filter((x) => x.classList.contains('mg-scheda'));
    const tops = s.map((x) => Math.round(r(x).top));
    const prima = tops.filter((t) => Math.abs(t - tops[0]) <= 2).length;
    return { n: s.length, perRiga: prima, righe: new Set(tops.map((t) => Math.round(t / 4))).size, larga: r(g).width / (Number(document.querySelector('.mg-finestra')?.dataset.zoom ?? 100) / 100) };
  });
  const altezze = schede.map((x) => r(x).height / (Number(document.querySelector('.mg-finestra')?.dataset.zoom ?? 100) / 100));
  const rect = schede.map(r);
  const sopra = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
  const etichette = [...document.querySelectorAll('.mg-arco-etichetta, .mg-arco-numero')].filter((e) => r(e).width > 0);
  const coperte = etichette.filter((e) => rect.some((s) => sopra(r(e), s))).map((e) => e.textContent.slice(0, 60));
  const etichetteSovrapposte = etichette.filter((e, i) => etichette.some((f, j) => j < i && sopra(r(e), r(f)))).length;
  if (etichetteSovrapposte && window.DEBUG_MAPPA !== false) console.log('sovrapposte', JSON.stringify(etichette.map((e) => { const q = r(e); return [e.dataset.arco, e.className, Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; })));
  return { schede: schede.length, righe, altezzaMax: Math.max(0, ...altezze), archi: document.querySelectorAll('.mg-archi .mg-arco').length,
    etichette: etichette.length, coperte, etichetteSovrapposte, collegamenti: Number(document.querySelector('.mg-lezione')?.dataset.archi ?? 0) };
};

/** Prima scheda con collegamenti interamente visibile nella finestra della mappa (la finestra non scorre: si trascina). */
const schedaVisibile = async (p) => {
  // Si porta in vista con la rotella (dentro la mappa scorre il disegno) la prima scheda con collegamenti.
  for (let i = 0; i < 12; i++) {
    const giu = await p.evaluate(() => {
      const f = document.querySelector('.mg-finestra').getBoundingClientRect(), e = document.querySelector('.mg-scheda[data-legami]:not([data-legami="0"])');
      if (!e) return null; const r = e.getBoundingClientRect();
      return r.bottom > Math.min(f.bottom, innerHeight) - 8 ? { x: f.left + f.width / 2, y: f.top + Math.min(f.height, innerHeight - f.top) / 2, d: Math.min(400, r.bottom - Math.min(f.bottom, innerHeight) + 60) } : null;
    });
    if (!giu) break;
    // Rotella sintetica: vale anche su iPad e telefono (dove Playwright non ha la rotella); la mappa la tratta come quella vera.
    await p.evaluate((d) => document.querySelector('.mg-finestra').dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true })), giu.d); await p.waitForTimeout(120);
  }
  return cercaScheda(p);
};
const cercaScheda = (p) => p.evaluate(() => {
  const f = document.querySelector('.mg-finestra').getBoundingClientRect();
  const s = [...document.querySelectorAll('.mg-scheda[data-legami]:not([data-legami="0"])')].find((e) => { const r = e.getBoundingClientRect(); return r.top >= f.top + 60 && r.bottom <= Math.min(f.bottom, innerHeight) - 4 && r.left >= f.left && r.right <= f.right && r.right < innerWidth - 360; })
    ?? [...document.querySelectorAll('.mg-scheda[data-legami]:not([data-legami="0"])')].find((e) => { const r = e.getBoundingClientRect(); return r.top >= f.top + 60 && r.bottom <= Math.min(f.bottom, innerHeight) - 4; });
  if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
});
try {
  for (const cfg of CONFIG) {
    const browser = await cfg.motore.launch();
    try {
      for (const [doc, { materia, segni }] of documenti) {
        const scuro = materia === 'filosofia-del-diritto-mz';
        const ctx = await browser.newContext({ ...cfg.opz, serviceWorkers: 'block', colorScheme: scuro ? 'dark' : 'light' });
        await ctx.addInitScript(({ materia, corso, doc, segni, tema }) => {
          if (sessionStorage.getItem('iuris-test')) return;
          localStorage.setItem('iuris:v1:pref', JSON.stringify({ materia, corso, tema }));
          localStorage.setItem(`iuris:v1:prog:${materia}`, JSON.stringify({ originali: { [doc]: { pagina: 1, segni } } }));
          localStorage.setItem('iuris:v1:tour-visto', '1');
          sessionStorage.setItem('iuris-test', '1');
        }, { materia, corso: CORSO[materia], doc, segni, tema: scuro ? 'scuro' : 'chiaro' });
        const p = await ctx.newPage();
        const pagina = [];
        p.on('pageerror', (e) => pagina.push(e.message));
        if (process.env.DEBUG) p.on('console', (m) => console.log('  [pagina]', m.text().slice(0, 1500)));
        const dove = `${cfg.id} ${materia}`;
        await p.goto(BASE + '#/');
        await p.waitForSelector('.main', { timeout: 20000 });
        const t0 = Date.now();
        await p.evaluate(() => { location.hash = '#/mappa?personale=1'; });
        const selettore = SOLO_FOTO ? '.mg-nodo, .mg-scheda' : '.mg-scheda';
        await p.waitForSelector(selettore, { timeout: 30000 });
        const disegno = Date.now() - t0;
        await p.waitForTimeout(400);
        if (FOTO && (cfg.id === 'pc-chromium' || (cfg.id === 'ipad' && materia === 'diritto-romano') || (cfg.id === 'telefono' && materia === 'diritto-romano'))) {
          await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-${cfg.id}-${materia}.png`) });
        }
        if (SOLO_FOTO) {
          if (cfg.id === 'pc-chromium' && materia === 'diritto-romano' && FOTO) {
            const n = p.locator('.mg-nodo.mg-segnato:has(.mg-chip)').first();
            if (await n.count()) { await n.hover(); await p.waitForTimeout(200); await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-collegamento-acceso.png`) }); }
          }
          await ctx.close(); continue;
        }
        tempi.push({ dove, disegno });
        verifica(disegno < (cfg.motore === webkit ? 4000 : 3000), `${dove}: la mappa compare in ${disegno} ms`);

        // Layout a fasce: schede della stessa sezione sulla stessa riga, a capo dopo 3–4.
        const m = await p.evaluate(misuraLayout);
        verifica(m.schede > 0, `${dove}: nessuna scheda`);
        const minimo = cfg.telefono ? 2 : cfg.pc ? 3 : 3;
        for (const g of m.righe) {
          if (g.n < 2) continue;
          verifica(g.perRiga >= Math.min(g.n, minimo), `${dove}: schede della stessa sezione in colonna (${g.perRiga} per riga su ${g.n})`);
          verifica(g.perRiga <= 4, `${dove}: più di 4 schede per riga (${g.perRiga})`);
          verifica(g.righe === Math.ceil(g.n / g.perRiga), `${dove}: righe irregolari ${JSON.stringify(g)}`);
        }
        verifica(m.altezzaMax <= 150, `${dove}: schede troppo alte di base (${Math.round(m.altezzaMax)} px)`);
        // Di base nessuna freccia: solo gli indicatori sui concetti.
        verifica(m.archi === 0 && m.etichette === 0, `${dove}: collegamenti accesi senza passaggio (${m.archi} archi, ${m.etichette} etichette)`);

        // Passaggio (o tocco) su una scheda con collegamenti: si accendono i suoi, con etichette che non coprono le schede.
        const box = m.collegamenti > 0 ? await schedaVisibile(p) : null;
        if (m.collegamenti > 0) verifica(!!box, `${dove}: nessuna scheda con collegamenti in vista`);
        if (box) {
          const tH = Date.now();
          if (cfg.touch) await p.touchscreen.tap(box.x + 12, box.y + 8);
          else await p.mouse.move(box.x + box.width / 2, box.y + 10);
          await p.waitForSelector('.mg-archi .mg-arco', { state: 'attached', timeout: 3000 }).catch(() => {});
          const accensione = Date.now() - tH;
          tempi.push({ dove: `${dove} accensione`, disegno: accensione });
          verifica(accensione < 400, `${dove}: i collegamenti si accendono in ${accensione} ms`);
          const a = await p.evaluate(misuraLayout);
          verifica(a.archi > 0 && a.archi < a.collegamenti + 1, `${dove}: al passaggio si accendono ${a.archi} collegamenti su ${a.collegamenti}`);
          verifica(!a.coperte.length, `${dove}: etichette sopra le schede: ${a.coperte.join(' | ')}`);
          verifica(a.etichetteSovrapposte === 0, `${dove}: etichette sovrapposte fra loro`);
          const elenco = await p.locator('.mg-collegamenti .mg-coll-voce').count();
          verifica(elenco === a.archi, `${dove}: il riquadro dei collegamenti elenca ${elenco} voci per ${a.archi} frecce`);
          // Stesso colore e stesso numero fra freccia, etichetta e voce dell'elenco.
          const coerenti = await p.evaluate(() => [...document.querySelectorAll('.mg-archi .mg-arco')].every((g) => {
            const i = g.getAttribute('data-arco'), v = document.querySelector(`.mg-coll-voce[data-arco="${i}"]`), e = document.querySelector(`.mg-arco-etichetta[data-arco="${i}"], .mg-arco-numero[data-arco="${i}"]`);
            return v && e && getComputedStyle(v).getPropertyValue('--mg-tinta') === getComputedStyle(g).getPropertyValue('--mg-tinta') && v.querySelector('.mg-coll-n')?.textContent === e.querySelector('.mg-coll-n')?.textContent;
          }));
          if (!coerenti && process.env.DEBUG) console.log(await p.evaluate(() => JSON.stringify([...document.querySelectorAll('.mg-archi .mg-arco')].map((g) => [g.getAttribute('data-arco'), g.querySelector('path').getAttribute('d'), !!document.querySelector(`.mg-coll-voce[data-arco="${g.getAttribute('data-arco')}"]`), !!document.querySelector(`[class^="mg-arco-"][data-arco="${g.getAttribute('data-arco')}"]:not(g)`)]))));
          verifica(coerenti, `${dove}: freccia, etichetta e voce dell'elenco non si corrispondono`);
          // Tutto il testo segnato al passaggio o al primo tocco.
          const piena = await p.evaluate(() => { const s = document.querySelector('.mg-scheda.mg-aperta, .mg-scheda:hover'); const t = s?.querySelector('.mg-scheda-testo'); return !!t && t.scrollHeight <= t.clientHeight + 2 && !!s.querySelector('.mg-scheda-pagina'); });
          verifica(piena, `${dove}: la scheda non mostra tutto il testo al passaggio`);
          if (FOTO && materia === 'diritto-romano' && cfg.id === 'pc-chromium') await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-collegamento-acceso.png`) });
          if (cfg.touch) {
            // Secondo tocco: apre il passaggio negli Originali.
            await p.touchscreen.tap(box.x + 12, box.y + 8);
            await p.waitForFunction(() => location.hash.startsWith('#/originali'), null, { timeout: 5000 }).catch(() => {});
            verifica(await p.evaluate(() => location.hash.startsWith('#/originali')), `${dove}: il secondo tocco non apre il passaggio`);
            await p.evaluate(() => { location.hash = '#/mappa?personale=1'; });
            await p.waitForSelector('.mg-scheda', { timeout: 15000 });
          } else {
            await p.mouse.move(2, 2);
            await p.waitForTimeout(500);
            verifica(await p.locator('.mg-archi .mg-arco').count() === 0, `${dove}: i collegamenti restano accesi dopo il passaggio`);
          }
        }

        // «Mostra tutti i collegamenti»: tutte le frecce, numeri o etichette fuori dalle schede.
        const tuttiBtn = p.locator('button[aria-label="Mostra tutti i collegamenti"]');
        if (m.collegamenti > 0) {
          verifica(await tuttiBtn.count() > 0, `${dove}: manca «Mostra tutti i collegamenti»`);
          if (await tuttiBtn.count()) {
            await tuttiBtn.first().click();
            await p.waitForTimeout(150);
            const t = await p.evaluate(misuraLayout);
            verifica(t.archi === t.collegamenti, `${dove}: «Mostra tutti» accende ${t.archi} collegamenti su ${t.collegamenti}`);
            verifica(!t.coperte.length, `${dove}: con tutti i collegamenti, etichette sopra le schede: ${t.coperte.join(' | ')}`);
            verifica(t.etichetteSovrapposte === 0, `${dove}: con tutti i collegamenti, etichette sovrapposte`);
            await p.locator('button[aria-label="Mostra tutti i collegamenti"]').first().click();
          }
        }

        // «Adatta»: i titoli delle fasce restano leggibili (almeno 11 px sullo schermo).
        if (cfg.pc) {
          await p.click('button[aria-label="Adatta"]');
          await p.waitForTimeout(500);
          const titoli = await p.evaluate(() => [...document.querySelectorAll('.mg-fascia-titolo .mg-titolo-testo, .mg-gruppo-titolo .mg-titolo-testo')].slice(0, 6).map((e) => {
            const r = document.createRange(); r.selectNodeContents(e); const q = r.getClientRects()[0];
            return q ? q.height / 1.3 : 0;
          }));
          verifica(titoli.length > 0 && Math.min(...titoli) >= 11, `${dove}: titoli illeggibili con «Adatta» (${titoli.map((x) => x.toFixed(1)).join(', ')} px)`);
        }
        verifica(!pagina.length, `${dove}: errori in pagina: ${pagina.join(' | ')}`);

        // Pannello della mappa nel lettore (anche nel foglio dal basso su iPad e telefono): stesso layout, schede in riga.
        {
          await p.evaluate((d) => { location.hash = `#/originali?doc=${d}&modo=testo`; }, doc);
          await p.waitForSelector('[data-lettura-block]', { timeout: 20000 });
          if (!(await p.locator('button[aria-label="Mappa personale"]').first().isVisible())) { await p.click('button[aria-label="Scegli testo e sezione"]'); await p.waitForTimeout(300); }
          await p.locator('button[aria-label="Mappa personale"]').filter({ visible: true }).first().click();
          const t1 = Date.now();
          await p.waitForSelector('.lettura-pannello .mg-scheda', { timeout: 30000 });
          tempi.push({ dove: `${dove} pannello`, disegno: Date.now() - t1 });
          const q = await p.evaluate(misuraLayout);
          for (const g of q.righe) if (g.n >= 2) verifica(g.perRiga >= 2, `${dove} pannello: schede della stessa sezione in colonna`);
          if (FOTO && materia === 'diritto-romano' && cfg.id !== 'pc-chromium') await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-pannello-lettore-${cfg.id}.png`) });
          verifica(q.archi === 0, `${dove} pannello: collegamenti accesi senza passaggio`);
          if (FOTO && cfg.id === 'pc-chromium' && materia === 'diritto-romano') await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-pannello-lettore.png`) });
        }
        await ctx.close();
      }
      if (denso && cfg.pc) {
        // 300 segni in tre lezioni: disegno, passaggio e «Mostra tutti» senza blocchi.
        const ctx = await browser.newContext({ ...cfg.opz, serviceWorkers: 'block' });
        await ctx.addInitScript(({ segni }) => {
          if (sessionStorage.getItem('iuris-test')) return;
          localStorage.setItem('iuris:v1:pref', JSON.stringify({ materia: 'diritto-romano', corso: 'uniba-lmg-1-al' }));
          localStorage.setItem('iuris:v1:prog:diritto-romano', JSON.stringify({ originali: { 'romano-iuris-v1': { pagina: 1, segni } } }));
          sessionStorage.setItem('iuris-test', '1');
        }, { segni: denso.segni });
        const p = await ctx.newPage(), dove = `${cfg.id} denso (${denso.segni.length} segni)`;
        await p.goto(BASE + '#/'); await p.waitForSelector('.main', { timeout: 20000 });
        // Lezione più segnata: la si sceglie dal menu e si misura il disegno.
        await p.evaluate(() => { location.hash = '#/mappa?personale=1'; });
        await p.waitForSelector('.mg-scheda', { timeout: 30000 });
        const [scelta, attese] = await p.evaluate(() => { const s = document.querySelector('select[aria-label="Scegli la lezione"]'); const o = [...s.options].sort((a, b) => Number(b.textContent.split('·').pop()) - Number(a.textContent.split('·').pop()))[0]; return [o.value, Number(o.textContent.split('·').pop())]; });
        await p.evaluate(() => { window.__lunghi = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lunghi = Math.max(window.__lunghi, e.duration); }).observe({ type: 'longtask', buffered: false }); } catch {} });
        // Si parte da un'altra lezione: si misura il disegno della lezione densa da zero.
        const altra = await p.evaluate((v) => [...document.querySelector('select[aria-label="Scegli la lezione"]').options].find((o) => o.value !== v).value, scelta);
        await p.selectOption('select[aria-label="Scegli la lezione"]', altra);
        await p.waitForTimeout(300);
        const t0 = Date.now();
        await p.selectOption('select[aria-label="Scegli la lezione"]', scelta);
        await p.waitForFunction((n) => document.querySelectorAll('.mg-scheda, .mg-intestazione.mg-segnato').length === n, attese, { timeout: 15000 });
        const disegno = Date.now() - t0;
        const m = await p.evaluate(misuraLayout);
        tempi.push({ dove: `${dove}: lezione con ${m.schede} schede`, disegno });
        verifica(disegno < 1500, `${dove}: la lezione densa compare in ${disegno} ms`);
        for (const g of m.righe) if (g.n >= 2) verifica(g.perRiga >= Math.min(g.n, 3) && g.perRiga <= 4, `${dove}: schede in colonna (${g.perRiga} per riga su ${g.n})`);
        const b = await schedaVisibile(p);
        verifica(!!b, `${dove}: nessuna scheda con collegamenti in vista`);
        if (b) {
          const tH = Date.now();
          await p.mouse.move(b.x + b.width / 2, b.y + 10);
          await p.waitForSelector('.mg-archi .mg-arco', { state: 'attached', timeout: 3000 }).catch(async () => { if (process.env.DEBUG) console.log('DBG', await p.evaluate(() => [document.querySelectorAll('.mg-archi .mg-arco').length, document.querySelectorAll('.mg-archi').length, document.elementFromPoint(0,0) && 0, [...document.querySelectorAll('.mg-archi .mg-arco')].map((g) => JSON.stringify(g.getBoundingClientRect()))])); });
          const acc = Date.now() - tH;
          if (FOTO && cfg.id === 'pc-chromium') await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-denso-acceso.png`) });
          tempi.push({ dove: `${dove}: accensione`, disegno: acc });
          verifica(acc < 400, `${dove}: i collegamenti si accendono in ${acc} ms`);
          const a = await p.evaluate(misuraLayout);
          verifica(a.archi > 0 && !a.coperte.length && !a.etichetteSovrapposte, `${dove}: collegamenti al passaggio ${JSON.stringify({ archi: a.archi, coperte: a.coperte })}`);
          // Passaggi rapidi su molte schede: nessun task lungo.
          const schede = await p.locator('.mg-scheda').evaluateAll((l) => l.slice(0, 40).map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12]; }));
          const tM = Date.now();
          for (const [x, y] of schede) if (y > 0 && y < 840) await p.mouse.move(x, y, { steps: 2 });
          tempi.push({ dove: `${dove}: ${schede.length} passaggi`, disegno: Date.now() - tM });
        }
        await p.mouse.move(2, 2);
        await p.click('button[aria-label="Mostra tutti i collegamenti"]').catch(() => {});
        await p.waitForTimeout(200);
        const t = await p.evaluate(misuraLayout);
        verifica(t.archi === t.collegamenti && !t.coperte.length && !t.etichetteSovrapposte, `${dove}: «Mostra tutti» ${JSON.stringify({ archi: t.archi, di: t.collegamenti, coperte: t.coperte })}`);
        const lungo = await p.evaluate(() => window.__lunghi);
        tempi.push({ dove: `${dove}: task più lungo`, disegno: Math.round(lungo) });
        if (cfg.motore === chromium) verifica(lungo < 250, `${dove}: task lungo di ${Math.round(lungo)} ms`);
        if (FOTO && cfg.id === 'pc-chromium') await p.screenshot({ path: path.join(FOTO, `${PREFISSO}-denso-mostra-tutti.png`) });
        await ctx.close();
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }

if (tempi.length) {
  for (const t of tempi) console.log(`  ${t.dove}: ${t.disegno} ms`);
}
if (errori.length) { console.error(errori.map((e) => `✗ ${e}`).join('\n')); process.exit(1); }
console.log(SOLO_FOTO ? `Schermate salvate in ${FOTO}.` : `Mappa personale verificata nel browser: ${controlli} controlli su ${documenti.length} materie e ${CONFIG.length} configurazioni.`);
