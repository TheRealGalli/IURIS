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
const parole = new Map();
const parola = (label) => {
  if (!parole.has(label)) parole.set(label, new RegExp(`(?<![\\p{L}\\p{N}_[|])${escRegex(label)}(?![\\p{L}\\p{N}_\\]|])`, 'iu'));
  return parole.get(label);
};
const revisionata = (sec) => !!(sec.revisionata || sec.pilota);

/** Regole di sola forma: titoli, elenchi, note, etichette in grassetto e spazi. Le parole restano quelle della fonte. */
export function formatta(md) {
  // A capo già decisi (revisioni): ogni paragrafo segue le regole per conto suo.
  // Le voci «- …» restano attaccate a ciò che precede: un solo elenco, non paragrafi staccati.
  if (/\n\s*\n/.test(md)) return md.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map(formatta)
    .reduce((out, x) => out ? `${out}${/^- /.test(x) && !/^#{1,6} /m.test(out.slice(out.lastIndexOf('\n') + 1)) ? '\n' : '\n\n'}${x}` : x, '');
  // Blocco che comincia con un titolo: il titolo resta com'è, il resto segue le regole.
  const conTitolo = /^(#{1,6} [^\n]*)\n+([\s\S]*\S[\s\S]*)$/.exec(md);
  if (conTitolo) return `${conTitolo[1]}\n\n${formatta(conTitolo[2].trim())}`;
  if (/^(?:#{1,6} |\|)/.test(md)) return md;
  let s = md.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/([AaEeIiOoUu])ˋ/g, (_, v) => ({ A: 'À', a: 'à', E: 'È', e: 'è', I: 'Ì', i: 'ì', O: 'Ò', o: 'ò', U: 'Ù', u: 'ù' })[v])
    .replace(/([AaEeIiOoUu])ˊ/g, (_, v) => ({ A: 'Á', a: 'á', E: 'É', e: 'é', I: 'Í', i: 'í', O: 'Ó', o: 'ó', U: 'Ú', u: 'ú' })[v])
    .replace(/(\p{L})\\(\p{L})/gu, '$1/$2')
    .replace(/[ \t]+([,.;:!?])(?=\s|$)/g, '$1').replace(/\( +/g, '(').replace(/ +\)/g, ')');
  // Negli appunti «>» a inizio riga è una freccia, non una citazione.
  s = s.replace(/^> (?=\S)/gm, '→ ');
  // «‣ Capitolo terzo: …» sulla prima riga di un blocco più lungo: è il titolo del capitolo.
  const primaRiga = /^‣\s*([^\n]{1,120})\n+([\s\S]*\S[\s\S]*)$/.exec(s);
  if (primaRiga) return `## ${primaRiga[1].trim()}\n\n${formatta(primaRiga[2].trim())}`;
  // «‣Littera Florentina > Una prima redazione…»: titoletto breve seguito dal testo.
  const titoletto = /^‣\s*([^\n>.:;]{3,70}?)\s+>\s+(?=\S)/.exec(s);
  if (titoletto) return `### ${titoletto[1].trim()}\n\n${formatta(s.slice(titoletto[0].length))}`;
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

/**
 * Dispense fitte estratte da PDF con riquadri in caratteri codificati (Diritto privato): via i tratti illeggibili,
 * titoletti in grassetto e capoversi lunghi spezzati a fine frase. Le parole leggibili restano quelle della fonte.
 */
const FITTI = new Set(['diritto-privato-torrente-dispense-v1']);
const VUOTO = '&nbsp;';
const NOTA_ILLEGGIBILE = '*[Riquadro di approfondimento non leggibile nel PDF.]*';
const sospetto = (t) => /[<>=+@*]/.test(t) || /[\p{L}\d][/;:][\p{L}\d]/u.test(t) || /^[^\p{L}\d\s]{2,}$/u.test(t);
const parolaVera = (t) => /^[(«"“']*\p{L}{3,}['’\p{L}]*[.,;:!?)»"”]*$/u.test(t) && /[aeiouàèéìòù]/i.test(t);
/** Toglie le sequenze illeggibili; restituisce il testo e quante ne ha tolte. */
export function senzaIlleggibile(testo) {
  const token = testo.split(/( +)/); let tolte = 0;
  const out = []; let i = 0;
  while (i < token.length) {
    if (!sospetto(token[i])) { out.push(token[i]); i++; continue; }
    // la sequenza prosegue finché non incontra due parole vere di fila
    let j = i, fine = i, n = 0, vere = 0;
    while (j < token.length && vere < 2) {
      const t = token[j];
      if (t.trim() === '') { j++; continue; }
      if (sospetto(t)) { n++; fine = j; vere = 0; } else if (parolaVera(t)) vere++; else if (!/\n/.test(t)) { /* numeri, sigle brevi */ } else break;
      j++;
    }
    if (n >= 3) {
      // anche i numeri e le sigle brevi rimasti prima della sequenza ne fanno parte
      while (out.length && (out.at(-1).trim() === '' || (!parolaVera(out.at(-1)) && !/[.:→]$/.test(out.at(-1)) && out.at(-1).length <= 6 && !/^#/.test(out.at(-1))))) out.pop();
      out.push(' \u0000 '); tolte++; i = fine + 1;
    } else { out.push(token[i]); i++; }
  }
  return { testo: out.join('').replace(/(?:\s*\u0000\s*)+/g, ' \u0000 ').trim(), tolte };
}
const VERBI = /(?:^|\s)(?:è|sono|ha|hanno|si|può|possono|deve|devono|non|viene|vengono|era|sia)(?:\s|$)/i;
const SIGLE = /(?:\b(?:ecc|cfr|art|artt|pag|cod|civ|lett|seg|segg|Cass|Cost|sez|proc|pen|disp|att|prel|trans|cit|es|nn|ss|co|vol|cap)|\b\p{L}{1,2})\.$/u;
export function impagina(md) {
  if (/^(?:#{1,6} |\||- |\d{1,2}\. )/.test(md) || md.includes('\n')) return md;
  let s = md.replace(/^([\p{Lu}][^.:\n*[\]]{2,70})\. (?=[\p{Lu}«“(])/u, (m, t) => t.split(/\s+/).length <= 8 && !t.includes(',') && !VERBI.test(t) ? `**${t}.** ` : m);
  // etichetta in maiuscolo in testa al capoverso: «INDENNIZZO: quali sono…»
  s = s.replace(/^([\p{Lu}][\p{Lu}\s'’.]{3,45}):(?= )/u, '**$1:**');
  if (s.length < 750) return s;
  const frasi = []; let da = 0;
  for (const m of s.matchAll(/[.!?][)»”]? (?=[\p{Lu}«“])/gu)) {
    const fine = m.index + m[0].length - 1;
    if (SIGLE.test(s.slice(Math.max(0, m.index - 12), m.index + 1))) continue;
    frasi.push(s.slice(da, fine)); da = fine + 1;
  }
  frasi.push(s.slice(da));
  const capoversi = []; let cur = '';
  for (const f of frasi) {
    if (cur && cur.length + f.length > 620 && cur.length >= 280) { capoversi.push(cur); cur = f; } else cur = cur ? `${cur} ${f}` : f;
  }
  if (cur) { if (capoversi.length && cur.length < 200) capoversi[capoversi.length - 1] += ` ${cur}`; else capoversi.push(cur); }
  return capoversi.join('\n\n');
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
    let ultimoIlleggibile = false;
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
        if (FITTI.has(doc.id) && override?.markdown === undefined) {
          const titolo = /^#{1,6} /.exec(markdown)?.[0] ?? '';
          const pulito = senzaIlleggibile(markdown.slice(titolo.length).replace(/(?<=\p{L})%(?=\p{L})/gu, ' '));
          if (pulito.tolte) {
            const resto = pulito.testo.replace(/\u0000/g, '').replace(/[^\p{L}]/gu, '');
            if (resto.length < 12) { markdown = ultimoIlleggibile ? VUOTO : NOTA_ILLEGGIBILE; ultimoIlleggibile = true; }
            else {
            markdown = `${titolo}${pulito.testo.replace(/\s*\u0000\s*/g, ` ${NOTA_ILLEGGIBILE} `).trim()}`; ultimoIlleggibile = false; }
          } else ultimoIlleggibile = false;
        }
        if (override?.markdown === undefined && !override?.senzaRegole) markdown = formatta(markdown);
        // blocco rimasto senza parole (il suo testo è confluito in quello accanto): resta al suo posto, vuoto
        if (FITTI.has(doc.id) && !/\p{L}{2}/u.test(markdown.replace(/&nbsp;/g, ''))) markdown = VUOTO;
        if (FITTI.has(doc.id) && markdown !== VUOTO) markdown = markdown.split(/\n\s*\n/).map(impagina).join('\n\n');
        // Le etichette curate si ripetono nei capoversi; le automatiche una volta nella sezione.
        const voci = [...curati.flatMap((e) => e.etichette.map((label) => ({ id: e.id, label, curata: true }))),
          ...auto.map((e) => ({ ...e, curata: false }))].sort((x, y) => y.label.length - x.label.length);
        if (curati.length) markdown = markdown.split(/\n\s*\n/).map((capoverso) => {
          const nelCapoverso = new Set([...capoverso.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]));
          for (const { id: cid, label, curata } of voci) {
            if (!parola(label).test(piano(capoverso))) continue;
            tag.add(cid);
            if (nelCapoverso.has(cid) || (!curata && giaCollegati.has(cid))) continue;
            const nuovo = collega(capoverso, cid, label);
            if (nuovo) { capoverso = nuovo; nelCapoverso.add(cid); giaCollegati.add(cid); }
          }
          return capoverso;
        }).join('\n\n');
        else for (const { id: cid, label } of voci) {
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
        ...(override?.notaRevisione ? { notaRevisione: override.notaRevisione } : {}),
        ...(override?.notaAggiornamento ? { notaAggiornamento: override.notaAggiornamento } : {}) };
    });
    if (!blocchi.length) throw new Error(`Sezione senza blocchi: ${doc.id}/${sec.id}`);
    // Pagina condivisa con la sezione precedente: il primo blocco dice dove comincia questa.
    const precedente = doc.sezioni[doc.sezioni.indexOf(sec) - 1];
    if (precedente && precedente.a >= sec.da) sec.primo = blocchi[0].id; else delete sec.primo;
    const file = { documento: doc.id, edizione: doc.edizione, id: sec.id, titolo: sec.titolo, da: sec.da, a: sec.a,
      ...(sec.lezione ? { lezione: sec.lezione } : {}), ...(sec.lezioni ? { lezioni: sec.lezioni } : {}), ...(rev ? { revisionata: true } : {}),
      ...(sec.soloTitolo ? { soloTitolo: true } : {}), ...(sec.integrazione ? { integrazione: sec.integrazione } : {}), blocchi };
    await writeFile(path.join(root, 'public', sec.file), `${JSON.stringify(file, null, 2)}\n`);
    totale += blocchi.length;
  }
}
await writeFile(path.join(root, 'src/lib/letture-catalogo.json'), `${JSON.stringify(catalogo, null, 2)}\n`);
console.log(`Letture pubblicate: ${catalogo.length} documenti, ${catalogo.filter((d) => !d.tipoFonte).reduce((n, d) => n + d.pagine, 0)} pagine PDF originali, ${catalogo.filter((d) => d.tipoFonte === 'manuale-ricostruito').reduce((n, d) => n + d.sezioni.length, 0)} integrazioni dal Percorso, ${totale} blocchi.`);
