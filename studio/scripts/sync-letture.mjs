// Pubblica gli estratti Markdown e le revisioni puntuali; nessun PDF viene modificato.
// Le sezioni revisionate ricevono, in quest'ordine: correzioni di revisioni.json, regole
// editoriali conservative (formattazione, mai parole nuove), collegamenti al glossario.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { improntaMaterialePercorso, sezioneDaPercorso } from './lib/lettura-percorso.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'letture-src');
const json = async (file) => JSON.parse(await readFile(path.join(source, file), 'utf8'));
const catalogo = await json('catalogo.json');
const revisioni = await json('revisioni.json');
const fonti = await json('fonti.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const piano = (s) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => label || id.replace(/-/g, ' '))
  .replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const escRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const parola = (label) => new RegExp(`(?<![\\p{L}\\p{N}_[|])${escRegex(label)}(?![\\p{L}\\p{N}_\\]|])`, 'iu');
const revisionata = (sec) => !!(sec.revisionata || sec.pilota);

/** Regole di sola forma: titoli, elenchi, note, etichette in grassetto e spazi. Le parole restano quelle della fonte. */
export function formatta(md) {
  if (/^(?:#{1,6} |\|)/.test(md)) return md;
  let s = md.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/([AaEeIiOoUu])ˋ/g, (_, v) => ({ A: 'À', a: 'à', E: 'È', e: 'è', I: 'Ì', i: 'ì', O: 'Ò', o: 'ò', U: 'Ù', u: 'ù' })[v])
    .replace(/([AaEeIiOoUu])ˊ/g, (_, v) => ({ A: 'Á', a: 'á', E: 'É', e: 'é', I: 'Í', i: 'í', O: 'Ó', o: 'ó', U: 'Ú', u: 'ú' })[v])
    .replace(/(\p{L})\\(\p{L})/gu, '$1/$2')
    .replace(/[ \t]+([,.;:!?])(?=\s|$)/g, '$1').replace(/\( +/g, '(').replace(/ +\)/g, ')');
  // Negli appunti «>» a inizio riga è una freccia, non una citazione.
  s = s.replace(/^> (?=\S)/gm, '→ ');
  // Freccia tipografica degli appunti (‣) usata come titolo.
  if (/^‣\s*/.test(s) && !s.includes('\n') && s.length <= 120) return `## ${s.replace(/^‣\s*/, '')}`;
  s = s.replace(/^[‣•]\s*/gm, '- ');
  // Nota a piè di pagina finita nel testo: «3 l'aleph…» e richiami «aleph3».
  s = s.replace(/^(\d{1,2}) (?=[\p{L}(«"])/u, (m, n) => Number(n) <= 40 ? `<sup>${n}</sup> ` : m);
  s = s.replace(/(?<=\p{Ll}{3}|[)»"])(\d{1,2})(?=[\s,;:)»"]|\.(?:\s|$)|$)/gu, '<sup>$1</sup>');
  // Il segno > a metà riga è una freccia degli appunti, non una citazione.
  s = s.replace(/(\S) > (?=\S)/g, '$1 → ');
  // Elenchi numerati linearizzati: «1- … 2- …» diventa un elenco, solo se la sequenza è completa.
  if (!s.includes('\n')) {
    const numeri = [...s.matchAll(/(^|\s)(\d{1,2})[-.] (?=\p{Lu})/gu)];
    if (numeri.length >= 2 && numeri.every((m, i) => Number(m[2]) === i + 1)) {
      const testa = s.slice(0, numeri[0].index + numeri[0][1].length).trim();
      const voci = numeri.map((m, i) => s.slice(m.index + m[1].length, i + 1 < numeri.length ? numeri[i + 1].index : s.length).trim().replace(/^(\d{1,2})[-.] /, '$1. '));
      s = `${testa ? `${testa}\n\n` : ''}${voci.join('\n')}`;
    }
  }
  // Sottovoci linearizzate (○) dentro una voce d'elenco.
  s = s.split('\n').map((riga) => /^(?:- |\d{1,2}\. )/.test(riga) && riga.includes(' ○ ') ? riga.replace(/ ○ /g, '\n   - ') : riga.replace(/^○ /, '- ')).join('\n');
  // Etichette brevi all'inizio delle voci: «- Influenze filosofiche: …» → «- **Influenze filosofiche:** …».
  s = s.replace(/^((?:- |\d{1,2}\. ))([\p{Lu}][^\n:[\]*«»"()<>]{0,45}?):(?= )/gmu, (m, marker, label) => label.trim().split(/\s+/).length <= 5 ? `${marker}**${label.trim()}:**` : m);
  // Titolo isolato: riga breve, maiuscola iniziale, senza punteggiatura finale.
  const parole = s.split(/\s+/).length;
  if (!s.includes('\n') && parole <= 12 && s.length <= 90 && /^[\p{Lu}]/u.test(s) && !/[.;:,!?»"”)\]]$/.test(s) && !/^(?:- |\d)/.test(s) && !/\d{4}$/.test(s) && !s.includes('<sup>')) return `### ${s}`;
  return s;
}

function etichette(c) {
  const tutte = [c.nome, c.latino, ...(Array.isArray(c.alias) ? c.alias : [])].filter((x) => typeof x === 'string');
  return [...new Set(tutte.map((x) => x.replace(/\s*\([^)]*\)\s*/g, ' ').trim()).filter((x) => x.length >= 4 && !/[«»"*[\]|]/.test(x)))];
}

function collega(markdown, entry, label) {
  const re = parola(label), parts = markdown.split(/(\[\[[\s\S]*?\]\]|^#{1,6} .*$)/gm);
  let fatto = false;
  const out = parts.map((part) => {
    if (fatto || !part || part.startsWith('[[') || /^#{1,6} /.test(part)) return part;
    return part.replace(re, (text) => { fatto = true; return `[[${entry}|${text}]]`; });
  }).join('');
  return fatto ? out : null;
}

let totale = 0;
for (const doc of catalogo) {
  const outdir = path.join(root, 'public/letture', doc.id);
  await mkdir(outdir, { recursive: true });
  const corso = JSON.parse(await readFile(path.join(root, 'public/content', doc.materia, 'corso.json'), 'utf8'));
  const concetti = new Map(corso.concetti.map((c) => [c.id, c]));
  const lezioni = new Map();
  for (const u of corso.unita) for (const l of u.lezioni) lezioni.set(l.id, l);
  const curati = await json(`glossario-${doc.materia}.json`).catch(() => []);
  for (const e of curati) if (!concetti.has(e.id)) throw new Error(`Concetto inesistente: ${e.id}`);
  if (fonti[doc.id]) doc.fonti = fonti[doc.id];
  if (doc.tipoFonte === 'manuale-ricostruito') {
    const idsUnita = new Set(doc.sezioni.map((sec) => lezioni.get(sec.lezione)?.unita));
    doc.fonteSha256 = improntaMaterialePercorso(corso.unita.filter((u) => idsUnita.has(u.id)));
  }
  for (const sec of doc.sezioni) {
    if (doc.tipoFonte === 'manuale-ricostruito') {
      const lezione = lezioni.get(sec.lezione);
      const unita = corso.unita.find((u) => u.id === lezione?.unita);
      const file = sezioneDaPercorso(doc, sec, lezione, unita);
      for (const b of file.blocchi) for (const id of b.concetti) if (!concetti.has(id)) throw new Error(`Collegamento non valido: ${id}`);
      await writeFile(path.join(root, 'public', sec.file), `${JSON.stringify(file, null, 2)}\n`);
      totale += file.blocchi.length;
      continue;
    }
    const md = await readFile(path.join(source, doc.id, `${sec.id}.md`), 'utf8');
    const matches = [...md.matchAll(/<!-- blocco:([^\s]+) pagina:(\d+) -->\s*\n([\s\S]*?)(?=\n\s*<!-- blocco:|$)/g)];
    const rev = revisionata(sec);
    // Glossario della sezione: voci curate (ogni paragrafo) e concetti delle lezioni (prima occorrenza della sezione).
    const ids = rev ? [...new Set((sec.lezioni ?? [sec.lezione]).flatMap((id) => lezioni.get(id)?.concetti ?? []))] : [];
    const auto = ids.filter((id) => concetti.has(id)).flatMap((id) => etichette(concetti.get(id)).map((label) => ({ id, label })))
      .sort((a, b) => b.label.length - a.label.length);
    const giaCollegati = new Set();
    const blocchi = matches.map((m) => {
      const id = m[1], pagina = Number(m[2]), originale = m[3].trim();
      let markdown = originale;
      const override = revisioni[doc.id]?.[id];
      if (override) {
        if (override.baseSha256 && override.baseSha256 !== sha(originale)) throw new Error(`Base modificata, verificare la revisione ${doc.id}/${id}`);
        for (const correzione of override.sostituzioni ?? []) {
          if (!markdown.includes(correzione.da)) throw new Error(`Correzione non applicabile: ${doc.id}/${id} «${correzione.da}»`);
          markdown = correzione.tutte ? markdown.split(correzione.da).join(correzione.a) : markdown.replace(correzione.da, correzione.a);
        }
        if (override.markdown !== undefined) markdown = override.markdown;
      }
      const tag = new Set();
      if (rev) {
        if (override?.markdown === undefined && !override?.senzaRegole) markdown = formatta(markdown);
        // Un collegamento per concetto e per sezione; ogni occorrenza resta però un concetto del paragrafo per la mappa.
        const voci = [...curati.flatMap((e) => e.etichette.map((label) => ({ id: e.id, label }))), ...auto].sort((x, y) => y.label.length - x.label.length);
        for (const { id: cid, label } of voci) {
          if (!parola(label).test(piano(markdown))) continue;
          tag.add(cid);
          if (giaCollegati.has(cid)) continue;
          const nuovo = collega(markdown, cid, label);
          if (nuovo) { markdown = nuovo; giaCollegati.add(cid); }
        }
      }
      const collegati = [...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((x) => x[1]);
      const concettiBlocco = [...new Set([...collegati, ...tag])];
      for (const c of concettiBlocco) if (!concetti.has(c)) throw new Error(`Collegamento non valido: ${c}`);
      return { id, pagina, markdown, concetti: concettiBlocco,
        ...(piano(originale) !== piano(markdown) ? { testoFonte: piano(originale) } : {}),
        ...(override?.notaRevisione ? { notaRevisione: override.notaRevisione } : {}) };
    });
    if (!blocchi.length) throw new Error(`Sezione senza blocchi: ${doc.id}/${sec.id}`);
    const file = { documento: doc.id, edizione: doc.edizione, id: sec.id, titolo: sec.titolo, da: sec.da, a: sec.a,
      ...(sec.lezione ? { lezione: sec.lezione } : {}), ...(sec.lezioni ? { lezioni: sec.lezioni } : {}), ...(rev ? { revisionata: true } : {}),
      ...(sec.soloTitolo ? { soloTitolo: true } : {}), ...(sec.integrazione ? { integrazione: sec.integrazione } : {}), blocchi };
    await writeFile(path.join(root, 'public', sec.file), `${JSON.stringify(file, null, 2)}\n`);
    totale += blocchi.length;
  }
}
await writeFile(path.join(root, 'src/lib/letture-catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
console.log(`Letture pubblicate: ${catalogo.length} documenti, ${catalogo.filter((d) => !d.tipoFonte).reduce((n, d) => n + d.pagine, 0)} pagine PDF originali, ${catalogo.filter((d) => d.tipoFonte === 'manuale-ricostruito').reduce((n, d) => n + d.sezioni.length, 0)} integrazioni dal Percorso, ${totale} blocchi.`);
