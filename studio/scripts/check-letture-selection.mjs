// Test isolato dei Range: nessun server, browser o progresso personale.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let sorgente = await readFile(new URL('../src/lib/letture-client.ts', import.meta.url), 'utf8');
sorgente = sorgente.replace(/^import catalogo from .*;$/m, 'const catalogo = [];')
  .replace(/^import \{ renderMd \} from .*;$/m, "const renderMd = (s: string) => s;");
const codice = ts.transpileModule(sorgente, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(codice).toString('base64')}`);
const prima = new Map(['window', 'document', 'NodeFilter'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
let checks = 0;
const check = (nome, fn) => { try { fn(); checks++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

function ambiente(definizioni, inizio, fine) {
  const flussi = new Map(); let offset = 0, misure = 0;
  const blocchi = definizioni.map((def, b) => {
    const blocco = { dataset: { letturaBlock: `p${String(b + 1).padStart(3, '0')}-b001`, pagina: String(b + 1) }, nodi: [], da: offset };
    for (const [i, dato] of def.entries()) {
      const cfg = typeof dato === 'string' ? { testo: dato } : dato;
      const chiave = cfg.flusso ?? b;
      if (!flussi.has(chiave)) flussi.set(chiave, { closest() { return this; } });
      const nodo = { data: cfg.testo, da: offset, blocco, parentElement: { closest: () => flussi.get(chiave) },
        rects: cfg.rects ?? ((a, z) => [{ left: (cfg.x ?? 100 + i * 100) + a * 10, top: cfg.y ?? 100 + b * 40, width: (z - a) * 10, height: cfg.h ?? 20 }]) };
      blocco.nodi.push(nodo); offset += nodo.data.length;
    }
    blocco.a = offset; blocco.textContent = blocco.nodi.map((n) => n.data).join('');
    blocco.contains = (n) => n === blocco || blocco.nodi.includes(n);
    return blocco;
  });
  const articolo = { querySelectorAll: () => blocchi, contains: (n) => blocchi.some((b) => b.contains(n)),
    getBoundingClientRect: () => ({ left: 10, top: 20 }) };
  const confine = ([b, n, o]) => n === null ? { nodo: blocchi[b], offset: o } : { nodo: blocchi[b].nodi[n], offset: o };
  const da = confine(inizio), a = confine(fine);
  const pos = (n, o) => n.nodi ? (n.nodi[o]?.da ?? n.a) : n.da + o;
  const start = pos(da.nodo, da.offset), end = pos(a.nodo, a.offset);
  const range = { startContainer: da.nodo, startOffset: da.offset, endContainer: a.nodo, endOffset: a.offset,
    intersectsNode(n) { return Math.min(end, n.nodi ? n.a : n.da + n.data.length) > Math.max(start, n.da); },
    comparePoint(n, o) { const p = pos(n, o); return p < start ? -1 : p > end ? 1 : 0; },
    getClientRects() { throw new Error('È stato misurato il Range globale: include i box di p/div'); } };
  const selezione = { isCollapsed: start === end, rangeCount: 1, getRangeAt: () => range };
  const document = {
    createTreeWalker(el) { let i = 0; return { nextNode: () => el.nodi[i++] ?? null }; },
    createRange() { return {
      setStart(n, o) { this.startContainer = n; this.startOffset = o; },
      setEnd(n, o) { this.endContainer = n; this.endOffset = o; },
      getClientRects() { misure++; assert.strictEqual(this.startContainer, this.endContainer, 'la geometria deve appartenere a un solo nodo di testo'); return this.startContainer.rects(this.startOffset, this.endOffset); },
    }; },
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'NodeFilter', { configurable: true, value: { SHOW_TEXT: 4 } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { getSelection: () => selezione, CSS: {} } });
  return { articolo, blocchi, range, selezione, misure: () => misure };
}

try {
  check('Una parola in un paragrafo largo misura solo i caratteri selezionati', () => {
    const a = ambiente([['Prima seconda terza']], [0, 0, 6], [0, 0, 13]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.testo, 'seconda'); assert.equal(s.ancore[0].inizio, 6); assert.equal(s.ancore[0].fine, 13);
    assert.deepEqual(s.rects, [{ x: 150, y: 80, w: 70, h: 20 }]); assert.equal(a.misure(), 1);
  });
  check('Link, grassetti e testo normale mantengono offset e geometria contigui', () => {
    const a = ambiente([[{ testo: 'Dovere ', x: 100 }, { testo: 'giuridico', x: 170 }, { testo: ' e libertà', x: 260 }]], [0, 0, 2], [0, 2, 3]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.testo, 'vere giuridico e'); assert.equal(s.ancore[0].inizio, 2);
    assert.equal(a.blocchi[0].textContent.slice(s.ancore[0].inizio, s.ancore[0].fine), s.testo);
    assert.deepEqual(s.rects, [{ x: 110, y: 80, w: 160, h: 20 }]); assert.equal(s.ranges.length, 3);
  });
  check('Una selezione multiparagrafo non include margini o box di contenitori intermedi', () => {
    const a = ambiente([['Prima parte.'], ['Intero secondo paragrafo.'], ['Terza parte.']], [0, 0, 6], [2, 0, 5]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.deepEqual(s.ancore.map((a) => a.citazione), ['parte.', 'Intero secondo paragrafo.', 'Terza']);
    assert.equal(s.rects.length, 3); assert(s.rects.every((r) => r.w < 300 && r.h === 20));
    assert.equal(a.misure(), 3);
  });
  check('Gli spazi e i ritorni a capo privi di caratteri visibili non creano rettangoli', () => {
    const a = ambiente([['\n  '], [{ testo: '  Parola ', x: 100 }, { testo: '\n ', x: 180 }]], [0, 0, 0], [1, 1, 2]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.testo, 'Parola'); assert.equal(s.pagina, 2); assert.equal(s.ancore.length, 1);
    assert.equal(s.ranges.length, 1); assert.equal(a.misure(), 1); assert.equal(s.rects[0].w, 60);
  });
  check('Le celle e le colonne restano distinte anche se vicine sulla stessa riga', () => {
    const a = ambiente([[{ testo: 'Uno', x: 100, flusso: 'cella-a' }, { testo: 'Due', x: 132, flusso: 'cella-b' }]], [0, 0, 0], [0, 1, 3]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.rects.length, 2); assert.deepEqual(s.rects.map((r) => r.w), [30, 30]);
    const separati = lib.unisciFrammentiTesto([{ x: 0, y: 0, w: 20, h: 20, flusso: 1 }, { x: 120, y: 0, w: 30, h: 20, flusso: 1 }]);
    assert.equal(separati.length, 2, 'nessun rettangolo deve coprire un grande intervallo vuoto');
  });
  check('Un nodo su due righe conserva due frammenti, utilizzabili anche come sottolineature', () => {
    const a = ambiente([[{ testo: 'Una parola lunga.', rects: () => [{ left: 100, top: 100, width: 100, height: 20 }, { left: 100, top: 128, width: 60, height: 20 }] }]], [0, 0, 0], [0, 0, 17]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.rects.length, 2); assert.deepEqual(s.rects.map((r) => r.y), [80, 108]);
  });
  check('Anche i confini su elementi usati dalla selezione nativa limitano i nodi corretti', () => {
    const a = ambiente([['Prima', 'Seconda', 'Terza']], [0, null, 1], [0, null, 2]);
    const s = lib.catturaAncoreTesto(a.articolo, 1);
    assert.equal(s.testo, 'Seconda'); assert.equal(s.ancore[0].inizio, 5); assert.equal(s.ancore[0].fine, 12);
  });
  check('Emoji e caratteri combinati mantengono gli indici UTF-16 delle annotazioni salvate', () => {
    const a = ambiente([['A🙂e\u0300 diritto']], [0, 0, 1], [0, 0, 5]);
    const s = lib.catturaAncoreTesto(a.articolo, 2);
    assert.equal(s.testo, '🙂e\u0300'); assert.equal(s.ancore[0].inizio, 1); assert.equal(s.ancore[0].fine, 5);
    assert.equal(s.ancore[0].citazione.length, 4); assert.equal(s.ancore[0].edizione, 2);
  });
  check('La cattura per il motore nativo non forza misure di layout', () => {
    const a = ambiente([['Prima seconda terza']], [0, 0, 6], [0, 0, 13]);
    const s = lib.catturaAncoreTesto(a.articolo, 1, { geometria: false });
    assert.equal(a.misure(), 0); assert.deepEqual(s.rects, []); assert.equal(s.ranges.length, 1);
    assert.equal(lib.rettangoliRangeTesto(s.ranges, a.articolo)[0].w, 70); assert.equal(a.misure(), 1);
  });
  check('Selezioni collassate o esterne al testo non producono annotazioni', () => {
    const a = ambiente([['Una parola']], [0, 0, 0], [0, 0, 0]);
    assert.equal(lib.catturaAncoreTesto(a.articolo, 1), null);
    a.selezione.isCollapsed = false; a.range.startContainer = {};
    assert.equal(lib.catturaAncoreTesto(a.articolo, 1), null); assert.equal(a.misure(), 0);
  });
  check('Anteprima nativa rilevata senza alterare il testo e rimossa solo dal suo proprietario', () => {
    const registro = new Map();
    window.CSS.highlights = registro; window.Highlight = class { constructor(...ranges) { this.ranges = ranges; } };
    const primo = lib.creaAnteprimaTestoNativa(), secondo = lib.creaAnteprimaTestoNativa(), range = {};
    assert.equal(primo.disponibile, true); assert.equal(primo.mostra([range]), true);
    assert.deepEqual(registro.get('iuris-lettura-bozza').ranges, [range]);
    secondo.mostra([range]); primo.cancella(); assert.equal(registro.size, 1);
    secondo.cancella(); assert.equal(registro.size, 0);
  });
  check('Browser senza API o con API non funzionante mantengono il fallback geometrico', () => {
    window.CSS = {}; delete window.Highlight;
    const assente = lib.creaAnteprimaTestoNativa(); assert.equal(assente.disponibile, false); assert.equal(assente.mostra([{}]), false); assente.cancella();
    let fallisce = false; const registro = new Map();
    window.CSS.highlights = registro; window.Highlight = class { constructor() { if (fallisce) throw new Error('API non disponibile'); } };
    const presente = lib.creaAnteprimaTestoNativa(); assert.equal(presente.mostra([{}]), true);
    fallisce = true; assert.equal(presente.mostra([{}]), false); assert.equal(registro.size, 0);
  });
  console.log(`Selezione Letture verificata: ${checks} scenari su frammenti di testo, UTF-16, geometria e fallback nativo.`);
} finally {
  for (const [k, descrittore] of prima) { if (descrittore) Object.defineProperty(globalThis, k, descrittore); else delete globalThis[k]; }
}
