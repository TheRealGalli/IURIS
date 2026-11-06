// Voce gratuita del browser: sintesi (legge le domande) e riconoscimento (trascrive la risposta).
import { norm } from './data';

export function puoParlare() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

export function leggiAdAltaVoce(testo: string, onEnd?: () => void) {
  if (!puoParlare()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(testo);
  u.lang = 'it-IT';
  u.rate = 1;
  const voce = speechSynthesis.getVoices().find((v) => v.lang.startsWith('it'));
  if (voce) u.voice = voce;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}
export function zitto() { if (puoParlare()) speechSynthesis.cancel(); }

/* eslint-disable @typescript-eslint/no-explicit-any */
const Riconoscitore: any = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;
export const puoAscoltare = () => !!Riconoscitore;

export interface Ascolto { stop: () => void }
export function ascolta(onTesto: (finale: string, provvisorio: string) => void, onFine: (errore?: string) => void): Ascolto | null {
  if (!Riconoscitore) return null;
  const r = new Riconoscitore();
  r.lang = 'it-IT';
  r.continuous = true;
  r.interimResults = true;
  let finale = '';
  r.onresult = (e: any) => {
    let provv = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finale += t + ' ';
      else provv += t;
    }
    onTesto(finale, provv);
  };
  r.onerror = (e: any) => onFine(e.error === 'not-allowed' ? 'Microfono non autorizzato' : e.error);
  r.onend = () => onFine();
  r.start();
  return { stop: () => r.stop() };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Quali punti della checklist sono stati toccati, cercando le parole chiave nel testo */
export function puntiDetti(testo: string, punti: { chiavi: string[] }[]): boolean[] {
  const t = ` ${norm(testo)} `;
  return punti.map((p) => p.chiavi.some((k) => k && t.includes(norm(k))));
}
