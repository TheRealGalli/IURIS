// Progressi di studio salvati nel browser (localStorage), uno per materia.
import { useSyncExternalStore } from 'react';
import type { Card } from 'ts-fsrs';
import { isoDi, oggiISO } from './util';
import { applicaAzioneSegno, normalizzaSegno, paginaValida, spostaCronologiaSegni, type DocumentoOriginale, type LetturaOriginale, type SegnoOriginale } from './originali';
import { chiaveExtraValida, leggiBackup, preparaBackup, slugBackupValido, type BackupDati, type RiepilogoBackup } from './backup-dati';

export type { RiepilogoBackup } from './backup-dati';

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

function persisti(slug: string, next: Progresso): boolean {
  mem.set(slug, next);
  let salvato = true;
  try { localStorage.setItem(key(slug), JSON.stringify(next)); } catch { salvato = false; }
  listeners.forEach((l) => l());
  return salvato;
}

export function aggiorna(slug: string, fn: (p: Progresso) => Progresso | void) {
  const draft: Progresso = structuredClone(leggi(slug));
  return persisti(slug, fn(draft) ?? draft);
}

/** Cambiare pagina o segni non copia carte FSRS, statistiche o gli altri documenti. */
function aggiornaOriginale(slug: string, doc: DocumentoOriginale,
  modifica: (lettura: LetturaOriginale | undefined) => LetturaOriginale | undefined): boolean {
  if (doc.materia !== slug) throw new Error('Documento di un’altra materia');
  const prev = leggi(slug);
  const prima = prev.originali?.[doc.id];
  const lettura = modifica(prima);
  const next = lettura === prima ? prev : { ...prev, originali: { ...prev.originali, [doc.id]: lettura! } };
  // Anche un nuovo tentativo sulla stessa pagina deve poter salvare modifiche rimaste in memoria per quota piena.
  return persisti(slug, next);
}

export function salvaPaginaOriginale(slug: string, doc: DocumentoOriginale, pagina: number): boolean {
  return aggiornaOriginale(slug, doc, (lettura) => ({ ...lettura, pagina: paginaValida(pagina, doc.pagine), segni: lettura?.segni ?? [] }));
}

export function aggiungiSegnoOriginale(slug: string, doc: DocumentoOriginale, segno: Omit<SegnoOriginale, 'id' | 'creata'>): { id: string; salvato: boolean } {
  if (doc.materia !== slug) throw new Error('Documento di un’altra materia');
  const valido = normalizzaSegno(segno, doc.pagine);
  const id = crypto.randomUUID();
  const nuovo = { ...valido, id, creata: new Date().toISOString() };
  const salvato = aggiornaOriginale(slug, doc, (precedente) => {
    const lettura = precedente ?? { pagina: valido.pagina, segni: [] };
    return applicaAzioneSegno(lettura, { tipo: 'aggiungi', segno: nuovo, posizione: lettura.segni.length });
  });
  return { id, salvato };
}

export function rimuoviSegnoOriginale(slug: string, doc: DocumentoOriginale, id: string): boolean {
  return aggiornaOriginale(slug, doc, (lettura) => {
    if (!lettura) return lettura;
    const posizione = lettura.segni.findIndex((segno) => segno.id === id);
    return posizione < 0 ? lettura : applicaAzioneSegno(lettura, { tipo: 'rimuovi', segno: lettura.segni[posizione], posizione });
  });
}

function spostaStoriaOriginale(slug: string, doc: DocumentoOriginale, direzione: 'indietro' | 'avanti'): { eseguito: boolean; salvato: boolean } {
  let eseguito = false;
  const salvato = aggiornaOriginale(slug, doc, (lettura) => {
    if (!lettura) return lettura;
    const prossima = spostaCronologiaSegni(lettura, direzione);
    eseguito = prossima !== null;
    return prossima ?? lettura;
  });
  return { eseguito, salvato };
}

export const annullaSegnoOriginale = (slug: string, doc: DocumentoOriginale) => spostaStoriaOriginale(slug, doc, 'indietro');
export const ripristinaSegnoOriginale = (slug: string, doc: DocumentoOriginale) => spostaStoriaOriginale(slug, doc, 'avanti');

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

/** Raccoglie anche materie non più nel catalogo e modifiche rimaste solo in memoria. */
function datiCompleti(): BackupDati {
  const materie: Record<string, Progresso> = Object.fromEntries(mem);
  const sessioni: Record<string, unknown> = {};
  const altriDati: Record<string, string> = {};
  let preferenze: Preferenze;
  try {
    const storage = localStorage;
    const chiavi = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null);
    for (const k of chiavi) {
      if (!k.startsWith('iuris:v1:')) continue;
      const raw = storage.getItem(k);
      if (raw === null) continue;
      if (k.startsWith('iuris:v1:prog:')) {
        const slug = k.slice('iuris:v1:prog:'.length);
        if (!slugBackupValido(slug)) throw new Error('Identificativo materia non valido');
        if (!mem.has(slug)) materie[slug] = JSON.parse(raw);
      } else if (k.startsWith('iuris:v1:sessione:')) {
        const slug = k.slice('iuris:v1:sessione:'.length);
        if (!slugBackupValido(slug)) throw new Error('Identificativo materia non valido');
        const sessione = JSON.parse(raw);
        if (sessione !== null) sessioni[slug] = sessione;
      } else if (chiaveExtraValida(k)) altriDati[k] = raw;
    }
    preferenze = pref ?? JSON.parse(storage.getItem(PREF) ?? '{}');
  } catch { throw new Error('Impossibile leggere tutti i dati del browser: il backup non è stato creato'); }
  for (const slug of Object.keys(sessioni)) if (!materie[slug]) materie[slug] = vuoto();
  return { formato: 'iuris-backup', versione: 1, esportato: new Date().toISOString(), materie, preferenze, sessioni, altriDati };
}

export function riepilogoBackup(): RiepilogoBackup {
  return preparaBackup(datiCompleti()).riepilogo;
}

export function esportaTutto(): string {
  return JSON.stringify(preparaBackup(datiCompleti()).dati, null, 1);
}

export function ispezionaBackup(json: string, materiaLegacy?: string): RiepilogoBackup {
  return leggiBackup(json, materiaLegacy).riepilogo;
}

/** Prima valida l'intero file; cache e preferenze cambiano solo dopo tutte le scritture riuscite. */
export function importaTutto(json: string, materiaLegacy?: string): RiepilogoBackup {
  const { dati, riepilogo } = leggiBackup(json, materiaLegacy);
  const scritture = new Map<string, string | null>();
  for (const [slug, progresso] of Object.entries(dati.materie)) scritture.set(key(slug), JSON.stringify(progresso));
  // Per le materie ripristinate anche l'assenza di una sessione è uno stato da ripristinare.
  for (const slug of new Set([...Object.keys(dati.materie), ...Object.keys(dati.sessioni)])) {
    scritture.set(`iuris:v1:sessione:${slug}`, dati.sessioni[slug] === undefined ? null : JSON.stringify(dati.sessioni[slug]));
  }
  if (dati.preferenze !== undefined) scritture.set(PREF, JSON.stringify(dati.preferenze));
  for (const [k, value] of Object.entries(dati.altriDati)) scritture.set(k, value);
  let storage: Storage;
  const precedenti = new Map<string, string | null>();
  try {
    storage = localStorage;
    for (const k of scritture.keys()) precedenti.set(k, storage.getItem(k));
  } catch { throw new Error('Il browser non consente di leggere i dati: importazione annullata'); }
  const tentate: string[] = [];
  try {
    for (const [k, value] of scritture) {
      tentate.push(k);
      if (value === null) storage.removeItem(k); else storage.setItem(k, value);
    }
  } catch {
    let recuperoFallito = false;
    const modificate: string[] = [];
    for (const k of tentate) {
      try { if (storage.getItem(k) !== precedenti.get(k)) modificate.push(k); } catch { recuperoFallito = true; }
    }
    // Libera prima le nuove allocazioni, così il ripristino dei valori precedenti rientra nella quota iniziale.
    for (const k of modificate) { try { storage.removeItem(k); } catch { recuperoFallito = true; } }
    for (const k of modificate) {
      const value = precedenti.get(k)!;
      if (value !== null) try { storage.setItem(k, value); } catch { recuperoFallito = true; }
    }
    throw new Error(recuperoFallito
      ? 'Importazione interrotta. Il browser ha impedito anche il ripristino completo dei dati sul dispositivo. Non chiudere la pagina e conserva il file di backup'
      : 'Il browser non ha consentito il salvataggio. Importazione annullata: i dati precedenti sono stati conservati');
  }
  for (const [slug, progresso] of Object.entries(dati.materie)) mem.set(slug, progresso);
  if (dati.preferenze !== undefined) pref = dati.preferenze;
  listeners.forEach((listener) => { try { listener(); } catch { /* un componente non deve invalidare un ripristino già concluso */ } });
  return riepilogo;
}
