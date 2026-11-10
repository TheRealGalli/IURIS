/** Le materie disponibili nel corso scelto: servono per i rimandi tra una materia e l'altra (un articolo della
 *  Costituzione citato negli Originali di Diritto privato). Stanno su globalThis perché le legge letture-client.ts,
 *  che i controlli compilano da solo, senza altri moduli. */
export function impostaMaterieCorso(elenco: string[]): void {
  (globalThis as { __iurisMaterieCorso?: Set<string> }).__iurisMaterieCorso = new Set(elenco);
}
