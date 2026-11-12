// Tracce d'esame dei docenti (esame.json): di chi sono, per quale classe valgono, in che ordine mostrarle.
import { CORSI } from '../data/corsi';
import type { Indice } from './data';
import type { Domanda, FonteEsame, TracciaEsame } from './types';

/** «Michele Lobuono» → «prof. Lobuono»; «S.R. Alessandrì» → «prof. Alessandrì»; «Maria De Luca» → «prof. De Luca». */
export function prof(docente: string): string {
  const parole = docente.trim().split(/\s+/);
  const cognome = parole.slice(1).filter((x) => !/^[A-Z]\.(?:[A-Z]\.)*$/.test(x));
  return `prof. ${(cognome.length ? cognome : parole.slice(-1)).join(' ')}`;
}

/** La fonte è del docente che insegna la materia nel corso scelto? */
export const delCorso = (f: FonteEsame | undefined, corso: string) => !!f && f.corsi.includes(corso);

/** Classi in cui insegna il docente, in breve: «M-Z, SSG». */
export function classiDi(f: FonteEsame): string {
  return f.corsi.map((id) => { const c = CORSI.find((x) => x.id === id); return c ? c.lettere ?? c.sigla.split(' · ')[0] : null; })
    .filter(Boolean).join(', ');
}

/** Fonti distinte di un elenco di tracce o di id: prima quelle del corso scelto. */
export function fontiOrdinate(idx: Indice, ids: Iterable<string>, corso: string): FonteEsame[] {
  const viste = [...new Set(ids)].map((id) => idx.fontiEsame.get(id)).filter((f): f is FonteEsame => !!f);
  return [...viste.filter((f) => delCorso(f, corso)), ...viste.filter((f) => !delCorso(f, corso))];
}

/** Tracce ordinate: prima quelle del docente del corso scelto, poi quelle delle altre classi (ordine del file). */
export function tracceOrdinate(idx: Indice, tracce: TracciaEsame[], corso: string): TracciaEsame[] {
  const mie = (t: TracciaEsame) => delCorso(idx.fontiEsame.get(t.fonte), corso);
  return [...tracce.filter(mie), ...tracce.filter((t) => !mie(t))];
}

/** Domande legate alle tracce d'esame, divise fra il docente del corso scelto e le altre classi. */
export function domandeEsame(idx: Indice, corso: string): { mie: Domanda[]; altre: Domanda[] } {
  const tutte = idx.corso.domande.filter((q) => q.esame?.some((f) => idx.fontiEsame.has(f)));
  const mia = (q: Domanda) => q.esame!.some((f) => delCorso(idx.fontiEsame.get(f), corso));
  return { mie: tutte.filter(mia), altre: tutte.filter((q) => !mia(q)) };
}

/** Tracce a cui risponde una domanda (stessa fonte, e la domanda è tra quelle della traccia). */
export function tracceDellaDomanda(idx: Indice, q: Domanda): TracciaEsame[] {
  if (!q.esame?.length) return [];
  return (idx.corso.esame?.tracce ?? []).filter((t) => t.domande.includes(q.id));
}
