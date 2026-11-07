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
let domande = 0, glossario = 0, cronologia = 0, completa = 0;
try {
  const { indicizza } = await server.ssrLoadModule('/src/lib/data.ts');
  const { rispostaCompletaGiusta } = await server.ssrLoadModule('/src/lib/completa.ts');
  for (const slug of fs.readdirSync(new URL('../public/content/', import.meta.url)).filter((f) => !f.includes('.'))) {
    const corso = JSON.parse(fs.readFileSync(new URL(`../public/content/${slug}/corso.json`, import.meta.url), 'utf8'));
    const idx = indicizza(corso);
    const ids = new Set();
    for (const q of idx.domandaById.values()) {
      const w = `${slug}/${q.id}`;
      domande++;
      if (ids.has(q.id)) E(w, 'id ripetuto');
      ids.add(q.id);
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
      }
    }
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
console.log(`Domande verificate: ${domande} (glossario ${glossario}, date ${cronologia}, completamenti ${completa}); nessun errore di forma o di fatto noto.`);
