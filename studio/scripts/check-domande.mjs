// Qualità delle domande: glossario adatto al tipo di voce, cronologia leggibile, completamenti verificabili,
// coerenza interna (vero/falso, risposta multipla, ordine cronologico) ed errori di fatto già corretti.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true } });
const errori = [];
const E = (w, m) => errori.push(`${w}: ${m}`);
// frasi già corrette nella revisione: non devono ricomparire
const ERRATI = [
  [/procedimento chimico/i, 'il palinsesto di Gaio fu scoperto da Niebuhr nel 1816; i reagenti lo danneggiarono'],
  [/(?:oggi|esposta|è) (?:a|in) S\. Giovanni in Laterano/i, 'la Lex de imperio Vespasiani è ai Musei Capitolini'],
  [/scoperta ad \{?\{?Autun/i, "l'Epitome Gai è tramandata nella Lex Romana Visigothorum"],
  [/provocatio ad populum introdotta dalla Lex Valeria del 300/i, 'la provocatio risale per tradizione al 509 a.C.'],
];
// inizi che non rispondono a «Chi era…?» o «Che cos'è…?»
const INIZIO_VAGO = /^(Le sue|Il suo|La sua|I suoi|Nelle dispense|Negli appunti|In questa unità|Citat[oa]|Nel capitolo|Qui |Vi si|Il testo l[oa] |Incampo|Per Incampo|Cotta |Moro )/;
// Una scheda deve poter essere capita da sola, senza dedurre l'era dal titolo della lezione.
const SECOLO = /\b(?:[IVX]+(?:\s*[–-]\s*[IVX]+)?\s*(?:secol[oi]|sec\.)|secol[oi]\s+[IVX]+(?:[–-][IVX]+)?\b)/g;
const ERA = /^\W*(?:[ad]\.\s*C\.|(?:avanti|dopo) Cristo)/i;
const CAMPI_TESTO = ['domanda', 'risposta', 'affermazione', 'spiegazione', 'testo', 'consegna', 'traccia', 'opzioni', 'elementi', 'coppie'];
let domande = 0, glossario = 0, cronologia = 0, completa = 0, tracce = 0, conEsame = 0;
try {
  const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
  const { rispostaCompletaGiusta } = await server.ssrLoadModule('/src/lib/completa.ts');
  const esameLib = await server.ssrLoadModule('/src/lib/esame.ts');
  const { CORSI } = await server.ssrLoadModule('/src/data/corsi.ts');
  for (const slug of fs.readdirSync(new URL('../public/content/', import.meta.url)).filter((f) => !f.includes('.'))) {
    const corso = JSON.parse(fs.readFileSync(new URL(`../public/content/${slug}/corso.json`, import.meta.url), 'utf8'));
    const idx = indicizza(corso);
    const ids = new Set();
    // Tracce d'esame dei docenti (esame.json): ognuna porta a lezioni, voci e almeno una domanda aperta della stessa fonte.
    const idTracce = new Set();
    for (const t of corso.esame?.tracce ?? []) {
      const w = `${slug}/${t.id}`;
      tracce++;
      if (idTracce.has(t.id)) E(w, 'traccia ripetuta');
      idTracce.add(t.id);
      if (!idx.fontiEsame.has(t.fonte)) E(w, `fonte «${t.fonte}» inesistente`);
      if (!t.testo?.trim()) E(w, 'traccia senza testo');
      if (!t.lezioni.length) E(w, 'traccia senza lezioni: non porta in nessun punto degli appunti');
      if (!t.concetti.length) E(w, 'traccia senza voci collegate');
      for (const l of t.lezioni) if (!idx.lezioneById.has(l)) E(w, `lezione «${l}» inesistente`);
      for (const c of t.concetti) if (!idx.concettoById.has(c)) E(w, `voce «${c}» inesistente`);
      if (!t.domande.length) E(w, `nessuna domanda aperta con "esame": ["${t.fonte}"] nelle lezioni della traccia`);
      for (const id of t.domande) {
        const q = idx.domandaById.get(id);
        if (!q || q.tipo !== 'aperta' || !q.esame?.includes(t.fonte)) E(w, `la domanda «${id}» non è un'aperta della stessa fonte`);
      }
    }
    for (const f of corso.esame?.fonti ?? []) {
      const w = `${slug}/esame/${f.id}`;
      if (!/^prof\. \p{Lu}/u.test(esameLib.prof(f.docente))) E(w, `docente «${f.docente}» non leggibile come «prof. Cognome»`);
      if (/@|prof\.|dott\./i.test(f.docente)) E(w, 'il docente va scritto con nome e cognome, senza titoli né indirizzi');
      for (const c of f.corsi) if (!CORSI.some((x) => x.id === c)) E(w, `corso «${c}» inesistente`);
      if (!(corso.esame.tracce.some((t) => t.fonte === f.id))) E(w, 'fonte senza tracce');
    }
    for (const q of idx.domandaById.values()) {
      const w = `${slug}/${q.id}`;
      domande++;
      if (ids.has(q.id)) E(w, 'id ripetuto');
      ids.add(q.id);
      for (const campo of CAMPI_TESTO) {
        const testi = typeof q[campo] === 'string' ? [q[campo]] : Array.isArray(q[campo]) ? q[campo].flat(Infinity) : [];
        for (const testo of testi) {
          const visibile = testo.replace(/\{\{([^}]+)\}\}/g, (_, alternative) => alternative.split('|')[0]).replace(/\*\*/g, '');
          for (const m of visibile.matchAll(SECOLO)) {
            if (!ERA.test(visibile.slice(m.index + m[0].length))) E(w, `${campo}: manca a.C. o d.C. dopo «${m[0]}»`);
          }
        }
      }
      if (q.esame) {
        conEsame++;
        if (!Array.isArray(q.esame) || !q.esame.length) E(w, '"esame" deve elencare almeno una fonte');
        else for (const f of q.esame) if (!idx.fontiEsame.has(f)) E(w, `"esame" cita la fonte «${f}», che non è in esame.json`);
        if (q.tipo === 'aperta' && (!q.traccia || !(q.punti?.length >= 2))) E(w, 'una domanda d’esame aperta vuole traccia e punti');
      }
      const tutto = JSON.stringify(q);
      for (const [re, perche] of ERRATI) if (re.test(tutto)) E(w, `errore già corretto ricomparso (${perche})`);
      if (q.glossario && !q.inversa) {
        glossario++;
        const c = idx.concettoById.get(q.glossario);
        if (c.tipo === 'persona' && !/^Chi (era|è)\s/.test(q.domanda)) E(w, 'di una persona si chiede «Chi era…?»');
        if (c.tipo !== 'persona' && /^Chi /.test(q.domanda)) E(w, '«Chi…?» solo per le persone');
        if (['persona', 'opera'].includes(c.tipo) && /^Che cosa significa/.test(q.domanda)) E(w, 'persone e opere non si «significano»');
        if (INIZIO_VAGO.test(q.risposta)) E(w, `la risposta non dice che cos'è la voce: «${q.risposta.slice(0, 50)}…»`);
        if (q.risposta.length < 40) E(w, 'risposta troppo breve');
      }
      if (q.cronologia && q.tipo === 'flashcard') {
        cronologia++;
        if (!/^(Quando|In quale periodo) si colloca («[^«»]+»|.*«.+».*)\?$/.test(q.domanda) || /\?\?|««|»»/.test(q.domanda)) E(w, `domanda di data malformata: ${q.domanda}`);
      }
      if (q.tipo === 'verofalso') {
        const s = (q.spiegazione ?? '').trim().toLowerCase();
        if ((s.startsWith('vero') && !q.vero) || (s.startsWith('falso') && q.vero)) E(w, 'spiegazione in contrasto con vero/falso');
      }
      if (q.tipo === 'multipla') {
        if (!(q.corretta >= 0 && q.corretta < q.opzioni.length)) E(w, 'indice della risposta corretta fuori dalle opzioni');
        if (new Set(q.opzioni.map((o) => o.trim().toLowerCase())).size !== q.opzioni.length) E(w, 'opzioni ripetute');
      }
      if (q.tipo === 'completa') {
        completa++;
        const buchi = [...q.testo.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => m[1].split('|'));
        if (!buchi.length) E(w, 'completamento senza spazi da riempire');
        for (const alt of buchi) {
          if (alt.some((a) => !a.trim())) E(w, 'alternativa vuota in un completamento');
          if (!rispostaCompletaGiusta(alt, alt[0])) E(w, `la soluzione «${alt[0]}» non è accettata`);
        }
        for (const m of q.testo.matchAll(/\{\{([^}]+)\}\}/g)) {
          if (/\b[ad]\.\s*C\./i.test(m[1]) && !ERA.test(q.testo.slice(m.index + m[0].length))) E(w, 'nei completamenti l’era deve essere visibile fuori dallo spazio da riempire');
        }
      }
    }
  }
  // docenti delle tracce d'esame: «prof. Cognome», e prima le domande del docente del corso scelto
  assert.equal(esameLib.prof('Michele Lobuono'), 'prof. Lobuono');
  assert.equal(esameLib.prof('S.R. Alessandrì'), 'prof. Alessandrì');
  assert.equal(esameLib.prof('Maria De Luca'), 'prof. De Luca');
  assert.equal(esameLib.prof('Starace'), 'prof. Starace');
  {
    const q = (id, esame) => ({ id, tipo: 'aperta', esame });
    const finto = { corso: { domande: [q('a', ['x']), q('b', ['y']), q('c', ['x', 'y']), q('d', undefined), q('e', ['z'])] },
      fontiEsame: new Map([['x', { id: 'x', docente: 'A B', corsi: ['uno'] }], ['y', { id: 'y', docente: 'C D', corsi: ['due'] }]]) };
    const uno = esameLib.domandeEsame(finto, 'uno'), tre = esameLib.domandeEsame(finto, 'tre');
    assert.deepEqual([uno.mie.map((x) => x.id), uno.altre.map((x) => x.id)], [['a', 'c'], ['b']], 'prima le tracce del docente del corso');
    assert.deepEqual([tre.mie.length, tre.altre.map((x) => x.id)], [0, ['a', 'b', 'c']], 'senza docente del corso sono tutte di altre classi');
    assert.deepEqual(esameLib.fontiOrdinate(finto, ['x', 'y', 'x'], 'due').map((f) => f.id), ['y', 'x']);
  }
  // il confronto dei completamenti accetta forme equivalenti, non risposte diverse
  assert.equal(rispostaCompletaGiusta(['18', 'diciotto'], 'Diciotto'), true);
  assert.equal(rispostaCompletaGiusta(['438'], '438 d.C.'), true);
  assert.equal(rispostaCompletaGiusta(['16'], 'sedici'), true);
  assert.equal(rispostaCompletaGiusta(['438'], '439'), false);
  assert.equal(rispostaCompletaGiusta(['95 a.C.', '95'], '95 d.C.'), false);
  assert.equal(rispostaCompletaGiusta(['Gaio'], ''), false);
} finally {
  await server.close();
}
if (errori.length) {
  console.error(`✗ Domande: ${errori.length} problemi\n  ${errori.slice(0, 40).join('\n  ')}`);
  process.exit(1);
}
console.log(`Domande verificate: ${domande} (glossario ${glossario}, date ${cronologia}, completamenti ${completa}, d'esame ${conEsame} per ${tracce} tracce dei docenti); secoli con era esplicita, nessun errore di forma o di fatto noto.`);
