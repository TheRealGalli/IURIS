#!/usr/bin/env node
/**
 * Percorre la visita guidata dall'inizio alla fine su un dispositivo e salva una schermata per tappa.
 * Uso: node scripts/giro-tour.mjs <url-base> <cartella-schermate> [dispositivo] [motore]
 * Esempio: node scripts/giro-tour.mjs http://localhost:7102/ ../piani/fase-demo/iphone-se 'iPhone SE' webkit
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit, devices } from 'playwright';

const [base = 'http://localhost:7102/', cartella = '', disp = 'iPhone 15 Pro', motore = 'webkit'] = process.argv.slice(2);
const opz = disp === 'PC' ? { viewport: { width: 1366, height: 860 } } : devices[disp];
const browser = await ({ webkit, chromium })[motore].launch();
const ctx = await browser.newContext({ ...opz, locale: 'it-IT' });
const p = await ctx.newPage();
const errori = [];
p.on('pageerror', (e) => errori.push(e.message));
if (cartella) fs.mkdirSync(cartella, { recursive: true });
await p.goto(base + '#/demo');
for (let i = 0; i < 80; i++) {
  await p.waitForSelector('.tour-bubble.ready', { timeout: 30000 });
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => ({
    passo: document.querySelector('.tour-step')?.textContent, titolo: document.querySelector('.tour-bubble h2')?.textContent,
    testo: document.querySelector('.tour-copy')?.textContent, hash: location.hash, segni: document.querySelectorAll('.lettura-segno').length, sel: String(getSelection()).length,
  }));
  console.log(`${String(i + 1).padStart(2, '0')} ${info.passo} | ${info.titolo} | ${info.hash} | segni ${info.segni} sel ${info.sel}\n    ${info.testo}`);
  if (cartella) await p.screenshot({ path: path.join(cartella, `${String(i + 1).padStart(2, '0')}.png`) });
  const prossimo = p.locator('.tour-next');
  if ((await prossimo.getAttribute('aria-label')) === 'Apri il mio backup') break;
  await prossimo.click();
  await p.waitForTimeout(150);
}
if (errori.length) console.log('Errori in pagina:', errori);
await browser.close();
