// Verifica la macchina a stati senza browser, server, porte o file compilati.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const file = new URL('../src/lib/originali-render.ts', import.meta.url);
const source = await readFile(file, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'originali-render.ts', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, isolatedModules: true },
});
const errors = (compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
const { ordinePagine, aggiornaPianoRender, paginaPronta, avviaPagina, pixelRatioPagina } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
const piano = (larghezza = 800, pronte = [], inCorso = null) => ({ larghezza, pronte: new Set(pronte), inCorso });
const pronta = (p, n) => paginaPronta(p, n, p.larghezza);
let checks = 0;
const check = (name, fn) => {
  try { fn(); checks++; } catch (e) { e.message = `${name}: ${e.message}`; throw e; }
};

check('Ordine corrente, successiva e precedente, con bordi e input non validi', () => {
  assert.deepEqual(ordinePagine(5, 10), [5, 6, 4]);
  assert.deepEqual(ordinePagine(1, 10), [1, 2]);
  assert.deepEqual(ordinePagine(10, 10), [10, 9]);
  assert.deepEqual(ordinePagine(1, 1), [1]);
  assert.deepEqual(ordinePagine(-20, 5), [1, 2]);
  assert.deepEqual(ordinePagine(100, 5), [5, 4]);
  assert.deepEqual(ordinePagine(2.6, 5), [3, 4, 2]);
  assert.deepEqual(ordinePagine(NaN, 5), [1, 2]);
  assert.deepEqual(ordinePagine(2, 0), []);
  assert.deepEqual(ordinePagine(2, -1), []);
  assert.deepEqual(ordinePagine(2, Infinity), []);
});
check('La pagina visibile parte subito, senza mutare il piano precedente', () => {
  const prev = piano();
  const next = aggiornaPianoRender(prev, [5, 6, 4], 5, 800);
  assert.equal(next.inCorso, 5); assert.equal(next.pronte.size, 0);
  assert.equal(prev.inCorso, null); assert.equal(prev.pronte.size, 0);
  assert.strictEqual(aggiornaPianoRender(next, [5, 6, 4], 5, 800), next);
});
check('Completamento corrente non avvia automaticamente le pagine vicine', () => {
  let p = aggiornaPianoRender(piano(), [5, 6, 4], 5, 800);
  p = pronta(p, 5);
  assert.equal(p.inCorso, null); assert.deepEqual([...p.pronte], [5]);
  assert.strictEqual(aggiornaPianoRender(p, [5, 6, 4], 5, 800), p);
});
check('Il precaricamento idle è seriale e salta le pagine già pronte', () => {
  let p = piano(800, [5]);
  p = avviaPagina(p, 6, 800); assert.equal(p.inCorso, 6);
  assert.strictEqual(avviaPagina(p, 4, 800), p, 'una seconda pagina non può partire');
  assert.strictEqual(avviaPagina(p, 6, 800), p, 'anche lo stesso job è un no-op');
  p = pronta(p, 6); assert.equal(p.inCorso, null);
  assert.strictEqual(avviaPagina(p, 6, 800), p);
  p = avviaPagina(p, 4, 800); assert.equal(p.inCorso, 4);
  p = pronta(p, 4); assert.deepEqual([...p.pronte], [5, 6, 4]);
});
check('La nuova corrente interrompe il precaricamento ed elimina il lavoro fuori intervallo', () => {
  const prev = piano(800, [5], 4);
  const next = aggiornaPianoRender(prev, [6, 7, 5], 6, 800);
  assert.equal(next.inCorso, 6); assert.deepEqual([...next.pronte], [5]);
  assert.strictEqual(paginaPronta(next, 4, 800), next, 'il vecchio job non deve rendersi pronto');
});
check('Priorità corrente anche quando il vecchio job è ancora nell’intervallo', () => {
  const prev = piano(800, [5], 6);
  const next = aggiornaPianoRender(prev, [4, 5, 6], 4, 800);
  assert.equal(next.inCorso, 4);
  assert.strictEqual(paginaPronta(next, 6, 800), next);
});
check('Navigare a una pagina già pronta conserva un job vicino utile', () => {
  const prev = piano(800, [5, 6], 4);
  const next = aggiornaPianoRender(prev, [6, 4, 5], 6, 800);
  assert.strictEqual(next, prev);
  const senzaVecchioJob = aggiornaPianoRender(prev, [6, 7, 5], 6, 800);
  assert.equal(senzaVecchioJob.inCorso, null);
  assert.deepEqual([...senzaVecchioJob.pronte], [5, 6]);
});
check('Le pronte fuori intervallo sono rilasciate e un riordino non ricrea il piano', () => {
  const prev = piano(800, [4, 5, 6]);
  const next = aggiornaPianoRender(prev, [6, 7, 5], 6, 800);
  assert.deepEqual([...next.pronte], [5, 6]); assert.equal(next.inCorso, null);
  assert.deepEqual([...prev.pronte], [4, 5, 6]);
  assert.strictEqual(aggiornaPianoRender(next, [5, 6, 7], 6, 800), next);
});
check('Cambiare zoom invalida tutte le pronte e avvia soltanto la corrente', () => {
  const prev = piano(800, [4, 5], 6);
  const next = aggiornaPianoRender(prev, [5, 6, 4], 5, 1000);
  assert.equal(next.larghezza, 1000); assert.equal(next.pronte.size, 0); assert.equal(next.inCorso, 5);
  assert.strictEqual(paginaPronta(next, 5, 800), next);
  assert.strictEqual(paginaPronta(next, 6, 1000), next);
  assert.strictEqual(avviaPagina(next, 6, 800), next);
  const done = paginaPronta(next, 5, 1000);
  assert.equal(done.inCorso, null); assert.deepEqual([...done.pronte], [5]);
});
check('Completamenti ripetuti o non richiesti sono no-op', () => {
  const prev = piano(800, [5]);
  assert.strictEqual(paginaPronta(prev, 5, 800), prev);
  assert.strictEqual(paginaPronta(prev, 6, 800), prev);
  assert.strictEqual(avviaPagina(prev, 0, 800), prev);
  assert.strictEqual(avviaPagina(prev, 2.5, 800), prev);
  assert.strictEqual(avviaPagina(prev, 6, 1000), prev);
});
check('Intervallo vuoto rilascia tutte le pagine senza avviare lavori', () => {
  const next = aggiornaPianoRender(piano(800, [1], 2), [], 1, 800);
  assert.equal(next.inCorso, null); assert.equal(next.pronte.size, 0);
  assert.strictEqual(aggiornaPianoRender(next, [], 1, 800), next);
});
check('Sequenza di navigazione e zoom non supera una pagina attiva e tre trattenute', () => {
  let p = piano();
  for (const [current, width] of [[1, 800], [2, 800], [10, 800], [9, 800], [9, 1200], [10, 1200], [1, 800]]) {
    const order = ordinePagine(current, 10);
    p = aggiornaPianoRender(p, order, current, width);
    if (p.inCorso !== null) p = pronta(p, p.inCorso);
    for (const n of order) {
      p = avviaPagina(p, n, width);
      if (p.inCorso !== null) p = pronta(p, p.inCorso);
    }
    assert(p.pronte.size <= 3);
    assert([...p.pronte].every((n) => order.includes(n)));
    assert(p.pronte.has(current)); assert.equal(p.inCorso, null);
  }
});
check('DPR limitato a due e a otto milioni di pixel quando possibile a DPR almeno uno', () => {
  assert.equal(pixelRatioPagina(800, Math.SQRT2, 3), 2);
  assert.equal(pixelRatioPagina(800, Math.SQRT2, 1.5), 1.5);
  assert.equal(pixelRatioPagina(800, Math.SQRT2, .75), 1);
  for (const [width, ratio, dpr] of [[1600, Math.SQRT2, 3], [2400, 1.2, 2], [1200, 3, 2]]) {
    const result = pixelRatioPagina(width, ratio, dpr);
    assert(result >= 1 && result <= 2 && result <= Math.max(1, dpr));
    assert(width * width * ratio * result * result <= 8_000_000 + .00001);
  }
  assert.equal(pixelRatioPagina(4000, 2, 2), 1, 'DPR uno è il minimo anche per pagine enormi');
  for (const args of [[0, 1.4, 2], [800, 0, 2], [800, 1.4, 0], [NaN, 1.4, 2], [800, Infinity, 2], [800, 1.4, NaN], [-1, 1.4, 2]]) assert.equal(pixelRatioPagina(...args), 1);
});
console.log(`Rendering Originali verificato: ${checks} scenari, priorità visibile, coda seriale, zoom e budget canvas.`);
