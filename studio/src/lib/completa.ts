import { norm } from './data';

const pulisci = (s: string) => norm(s).replace(/[.,;:()\-–—\s]/g, '').replace(/^(il|lo|la|i|gli|le|l)(?=[a-z])/, '');
const NUMERI = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici',
  'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti'];
/** Una risposta numerica vale anche scritta in lettere (fino a venti) o con «d.C.» se la soluzione è un anno senza era. */
export function rispostaCompletaGiusta(alternative: string[], scritta: string): boolean {
  let x = pulisci(scritta);
  if (!x) return false;
  const n = NUMERI.indexOf(x);
  if (n >= 0) x = String(n);
  const avantiCristo = alternative.some((a) => /\d\s*a\.?\s*c\.?$/i.test(a.trim()));
  return alternative.some((a) => {
    let y = pulisci(a);
    // soluzione scritta in lettere («cinque»): vale anche la cifra, come per la risposta
    if (NUMERI.includes(y)) y = String(NUMERI.indexOf(y));
    return y === x || (/^\d+$/.test(y) && ((!avantiCristo && x === `${y}dc`) || NUMERI[Number(y)] === x));
  });
}
