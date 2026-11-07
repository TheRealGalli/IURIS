// Mappa sulla geometria del testo: gerarchia titoli → paragrafi → voci, solo parti segnate, ordine del testo.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const src = await readFile(new URL('../src/lib/mappa-geometrica.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { alberoGeometrico, primoSegno, semanticaGeometrica, etichetteConcetto } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

// Pagina «Premesse» degli appunti: titolo, frase che introduce l'elenco, cinque voci, due paragrafi.
const testi = [['titolo', 2, 'Premesse'], ['paragrafo', 0, 'I cinque significati di Diritto Romano'],
  ...['diritto storico', 'tradizione romanistica', 'diritto comune', 'pandettistica', 'romanistico'].map((t, i) => ['voce', 1, `Diritto romano come ${t}: spiegazione della voce ${i + 1} con qualche parola in più.`, `${i + 1}.`, `Diritto romano come ${t}:`.length]),
  ['paragrafo', 0, '→ L’oggetto del nostro studio è di fatto il diritto romano inteso come storico.'],
  ['paragrafo', 0, 'Differenza pubblico-privato - Nel diritto romano si parla di diritto pubblico e privato in termini diversi.'],
  ['titolo', 2, 'Le fonti'], ['paragrafo', 0, 'Paragrafo mai segnato.']];
const unita = testi.map(([tipo, livello, testo, numero, guida], i) => ({ id: `b${i}#0`, blocco: `b${i}`, pagina: 2, tipo, livello, inizio: 0, fine: testo.length, testo, ...(numero ? { numero } : {}), ...(guida ? { guida } : {}) }));
const su = (i, da = 0, a = unita[i].testo.length) => ({ blocco: `b${i}`, inizio: da, fine: a });
let n = 0;
const segno = (id, i, tipo = 'evidenziato', colore = 'giallo', creata = `2026-11-07T10:${String(n++).padStart(2, '0')}:00Z`, ancore = [su(i, 0, unita[i].guida ?? unita[i].testo.length)]) => ({ id, tipo, colore, creata, ancore });
let checks = 0;
{
  // Segnati in ordine sparso: prima la voce 1, poi il titolo dell'elenco, poi le altre voci al contrario.
  const segni = [segno('v1', 2), segno('intro', 1), segno('v5', 6, 'sottolineato', 'azzurro'), segno('v4', 5, 'evidenziato', 'viola'), segno('v3', 4), segno('v2', 3, 'evidenziato', 'verde')];
  const m = alberoGeometrico(unita, segni);
  assert.equal(m.radici.length, 1, 'solo il titolo «Premesse» resta in radice; «Le fonti» non ha parti segnate');
  const premesse = m.radici[0];
  assert.equal(premesse.unita.testo, 'Premesse'); assert.equal(premesse.segnato, false, 'antenato mostrato ma non segnato');
  assert.equal(premesse.figli.length, 1); const intro = premesse.figli[0];
  assert.equal(intro.unita.testo, 'I cinque significati di Diritto Romano'); assert(intro.segnato);
  assert.deepEqual(intro.figli.map((f) => f.unita.numero), ['1.', '2.', '3.', '4.', '5.'], 'cinque figli nell’ordine del testo');
  assert.equal(m.segnati, 6); assert.equal(m.segni, 6);
  assert.equal(primoSegno(premesse), 'intro', 'l’antenato porta al primo segno sotto di lui');
  const v1 = intro.figli[0];
  assert.equal(v1.pezzi[0].testo, 'Diritto romano come diritto storico:'); assert.equal(v1.pezzi[0].segnato, true);
  assert.equal(v1.pezzi.at(-1).segnato, false, 'il resto lungo della voce diventa «…»'); assert.equal(v1.pezzi.at(-1).testo, ' …');
  assert.deepEqual(alberoGeometrico(unita, segni), m, 'stesso input, stesso albero');
  checks++;
}
{
  // Evidenziato e sottolineato sullo stesso tratto, in momenti diversi: un solo nodo, enfatizzato.
  const segni = [segno('ev', 1, 'evidenziato', 'giallo', '2026-11-01T10:00:00Z'), segno('so', 1, 'sottolineato', 'rosa', '2026-11-05T10:00:00Z')];
  const m = alberoGeometrico(unita, segni), intro = m.radici[0].figli[0];
  assert.equal(m.segnati, 1); assert.equal(intro.enfasi, true); assert.deepEqual(intro.segni.sort(), ['ev', 'so']);
  assert.equal(intro.pezzi.length, 1); assert.equal(intro.pezzi[0].colore, 'giallo'); assert.equal(intro.pezzi[0].linea, 'rosa');
  checks++;
}
{
  // Frammento dentro una voce: contesto minimo con l'attacco in grassetto; più segni nella stessa voce = un nodo.
  const t = unita[3].testo, a = t.indexOf('spiegazione'), b = t.indexOf('qualche');
  const segni = [segno('f1', 3, 'evidenziato', 'verde', undefined, [su(3, a, a + 'spiegazione'.length)]), segno('f2', 3, 'sottolineato', 'arancio', undefined, [su(3, b, b + 'qualche parola'.length)])];
  const m = alberoGeometrico(unita, segni), voce = m.radici[0].figli[0].figli[0];
  assert.equal(m.radici[0].figli[0].segnato, false, 'la frase che introduce l’elenco resta come antenato');
  assert.equal(voce.unita.numero, '2.'); assert.equal(voce.segnato, true);
  assert(voce.pezzi[0].testo.startsWith('Diritto romano come tradizione romanistica:'), 'l’attacco in grassetto dà il contesto');
  assert.deepEqual(voce.pezzi.filter((p) => p.segnato).map((p) => p.testo), ['spiegazione', 'qualche parola']);
  assert.deepEqual(voce.segni, ['f1', 'f2']); checks++;
}
{
  // Un segno su due paragrafi vicini; senza segni non c'è niente; segni su blocchi assenti ignorati.
  const segni = [{ id: 'lungo', tipo: 'evidenziato', colore: 'rosa', ancore: [su(7, 2, 20), su(8, 0, 12)] }, { id: 'altrove', tipo: 'evidenziato', colore: 'rosa', ancore: [{ blocco: 'zz', inizio: 0, fine: 3 }] }];
  const m = alberoGeometrico(unita, segni);
  assert.deepEqual(m.radici[0].figli.map((f) => f.unita.id), ['b7#0', 'b8#0']); assert.equal(m.segni, 1);
  assert.deepEqual(alberoGeometrico(unita, []).radici, []); checks++;
}
{
  // Significato: «Fonti di cognizione» definita in un punto, divisa in primarie/secondarie in un altro.
  const t = [['titolo', 3, 'Le fonti'], ['paragrafo', 0, 'Le fonti del diritto possono essere:'], ['voce', 1, 'Fonti di cognizione'], ['voce', 1, 'Fonti di produzione'],
    ['titolo', 3, 'Altro'], ['paragrafo', 0, 'Possiamo distinguere ulteriormente le fonti di cognizione in:'], ['voce', 1, 'Fonti primarie'], ['voce', 1, 'Fonti secondarie o derivate'], ['paragrafo', 0, 'Le fonti di cognizione tornano qui.']];
  const u = t.map(([tipo, livello, testo], i) => ({ id: `c${i}#0`, blocco: `c${i}`, pagina: 4, tipo, livello, inizio: 0, fine: testo.length, testo }));
  const segni = [2, 3, 6, 7, 8].map((i) => ({ id: `s${i}`, tipo: 'evidenziato', colore: 'giallo', creata: `2026-11-07T11:0${i}:00Z`, ancore: [{ blocco: `c${i}`, inizio: 0, fine: u[i].testo.length }] }));
  const m = alberoGeometrico(u, segni);
  const conc = [['fonti-di-cognizione', 'Fonti di cognizione'], ['fonti-di-produzione', 'Fonti di produzione'], ['fonti-primarie', 'Fonti primarie'], ['fonti-secondarie', 'Fonti secondarie (o derivate)', ['fonti derivate']], ['assente', 'Concetto assente']]
    .map(([id, nome, alias]) => ({ id, nome, etichette: etichetteConcetto({ nome, alias }) }));
  assert.deepEqual(conc[3].etichette, ['Fonti secondarie', 'fonti derivate']);
  const rel = [{ da: 'fonti-primarie', a: 'fonti-di-cognizione', tipo: 'parte-di', etichetta: 'costituiscono una categoria delle' },
    { da: 'fonti-secondarie', a: 'fonti-di-cognizione', tipo: 'parte-di', etichetta: 'sono una categoria delle' },
    { da: 'fonti-di-cognizione', a: 'fonti-di-produzione', tipo: 'collegato' }, { da: 'assente', a: 'fonti-primarie', tipo: 'parte-di' }];
  const s = semanticaGeometrica(m.radici, conc, rel);
  const voce = (testo) => { let x; const cerca = (l) => l.forEach((n) => { if (n.unita.testo === testo) x = n.id; cerca(n.figli); }); cerca(m.radici); return x; };
  const arco = (da, a) => s.archi.find((x) => x.da === voce(da) && x.a === voce(a));
  assert.equal(arco('Fonti primarie', 'Fonti di cognizione')?.etichetta, 'costituiscono una categoria delle', 'la voce va al punto in cui il concetto è definito, non al suo genitore');
  assert(arco('Fonti secondarie o derivate', 'Fonti di cognizione'));
  assert(!s.archi.some((x) => x.da === voce('Possiamo distinguere ulteriormente le fonti di cognizione in:') && x.a === voce('Fonti primarie')), 'genitore e figlio sono già uniti dall’albero');
  assert(s.archi.some((x) => x.tipo === 'stesso' && x.concetto === 'fonti-di-cognizione'), 'stesso concetto in due punti lontani');
  assert(s.archi.findIndex((x) => x.tipo === 'relazione' && x.etichetta?.includes('categoria')) < s.archi.findIndex((x) => x.tipo === 'stesso'), 'prima le relazioni gerarchiche');
  assert(!s.concetti.includes('assente'));
  assert.deepEqual(s.perNodo.get(voce('Fonti primarie')), ['fonti-primarie']);
  assert(semanticaGeometrica(m.radici, conc, rel, 2).archi.length === 2, 'tetto agli archi per non affollare');
  assert.deepEqual(semanticaGeometrica(m.radici, conc, rel), s, 'stesso input, stessi archi');
  checks++;
}
console.log(`Mappa geometrica verificata: ${checks} scenari su gerarchia, ordine del testo, doppio segno, frammenti, potatura e concetti collegati.`);
