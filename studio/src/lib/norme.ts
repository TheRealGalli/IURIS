import type { Articolo, Norme } from './types';

/** Articoli dell'atto collegati a lezioni o domande: tutti quelli di un atto breve, il solo «programma» di un atto lungo. */
export function articoliCollegati(norme: Norme | undefined): Articolo[] {
  if (!norme) return [];
  return norme.programma ?? (norme.gruppi ?? []).flatMap((g) => g.articoli).filter((a) => !a.disposizione && !a.serie);
}
