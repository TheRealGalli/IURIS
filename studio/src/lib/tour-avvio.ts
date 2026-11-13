// Su desktop la visita guidata parte da sola soltanto alla prima visita: niente progressi salvati e visita mai proposta.
// Su telefono e iPad parte solo da «Demo interattiva». Dopo, su ogni dispositivo, si rifà tutta da quel pulsante.
import { inDemo } from './archivio';

export const CHIAVE_VISITA = 'iuris:v1:tour-visto';

/** Vero solo per chi apre IURIS per la prima volta in questo browser (nessuna materia studiata, visita mai proposta). */
export function primaVisita(): boolean {
  if (inDemo() || typeof window === 'undefined') return false;
  // I controlli automatici (Playwright) aprono sempre un browser vuoto: la visita non deve coprire le pagine che misurano.
  if (navigator.webdriver) return false;
  try {
    const s = window.localStorage;
    if (s.getItem(CHIAVE_VISITA)) return false;
    for (let i = 0; i < s.length; i++) if (s.key(i)?.startsWith('iuris:v1:prog:')) return false;
    return true;
  } catch { return false; }
}

export function segnaVisitaProposta(): void {
  try { window.localStorage.setItem(CHIAVE_VISITA, '1'); } catch { /* archivio non disponibile: la visita si riproporrà */ }
}
