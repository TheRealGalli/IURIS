// Progressi di studio salvati nel browser (localStorage), uno per materia.
import { useSyncExternalStore } from 'react';
import type { Card } from 'ts-fsrs';
import { isoDi, oggiISO } from './util';
import { normalizzaSegno, paginaValida, type DocumentoOriginale, type LetturaOriginale, type SegnoOriginale } from './originali';

export type CartaSalvata = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string; introdotta?: string };

export const DOMANDE_VERIFICA_INIZIALE = 6;

export interface Giorno { lette: number; risposte: number; corrette: number; secondi: number }

export const haAttivita = (g?: Giorno) => !!g && (g.lette > 0 || g.risposte > 0 || g.secondi > 0);

export interface Progresso {
  versione: 1;
  lezioni: Record<string, { studiata?: string; letta?: string; verificaIniziale?: { giorno: string; domande: string[] } }>;
  carte: Record<string, CartaSalvata>;
  esiti: Record<string, { ultimo: number; n: number; giuste: number; quando: string }>;
  giorni: Record<string, Giorno>;
  esame?: string;
  nuovePerGiorno: number;
  ultimaLezione?: string;
  originali?: Record<string, LetturaOriginale>;
}

const vuoto = (): Progresso => ({ versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: 25 });
const key = (slug: string) => `iuris:v1:prog:${slug}`;

const mem = new Map<string, Progresso>();
const listeners = new Set<() => void>();

function leggi(slug: string): Progresso {
  if (mem.has(slug)) return mem.get(slug)!;
  let p = vuoto();
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) p = { ...vuoto(), ...JSON.parse(raw) };
  } catch { /* storage non disponibile: si lavora in memoria */ }
  mem.set(slug, p);
  return p;
}

export function aggiorna(slug: string, fn: (p: Progresso) => Progresso | void) {
  const prev = leggi(slug);
  const draft: Progresso = structuredClone(prev);
  const next = fn(draft) ?? draft;
  mem.set(slug, next);
  let salvato = true;
  try { localStorage.setItem(key(slug), JSON.stringify(next)); } catch { salvato = false; }
  listeners.forEach((l) => l());
  return salvato;
}

export function salvaPaginaOriginale(slug: string, doc: DocumentoOriginale, pagina: number): boolean {
  if (doc.materia !== slug) throw new Error('Documento di un’altra materia');
  return aggiorna(slug, (p) => {
    const originali = p.originali ?? (p.originali = {});
    const lettura = originali[doc.id] ?? (originali[doc.id] = { pagina: 1, segni: [] });
    lettura.pagina = paginaValida(pagina, doc.pagine);
  });
}

export function aggiungiSegnoOriginale(slug: string, doc: DocumentoOriginale, segno: Omit<SegnoOriginale, 'id' | 'creata'>): { id: string; salvato: boolean } {
  if (doc.materia !== slug) throw new Error('Documento di un’altra materia');
  const valido = normalizzaSegno(segno, doc.pagine);
  const id = crypto.randomUUID();
  const salvato = aggiorna(slug, (p) => {
    const originali = p.originali ?? (p.originali = {});
    const lettura = originali[doc.id] ?? (originali[doc.id] = { pagina: valido.pagina, segni: [] });
    lettura.segni.push({ ...valido, id, creata: new Date().toISOString() });
  });
  return { id, salvato };
}

export function rimuoviSegnoOriginale(slug: string, doc: DocumentoOriginale, id: string): boolean {
  if (doc.materia !== slug) throw new Error('Documento di un’altra materia');
  return aggiorna(slug, (p) => {
    const lettura = p.originali?.[doc.id];
    if (lettura) lettura.segni = lettura.segni.filter((s) => s.id !== id);
  });
}

export function useProgresso(slug: string): Progresso {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => leggi(slug),
  );
}

export function giornoDi(p: Progresso, iso = oggiISO()): Giorno {
  return p.giorni[iso] ?? (p.giorni[iso] = { lette: 0, risposte: 0, corrette: 0, secondi: 0 });
}

export function segnaStudiata(slug: string, lezione: string, studiata: boolean, domande: string[] = [], now = new Date()) {
  aggiorna(slug, (p) => {
    const l = p.lezioni[lezione] ?? (p.lezioni[lezione] = {});
    if (studiata) {
      if (!l.studiata) {
        giornoDi(p, isoDi(now)).lette += 1;
        // Una piccola verifica fissa: rispondere non fa scorrere la riserva sulle domande successive.
        // Togliere e rimettere «Studiata» non genera altre domande extra.
        if (!l.verificaIniziale) l.verificaIniziale = {
          giorno: isoDi(now),
          domande: [...new Set(domande)].filter((id) => !p.carte[id]).slice(0, DOMANDE_VERIFICA_INIZIALE),
        };
      }
      l.studiata = now.toISOString();
    } else delete l.studiata;
  });
}

export function apriLezione(slug: string, lezione: string) {
  aggiorna(slug, (p) => {
    p.ultimaLezione = lezione;
    const l = p.lezioni[lezione] ?? (p.lezioni[lezione] = {});
    l.letta = new Date().toISOString();
  });
}

export function aggiungiTempo(slug: string, secondi: number, fine = new Date()) {
  if (!Number.isFinite(secondi) || secondi < 5 || !Number.isFinite(fine.getTime())) return;
  const termine = Math.floor(fine.getTime() / 1000) * 1000;
  const durata = Math.round(secondi) * 1000;
  aggiorna(slug, (p) => {
    // Una lettura che attraversa mezzanotte resta attribuita ai rispettivi giorni locali.
    let da = termine - durata;
    while (da < termine) {
      const data = new Date(da);
      const mezzanotte = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1).getTime();
      const a = Math.min(termine, mezzanotte);
      giornoDi(p, isoDi(data)).secondi += (a - da) / 1000;
      da = a;
    }
  });
}

export function impostaEsame(slug: string, data: string | undefined) {
  aggiorna(slug, (p) => { if (data) p.esame = data; else delete p.esame; });
}

export function impostaNuove(slug: string, n: number) {
  aggiorna(slug, (p) => { p.nuovePerGiorno = n; });
}

export function esporta(slug: string): string {
  return JSON.stringify({ materia: slug, esportato: new Date().toISOString(), progresso: leggi(slug) }, null, 1);
}

export function importa(slug: string, json: string) {
  const data = JSON.parse(json);
  const p = data.progresso ?? data;
  if (p?.versione !== 1) throw new Error('file non riconosciuto');
  aggiorna(slug, () => ({ ...vuoto(), ...p }));
}

export function azzera(slug: string) {
  aggiorna(slug, () => vuoto());
}

// Preferenze generali
const PREF = 'iuris:v1:pref';
export interface Preferenze { materia?: string; tema?: 'auto' | 'chiaro' | 'scuro'; voce?: boolean }
let pref: Preferenze | null = null;
export function leggiPref(): Preferenze {
  if (pref) return pref;
  try { pref = JSON.parse(localStorage.getItem(PREF) || '{}'); } catch { pref = {}; }
  return pref!;
}
export function scriviPref(p: Partial<Preferenze>) {
  pref = { ...leggiPref(), ...p };
  try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch { /* noop */ }
  listeners.forEach((l) => l());
}
export function usePref(): Preferenze {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, leggiPref);
}
