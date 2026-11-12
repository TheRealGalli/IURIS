// Segni di prova per la mappa personale: ~300 per documento IURIS, come nelle misure degli Originali
// (100 nelle prime quattro sezioni, 200 sparsi su tutto il testo), evidenziati e sottolineati in sei colori.
// Frasi intere o loro parti, titoli compresi: le stesse forme che produce chi studia.
import { apriCorpus } from './corpus-letture.mjs';

const COLORI = ['giallo', 'verde', 'azzurro', 'rosa', 'viola', 'arancio'];

/** { [docId]: { materia, segni } } per i documenti IURIS del catalogo. */
/** `densi`: le N sezioni più lunghe, ogni frase segnata fino a `perDensa` (tante schede in una lezione). */
export async function segniMappa({ perPrime = 25, prime = 4, sparsi = 200, solo, densi = 0, perDensa = 100 } = {}) {
  const C = await apriCorpus();
  const out = {};
  try {
    for (const doc of C.catalogo.filter((d) => !d.tipoFonte && /-iuris-v\d+$/.test(d.id) && (!solo || solo.includes(d.id)))) {
      const segni = [];
      let n = 0;
      const prendi = async (sec, quanti) => {
        if (quanti <= 0) return;
        const blocchi = (await C.sezione(doc, sec)).filter((b) => b.testo.trim().length >= 12);
        if (!blocchi.length) return;
        for (let k = 0; k < quanti; k++) {
          const b = blocchi[Math.floor((k + 0.5) * blocchi.length / quanti) % blocchi.length];
          const t = b.testo;
          // Frasi del blocco: si segna la k-esima (a giro), a volte solo la sua prima parte.
          const frasi = [...t.matchAll(/[^.;:!?\n]+[.;:!?]?/gu)].filter((m) => m[0].trim().length >= 8);
          const f = frasi[k % Math.max(1, frasi.length)];
          let a = f ? f.index : 0, z = f ? f.index + f[0].length : t.length;
          if (k % 4 === 3 && z - a > 60) z = a + Math.floor((z - a) * 0.6);
          if (z - a > 260) z = a + 260;
          const ancora = C.lib.creaAncoraTesto(b, a, z, doc.edizione);
          if (!ancora) continue;
          const i = n++;
          segni.push({ id: `m${i}`, pagina: b.pagina, testo: ancora.citazione, tipo: i % 3 === 2 ? 'sottolineato' : 'evidenziato',
            colore: COLORI[i % COLORI.length], rettangoli: [], creata: `2026-11-12T${String(8 + Math.floor(i / 60) % 12).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`, ancoreTesto: [ancora] });
        }
      };
      if (densi) {
        const lunghe = [];
        for (const sec of doc.sezioni) lunghe.push({ sec, blocchi: (await C.sezione(doc, sec)).filter((b) => b.testo.trim().length >= 12) });
        lunghe.sort((a, b) => b.blocchi.reduce((t, x) => t + x.testo.length, 0) - a.blocchi.reduce((t, x) => t + x.testo.length, 0));
        for (const { blocchi } of lunghe.slice(0, densi)) {
          let q = 0;
          for (const b of blocchi) for (const f of b.testo.matchAll(/[^.;:!?\n]+[.;:!?]?/gu)) {
            if (q >= perDensa || f[0].trim().length < 8) continue;
            const ancora = C.lib.creaAncoraTesto(b, f.index, Math.min(b.testo.length, f.index + Math.min(f[0].length, 200)), doc.edizione);
            if (!ancora) continue;
            const i = n++; q++;
            segni.push({ id: `d${i}`, pagina: b.pagina, testo: ancora.citazione, tipo: i % 3 === 2 ? 'sottolineato' : 'evidenziato', colore: COLORI[i % COLORI.length], rettangoli: [], creata: `2026-11-12T09:${String(i % 60).padStart(2, '0')}:00Z`, ancoreTesto: [ancora] });
          }
        }
        out[doc.id] = { materia: doc.materia, segni, prima: lunghe[0]?.sec.id };
        continue;
      }
      const sezioni = doc.sezioni;
      for (const sec of sezioni.slice(0, prime)) await prendi(sec, perPrime);
      const resto = sezioni.slice(prime);
      for (let i = 0; i < resto.length; i++) await prendi(resto[i], Math.floor((i + 1) * sparsi / resto.length) - Math.floor(i * sparsi / resto.length));
      out[doc.id] = { materia: doc.materia, segni, prima: sezioni[0]?.id };
    }
  } finally { await C.chiudi(); }
  return out;
}
