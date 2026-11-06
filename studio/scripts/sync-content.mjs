/**
 * sync-content.mjs
 * Legge le cartelle-materia di IURIS (sorelle di studio/) e costruisce, per ogni materia
 * con una cartella "05 - Contenuti", un unico public/content/<slug>/corso.json:
 * unità e lezioni, glossario unificato, relazioni, cronologia, mappa e domande.
 * Il formato delle unità è descritto in CONTENUTI.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import { idsNoti, idsNuoviOltre, validateOltre, validateSchedeInverse, validateUnit } from './validate-content.mjs';
import { spaceGraphNodes } from './graph-layout.mjs';

const studioRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iurisRoot = path.dirname(studioRoot);
const outRoot = path.join(studioRoot, 'public', 'content');
const CONTENUTI = '05 - Contenuti';

const SKIP = new Set(['studio', 'node_modules', '.git']);
const slug = (s) =>
  s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const links = (s) => [...(s || '').matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
/** pagine distinte coperte dalle lezioni; con più fonti (PDF diversi) la stessa pagina conta una volta per fonte */
const pagesUnion = (lezioni) => {
  const set = new Set();
  for (const l of lezioni) {
    if (!l.pagine) continue;
    for (let p = l.pagine[0]; p <= l.pagine[1]; p++) set.add(`${l.fonte ?? ''}:${p}`);
  }
  return set.size;
};

/** Applica alias.json ({ "id-doppione": "id-canonico" }) a tutti i riferimenti di un'unità */
function rinomina(u, alias) {
  if (!Object.keys(alias).length) return u;
  const id = (x) => alias[x] ?? x;
  const md = (s) => s?.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (m, a, t) => `[[${id(a.trim())}${t ?? ''}]]`);
  const walk = (n) => { if (n.concetto) n.concetto = id(n.concetto); (n.figli || []).forEach(walk); };
  for (const c of u.concetti) { c.id = id(c.id); c.definizione = md(c.definizione); }
  // dopo la rinomina un'unità può avere lo stesso concetto due volte: si tiene il primo
  const visti = new Set();
  u.concetti = u.concetti.filter((c) => (visti.has(c.id) ? false : visti.add(c.id)));
  for (const l of u.lezioni) { l.concetti = [...new Set(l.concetti.map(id))]; l.sintesi = md(l.sintesi); }
  for (const r of u.relazioni) { r.da = id(r.da); r.a = id(r.a); }
  u.relazioni = u.relazioni.filter((r) => r.da !== r.a);
  for (const e of u.eventi) e.concetti = e.concetti?.map(id);
  for (const q of u.domande) { q.concetti = q.concetti?.map(id); if (q.traccia) q.traccia = md(q.traccia); }
  walk(u.mappa);
  return u;
}

/** Posizioni della mappa di tutti i concetti, calcolate qui una volta sola: il browser
 *  riutilizza le coordinate anche quando si filtra per unità o tipo. */
function layoutGrafo(concetti, relazioni, unita) {
  const grado = new Map();
  for (const r of relazioni) { grado.set(r.da, (grado.get(r.da) ?? 0) + 1); grado.set(r.a, (grado.get(r.a) ?? 0) + 1); }
  const ordU = new Map(unita.map((u, i) => [u.id, i]));
  const nodi = concetti.map((c, i) => {
    const a = ((ordU.get(c.unita[0]) ?? 0) / Math.max(1, unita.length)) * Math.PI * 2;
    return { id: c.id, nome: c.nome, grado: grado.get(c.id) ?? 0, x: Math.cos(a) * 1000 + (i % 7) * 12, y: Math.sin(a) * 600 + (i % 5) * 12 };
  });
  const byId = new Map(nodi.map((n) => [n.id, n]));
  // Più relazioni fra gli stessi concetti restano visibili, ma condividono una sola
  // molla nel precalcolo: ripeterla altererebbe la distanza in base al numero di frasi.
  const pairs = new Set();
  const links = relazioni.filter((r) => byId.has(r.da) && byId.has(r.a)).flatMap((r) => {
    const key = [r.da, r.a].sort().join('|');
    if (pairs.has(key)) return [];
    pairs.add(key);
    return [{ source: byId.get(r.da), target: byId.get(r.a) }];
  });
  const sim = forceSimulation(nodi)
    .force('link', forceLink(links).distance(220).strength(0.8))
    .force('charge', forceManyBody().strength(-300).distanceMax(1300))
    .force('collide', forceCollide().radius((d) => 35 + Math.sqrt(d.grado) * 2).iterations(2))
    .force('x', forceX(0).strength(0.006)).force('y', forceY(0).strength(0.05))
    .force('center', forceCenter(0, 0))
    .stop();
  for (let i = 0; i < 400; i++) sim.tick();
  return spaceGraphNodes(nodi);
}

function buildCorso(materiaDir, materiaSlug, nomeCartella) {
  const dir = path.join(materiaDir, CONTENUTI);
  const meta = fs.existsSync(path.join(dir, 'materia.json')) ? readJson(path.join(dir, 'materia.json')) : {};
  const alias = fs.existsSync(path.join(dir, 'alias.json')) ? readJson(path.join(dir, 'alias.json')) : {};
  // concetti-extra.json: voci di glossario che nessuna unità definisce ma che vengono citate
  const extra = fs.existsSync(path.join(dir, 'concetti-extra.json')) ? readJson(path.join(dir, 'concetti-extra.json')) : [];
  // materie con più testi: materia.json elenca le "fonti" e ogni unità dice da quale viene ("fonte")
  const fonti = new Map((meta.fonti ?? []).map((f) => [f.id, f]));
  const files = fs.readdirSync(dir).filter((f) => /^u\d+\.json$/.test(f)).sort();
  const noti = idsNoti(dir);
  const avvisi = [];
  const unita = [];
  const concetti = new Map();
  const relazioni = new Map();
  const eventi = new Map();
  const domande = [];
  const referenced = new Map(); // id → luoghi

  for (const f of files) {
    let u;
    try { u = readJson(path.join(dir, f)); }
    catch (e) { avvisi.push(`${f}: JSON non valido (${e.message})`); continue; }
    const { errors } = validateUnit(u, f, noti);
    if (errors.length) {
      avvisi.push(`${f}: ${errors.length} errori di formato, unità saltata (node scripts/validate-content.mjs per i dettagli)`);
      continue;
    }
    rinomina(u, alias);
    if (u.fonte && !fonti.has(u.fonte)) avvisi.push(`${f}: fonte "${u.fonte}" non elencata in materia.json`);
    const fonteNome = u.fonte ? fonti.get(u.fonte)?.nome ?? u.fonte : undefined;

    unita.push({
      id: u.id, ordine: u.ordine, titolo: u.titolo, capitolo: u.capitolo ?? null, pagine: u.pagine,
      manuale: u.manuale, ricostruita: u.ricostruita || undefined, fonte: u.fonte, fonteNome,
      abstract: u.abstract, note: u.note ?? null, mappa: u.mappa,
      lezioni: u.lezioni.map((l) => ({ ...l, unita: u.id, fonte: u.fonte, fonteNome })),
    });

    for (const c of u.concetti) {
      const prev = concetti.get(c.id);
      if (!prev) {
        concetti.set(c.id, {
          ...c, alias: c.alias ?? [], unita: [u.id], lezioni: [],
          pagine: c.pagine ? [{ unita: u.id, pagine: c.pagine, fonteNome }] : [], approfondimenti: [],
        });
      } else {
        prev.alias = [...new Set([...prev.alias, ...(c.alias ?? [])])];
        if (!prev.latino && c.latino) prev.latino = c.latino;
        if (!prev.unita.includes(u.id)) prev.unita.push(u.id);
        if (c.pagine) prev.pagine.push({ unita: u.id, pagine: c.pagine, fonteNome });
        prev.approfondimenti.push({ unita: u.id, titolo: u.titolo, testo: c.definizione });
      }
    }

    const ref = (id, where) => {
      if (!referenced.has(id)) referenced.set(id, new Set());
      referenced.get(id).add(where);
    };
    for (const l of u.lezioni) {
      for (const id of new Set([...l.concetti, ...links(l.sintesi)])) ref(id, l.id);
    }
    for (const r of u.relazioni) {
      const k = `${r.da}|${r.a}|${r.tipo}`;
      if (!relazioni.has(k)) relazioni.set(k, { ...r, unita: u.id });
    }
    for (const ev of u.eventi) {
      const prev = eventi.get(ev.id);
      if (!prev) eventi.set(ev.id, { ...ev, unita: u.id, fonteNome });
      else prev.concetti = [...new Set([...(prev.concetti ?? []), ...(ev.concetti ?? [])])];
    }
    for (const q of u.domande) domande.push({ ...q, unita: u.id, fonteNome });
  }

  for (const c of extra) {
    if (concetti.has(c.id)) continue;
    concetti.set(c.id, { ...c, alias: c.alias ?? [], unita: [], lezioni: [], pagine: c.pagine ? [{ unita: null, pagine: c.pagine }] : [], approfondimenti: [] });
  }
  // ampliamenti «oltre gli appunti» (oltre*.json): conoscenze di base sulle voci, collegamenti corretti o aggiunti
  const id = (x) => alias[x] ?? x;
  const chiave = (r) => `${r.da}|${r.a}|${r.tipo}`;
  const tra = (x, y) => [...relazioni.values()].filter((r) => (r.da === x && r.a === y) || (r.da === y && r.a === x));
  const ampliamenti = [];
  const base = new Set([...idsNoti(dir, false), ...concetti.keys()]);
  for (const f of fs.readdirSync(dir).filter((f) => /^oltre.*\.json$/.test(f)).sort()) {
    let o;
    try { o = readJson(path.join(dir, f)); } catch (e) { throw new Error(`${f}: JSON non valido (${e.message})`); }
    const { errors } = validateOltre(o, new Set([...base, ...idsNuoviOltre(dir, f)]));
    if (errors.length) throw new Error(`${f}: ampliamento non valido\n${errors.join('\n')}`);
    ampliamenti.push(o);
  }
  // Registra prima tutte le nuove voci: i riferimenti non dipendono dall'ordine dei file.
  for (const o of ampliamenti) {
    for (const c of o.nuovi ?? []) {
      if (concetti.has(c.id)) continue;
      concetti.set(c.id, { ...c, alias: c.alias ?? [], unita: [], lezioni: [], pagine: [], approfondimenti: [], oltreAppunti: true });
    }
  }
  for (const o of ampliamenti) {
    for (const v of o.voci) {
      const c = concetti.get(id(v.id));
      if (!c) continue;
      if (v.rettifica) {
        c.breve = v.rettifica.breve;
        c.definizione = v.rettifica.definizione;
        c.rettificato = true;
      }
      if (v.oltre) c.oltre = { testo: v.oltre, daSapere: v.daSapere ?? [], ...(v.fonti?.length ? { fonti: v.fonti } : {}) };
      for (const t of v.togli ?? []) for (const r of tra(id(t.da), id(t.a))) relazioni.delete(chiave(r));
      for (const n of v.collegamenti ?? []) {
        const nuovo = { da: id(n.da), a: id(n.a), tipo: n.tipo, etichetta: n.etichetta };
        const vecchi = tra(nuovo.da, nuovo.a);
        for (const r of vecchi) relazioni.delete(chiave(r)); // stesso collegamento riscritto meglio
        relazioni.set(chiave(nuovo), { ...nuovo, unita: vecchi[0]?.unita ?? null, oltre: true });
      }
    }
  }
  for (const c of concetti.values()) if (c.oltre) for (const l of links(c.oltre.testo)) if (!concetti.has(l)) avvisi.push(`oltre: «${c.id}» rimanda a "${l}", che non esiste`);

  const inverseFile = path.join(dir, 'schede-inverse.json');
  if (fs.existsSync(inverseFile)) {
    const inverse = readJson(inverseFile);
    const { errors } = validateSchedeInverse(inverse, concetti);
    if (errors.length) throw new Error(`schede-inverse.json: schede non valide\n${errors.join('\n')}`);
    for (const s of inverse) concetti.get(s.concetto).schedaInversa = s.definizione.trim();
  }

  // lezioni in cui compare ciascun concetto
  for (const [id, where] of referenced) {
    const c = concetti.get(id);
    if (c) c.lezioni = [...where];
  }
  // riferimenti a concetti mai definiti
  const tutti = new Set();
  const addRef = (id) => id && tutti.add(id);
  for (const u of unita) {
    for (const l of u.lezioni) { l.concetti.forEach(addRef); links(l.sintesi).forEach(addRef); }
    const walk = (n) => { addRef(n.concetto); (n.figli || []).forEach(walk); };
    walk(u.mappa);
  }
  for (const r of relazioni.values()) { addRef(r.da); addRef(r.a); }
  for (const e of eventi.values()) (e.concetti || []).forEach(addRef);
  for (const q of domande) (q.concetti || []).forEach(addRef);
  const mancanti = [...tutti].filter((id) => !concetti.has(id)).sort();
  if (mancanti.length) avvisi.push(`${mancanti.length} concetti citati ma non definiti: ${mancanti.join(', ')}`);

  unita.sort((a, b) => a.ordine - b.ordine);
  const lezioni = unita.flatMap((u) => u.lezioni);
  const corso = {
    generatedAt: new Date().toISOString(),
    materia: { slug: materiaSlug, nome: meta.nome ?? nomeCartella, ...meta },
    unita,
    concetti: [...concetti.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    relazioni: [...relazioni.values()].filter((r) => concetti.has(r.da) && concetti.has(r.a)),
    eventi: [...eventi.values()].sort((a, b) => a.anno - b.anno || (a.annoFine ?? a.anno) - (b.annoFine ?? b.anno)),
    domande,
    mancanti,
  };
  corso.grafo = layoutGrafo(corso.concetti, corso.relazioni, unita);
  const stats = {
    unita: unita.length,
    lezioni: lezioni.length,
    pagine: pagesUnion(lezioni),
    paginePdf: meta.fonte?.pagine ?? null,
    concetti: corso.concetti.length,
    eventi: corso.eventi.length,
    domande: domande.length,
  };
  return { corso, stats, avvisi };
}

fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), materie: [] };

for (const entry of fs.readdirSync(iurisRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
  const materiaDir = path.join(iurisRoot, entry.name);
  const materiaSlug = slug(entry.name);
  const fontiDir = path.join(materiaDir, '00 - Appunti e fonti');
  const fonti = fs.existsSync(fontiDir) ? fs.readdirSync(fontiDir).filter((f) => !f.startsWith('.')) : [];

  if (!fs.existsSync(path.join(materiaDir, CONTENUTI))) {
    manifest.materie.push({ slug: materiaSlug, nome: entry.name.trim(), disponibile: false, fonti });
    continue;
  }
  const { corso, stats, avvisi } = buildCorso(materiaDir, materiaSlug, entry.name.trim());
  fs.mkdirSync(path.join(outRoot, materiaSlug), { recursive: true });
  fs.writeFileSync(path.join(outRoot, materiaSlug, 'corso.json'), JSON.stringify(corso));
  manifest.materie.push({
    slug: materiaSlug, nome: corso.materia.nome, breve: corso.materia.breve ?? corso.materia.nome,
    colore: corso.materia.colore ?? null, disponibile: true, fonti,
    file: `content/${materiaSlug}/corso.json`, stats,
  });
  console.log(`[sync] ${corso.materia.nome}: ${stats.unita} unità, ${stats.lezioni} lezioni, ${stats.pagine} pagine, ${stats.concetti} concetti, ${stats.domande} domande`);
  for (const a of avvisi) console.warn(`[sync]   avviso: ${a}`);
}

manifest.materie.sort((a, b) => Number(b.disponibile) - Number(a.disponibile) || a.nome.localeCompare(b.nome, 'it'));
fs.writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[sync] ${manifest.materie.length} materie in public/content`);
