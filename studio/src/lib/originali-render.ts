/** Il piano riguarda una sola larghezza: canvas e text layer di zoom diversi non sono riutilizzabili. */
export type PianoRender = {
  larghezza: number;
  pronte: ReadonlySet<number>;
  inCorso: number | null;
};

const paginaIntera = (n: number) => Number.isInteger(n) && n >= 1;

/** Prima la pagina visibile, poi la successiva e la precedente; mai più di tre. */
export function ordinePagine(corrente: number, totale: number): number[] {
  const ultimo = Number.isFinite(totale) ? Math.max(0, Math.floor(totale)) : 0;
  if (!ultimo) return [];
  const richiesta = Number.isFinite(corrente) ? Math.round(corrente) : 1;
  const pagina = Math.max(1, Math.min(ultimo, richiesta));
  return [pagina, pagina + 1, pagina - 1].filter((n) => n >= 1 && n <= ultimo);
}

/**
 * Mantiene solo il piccolo intervallo corrente. La pagina visibile interrompe un
 * precaricamento, ma le vicine partono soltanto quando il chiamante concede un idle.
 */
export function aggiornaPianoRender(prev: PianoRender, ordine: number[], corrente: number, larghezza: number): PianoRender {
  const width = Number.isFinite(larghezza) && larghezza > 0 ? larghezza : 1;
  const consentite = new Set(ordine.filter(paginaIntera));
  const visibile = consentite.has(corrente) ? corrente : consentite.values().next().value ?? null;
  const cambiaZoom = prev.larghezza !== width;
  let pronte: ReadonlySet<number> = prev.pronte;
  if (cambiaZoom) pronte = new Set();
  else if ([...prev.pronte].some((n) => !consentite.has(n))) pronte = new Set([...prev.pronte].filter((n) => consentite.has(n)));

  let inCorso = cambiaZoom || (prev.inCorso !== null && !consentite.has(prev.inCorso)) ? null : prev.inCorso;
  if (visibile !== null && !pronte.has(visibile)) inCorso = visibile;

  if (!cambiaZoom && pronte === prev.pronte && inCorso === prev.inCorso) return prev;
  return { larghezza: width, pronte, inCorso };
}

/** Una notifica tardiva di un canvas smontato o di un altro zoom non rende pronta la pagina. */
export function paginaPronta(prev: PianoRender, numero: number, larghezza: number): PianoRender {
  if (prev.larghezza !== larghezza || prev.inCorso !== numero) return prev;
  const pronte = prev.pronte.has(numero) ? prev.pronte : new Set([...prev.pronte, numero]);
  return { ...prev, pronte, inCorso: null };
}

/** L'effetto idle può avviare una sola vicina e non può sostituire un lavoro attivo. */
export function avviaPagina(prev: PianoRender, numero: number, larghezza: number): PianoRender {
  if (!paginaIntera(numero) || prev.larghezza !== larghezza || prev.inCorso !== null || prev.pronte.has(numero)) return prev;
  return { ...prev, inCorso: numero };
}

/**
 * Limita la risoluzione a DPR 2 e circa otto milioni di pixel per canvas.
 * Se la pagina supera già il budget a DPR 1, resta il minimo 1 richiesto dal lettore.
 */
export function pixelRatioPagina(width: number, rapporto: number, dpr: number): number {
  if (![width, rapporto, dpr].every((n) => Number.isFinite(n) && n > 0)) return 1;
  const budget = Math.sqrt(8_000_000 / (width * width * rapporto));
  return Math.max(1, Math.min(2, dpr, budget));
}
