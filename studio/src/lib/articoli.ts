// Scheda di un articolo citato in una lezione o negli Originali: il testo si prende dalla materia che ospita l'atto
// (la stessa che si sta studiando, o un'altra: la Costituzione per Diritto privato, il Codice civile per le altre).
import { caricaCorso, type Indice } from './data';
import type { Articolo, GruppoNorme, Norme } from './types';

export interface SchedaArticolo {
  /** nome breve dell'atto («Costituzione», «Codice civile») */
  atto: string;
  /** «Art. 3», «Art. 12 preleggi» */
  etichetta: string;
  tema?: string;
  commi: string[];
  abrogato?: boolean;
}

const chiaveDi = (a: Articolo) => `${a.disposizione ? 'd' : a.serie ? 'p' : ''}${a.n}`;
const libri = new Map<string, Promise<GruppoNorme[]>>();
function caricaLibro(slug: string, file: string): Promise<GruppoNorme[]> {
  const k = `${slug}/${file}`;
  if (!libri.has(k)) {
    libri.set(k, fetch(`content/${slug}/${file}`).then((r) => { if (!r.ok) throw new Error('libro non trovato'); return r.json(); })
      .then((d) => d.gruppi as GruppoNorme[]).catch((e) => { libri.delete(k); throw e; }));
  }
  return libri.get(k)!;
}

async function trova(norme: Norme, slug: string, chiave: string): Promise<Articolo | undefined> {
  const tra = (gruppi: GruppoNorme[]) => gruppi.flatMap((g) => g.articoli).find((a) => chiaveDi(a) === chiave);
  if (norme.gruppi) return tra(norme.gruppi);
  const noto = norme.programma?.find((a) => chiaveDi(a) === chiave);
  if (noto) return noto;
  // atto lungo: l'indice dice in quale libro sta l'articolo, il testo si scarica con il libro
  const riga = norme.indice?.find((r) => (r[5] ? `p${r[0]}` : r[0]) === chiave);
  const libro = riga && norme.libri?.[riga[2]];
  return libro ? tra(await caricaLibro(slug, libro.file)) : undefined;
}

/** `materia` = slug della materia che ospita l'atto, se non è quella aperta (`idx`). Null se l'articolo non si trova. */
export async function caricaArticolo(idx: Indice, chiave: string, materia?: string): Promise<SchedaArticolo | null> {
  const altra = materia && materia !== idx.corso.materia.slug;
  const corso = altra ? (await caricaCorso(`content/${materia}/corso.json`)).corso : idx.corso;
  const norme = corso.norme;
  if (!norme) return null;
  const a = await trova(norme, corso.materia.slug, chiave);
  if (!a) return null;
  return {
    atto: norme.nome ?? norme.atto,
    etichetta: a.disposizione ? `Disp. ${a.n}` : a.serie ? `Art. ${a.n} ${a.serie}` : `Art. ${a.n}`,
    tema: a.tema, commi: a.commi, abrogato: a.abrogato,
  };
}

/** Testo breve per l'anteprima: i primi commi, fino a circa `max` caratteri. */
export function testoBreve(commi: string[], max = 380): { testo: string[]; tagliato: boolean } {
  const out: string[] = [];
  let n = 0;
  for (const c of commi) {
    if (n + c.length > max) {
      const resto = max - n;
      if (resto > 80 || !out.length) out.push(`${c.slice(0, Math.max(resto, 120)).replace(/\s+\S*$/, '')}…`);
      return { testo: out, tagliato: true };
    }
    out.push(c); n += c.length;
  }
  return { testo: out, tagliato: false };
}
