// Mappa sulla geometria del testo: gerarchia titoli → paragrafi → voci, solo parti segnate, ordine del testo.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const src = await readFile(new URL('../src/lib/mappa-geometrica.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { alberoGeometrico, primoSegno, semanticaGeometrica, etichetteConcetto, corsieArchi, accensione, inquadra, altezzaVista, inLocale, tracciaArco } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

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
{
  // Instradamento: corsie annidate senza sovrapposizioni, una porta per arco, ordinate per non incrociarsi.
  const ordine = new Map(['a', 'b', 'c', 'd', 'e', 'f'].map((x, i) => [x, i]));
  const archi = [{ da: 'a', a: 'f' }, { da: 'b', a: 'c' }, { da: 'b', a: 'e' }, { da: 'd', a: 'e' }, { da: 'a', a: 'b' }];
  const { percorsi, corsie } = corsieArchi(archi, ordine);
  const iv = archi.map((x) => [ordine.get(x.da), ordine.get(x.a)].sort((p, q) => p - q));
  for (let i = 0; i < archi.length; i++) for (let j = 0; j < archi.length; j++) {
    if (i === j) continue;
    const [a1, b1] = iv[i], [a2, b2] = iv[j];
    if (a1 <= b2 && a2 <= b1) assert.notEqual(percorsi[i].corsia, percorsi[j].corsia, 'archi sovrapposti non condividono la corsia');
    if (a1 <= a2 && b2 <= b1 && (b1 - a1) > (b2 - a2)) assert(percorsi[i].corsia > percorsi[j].corsia, 'chi contiene corre più fuori');
  }
  assert.equal(percorsi[0].corsia, corsie - 1, 'l’arco più lungo è il più esterno');
  // Nodo b ha tre archi: verso a (sopra), c ed e (sotto): tre porte diverse, sopra prima di sotto.
  const pb = [[4, 'portaA'], [1, 'portaDa'], [2, 'portaDa']].map(([i, k]) => percorsi[i][k]);
  assert.deepEqual(pb.map((p) => p[1]), [3, 3, 3]); assert.equal(new Set(pb.map((p) => p[0])).size, 3, 'ogni arco ha la sua porta');
  assert.equal(pb[0][0], 0, 'l’arco che sale parte dall’alto');
  assert(pb[2][0] < pb[1][0], 'fra quelli che scendono, la corsia esterna parte più in alto: niente incroci');
  assert.deepEqual(corsieArchi(archi, ordine), { percorsi, corsie }, 'stesso input, stesso instradamento');
  // Passaggio del mouse: arco, nodo, concetto.
  const ac = [{ da: 'a', a: 'f', tipo: 'stesso', concetto: 'x' }, { da: 'b', a: 'c', tipo: 'relazione', concetto: 'y', altro: 'x' }, { da: 'd', a: 'e', tipo: 'stesso', concetto: 'z' }];
  assert.equal(accensione(ac, null), null);
  const l = accensione(ac, { arco: 1 });
  assert.deepEqual([...l.archi], [1]); assert.equal(l.centro, 'b'); assert.deepEqual([...l.collegati], ['c']); assert.deepEqual([...l.concetti].sort(), ['x', 'y']);
  const n = accensione(ac, { nodo: 'd' }); assert.deepEqual([...n.archi], [2]); assert.deepEqual([...n.collegati], ['e']);
  const c = accensione(ac, { nodo: 'a', concetto: 'x' }); assert.deepEqual([...c.archi], [0, 1], 'il concetto accende tutte le sue linee');
  assert.equal(c.centro, 'a'); assert.deepEqual([...c.collegati].sort(), ['b', 'c', 'f']);
  checks++;
}
{
  // Solo legami affidabili: relazione non confermata scartata, concetto generico (in ogni nodo) senza ripetizioni.
  const t = ['Il diritto e la legge', 'Il diritto e la consuetudine', 'Il diritto e il pretore', 'Il diritto e il giurista', 'Consuetudine e legge'];
  const u = t.map((testo, i) => ({ id: `g${i}#0`, blocco: `g${i}`, pagina: 9, tipo: 'paragrafo', livello: 0, inizio: 0, fine: testo.length, testo }));
  const m = alberoGeometrico(u, u.map((x, i) => ({ id: `t${i}`, tipo: 'evidenziato', colore: 'giallo', ancore: [{ blocco: x.blocco, inizio: 0, fine: x.testo.length }] })));
  const conc = [['diritto', 'Diritto'], ['consuetudine', 'Consuetudine'], ['pretore', 'Pretore'], ['legge', 'Legge']].map(([id, nome]) => ({ id, nome, etichette: etichetteConcetto({ nome }) }));
  const s = semanticaGeometrica(m.radici, conc, [{ da: 'pretore', a: 'consuetudine', tipo: 'collegato', affidabile: false }, { da: 'consuetudine', a: 'legge', tipo: 'contrasta', affidabile: true }]);
  assert(!s.archi.some((a) => a.concetto === 'diritto'), 'il concetto in tutti i nodi non genera archi');
  assert(!s.archi.some((a) => a.concetto === 'pretore'), 'relazione non confermata: niente arco');
  assert.equal(s.scartati.relazioni, 1); assert(s.scartati.ripetizioni >= 1);
  assert(s.archi.some((a) => a.tipo === 'relazione' && a.concetto === 'consuetudine' && a.altro === 'legge'));
  checks++;
}
{
  // Vista con zoom: la mappa intera entra nella finestra, in larghezza resta al 100% se c'è spazio, il resto si raggiunge trascinando.
  const f = { w: 1000, h: 600 };
  assert.deepEqual(inquadra({ w: 1000, h: 1800 }, f, 'larghezza'), { k: 1, x: 0, y: 0 }, 'entra in larghezza: niente rimpicciolimento, si parte dall’alto');
  const t = inquadra({ w: 1000, h: 1800 }, f, 'tutto');
  assert(Math.abs(1800 * t.k - (600 - 24)) < 1e-6 && t.y >= 0, 'vedi tutto: l’altezza intera entra nella finestra');
  assert(Math.abs(t.x + 1000 * t.k / 2 - 500) < 1e-6, 'vedi tutto: centrata');
  const larga = inquadra({ w: 2400, h: 500 }, f, 'larghezza');
  assert(larga.k < 1 && Math.abs(2400 * larga.k - 976) < 1e-6, 'più larga della finestra: si adatta in larghezza');
  assert.equal(inquadra({ w: 400, h: 200 }, f, 'tutto').k, 1, 'mai oltre il 100% nell’inquadratura');
  assert.equal(inquadra({ w: 100000, h: 100000 }, f, 'tutto').k, 0.2, 'zoom minimo rispettato');
  assert.equal(altezzaVista({ w: 1000, h: 300 }, 1000, 650), 324, 'mappa corta: finestra alta quanto serve');
  assert.equal(altezzaVista({ w: 1000, h: 3000 }, 1000, 650), 650, 'mappa lunga: finestra al massimo, il resto con trascinamento o rotella');
  assert.equal(altezzaVista({ w: 1000, h: 20 }, 1000, 650), 160, 'mai più bassa del minimo');
  checks++;
}
{
  // Le linee si ridisegnano uguali in ogni passaggio: coordinate alla scala del disegno qualunque sia lo zoom.
  const base = { left: 100, top: 50 }, nodo = { left: 300, top: 250, right: 500, bottom: 330 };
  const a1 = inLocale(nodo, base, 1);
  const a2 = inLocale({ left: 100 + 200 * 2, top: 50 + 200 * 2, right: 100 + 400 * 2, bottom: 50 + 280 * 2 }, base, 2);
  assert.deepEqual(a1, a2, 'stesso nodo, stessa posizione a zoom 1 e 2');
  assert.deepEqual(inLocale({ left: 100 + 80, top: 50 + 80, right: 100 + 160, bottom: 50 + 112 }, base, 0.4), a1, 'e a zoom 0,4');
  const d = tracciaArco(500, 290, 480, 120, 560);
  assert(d.startsWith('M500,290 '), 'parte dalla porta del nodo'); assert(d.endsWith('H481'), 'arriva alla porta dell’altro nodo');
  assert(/Q560,290 560,278 V132 Q560,120 548,120/.test(d), 'curve morbide e tratto verticale nella corsia');
  assert.equal(tracciaArco(10, 20, 10, 20, 50), tracciaArco(10, 20, 10, 20, 50), 'deterministico');
  // Albero ↔ schema, concetti spenti/accesi, cambio lezione: lo strato delle linee trova il contenitore dal proprio svg
  // (al primo montaggio il ref del genitore non è ancora assegnato: era il motivo delle linee sparite).
  const comp = await readFile(new URL('../src/components/MappaGeometrica.tsx', import.meta.url), 'utf8');
  const archiSrc = comp.slice(comp.indexOf('function Archi('), comp.indexOf('function Vista('));
  assert(/svgRef\.current\?\.parentElement/.test(archiSrc) && !/dentro\.current/.test(archiSrc), 'gli archi non dipendono dal ref del contenitore');
  assert(/return \(\) => segna\(false\)/.test(archiSrc), 'spegnendo i concetti non restano contorni sui nodi');
  assert(/inquadrata\.current !== chiave/.test(comp), 'lo zoom scelto resta finché non cambia lezione, forma o strato');
  checks++;
}
console.log(`Mappa geometrica verificata: ${checks} scenari su gerarchia, ordine del testo, doppio segno, frammenti, potatura, concetti collegati, instradamento, passaggio del mouse, affidabilità dei legami, zoom e ridisegno delle linee.`);
