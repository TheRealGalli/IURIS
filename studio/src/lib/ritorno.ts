// «Indietro» nel browser riporta dove si era: ogni voce della cronologia ricorda la materia in cui è stata aperta
// e, quando si parte da una citazione, il punto della pagina. Tutto sta in history.state, niente nell'archivio.
type Stato = { iurisMateria?: string; iurisScroll?: number };

function aggiorna(parte: Stato) {
  try { history.replaceState({ ...((history.state as object | null) ?? {}), ...parte }, ''); } catch { /* cronologia non scrivibile */ }
}

/** La pagina corrente appartiene a questa materia. */
export const timbraMateria = (slug: string) => aggiorna({ iurisMateria: slug });

/** Da chiamare prima di lasciare la pagina seguendo un collegamento. */
export const ricordaScroll = () => aggiorna({ iurisScroll: Math.round(window.scrollY) });

/** Dopo «indietro»: la pagina può dover essere ridisegnata (o il corso ricaricato) prima di poter tornare nel punto giusto.
 *  Si riprova per un paio di secondi e ci si ferma appena chi legge tocca la pagina. */
export function ripristinaScroll(y: number) {
  if (!(y > 0)) return;
  const inizio = performance.now();
  let fermo = false;
  const ferma = () => { fermo = true; };
  const eventi = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
  for (const e of eventi) window.addEventListener(e, ferma, { once: true, passive: true });
  const prova = () => {
    const t = performance.now() - inizio;
    const alta = document.documentElement.scrollHeight - window.innerHeight >= y - 4;
    if (!fermo && alta && Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y });
    if (!fermo && t < 2500 && (!alta || t < 700)) requestAnimationFrame(prova);
    else for (const e of eventi) window.removeEventListener(e, ferma);
  };
  requestAnimationFrame(prova);
}
