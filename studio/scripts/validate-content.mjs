/**
 * validate-content.mjs
 * Controlla una o più unità di studio (uNN.json) secondo il formato descritto in CONTENUTI.md.
 *   node scripts/validate-content.mjs "<Materia>/05 - Contenuti/u03.json" [altri file…]
 * Esce con codice 1 se ci sono errori. Gli avvisi non bloccano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const studioRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const TIPI_CONCETTO = new Set(['persona', 'magistratura', 'organo', 'gruppo', 'norma', 'fonte', 'opera', 'istituto', 'procedura', 'periodo', 'evento', 'concetto', 'luogo']);
const TIPI_RELAZIONE = new Set(['parte-di', 'crea', 'supera', 'influenza', 'contrasta', 'evolve-in', 'testimonia', 'interpreta', 'causa', 'esempio-di', 'collegato']);
const TIPI_EVENTO = new Set(['legge', 'istituzione', 'giurisprudenza', 'politica', 'codificazione', 'opera', 'periodo', 'altro']);
const LIVELLI = new Set(['base', 'medio', 'avanzato']);
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function canonicalIds() {
  try {
    const md = fs.readFileSync(path.join(studioRoot, 'CONTENUTI.md'), 'utf8');
    const sez = md.split('## ID CANONICI').slice(1).join('\n'); // tutte le sezioni, una per materia
    return new Set([...sez.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
  } catch { return new Set(); }
}

/** Id canonici più quelli definiti dalle unità della cartella e da concetti-extra.json:
 *  un'unità scritta dopo le altre può citarli senza ridefinirli. */
export function idsNoti(dir, includiCanonici = true) {
  const ids = includiCanonici ? canonicalIds() : new Set();
  for (const f of fs.readdirSync(dir)) {
    if (!/^u\d+\.json$/.test(f) && f !== 'concetti-extra.json') continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const c of (Array.isArray(j) ? j : j.concetti ?? [])) if (c?.id) ids.add(c.id);
    } catch { /* un file illeggibile viene segnalato quando lo si valida */ }
  }
  return ids;
}

/** Le voci nuove degli altri ampliamenti possono essere citate senza duplicarle. */
export function idsNuoviOltre(dir, escluso) {
  const ids = new Set();
  for (const f of fs.readdirSync(dir).filter((f) => /^oltre.*\.json$/.test(f))) {
    if (f === escluso) continue;
    try {
      const o = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const c of o.nuovi ?? []) if (c?.id) ids.add(c.id);
    } catch { /* il file illeggibile viene segnalato quando lo si valida */ }
  }
  return ids;
}

const words = (s) => (s || '').split(/\s+/).filter(Boolean).length;
const links = (s) => [...(s || '').matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());

export function validateUnit(u, fileName, canon = canonicalIds()) {
  const errors = [];
  const warns = [];
  const E = (m) => errors.push(m);
  const W = (m) => warns.push(m);
  const isRange = (p) => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] <= p[1];

  const expectedId = fileName ? path.basename(fileName, '.json') : u.id;
  if (u.id !== expectedId) E(`id unità "${u.id}" diverso dal nome file "${expectedId}"`);
  for (const k of ['titolo', 'abstract']) if (!u[k] || typeof u[k] !== 'string') E(`manca "${k}"`);
  if (!Number.isInteger(u.ordine)) E('manca "ordine" (intero)');
  // unità ricostruita: capitolo che gli appunti non trattano, riferito alle pagine del manuale
  if (u.ricostruita) {
    if (u.pagine != null && !isRange(u.pagine)) E('"pagine" deve essere [da, a]');
    if (!isRange(u.manuale)) E('unità ricostruita: "manuale" deve essere [da, a]');
  } else if (!isRange(u.pagine)) E('"pagine" deve essere [da, a]');
  for (const k of ['lezioni', 'concetti', 'relazioni', 'eventi', 'domande']) if (!Array.isArray(u[k])) E(`"${k}" deve essere un array`);
  if (!u.mappa || typeof u.mappa !== 'object') E('manca "mappa"');
  if (errors.length) return { errors, warns, stats: {} };

  const [uFrom, uTo] = u.pagine ?? [];
  const inUnit = (p, where) => {
    if (p == null && u.ricostruita) return;
    if (!isRange(p)) { E(`${where}: "pagine" deve essere [da, a]`); return; }
    if (u.pagine && (p[0] < uFrom || p[1] > uTo)) W(`${where}: pagine ${p[0]}–${p[1]} fuori dall'unità (${uFrom}–${uTo})`);
  };
  const inManuale = (p, where) => {
    if (!isRange(p)) { E(`${where}: "manuale" deve essere [da, a]`); return; }
    if (p[0] < u.manuale[0] || p[1] > u.manuale[1]) W(`${where}: manuale pp. ${p[0]}–${p[1]} fuori dall'unità`);
  };

  // Concetti
  const local = new Set();
  for (const c of u.concetti) {
    const w = `concetto "${c.id}"`;
    if (!c.id || !ID_RE.test(c.id)) E(`${w}: id non valido (kebab-case senza accenti)`);
    if (local.has(c.id)) E(`${w}: id duplicato`);
    local.add(c.id);
    if (!c.nome) E(`${w}: manca "nome"`);
    if (!TIPI_CONCETTO.has(c.tipo)) E(`${w}: tipo "${c.tipo}" non valido`);
    if (!c.breve) E(`${w}: manca "breve"`);
    else if (c.breve.length > 180) W(`${w}: "breve" troppo lungo (${c.breve.length} caratteri)`);
    if (!c.definizione) E(`${w}: manca "definizione"`);
    if (c.alias && !Array.isArray(c.alias)) E(`${w}: "alias" deve essere un array`);
    inUnit(c.pagine, w);
  }
  const known = (id) => local.has(id) || canon.has(id);
  const refs = new Map(); // id → dove
  const ref = (id, where) => { if (!known(id)) refs.set(id, where); };

  // Lezioni
  const lezIds = new Set();
  let wordsTot = 0;
  const lezioni = [...u.lezioni];
  for (const l of lezioni) {
    const w = `lezione "${l.id}"`;
    if (!l.id || !l.id.startsWith(`${u.id}-l`)) E(`${w}: id deve iniziare con "${u.id}-l"`);
    if (lezIds.has(l.id)) E(`${w}: id duplicato`);
    lezIds.add(l.id);
    if (!l.titolo) E(`${w}: manca "titolo"`);
    inUnit(l.pagine, w);
    if (u.ricostruita) inManuale(l.manuale, w);
    if (!l.sintesi) E(`${w}: manca "sintesi"`);
    const n = words(l.sintesi);
    wordsTot += n;
    if (u.ricostruita) {
      if (n < 350) W(`${w}: sintesi corta (${n} parole, obiettivo almeno 350 per paragrafo del manuale)`);
    } else if (isRange(l.pagine)) {
      const pp = l.pagine[1] - l.pagine[0] + 1;
      if (n / pp < 140) W(`${w}: sintesi corta (${n} parole per ${pp} pagine, obiettivo 200–300 per pagina)`);
      if (pp > 7) W(`${w}: ${pp} pagine, meglio spezzarla (2–6)`);
    }
    if (!Array.isArray(l.puntiChiave) || l.puntiChiave.length < 3) W(`${w}: almeno 3 "puntiChiave"`);
    if (!Array.isArray(l.memoria)) E(`${w}: "memoria" deve essere un array`);
    else for (const m of l.memoria) if (!m.voce || !m.dettaglio) E(`${w}: voce di "memoria" senza "voce"/"dettaglio"`);
    if (!Array.isArray(l.concetti)) E(`${w}: "concetti" deve essere un array`);
    else for (const id of l.concetti) ref(id, w);
    for (const id of links(l.sintesi)) ref(id, `${w} (link nella sintesi)`);
    if (!Number.isInteger(l.minuti)) W(`${w}: manca "minuti"`);
  }
  // copertura delle pagine (degli appunti e, per le unità ricostruite, del manuale)
  const copertura = (campo, [from, to], etichetta) => {
    const ord = lezioni.filter((l) => isRange(l[campo])).sort((a, b) => a[campo][0] - b[campo][0]);
    let cursor = from - 1;
    for (const l of ord) {
      if (l[campo][0] > cursor + 1) W(`${etichetta} ${cursor + 1}–${l[campo][0] - 1} non coperte da nessuna lezione`);
      cursor = Math.max(cursor, l[campo][1]);
    }
    if (ord.length && cursor < to) W(`${etichetta} ${cursor + 1}–${to} non coperte da nessuna lezione`);
  };
  if (u.pagine) copertura('pagine', u.pagine, 'pagine');
  if (u.ricostruita) copertura('manuale', u.manuale, 'pagine del manuale');

  for (const c of u.concetti) for (const id of links(c.definizione)) ref(id, `concetto "${c.id}" (link)`);

  // Relazioni
  for (const r of u.relazioni) {
    const w = `relazione ${r.da} → ${r.a}`;
    if (!TIPI_RELAZIONE.has(r.tipo)) E(`${w}: tipo "${r.tipo}" non valido`);
    if (r.da === r.a) E(`${w}: un concetto non può collegarsi a se stesso`);
    ref(r.da, w); ref(r.a, w);
  }

  // Eventi
  const evIds = new Set();
  for (const ev of u.eventi) {
    const w = `evento "${ev.id}"`;
    if (!ev.id || !ev.id.startsWith('ev-')) E(`${w}: id deve iniziare con "ev-"`);
    if (evIds.has(ev.id)) E(`${w}: id duplicato`);
    evIds.add(ev.id);
    if (!Number.isInteger(ev.anno)) E(`${w}: "anno" deve essere un intero (a.C. negativo)`);
    if (ev.annoFine != null && (!Number.isInteger(ev.annoFine) || ev.annoFine < ev.anno)) E(`${w}: "annoFine" non valido`);
    if (!ev.data || !ev.titolo) E(`${w}: mancano "data" o "titolo"`);
    if (!TIPI_EVENTO.has(ev.tipo)) E(`${w}: tipo "${ev.tipo}" non valido`);
    for (const id of ev.concetti || []) ref(id, w);
    if (ev.pagine) inUnit(ev.pagine, w);
  }

  // Mappa
  let nodi = 0, prof = 0;
  const walk = (n, d, where) => {
    nodi++; prof = Math.max(prof, d);
    if (!n.testo) E(`mappa: nodo senza "testo" (${where})`);
    else if (n.testo.length > 60) W(`mappa: etichetta lunga "${n.testo.slice(0, 40)}…"`);
    if (n.concetto) ref(n.concetto, `mappa "${n.testo}"`);
    if (n.figli != null && !Array.isArray(n.figli)) E(`mappa: "figli" deve essere un array (${n.testo})`);
    (n.figli || []).forEach((f, i) => walk(f, d + 1, `${where}.${i}`));
  };
  walk(u.mappa, 1, 'radice');
  if (prof < 3) W(`mappa poco profonda (${prof} livelli)`);

  // Domande
  const qIds = new Set();
  const perLez = new Map();
  const perTipo = {};
  for (const q of u.domande) {
    const w = `domanda "${q.id}"`;
    if (!q.id || !new RegExp(`^${u.id}-q\\d{3}$`).test(q.id)) E(`${w}: id deve essere "${u.id}-q001", "${u.id}-q002"…`);
    if (qIds.has(q.id)) E(`${w}: id duplicato`);
    qIds.add(q.id);
    if (!lezIds.has(q.lezione)) E(`${w}: lezione "${q.lezione}" inesistente`);
    if (!LIVELLI.has(q.livello)) E(`${w}: livello "${q.livello}" non valido`);
    if (q.pagine) inUnit(q.pagine, w);
    for (const id of q.concetti || []) ref(id, w);
    perTipo[q.tipo] = (perTipo[q.tipo] || 0) + 1;
    const pl = perLez.get(q.lezione) || {};
    pl[q.tipo] = (pl[q.tipo] || 0) + 1;
    perLez.set(q.lezione, pl);
    switch (q.tipo) {
      case 'flashcard':
        if (!q.domanda || !q.risposta) E(`${w}: servono "domanda" e "risposta"`);
        break;
      case 'multipla':
        if (!q.domanda || !Array.isArray(q.opzioni) || q.opzioni.length < 3) E(`${w}: servono "domanda" e almeno 3 "opzioni"`);
        else if (!Number.isInteger(q.corretta) || q.corretta < 0 || q.corretta >= q.opzioni.length) E(`${w}: "corretta" fuori dalle opzioni`);
        if (new Set(q.opzioni || []).size !== (q.opzioni || []).length) E(`${w}: opzioni duplicate`);
        if (!q.spiegazione) W(`${w}: manca "spiegazione"`);
        break;
      case 'verofalso':
        if (!q.affermazione || typeof q.vero !== 'boolean') E(`${w}: servono "affermazione" e "vero" (booleano)`);
        if (!q.spiegazione) E(`${w}: manca "spiegazione"`);
        break;
      case 'completa':
        if (!q.testo || !/\{\{[^}]+\}\}/.test(q.testo)) E(`${w}: "testo" deve contenere almeno un {{buco}}`);
        break;
      case 'aperta':
        if (!q.domanda || !q.traccia) E(`${w}: servono "domanda" e "traccia"`);
        if (!Array.isArray(q.punti) || q.punti.length < 2) E(`${w}: servono almeno 2 "punti"`);
        else for (const p of q.punti) {
          if (!p.testo || !Array.isArray(p.chiavi) || !p.chiavi.length) E(`${w}: ogni punto vuole "testo" e "chiavi"`);
          else if (p.chiavi.some((k) => k !== k.toLowerCase())) W(`${w}: "chiavi" in minuscolo`);
        }
        for (const id of links(q.traccia)) ref(id, `${w} (link)`);
        break;
      case 'ordina':
        if (!q.consegna || !Array.isArray(q.elementi) || q.elementi.length < 3) E(`${w}: servono "consegna" e almeno 3 "elementi"`);
        break;
      case 'abbina':
        if (!q.consegna || !Array.isArray(q.coppie) || q.coppie.length < 3) E(`${w}: servono "consegna" e almeno 3 "coppie"`);
        else if (q.coppie.some((c) => !Array.isArray(c) || c.length !== 2)) E(`${w}: ogni coppia è [sinistra, destra]`);
        break;
      default:
        E(`${w}: tipo "${q.tipo}" non valido`);
    }
  }
  const MIN = { flashcard: 4, multipla: 2, verofalso: 2, completa: 1, aperta: 1 };
  for (const l of lezioni) {
    const pl = perLez.get(l.id) || {};
    const manca = Object.entries(MIN).filter(([t, n]) => (pl[t] || 0) < n).map(([t, n]) => `${t} ${pl[t] || 0}/${n}`);
    if (manca.length) W(`lezione "${l.id}": poche domande (${manca.join(', ')})`);
  }
  if (!perTipo.ordina && u.eventi.length >= 3) W('nessuna domanda "ordina" nell\'unità');
  if (!perTipo.abbina) W('nessuna domanda "abbina" nell\'unità');

  for (const [id, where] of refs) E(`id "${id}" non definito né canonico (${where}): aggiungi il concetto o usa un id canonico`);

  return {
    errors, warns,
    stats: {
      lezioni: lezioni.length, parole: wordsTot, concetti: u.concetti.length, relazioni: u.relazioni.length,
      eventi: u.eventi.length, nodiMappa: nodi, domande: u.domande.length, perTipo,
    },
  };
}

/** Controlla un file oltre*.json (ampliamento del glossario e dei collegamenti, vedi CONTENUTI.md) */
export function validateOltre(o, canon) {
  const errors = [];
  const warns = [];
  const E = (m) => errors.push(m);
  const W = (m) => warns.push(m);
  if (!o || !Array.isArray(o.voci)) return { errors: ['servono "voci" (array) e, facoltativo, "nuovi" (array)'], warns, stats: {} };
  const nuovi = new Set();
  for (const c of o.nuovi ?? []) {
    const w = `nuovo concetto "${c.id}"`;
    if (!c.id || !ID_RE.test(c.id)) E(`${w}: id non valido`);
    if (canon.has(c.id)) E(`${w}: esiste già, non va ricreato`);
    if (nuovi.has(c.id)) E(`${w}: ripetuto`);
    if (!c.nome || !c.breve || !c.definizione) E(`${w}: servono "nome", "breve" e "definizione"`);
    if (!TIPI_CONCETTO.has(c.tipo)) E(`${w}: tipo "${c.tipo}" non valido`);
    nuovi.add(c.id);
  }
  const noto = (id) => canon.has(id) || nuovi.has(id);
  for (const c of o.nuovi ?? []) for (const id of links(c.definizione)) if (!noto(id)) E(`nuovo concetto "${c.id}": link a "${id}" inesistente`);
  const viste = new Set();
  let collegamenti = 0;
  for (const v of o.voci) {
    const w = `voce "${v.id}"`;
    if (!noto(v.id)) E(`${w}: id inesistente`);
    if (viste.has(v.id)) E(`${w}: ripetuta`);
    viste.add(v.id);
    if (v.rettifica != null) {
      if (!v.rettifica || typeof v.rettifica.breve !== 'string' || !v.rettifica.breve.trim() || typeof v.rettifica.definizione !== 'string' || !v.rettifica.definizione.trim()) E(`${w}: "rettifica" richiede breve e definizione`);
      else for (const id of links(v.rettifica.definizione)) if (!noto(id)) E(`${w}: rettifica con link a "${id}" inesistente`);
    }
    if (v.oltre != null) {
      const n = words(v.oltre);
      if (n < 40) W(`${w}: testo «oltre» corto (${n} parole)`);
      if (n > 320) W(`${w}: testo «oltre» lungo (${n} parole)`);
      for (const id of links(v.oltre)) if (!noto(id)) E(`${w}: link a "${id}" inesistente`);
    }
    if (v.daSapere && !Array.isArray(v.daSapere)) E(`${w}: "daSapere" deve essere un array`);
    else for (const s of v.daSapere ?? []) {
      if (typeof s !== 'string') { E(`${w}: ogni punto "daSapere" deve essere un testo`); continue; }
      for (const id of links(s)) if (!noto(id)) E(`${w}: punto da sapere con link a "${id}" inesistente`);
    }
    if (v.fonti != null && !Array.isArray(v.fonti)) E(`${w}: "fonti" deve essere un array`);
    else for (const f of v.fonti ?? []) {
      let url;
      try { url = new URL(f.url); } catch { /* errore segnalato sotto */ }
      if (!f.titolo || !url || !['http:', 'https:'].includes(url.protocol)) E(`${w}: fonte senza titolo o URL web valido`);
    }
    for (const r of v.collegamenti ?? []) {
      collegamenti++;
      if (!noto(r.da) || !noto(r.a)) E(`${w}: collegamento ${r.da} → ${r.a} con un id inesistente`);
      if (r.da === r.a) E(`${w}: un concetto non può collegarsi a se stesso`);
      if (r.da !== v.id && r.a !== v.id) W(`${w}: il collegamento ${r.da} → ${r.a} non riguarda questa voce`);
      if (!TIPI_RELAZIONE.has(r.tipo)) E(`${w}: tipo di collegamento "${r.tipo}" non valido`);
      if (!r.etichetta) E(`${w}: collegamento ${r.da} → ${r.a} senza "etichetta"`);
    }
    for (const r of v.togli ?? []) if (!r.da || !r.a) E(`${w}: "togli" vuole { da, a }`);
  }
  return { errors, warns, stats: { voci: o.voci.length, nuovi: nuovi.size, collegamenti } };
}

/** Definizioni curate per l'allenamento inverso del glossario; controllate da sync-content. */
export function validateSchedeInverse(schede, concetti) {
  const errors = [];
  if (!Array.isArray(schede)) return { errors: ['serve un array di { concetto, definizione }'] };
  const normalizza = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const viste = new Set(), testi = new Set();
  for (const s of schede) {
    const c = concetti.get(s?.concetto);
    const w = `scheda "${s?.concetto ?? '?'}"`;
    if (!c) errors.push(`${w}: concetto inesistente o non canonico`);
    if (viste.has(s?.concetto)) errors.push(`${w}: ripetuta`);
    viste.add(s?.concetto);
    if (typeof s?.definizione !== 'string' || s.definizione.trim().length < 30 || s.definizione.length > 500) {
      errors.push(`${w}: serve una definizione tra 30 e 500 caratteri`);
      continue;
    }
    const testo = normalizza(s.definizione);
    if (testi.has(testo)) errors.push(`${w}: definizione uguale a un'altra scheda`);
    testi.add(testo);
    if (/\[\[|\{\{|<[^>]+>/.test(s.definizione)) errors.push(`${w}: usare testo semplice, senza link o campi da completare`);
    if (c) {
      const nomi = [c.nome, c.nome.replace(/\s*\([^)]*\)/g, ''), c.latino, ...(c.alias ?? [])];
      for (const nome of new Set(nomi.filter(Boolean).map(normalizza))) {
        if (nome.length >= 3 && ` ${testo} `.includes(` ${nome} `)) errors.push(`${w}: la definizione contiene già la risposta "${nome}"`);
      }
    }
  }
  return { errors };
}

/** Voci di glossario.json: { concetto, domanda?, premessa?, definizione?, motivo? }. */
export function validateGlossario(voci, concetti) {
  const errors = [];
  if (!Array.isArray(voci)) return { errors: ['serve un array di { concetto, domanda?, premessa?, definizione? }'] };
  const viste = new Set();
  for (const v of voci) {
    const w = `voce "${v?.concetto ?? '?'}"`;
    if (!concetti.get(v?.concetto)) errors.push(`${w}: concetto inesistente o non canonico`);
    if (viste.has(v?.concetto)) errors.push(`${w}: ripetuta`);
    viste.add(v?.concetto);
    if (!v.domanda && !v.premessa && !v.definizione) errors.push(`${w}: serve almeno domanda, premessa o definizione`);
    if (v.domanda != null && (typeof v.domanda !== 'string' || !/\?$/.test(v.domanda.trim()) || v.domanda.length > 160)) errors.push(`${w}: la domanda deve finire con «?» (max 160 caratteri)`);
    if (v.premessa != null && (typeof v.premessa !== 'string' || v.premessa.trim().length < 15 || v.premessa.length > 400 || !/[.!]$/.test(v.premessa.trim()))) errors.push(`${w}: premessa di 15–400 caratteri, chiusa da un punto`);
    if (v.premessa && v.definizione) errors.push(`${w}: usare premessa oppure definizione, non entrambe`);
    if (v.definizione != null && (typeof v.definizione !== 'string' || v.definizione.trim().length < 40 || !v.motivo)) errors.push(`${w}: una definizione riscritta vuole almeno 40 caratteri e un "motivo"`);
  }
  return { errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('uso: node scripts/validate-content.mjs <uNN.json> [...]'); process.exit(2); }
  let bad = false;
  for (const f of files) {
    let u;
    try { u = JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { console.log(`\n✗ ${f}\n  JSON non valido: ${e.message}`); bad = true; continue; }
    const dir = path.dirname(path.resolve(f));
    const oltre = path.basename(f).startsWith('oltre');
    const noti = new Set([...idsNoti(dir, !oltre), ...(oltre ? idsNuoviOltre(dir, path.basename(f)) : [])]);
    const { errors, warns, stats } = oltre ? validateOltre(u, noti) : validateUnit(u, f, noti);
    console.log(`\n${errors.length ? '✗' : '✓'} ${path.basename(f)} — ${errors.length} errori, ${warns.length} avvisi`);
    if (stats.lezioni != null) console.log('  ' + JSON.stringify(stats));
    for (const m of errors) console.log(`  ERRORE  ${m}`);
    for (const m of warns) console.log(`  avviso  ${m}`);
    if (errors.length) bad = true;
  }
  process.exit(bad ? 1 : 0);
}
