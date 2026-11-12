// Giro del backup tra dispositivi, nel browser vero e sull'app costruita (dist/):
//   PC (Chromium) → backup → telefono (WebKit, iPhone) → si continua a studiare → backup → PC,
// poi un backup di una sola materia su un terzo browser. Lezioni studiate, carte e voti, segni negli Originali,
// mappa personale, date d'esame e corso scelto devono arrivare intatti e sommarsi.
// Usa le materie presenti nel manifest e nel corso scelto: le materie nuove entrano nel giro da sole.
// Storage isolato (contesti nuovi di Playwright): nessun dato personale viene letto o scritto.
//   IURIS_BASE=http://localhost:7101/ node scripts/check-backup.mjs   → prova sul server di sviluppo invece che su dist/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
async function servi() {
  if (process.env.IURIS_BASE) return { base: process.env.IURIS_BASE, chiudi: async () => {} };
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Giro tra dispositivi: manca dist/, esegui prima npm run build (oppure SOLO_ARCHIVIO=1 per i soli controlli senza browser).');
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TIPI[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}/`, chiudi: () => new Promise((r) => server.close(r)) };
}

/** Tutto ciò che l'app ha salvato nel browser: progressi per materia e preferenze. */
const stato = (p) => p.evaluate(() => {
  const materie = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('iuris:v1:prog:')) materie[k.slice('iuris:v1:prog:'.length)] = JSON.parse(localStorage.getItem(k));
  }
  return { materie, pref: JSON.parse(localStorage.getItem('iuris:v1:pref') ?? '{}') };
});
const pronto = (p) => p.waitForFunction(() => document.querySelector('.main') && !document.querySelector('.main .empty.faint'), null, { timeout: 20000 });
const vaiA = async (p, r) => { await p.evaluate((h) => { location.hash = h; }, `#${r}`); await pronto(p); await p.waitForTimeout(120); };
/** Cambia materia come dal menu: preferenza salvata e pagina riaperta. */
const apriMateria = async (p, slug) => {
  await p.evaluate((s) => localStorage.setItem('iuris:v1:pref', JSON.stringify({ ...JSON.parse(localStorage.getItem('iuris:v1:pref') ?? '{}'), materia: s })), slug);
  await p.evaluate(() => { location.hash = '#/'; }); await p.reload(); await pronto(p);
};
const corsoJson = (p, slug) => p.evaluate(async (s) => (await fetch(`content/${s}/corso.json`)).json().then((c) => ({
  lezioni: c.unita.flatMap((u) => u.lezioni.map((l) => l.id)), inverse: c.concetti.filter((x) => x.schedaInversa).map((x) => x.id),
})), slug);

export async function giroDispositivi() {
  const { chromium, webkit, devices } = await import('playwright');
  const { base, chiudi } = await servi();
  const aperti = [];
  const avvia = async (motore, nome) => {
    try { const b = await motore.launch(); aperti.push(b); return b; }
    catch (e) { throw new Error(`${nome} non è installato per Playwright: esegui «npx playwright install chromium webkit».\n${e.message.split('\n')[0]}`); }
  };
  let passi = 0;
  const passo = async (nome, fn) => { try { await fn(); passi++; } catch (e) { e.message = `Giro tra dispositivi · ${nome}: ${e.message}`; throw e; } };
  const errori = [];
  const pagina = async (b, opzioni, chi) => {
    const ctx = await b.newContext({ ...opzioni, serviceWorkers: 'block', acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errori.push(`${chi}: ${e.message}`));
    await p.goto(base + '#/'); await pronto(p);
    return p;
  };
  const tocca = (p, l) => (p.__touch ? l.tap() : l.click());

  const studia = async (p, lezione) => {
    await vaiA(p, `/lezione/${lezione}`);
    const b = p.locator('button[data-tour="studiata"]');
    if (await b.getAttribute('aria-pressed') !== 'true') await tocca(p, b);
    assert.equal(await b.getAttribute('aria-pressed'), 'true', `la lezione ${lezione} non risulta studiata`);
  };
  /** Una scheda inversa del glossario: si scopre la risposta e si dà il voto (1–4). */
  const rispondi = async (p, concetto, voto) => {
    await vaiA(p, `/allena?modo=inverse&c=${concetto}`);
    await tocca(p, p.getByRole('button', { name: /Mostra la risposta/ }));
    await tocca(p, p.locator('.grades button').nth(voto - 1));
    // con «Non la sapevo» la scheda torna in coda: si esce dalla sessione; altrimenti si chiude l'esito
    await p.waitForTimeout(150);
    await tocca(p, (await p.locator('.quiz-top').count()) ? p.getByRole('button', { name: 'Esci', exact: true }) : p.getByRole('button', { name: 'Fine', exact: true }));
    await p.waitForFunction(() => !document.querySelector('.qcard'), null, { timeout: 5000 });
  };
  const scegliData = async (p, mesi, giorno) => {
    await vaiA(p, '/');
    await tocca(p, p.locator('.hero-main [data-scelta-data]'));
    const riquadro = p.locator('.sd-pop'); await riquadro.waitFor();
    for (let k = 0; k < mesi; k++) await tocca(p, riquadro.getByRole('button', { name: 'Mese successivo', exact: true }));
    const g = riquadro.locator('.sd-g:not(:disabled)').filter({ hasText: new RegExp(`^${giorno}$`) });
    const iso = await g.getAttribute('data-date');
    await tocca(p, g);
    await riquadro.waitFor({ state: 'detached' });
    return iso;
  };
  /** Segna un passaggio negli Originali: selezione del testo, poi «Salva» (mouse) o un tocco fuori (dito). */
  const segna = async (p, quale) => {
    await vaiA(p, '/originali');
    await p.waitForSelector('[data-lettura-block] p, [data-lettura-block] li', { timeout: 15000 });
    const prima = await p.evaluate(() => document.querySelectorAll('.lettura-segno').length);
    const testo = await p.evaluate((n) => {
      const lunghi = [...document.querySelectorAll('[data-lettura-block] p, [data-lettura-block] li')].filter((x) => (x.textContent?.length ?? 0) > 80 && !x.querySelector('.lettura-segno'));
      const el = lunghi[Math.min(n, lunghi.length - 1)];
      const t = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
      el.scrollIntoView({ block: 'center' });
      getSelection().setBaseAndExtent(t, 0, t, Math.min(36, t.length));
      return t.data.slice(0, Math.min(36, t.length));
    }, quale);
    await p.waitForFunction(() => document.querySelector('.lettura')?.dataset.bozza === 'true', null, { timeout: 5000 });
    if (await p.locator('.lettura-salva').isVisible().catch(() => false)) await p.locator('.lettura-salva').click();
    else {
      const r = await p.locator('.lettura-viewport').boundingBox();
      if (p.__touch) await p.touchscreen.tap(r.x + 6, r.y + 12); else await p.mouse.click(r.x + 6, r.y + 12);
    }
    await p.waitForFunction((n) => document.querySelectorAll('.lettura-segno').length > n, prima, { timeout: 6000 });
    return testo.trim();
  };
  const mappaPersonale = async (p, testi) => {
    await vaiA(p, '/mappa?personale=1');
    await p.waitForSelector('.mg-schema, .mg-finestra, .mg-vuota', { timeout: 15000 });
    const visto = (await p.evaluate(() => document.querySelector('.main')?.textContent ?? '')).replace(/\s+/g, ' ');
    for (const t of testi) assert(visto.includes(t.replace(/\s+/g, ' ').slice(0, 14)), `la mappa personale non mostra il passaggio segnato «${t.slice(0, 24)}…»`);
  };
  const scarica = async (p) => {
    await vaiA(p, '/backup');
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), tocca(p, p.getByRole('button', { name: /Scarica backup completo/ }))]);
    assert.equal(d.suggestedFilename(), 'formaiuris-backup.json');
    const file = await d.path();
    return fs.readFileSync(file, 'utf8');
  };
  const carica = async (p, json, atteso, nome = 'formaiuris-backup.json') => {
    await vaiA(p, '/backup');
    await p.locator('input[type="file"][aria-label="File di backup"]').setInputFiles({ name: nome, mimeType: 'application/json', buffer: Buffer.from(json) });
    const anteprima = p.locator('.backup-anteprima'); await anteprima.waitFor();
    assert.match(await anteprima.locator('.eyebrow').textContent(), atteso);
    await tocca(p, p.getByRole('button', { name: /Ripristina questo backup/ }));
    await p.locator('.backup-esito, .backup-errore').first().waitFor({ timeout: 10000 }).catch(async (e) => {
      await p.screenshot({ path: process.env.IURIS_DEBUG_PNG ?? '/dev/null' }).catch(() => {});
      throw new Error(`il ripristino non dà esito: «${(await p.locator('.main').innerText()).slice(0, 300)}» ${e.message.split('\n')[0]}`);
    });
    assert.equal(await p.locator('.backup-errore').count(), 0, `ripristino rifiutato: ${await p.locator('.backup-errore').textContent().catch(() => '')}`);
    assert.match(await p.locator('.backup-esito').innerText(), /ripristinato/i);
  };
  const studiate = (m) => Object.entries(m?.lezioni ?? {}).filter(([, l]) => l.studiata).map(([id]) => id).sort();
  const segni = (m) => Object.values(m?.originali ?? {}).flatMap((d) => d.segni ?? []);

  try {
    // ───── PC (Chromium) ─────
    const pc = await pagina(await avvia(chromium, 'Chromium'), { viewport: { width: 1366, height: 860 } }, 'PC');
    let corso, materie, prima, seconda, dati = {}, datePc = {}, segnoPc, schede;
    await passo('PC: corso scelto e materie del corso', async () => {
      // un corso diverso dal predefinito, se ce n'è uno selezionabile: deve arrivare sul telefono
      const scelta = pc.locator('.side select.corso-select');
      const altri = await scelta.locator('option:not([disabled])').evaluateAll((o) => o.map((x) => x.value));
      const attuale = await scelta.inputValue();
      corso = altri.filter((x) => x !== attuale).pop() ?? attuale;
      if (corso !== attuale) { await scelta.selectOption(corso); await pronto(pc); }
      assert.equal((await stato(pc)).pref.corso ?? attuale, corso);
      materie = await pc.locator('header.topbar select.select option:not([disabled])').evaluateAll((o) => o.map((x) => x.value));
      assert(materie.length >= 1, 'il corso non ha materie');
      for (const m of materie) dati[m] = await corsoJson(pc, m);
    });
    await passo('PC: una lezione studiata in ogni materia del corso', async () => {
      for (const m of materie) { await apriMateria(pc, m); await studia(pc, dati[m].lezioni[0]); }
    });
    await passo('PC: carte e voti, data d\'esame, segno negli Originali e mappa personale', async () => {
      // la materia con schede inverse e testo negli Originali porta carte e segni; un'altra porta una seconda data
      for (const m of materie) {
        if (dati[m].inverse.length < 3) continue;
        await apriMateria(pc, m); await vaiA(pc, '/originali');
        if (await pc.waitForSelector('[data-lettura-block] p, [data-lettura-block] li', { timeout: 8000 }).then(() => true, () => false)) { prima = m; break; }
      }
      assert(prima, 'nessuna materia del corso ha schede inverse e testo negli Originali');
      seconda = materie.find((m) => m !== prima) ?? prima;
      schede = dati[prima].inverse.slice(0, 3);
      await rispondi(pc, schede[0], 3); await rispondi(pc, schede[1], 1);
      datePc[prima] = await scegliData(pc, 2, 15);
      segnoPc = await segna(pc, 0);
      await mappaPersonale(pc, [segnoPc]);
      const s = (await stato(pc)).materie[prima];
      assert.equal(s.esame, datePc[prima]); assert.equal(segni(s).length, 1);
      assert(s.carte[`glossario-inversa-${schede[0]}`] && s.carte[`glossario-inversa-${schede[1]}`], 'le risposte non hanno creato le carte');
    });
    let backupPc, statoPc;
    await passo('PC: backup completo scaricato', async () => {
      backupPc = await scarica(pc); statoPc = await stato(pc);
      const b = JSON.parse(backupPc);
      assert.equal(b.formato, 'iuris-backup'); assert.equal(b.preferenze.corso, corso);
      assert.deepEqual(Object.keys(b.materie).sort(), [...materie].sort(), 'nel backup mancano materie studiate');
      for (const m of materie) assert.deepEqual(b.materie[m], statoPc.materie[m], `backup diverso dai dati del PC: ${m}`);
    });

    // ───── Telefono (WebKit, iPhone) ─────
    const tel = await pagina(await avvia(webkit, 'WebKit'), devices['iPhone 15 Pro'] ?? devices['iPhone 13'], 'telefono');
    tel.__touch = true;
    let segnoTel, dateTel = {}, backupTel, statoTel;
    await passo('Telefono: ripristino, tutto arriva intatto', async () => {
      assert.deepEqual((await stato(tel)).materie, {}, 'il telefono deve partire vuoto');
      await carica(tel, backupPc, /Backup completo/);
      const s = await stato(tel);
      assert.equal(s.pref.corso, corso, 'corso scelto non arrivato');
      assert.deepEqual(s.materie, statoPc.materie, 'progressi diversi da quelli del PC');
      // e si vede nell'app, non solo nell'archivio
      await vaiA(tel, '/altro');
      assert.equal(await tel.locator('.corso-switch-pagina select').inputValue(), corso);
      await apriMateria(tel, prima);
      assert.match(await tel.locator('.hero-main').innerText(), /giorni all'esame|Esame oggi/, 'la data d\'esame non compare in Oggi');
      await vaiA(tel, `/lezione/${dati[prima].lezioni[0]}`);
      assert.equal(await tel.locator('button[data-tour="studiata"]').getAttribute('aria-pressed'), 'true', 'lezione studiata non arrivata');
      await vaiA(tel, '/originali');
      await tel.waitForSelector('.lettura-segno', { state: 'attached', timeout: 10000 });
      await mappaPersonale(tel, [segnoPc]);
    });
    await passo('Telefono: si continua a studiare', async () => {
      await studia(tel, dati[prima].lezioni[1] ?? dati[prima].lezioni[0]);
      await rispondi(tel, schede[2], 4);           // una carta nuova
      await rispondi(tel, schede[1], 3);           // e una già vista sul PC, ora saputa
      segnoTel = await segna(tel, 1);
      if (seconda !== prima) {
        await apriMateria(tel, seconda);
        if (dati[seconda].lezioni[1]) await studia(tel, dati[seconda].lezioni[1]);
        dateTel[seconda] = await scegliData(tel, 3, 20);
      }
      backupTel = await scarica(tel); statoTel = await stato(tel);
    });

    // ───── di nuovo sul PC ─────
    await passo('PC: il backup del telefono somma lo studio dei due dispositivi', async () => {
      await carica(pc, backupTel, /Backup completo/);
      const s = await stato(pc);
      assert.deepEqual(s.materie, statoTel.materie, 'progressi diversi da quelli del telefono');
      assert.equal(s.pref.corso, corso);
      const m1 = s.materie[prima], v1 = statoPc.materie[prima];
      for (const id of studiate(v1)) assert(studiate(m1).includes(id), `lezione studiata sul PC persa: ${id}`);
      assert(studiate(m1).length >= Math.min(2, dati[prima].lezioni.length), 'manca la lezione studiata sul telefono');
      for (const id of Object.keys(v1.carte)) assert(m1.carte[id], `carta del PC persa: ${id}`);
      const nuova = `glossario-inversa-${schede[2]}`, rivista = `glossario-inversa-${schede[1]}`;
      assert(m1.carte[nuova], 'manca la carta risposta sul telefono');
      assert(m1.carte[rivista].reps > v1.carte[rivista].reps || m1.carte[rivista].last_review !== v1.carte[rivista].last_review, 'la carta rivista sul telefono non è aggiornata');
      assert.deepEqual(m1.carte[`glossario-inversa-${schede[0]}`], v1.carte[`glossario-inversa-${schede[0]}`], 'una carta non toccata sul telefono è cambiata');
      assert.equal(segni(m1).length, 2, 'i segni dei due dispositivi devono esserci entrambi');
      assert.equal(m1.esame, datePc[prima], 'data d\'esame del PC cambiata');
      if (seconda !== prima) {
        assert.equal(s.materie[seconda].esame, dateTel[seconda], 'data d\'esame scelta sul telefono non arrivata');
        for (const id of studiate(statoPc.materie[seconda])) assert(studiate(s.materie[seconda]).includes(id), `lezione di ${seconda} persa: ${id}`);
      }
      // nell'app
      await apriMateria(pc, prima);
      await vaiA(pc, '/originali');
      await pc.waitForSelector('.lettura-segno', { state: 'attached', timeout: 10000 });
      await mappaPersonale(pc, [segnoPc, segnoTel]);
      for (const l of studiate(m1)) {
        await vaiA(pc, `/lezione/${l}`);
        assert.equal(await pc.locator('button[data-tour="studiata"]').getAttribute('aria-pressed'), 'true', `nel Percorso manca ${l}`);
      }
      assert.equal(await pc.locator('.side select.corso-select').inputValue(), corso);
    });

    // ───── backup di una sola materia su un terzo browser ─────
    await passo('Una sola materia: entra quella, il resto non cambia', async () => {
      const terzo = await pagina(aperti[0], { viewport: { width: 1280, height: 800 } }, 'terzo browser');
      const altraMateria = (await terzo.locator('header.topbar select.select option:not([disabled])').evaluateAll((o) => o.map((x) => x.value))).find((m) => m !== prima);
      let lezioneLocale;
      if (altraMateria) {
        const d = await corsoJson(terzo, altraMateria);
        lezioneLocale = d.lezioni[d.lezioni.length - 1];
        await apriMateria(terzo, altraMateria); await studia(terzo, lezioneLocale);
      }
      const primaDi = await stato(terzo);
      const una = JSON.stringify({ materia: prima, progresso: JSON.parse(backupTel).materie[prima] });
      await carica(terzo, una, /Backup di una materia/, `iuris-${prima}.json`);
      const dopo = await stato(terzo);
      assert.deepEqual(dopo.materie[prima], statoTel.materie[prima], 'la materia del file non è arrivata intatta');
      assert.deepEqual(dopo.pref, primaDi.pref, 'un backup di una materia non deve toccare preferenze e corso');
      for (const [m, v] of Object.entries(primaDi.materie)) if (m !== prima) assert.deepEqual(dopo.materie[m], v, `il backup di ${prima} ha modificato ${m}`);
      if (altraMateria) assert(studiate(dopo.materie[altraMateria]).includes(lezioneLocale), 'lo studio locale di un\'altra materia è andato perso');
      await terzo.context().close();
    });
    assert.deepEqual(errori, [], 'errori JavaScript durante il giro');
    return { passi, corso, materie, prima };
  } finally {
    for (const b of aperti) await b.close().catch(() => {});
    await chiudi();
  }
}
