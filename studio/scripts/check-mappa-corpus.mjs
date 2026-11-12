// Su tutto il corpus pubblicato: ogni segno si ritrova dopo le revisioni del testo e compare per intero nella mappa,
// nel nodo giusto. Segni di prova: scripts/fixtures/segni-campione.json (generati sul testo prima delle revisioni).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { apriCorpus } from './lib/corpus-letture.mjs';

const C = await apriCorpus();
const campione = JSON.parse(await readFile(new URL('./fixtures/segni-campione.json', import.meta.url), 'utf8'));
// Soglie: quanti segni del backup di prova si ritrovavano prima di questa tornata di revisioni (mai meno).
// Romano: il testo IURIS (romano-iuris-v1) ha sostituito gli appunti; campione e stress sono stati rigenerati sul testo nuovo
// (12 novembre 2026, stesse forme del backup di prova: capoversi interi, prime frasi, titoli, voci, 6 segni su due blocchi).
const MINIMO_STRESS = { 'romano-iuris-v1': 287, 'filosofia-incampo-v1': 154, 'filosofia-moro-v1': 30 };
// Documenti che devono avere segni di prova: un documento nuovo senza campione non deve passare in silenzio.
for (const id of Object.keys(MINIMO_STRESS)) assert(campione.documenti[id]?.length && campione.stress?.[id]?.length, `${id}: segni di prova mancanti in fixtures/segni-campione.json`);
// Privato: il testo IURIS (privato-iuris-v1) ha sostituito la dispensa, che non aveva segni di prova; campione generato
// sul testo nuovo con le regole di genera-segni-campione.mjs (12 novembre 2026, 3.345 segni), senza backup di stress.
const SOLO_CAMPIONE = ['privato-iuris-v1'];
for (const id of SOLO_CAMPIONE) assert(campione.documenti[id]?.length >= 3000, `${id}: segni di prova mancanti in fixtures/segni-campione.json`);
const pag = (s) => s.ancoreTesto?.length ? s.ancoreTesto.map((a) => Number(/^p(\d+)-/.exec(a.blocco)?.[1] ?? s.pagina)) : [s.pagina];
let controlli = 0;
const conti = {};
try {
  for (const doc of C.catalogo.filter((d) => !d.tipoFonte)) {
    const sezioni = [];
    for (const sec of doc.sezioni) { const blocchi = await C.sezione(doc, sec); sezioni.push({ sec, blocchi, unita: C.unita(blocchi) }); }
    for (const [nome, segni] of [['campione', campione.documenti[doc.id] ?? []], ['stress', campione.stress?.[doc.id] ?? []]]) {
      if (!segni.length) continue;
      const c = { segni: segni.length, proiettati: 0, ritrovati: 0, persi: [] };
      const perSezione = new Map();
      for (const s of segni) {
        const candidate = sezioni.filter(({ sec }) => pag(s).some((p) => p >= sec.da && p <= sec.a));
        let preso = null;
        for (const x of candidate) {
          const pr = C.lib.proiettaSegnoTesto(s, x.blocchi, doc.edizione, x.sec);
          if (pr.stato === 'proiettato') { preso = { x, ancore: pr.ancore }; c.proiettati++; break; }
        }
        if (!preso) for (const x of candidate) {
          const citazione = s.ancoreTesto?.length ? s.ancoreTesto.map((a) => a.citazione).join('\n\n') : s.testo;
          const r = C.lib.ritrovaNellaSezione(citazione, x.blocchi, doc.edizione);
          if (r) { preso = { x, ancore: r }; c.ritrovati++; break; }
        }
        if (!preso) { c.persi.push(s); if (process.env.DEBUG) console.log("perso", JSON.stringify(s.ancoreTesto ?? s.testo).slice(0, 400)); if (candidate[0]) preso = { x: candidate[0], perso: true }; }
        if (preso) { const l = perSezione.get(preso.x) ?? []; l.push({ s, ...preso }); perSezione.set(preso.x, l); }
      }
      conti[`${doc.id} ${nome}`] = { segni: c.segni, proiettati: c.proiettati, ritrovati: c.ritrovati, persi: c.persi.length };
      if (nome === 'campione') assert.equal(c.persi.length, 0, `${doc.id}: segni persi dopo la revisione: ${c.persi.slice(0, 3).map((s) => `«${s.testo.slice(0, 60)}»`).join(', ')}`);
      else assert(c.proiettati + c.ritrovati >= (MINIMO_STRESS[doc.id] ?? 0), `${doc.id}: segni del backup di prova ritrovati ${c.proiettati + c.ritrovati}, prima ${MINIMO_STRESS[doc.id]}`);
      // Mappa: ogni segno c'è, per intero, nel nodo della sua unità (o in coda «da ricollocare»).
      for (const [x, lista] of perSezione) {
        const geo = lista.filter((l) => !l.perso).map(({ s, ancore }) => ({ id: s.id, colore: s.colore, tipo: s.tipo, creata: s.creata, ancore }));
        const coda = C.geo.daRicollocare(lista.filter((l) => l.perso).map(({ s }) => ({ id: s.id, testo: s.testo, colore: s.colore, tipo: s.tipo })), x.sec.a);
        const albero = C.geo.alberoGeometrico([...x.unita, ...coda.unita], [...geo, ...coda.segni]);
        assert.equal(albero.segni, geo.length + coda.segni.length, `${doc.id}/${x.sec.id}: segni assenti dalla mappa`);
        verificaNodi(albero.radici, [...x.unita, ...coda.unita], [...geo, ...coda.segni], `${doc.id}/${x.sec.id}`);
      }
      controlli++;
    }
    // Ogni unità del testo (titolo, paragrafo, voce) segnata per intero compare per intero nel suo nodo.
    for (const x of sezioni) {
      const segni = x.unita.map((u, i) => ({ id: `u${i}`, colore: 'verde', tipo: 'sottolineato', ancore: [{ blocco: u.blocco, inizio: u.inizio, fine: u.fine }] }));
      const albero = C.geo.alberoGeometrico(x.unita, segni);
      assert.equal(albero.segni, segni.length, `${doc.id}/${x.sec.id}: unità senza nodo`);
      verificaNodi(albero.radici, x.unita, segni, `${doc.id}/${x.sec.id}`);
    }
    controlli++;
  }
} finally { await C.chiudi(); }

/** Il testo segnato di ogni nodo è esattamente l'unione dei tratti segnati della sua unità: niente tagli, niente altro. */
function verificaNodi(radici, unita, segni, dove) {
  const byId = new Map(unita.map((u) => [u.id, u]));
  const giro = (n) => {
    const u = byId.get(n.id);
    const tratti = segni.flatMap((s) => s.ancore.filter((a) => a.blocco === u.blocco).map((a) => [Math.max(a.inizio, u.inizio), Math.min(a.fine, u.fine)])).filter(([a, z]) => z > a);
    const coperto = new Array(u.fine - u.inizio).fill(false);
    for (const [a, z] of tratti) for (let k = a; k < z; k++) coperto[k - u.inizio] = true;
    const atteso = [...u.testo].map((ch, k) => coperto[k] ? ch : '').join('');
    const visto = n.pezzi.filter((p) => p.segnato).map((p) => p.testo).join('');
    assert.equal(visto, atteso, `${dove}: nel nodo «${u.testo.slice(0, 50)}» manca una parte segnata`);
    n.figli.forEach(giro);
  };
  radici.forEach(giro);
}
for (const [k, v] of Object.entries(conti)) console.log(`  ${k}: ${v.proiettati}/${v.segni} al loro posto, ${v.ritrovati} ritrovati nella sezione, ${v.persi} da ricollocare`);
console.log(`Mappa sul corpus verificata: ${controlli} controlli, ogni segno compare per intero nel suo nodo.`);
