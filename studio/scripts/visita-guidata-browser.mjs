/**
 * La visita guidata nel browser, dalla prima all'ultima tappa (la usa check-responsive.mjs).
 *
 * Per ogni tappa: riquadro pronto e dentro lo schermo, nessun errore, nessun menu per saltare le sezioni (solo
 * indietro, avanti, esci), il riquadro non copre l'elemento spiegato. Sul touch: prima di ogni cambio di sezione dal
 * Menu c'è una tappa «ponte» che illumina il Menu in basso. Sottolineatura: prima la selezione (niente segni),
 * poi lo strumento (ancora niente segni), poi il salvataggio. Articoli: la tappa apre l'articolo della Costituzione
 * o del Codice civile e poi la visita torna nella materia di partenza. Telefono: niente Mappa nel lettore.
 * Infine: la visita parte da sola soltanto alla prima visita.
 */
export async function verificaVisita(browser, opzioni, BASE, etichetta, { telefono = false, touch = false, foto = '', pref = { materia: 'filosofia-del-diritto' }, primaVisita = true } = {}) {
  const errori = [];
  let controlli = 0;
  const verifica = (ok, msg) => { controlli++; if (!ok) errori.push(`${etichetta} visita: ${msg}`); };
  const ctx = await browser.newContext({ ...opzioni, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.addInitScript((pref) => { if (!sessionStorage.getItem('iuris-test')) { localStorage.setItem('iuris:v1:pref', JSON.stringify(pref)); sessionStorage.setItem('iuris-test', '1'); } }, pref);
  const p = await ctx.newPage(); const pagina = [];
  p.on('pageerror', (e) => pagina.push(e.message));
  await p.goto(BASE + '#/'); await p.waitForSelector('.main .hero-main', { timeout: 20000 });
  // con navigator.webdriver la visita non parte da sola: i controlli aprono sempre un browser vuoto
  await p.waitForTimeout(500);
  verifica(await p.locator('.tour-layer').count() === 0, 'partita da sola in un browser di prova');
  const prefPrima = await p.evaluate(() => localStorage.getItem('iuris:v1:pref'));
  await p.evaluate(() => { location.hash = '#/demo'; });
  const tappe = [];
  for (let i = 0; i < 80; i++) {
    await p.waitForSelector('.tour-bubble.ready', { timeout: 30000 });
    await p.waitForTimeout(120);
    // Il riquadro scivola nella nuova posizione (animazione e scorrimento della pagina): si misura quando è fermo.
    await p.waitForFunction(() => new Promise((ok) => {
      const r = () => JSON.stringify(document.querySelector('.tour-bubble')?.getBoundingClientRect());
      const a = r(); setTimeout(() => ok(a === r()), 150);
    }), null, { timeout: 5000 }).catch(() => {});
    const t = await p.evaluate(() => {
      const b = document.querySelector('.tour-bubble').getBoundingClientRect(), s = document.querySelector('.tour-spot')?.getBoundingClientRect();
      const inter = s ? Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left)) * Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top)) : 0;
      return {
        passo: document.querySelector('.tour-step')?.textContent ?? '', titolo: document.querySelector('.tour-bubble h2')?.textContent ?? '',
        hash: location.hash, select: document.querySelectorAll('.tour-layer select').length,
        controlli: [...document.querySelectorAll('.tour-controls button')].map((x) => x.getAttribute('aria-label') || x.textContent.trim()),
        dentro: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
        spot: s ? { area: s.width * s.height, coperta: inter / Math.max(1, s.width * s.height), y: s.top, h: s.height } : null, schermo: innerWidth * innerHeight,
        segni: document.querySelectorAll('.lettura-segno').length, selezione: String(getSelection()).length,
        spotSel: (() => { const r = getSelection().rangeCount && !getSelection().isCollapsed ? getSelection().getRangeAt(0).getBoundingClientRect() : null; return r && s ? Math.abs(r.top - s.top) < 12 && Math.abs(r.height - s.height) < 16 : false; })(),
        norma: !!document.querySelector('.norma-sel'), mappaLettore: document.querySelectorAll('.lettura-pannello-mappa').length,
        menuIlluminato: (() => { const m = document.querySelector('.mobile-tabs button[aria-label="Apri menu"]')?.getBoundingClientRect(); return !!(m && s && m.left >= s.left - 1 && m.right <= s.right + 1 && m.top >= s.top - 1 && m.bottom <= s.bottom + 1); })(),
      };
    });
    tappe.push(t);
    const dove = `tappa ${tappe.length} «${t.titolo}»`;
    verifica(!/Aspettiamo/.test(t.titolo), `${dove}: la tappa non trova la pagina`);
    verifica(t.select === 0, `${dove}: c'è ancora il menu delle sezioni`);
    verifica(t.controlli.length === 2, `${dove}: comandi attesi indietro e avanti, trovati ${t.controlli.join(', ')}`);
    verifica(t.dentro, `${dove}: riquadro fuori dallo schermo`);
    // Il riquadro non deve coprire l'elemento spiegato (si tollera per gli elementi grandi più di metà schermo).
    if (t.spot && t.spot.area < t.schermo * .45) verifica(t.spot.coperta < .25, `${dove}: il riquadro copre il ${Math.round(t.spot.coperta * 100)}% dell'elemento`);
    if (foto) await p.screenshot({ path: `${foto}-${String(tappe.length).padStart(2, '0')}.png` });
    const prossimo = p.locator('.tour-next');
    if ((await prossimo.getAttribute('aria-label')) === 'Apri il mio backup') break;
    await (touch ? prossimo.tap() : prossimo.click());
  }
  const trova = (re) => tappe.find((t) => re.test(t.titolo));
  // Dall'inizio alla fine: tutte le tappe numerate, in ordine.
  const numerate = tappe.filter((t) => / di \d+$/.test(t.passo)).map((t) => t.passo.match(/(\d+) di (\d+)$/).slice(1).map(Number));
  verifica(numerate.length > 25 && numerate.every(([n, tot], i) => n === i + 1 && tot === numerate.length), `tappe non in sequenza (${numerate.map((x) => x.join('/')).join(' ')})`);
  // Selezione → strumento → salvataggio.
  const sel = trova(/Prima scegli il passaggio/), str = trova(/Poi lo strumento/), salva = trova(/Infine salvi/);
  verifica(sel && sel.selezione > 20 && sel.segni === 0, `la selezione deve vedersi prima del segno (${JSON.stringify(sel && { sel: sel.selezione, segni: sel.segni })})`);
  if (process.env.DEBUG_VISITA) console.log(JSON.stringify({ sel, str, salva }));
  verifica(sel?.spotSel, 'il riquadro della selezione deve illuminare la selezione, non tutto il paragrafo');
  verifica(str && str.selezione > 20 && str.segni === 0, 'lo strumento si sceglie con la selezione ancora da salvare');
  verifica(salva && salva.segni > 0 && salva.selezione === 0, 'il segno compare solo al salvataggio');
  // Nuove funzioni.
  verifica(!!trova(/Chiesta all/), 'manca la tappa «Chiesta all’esame»');
  verifica(!!trova(/Domande d.esame/), 'manca la tappa «Domande d’esame» in Allenamento');
  verifica(!!trova(/di che concetto si tratta/), 'manca la tappa delle schede inverse');
  verifica(!!trova(/testo IURIS/), 'manca la tappa del testo IURIS');
  verifica(!!trova(/Mappa personale nasce/), 'manca la tappa della Mappa personale');
  verifica(trova(/L’articolo, nel suo atto/)?.norma, 'la tappa degli articoli non apre l’articolo');
  // Telefono: la Mappa personale sta solo nella sezione Mappa.
  if (telefono) verifica(!trova(/I tuoi segni diventano una mappa/) && tappe.every((t) => !t.mappaLettore), 'sul telefono la visita mostra la mappa nel lettore');
  else verifica(!!trova(/I tuoi segni diventano una mappa/), 'manca la mappa nel lettore su PC e iPad');
  // Touch: prima di ogni cambio di sezione dal Menu, la tappa ponte illumina il Menu.
  if (touch) {
    const ponti = tappe.filter((t) => /^Verso /.test(t.passo));
    verifica(ponti.length >= 6, `tappe ponte attese, trovate ${ponti.length}`);
    verifica(ponti.every((t) => t.menuIlluminato), 'una tappa ponte non illumina il Menu in basso');
    tappe.forEach((t, i) => {
      const prima = tappe[i - 1], sez = (x) => x.passo.replace(/ · .*$/, '').replace(/^Verso /, '');
      if (prima && !/^Verso /.test(t.passo) && sez(prima) !== sez(t) && !/^Verso /.test(prima.passo) && !/testo IURIS|L’articolo/.test(t.titolo)) verifica(false, `salto di netto da ${sez(prima)} a ${sez(t)}`);
    });
  } else verifica(!tappe.some((t) => /^Verso /.test(t.passo)), 'tappe ponte sul PC');
  // Fine: si apre il backup reale, la materia e le preferenze tornano quelle di prima.
  await (touch ? p.locator('.tour-next').tap() : p.locator('.tour-next').click());
  await p.waitForFunction(() => !document.querySelector('.tour-layer') && location.hash === '#/backup', null, { timeout: 15000 });
  verifica(await p.evaluate(() => localStorage.getItem('iuris:v1:pref')) === prefPrima, 'preferenze cambiate dopo la visita');
  // Rifare la visita: riparte dalla prima tappa.
  await p.evaluate(() => { location.hash = '#/demo'; });
  await p.waitForSelector('.tour-bubble.ready', { timeout: 30000 });
  verifica(/ 1 di /.test(await p.textContent('.tour-step')), 'la visita rifatta non riparte dall’inizio');
  await p.locator('.tour-close').click();
  verifica(pagina.length === 0, `errori in pagina: ${[...new Set(pagina)].slice(0, 3).join(' | ')}`);
  await ctx.close();

  if (!primaVisita) return { errori, controlli, tappe: tappe.length };
  // Prima visita: parte da sola una volta (qui si simula un browser normale, senza navigator.webdriver).
  const nuovo = await browser.newContext({ ...opzioni, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await nuovo.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const q = await nuovo.newPage();
  await q.goto(BASE + '#/');
  verifica(await q.waitForSelector('.tour-bubble.ready', { timeout: 30000 }).then(() => true, () => false), 'alla prima visita la visita non parte da sola');
  await q.locator('.tour-close').click();
  await q.waitForFunction(() => !document.querySelector('.tour-layer'));
  await q.reload(); await q.waitForSelector('.main .hero-main', { timeout: 20000 }); await q.waitForTimeout(800);
  verifica(await q.locator('.tour-layer').count() === 0, 'la visita riparte da sola anche dopo la prima volta');
  await nuovo.close();
  return { errori, controlli, tappe: tappe.length };
}
