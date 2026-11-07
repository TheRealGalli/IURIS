// Ordine dei segni salvati nel testo, senza aprire browser o server.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let checks = 0;
{
  // Ordine dei segni salvati (pannello Segni).
  const src = await readFile(new URL('../src/lib/ordine-segni.ts', import.meta.url), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  const { ordinaSegniNelTesto, posizioneSegno } = await import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`);
  const segno = (id, pagina, ancore, creata, rettangoli = []) => ({ id, pagina, testo: id, tipo: 'evidenziato', colore: 'giallo', creata, rettangoli, ancoreTesto: ancore });
  const a = (blocco, inizio) => ({ edizione: 1, blocco, inizio, fine: inizio + 5, citazione: 'x', prefisso: '', suffisso: '' });
  const segni = [segno('dopo', 1, [a('p001-b003', 0)], '2026-01-01'), segno('prima', 1, [a('p001-b001', 30)], '2026-01-03'),
    segno('primissima', 1, [a('p001-b001', 2)], '2026-01-04'), segno('pag2', 2, [a('p002-b001', 0)], '2025-01-01'),
    segno('pdf-basso', 3, undefined, '2025-01-01', [{ x: .1, y: .8, w: .2, h: .02 }]), segno('pdf-alto', 3, undefined, '2026-01-01', [{ x: .5, y: .2, w: .2, h: .02 }])];
  assert.deepEqual(ordinaSegniNelTesto(segni).map((s) => s.id), ['primissima', 'prima', 'dopo', 'pag2', 'pdf-alto', 'pdf-basso']);
  const manuale = [segno('m2', 1, [a('manuale-u14-p001-sintesi', 0)], '2025'), segno('m1', 1, [a('manuale-u14-p001-nota-fonte', 9)], '2026')];
  const indice = new Map([['manuale-u14-p001-nota-fonte', 0], ['manuale-u14-p001-sintesi', 1]]);
  assert.deepEqual(ordinaSegniNelTesto(manuale, (id) => indice.get(id)).map((s) => s.id), ['m1', 'm2'], 'blocchi senza numero: ordine del testo caricato');
  assert.deepEqual(posizioneSegno(segno('multi', 1, [a('p001-b004', 0), a('p001-b002', 7)], '2026')).slice(0, 3), [1, 2, 7], 'conta il punto in cui il segno comincia');
  checks++;
}
console.log(`Ordine dei segni verificato: ${checks} scenario su testo, PDF e blocchi senza numero.`);
