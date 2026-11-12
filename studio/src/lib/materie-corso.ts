/** Le materie disponibili nel corso scelto: servono per i rimandi tra una materia e l'altra (un articolo della
 *  Costituzione citato negli Originali di Diritto privato o in una lezione di Diritto romano). Stanno su globalThis
 *  perché le legge letture-client.ts, che i controlli compilano da solo, senza altri moduli. */

/** Materia che ospita un atto: `inCorso` = fa parte del corso scelto e si può aprire; altrimenti si mostra solo la scheda. */
export interface AttoCorso { slug: string; inCorso: boolean }
export interface AttiCorso { costituzione?: AttoCorso; codice?: AttoCorso }

const COSTITUZIONALE = (s: string) => s === 'diritto-costituzionale' || s.startsWith('diritto-costituzionale-');
const PRIVATO = (s: string) => s === 'diritto-privato' || s.startsWith('diritto-privato-');

/**
 * Dove si legge la Costituzione e dove il Codice civile per il corso scelto.
 * Diritto costituzionale è una sola materia (`diritto-costituzionale`) per le tre classi, come Diritto privato;
 * se il corso non la elenca si ripiega su quella presente nel manifest, ma solo per leggere l'articolo nella scheda.
 */
export function attiDelCorso(delCorso: string[], tutte: string[] = delCorso): AttiCorso {
  const scegli = (pred: (s: string) => boolean, preferita?: string): AttoCorso | undefined => {
    const nel = delCorso.find(pred);
    if (nel) return { slug: nel, inCorso: true };
    const fuori = tutte.filter(pred);
    const slug = fuori.find((s) => s === preferita) ?? fuori[0];
    return slug ? { slug, inCorso: false } : undefined;
  };
  return { costituzione: scegli(COSTITUZIONALE, 'diritto-costituzionale'), codice: scegli(PRIVATO, 'diritto-privato') };
}

type Globale = { __iurisMaterieCorso?: Set<string>; __iurisAtti?: AttiCorso };
/** `elenco` = materie disponibili del corso scelto; `tutte` = materie disponibili del manifest. */
export function impostaMaterieCorso(elenco: string[], tutte: string[] = elenco): void {
  const g = globalThis as Globale;
  g.__iurisMaterieCorso = new Set(elenco);
  g.__iurisAtti = attiDelCorso(elenco, tutte);
}
export const attiCorrenti = (): AttiCorso => (globalThis as Globale).__iurisAtti ?? {};
