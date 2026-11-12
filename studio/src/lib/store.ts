// Progressi di studio salvati nel browser (localStorage), uno per materia.
import { useSyncExternalStore } from 'react';
import { archivio, apriArchivioDemo, chiudiArchivioDemo, inDemo } from './archivio';
import type { Card } from 'ts-fsrs';
import { isoDi, oggiISO } from './util';
import { applicaAzioneSegno, idSezioneTestoValido, normalizzaSegno, paginaValida, segnoNellaSelezione, spostaCronologiaSegni, type DocumentoOriginale, type LetturaOriginale, type RettangoloSegno, type SegnoOriginale } from './originali';
import { chiaveExtraValida, leggiBackup, preparaBackup, slugBackupValido, type BackupDati, type RiepilogoBackup } from './backup-dati';
import { haTabelle, migraProgressi, migrazioneValida, type Migrazione } from './migrazione';

export type { RiepilogoBackup } from './backup-dati';

export type CartaSalvata = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string; introdotta?: string };

export const DOMANDE_VERIFICA_INIZIALE = 6;
export const NUOVE_PER_GIORNO_DEFAULT = 35;

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
  nuovePerGiornoPersonalizzato?: boolean;
  ultimaLezione?: string;
  originali?: Record<string, LetturaOriginale>;
  /** Versione dei contenuti della materia su cui valgono gli id (vedi lib/migrazione.ts); assente = 1. */
  versioneContenuto?: number;
}

const vuoto = (): Progresso => ({ versione: 1, lezioni: {}, carte: {}, esiti: {}, giorni: {}, nuovePerGiorno: NUOVE_PER_GIORNO_DEFAULT });
/** Il vecchio default25 migra una volta; un25 scelto esplicitamente dopo l'update resta25. */
function migraLimiteNuove(p: Progresso): Progresso {
  return p.nuovePerGiorno === 25 && p.nuovePerGiornoPersonalizzato !== true
    ? { ...p, nuovePerGiorno: NUOVE_PER_GIORNO_DEFAULT } : p;
}
const key = (slug: string) => `iuris:v1:prog:${slug}`;

const mem = new Map<string, Progresso>();
const listeners = new Set<() => void>();
/** Migrazioni note per materia (dal manifest, poi con le tabelle da corso.json). */
const migrazioni = new Map<string, Migrazione>();

function leggi(slug: string): Progresso {
  if (mem.has(slug)) return mem.get(slug)!;
  let p = vuoto(), salvato = false;
  try {
    const raw = archivio().getItem(key(slug));
    if (raw) { p = migraLimiteNuove({ ...vuoto(), ...JSON.parse(raw) }); salvato = true; }
  } catch { /* storage non disponibile: si lavora in memoria */ }
  // Progressi nuovi nascono già sulla versione corrente dei contenuti: nessuna tabella vecchia li toccherà.
  const versione = migrazioni.get(slug)?.versione;
  if (!salvato && versione) p.versioneContenuto = versione;
  mem.set(slug, p);
  return p;
}

/** Progressi salvati di una materia (in memoria o nel browser), `null` se non ce ne sono. */
function salvati(slug: string): Progresso | null {
  if (mem.has(slug)) return mem.get(slug)!;
  try {
    const raw = archivio().getItem(key(slug));
    return raw ? migraLimiteNuove({ ...vuoto(), ...JSON.parse(raw) }) : null;
  } catch { return null; }
}

/**
 * Registra la migrazione dei progressi verso `materia` (dal manifest senza tabelle, da corso.json con le tabelle) e
 * la esegue. Idempotente; se serve una tabella non ancora caricata rimanda (si riprova con corso.json).
 */
export function registraMigrazione(materia: string, m: Migrazione | undefined): 'nulla' | 'rimandata' | 'fatta' {
  if (!migrazioneValida(m)) return 'nulla';
  const prima = migrazioni.get(materia);
  if (!prima || m.versione > prima.versione || (m.versione === prima.versione && haTabelle(m))) migrazioni.set(materia, m);
  return eseguiMigrazione(materia);
}

/** Riesegue le migrazioni note: dopo un ripristino o la fine della demo (dati vecchi rientrati nell'archivio). */
export function eseguiMigrazioni() {
  for (const materia of migrazioni.keys()) eseguiMigrazione(materia);
}

function eseguiMigrazione(materia: string): 'nulla' | 'rimandata' | 'fatta' {
  const m = migrazioni.get(materia);
  if (!m || inDemo()) return 'nulla';
  const origini = m.da.map((d) => d.materia).filter((s) => s !== materia);
  // La materia scelta non esiste più: si apre quella in cui è confluita (non serve la tabella).
  const p = leggiPref();
  if (p.materia && origini.includes(p.materia)) scriviPref({ materia });
  const progressi = Object.fromEntries([materia, ...origini].map((s) => [s, salvati(s)]));
  const esito = migraProgressi(materia, m, progressi);
  if (esito.stato !== 'fatta') return esito.stato;
  const sessione = (s: string) => `iuris:v1:sessione:${s}`;
  let storage: Storage | null = null;
  try { storage = archivio(); } catch { /* si lavora in memoria */ }
  const salvato = persisti(materia, esito.progresso!);
  if (!storage || !salvato) return 'fatta';  // le origini restano: al prossimo avvio si rifonde (senza doppioni)
  try {
    // La sessione in corso di una materia rinominata ha domande vecchie: si scarta. Quella di una materia con
    // gli stessi id passa alla materia nuova, se lì non ce n'è già una.
    if (esito.rinominata) storage.removeItem(sessione(materia));
    for (const s of esito.assorbite) {
      const d = m.da.find((x) => x.materia === s)!;
      const sua = storage.getItem(sessione(s));
      if (sua !== null && d.lezioni === 'uguali' && d.domande === 'uguali' && storage.getItem(sessione(materia)) === null) storage.setItem(sessione(materia), sua);
      storage.removeItem(sessione(s));
      storage.removeItem(key(s));
      mem.delete(s);
    }
  } catch { /* al prossimo avvio */ }
  listeners.forEach((l) => l());
  return 'fatta';
}

function persisti(slug: string, next: Progresso): boolean {
  mem.set(slug, next);
  let salvato = true;
  try { archivio().setItem(key(slug), JSON.stringify(next)); } catch { salvato = false; }
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

export function salvaSezioneTestoOriginale(slug: string, doc: DocumentoOriginale, sezione: string, blocco?: string): boolean {
  if (!idSezioneTestoValido(sezione) || (blocco !== undefined && !idSezioneTestoValido(blocco))) throw new Error('Sezione del testo non valida');
  return aggiornaOriginale(slug, doc, (lettura) => {
    const prossima = { ...lettura, pagina: lettura?.pagina ?? 1, segni: lettura?.segni ?? [], sezioneTesto: sezione };
    if (blocco !== undefined) prossima.bloccoTesto = blocco;
    else if (lettura?.sezioneTesto !== sezione) delete prossima.bloccoTesto;
    return prossima;
  });
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

export function aggiungiSegnoTestoOriginale(slug: string, doc: DocumentoOriginale, segno: Omit<SegnoOriginale, 'id' | 'creata' | 'rettangoli'> & { ancoreTesto: NonNullable<SegnoOriginale['ancoreTesto']> }): { id: string; salvato: boolean } {
  return aggiungiSegnoOriginale(slug, doc, { ...segno, rettangoli: [] });
}

/** Cancellazione unica per la gomma HTML: stessi ID e stessa cronologia del PDF. */
export function rimuoviSegniOriginali(slug: string, doc: DocumentoOriginale, ids: string[]): { rimossi: number; salvato: boolean } {
  const richiesti = new Set(ids);
  let rimossi = 0;
  const salvato = aggiornaOriginale(slug, doc, (lettura) => {
    if (!lettura) return lettura;
    const toccati = lettura.segni.map((segno, posizione) => ({ segno, posizione })).filter(({ segno }) => richiesti.has(segno.id));
    if (!toccati.length) return lettura;
    rimossi = toccati.length;
    const [primo, ...altri] = toccati;
    return applicaAzioneSegno(lettura, { tipo: 'rimuovi', ...primo, ...(altri.length ? { altri } : {}) });
  });
  return { rimossi, salvato };
}

export function rimuoviSegnoOriginale(slug: string, doc: DocumentoOriginale, id: string): boolean {
  return aggiornaOriginale(slug, doc, (lettura) => {
    if (!lettura) return lettura;
    const posizione = lettura.segni.findIndex((segno) => segno.id === id);
    return posizione < 0 ? lettura : applicaAzioneSegno(lettura, { tipo: 'rimuovi', segno: lettura.segni[posizione], posizione });
  });
}

export function cancellaSegniOriginale(slug: string, doc: DocumentoOriginale, pagina: number, rettangoli: RettangoloSegno[]): { rimossi: number; salvato: boolean } {
  let rimossi = 0;
  const salvato = aggiornaOriginale(slug, doc, (lettura) => {
    if (!lettura) return lettura;
    const toccati = lettura.segni.map((segno, posizione) => ({ segno, posizione }))
      .filter(({ segno }) => segnoNellaSelezione(segno, pagina, rettangoli));
    if (!toccati.length) return lettura;
    rimossi = toccati.length;
    const [primo, ...altri] = toccati;
    return applicaAzioneSegno(lettura, { tipo: 'rimuovi', ...primo, ...(altri.length ? { altri } : {}) });
  });
  return { rimossi, salvato };
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
  aggiorna(slug, (p) => { p.nuovePerGiorno = Math.max(0, Math.round(Number.isFinite(n) ? n : NUOVE_PER_GIORNO_DEFAULT)); p.nuovePerGiornoPersonalizzato = true; });
}

export function esporta(slug: string): string {
  return JSON.stringify({ materia: slug, esportato: new Date().toISOString(), progresso: leggi(slug) }, null, 1);
}

export function importa(slug: string, json: string) {
  const data = JSON.parse(json);
  const p = data.progresso ?? data;
  if (p?.versione !== 1) throw new Error('file non riconosciuto');
  aggiorna(slug, () => migraLimiteNuove({ ...vuoto(), ...p }));
  eseguiMigrazioni();
}

export function azzera(slug: string) {
  // La versione dei contenuti resta: i progressi nuovi usano già gli id correnti.
  aggiorna(slug, (p) => ({ ...vuoto(), ...(p.versioneContenuto ? { versioneContenuto: p.versioneContenuto } : {}) }));
}

// Preferenze generali
const PREF = 'iuris:v1:pref';
export interface Preferenze {
  /** Corso di studio scelto (id in `data/corsi.ts`); senza valore vale il corso predefinito. */
  corso?: string;
  materia?: string; tema?: 'auto' | 'chiaro' | 'scuro'; voce?: boolean;
  /** Ultimo documento aperto negli Originali. `formatoOriginali` resta solo per leggere backup e preferenze precedenti: il lettore è sempre Testo. */
  originale?: string; formatoOriginali?: 'testo' | 'pdf';
}
let pref: Preferenze | null = null;
export function leggiPref(): Preferenze {
  if (pref) return pref;
  try { pref = JSON.parse(archivio().getItem(PREF) || '{}'); } catch { pref = {}; }
  return pref!;
}
export function scriviPref(p: Partial<Preferenze>) {
  pref = { ...leggiPref(), ...p };
  try { archivio().setItem(PREF, JSON.stringify(pref)); } catch { /* noop */ }
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
    const storage = archivio();
    const chiavi = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null);
    for (const k of chiavi) {
      if (!k.startsWith('iuris:v1:')) continue;
      const raw = storage.getItem(k);
      if (raw === null) continue;
      if (k.startsWith('iuris:v1:prog:')) {
        const slug = k.slice('iuris:v1:prog:'.length);
        if (!slugBackupValido(slug)) throw new Error('Identificativo materia non valido');
        if (!mem.has(slug)) materie[slug] = migraLimiteNuove(JSON.parse(raw));
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
  for (const [slug, progresso] of Object.entries(dati.materie)) dati.materie[slug] = migraLimiteNuove(progresso);
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
    storage = archivio();
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
  // Un backup di prima di una migrazione (id vecchi, materie confluite) si allinea subito ai contenuti correnti.
  try { eseguiMigrazioni(); } catch { /* i dati ripristinati restano: si migra al prossimo avvio */ }
  listeners.forEach((listener) => { try { listener(); } catch { /* un componente non deve invalidare un ripristino già concluso */ } });
  return riepilogo;
}

// Le viste vengono smontate prima del cambio di archivio: anche timer e cleanup
// del lettore completano le loro scritture nell'archivio a cui appartengono.
let archivioPersonale: { progressi: Map<string, Progresso>; preferenze: Preferenze } | null = null;
export function iniziaDemo(materia: string) {
  if (inDemo()) return;
  archivioPersonale = { progressi: new Map(mem), preferenze: leggiPref() };
  apriArchivioDemo(); mem.clear();
  pref = { ...archivioPersonale.preferenze, materia, voce: false };
  archivio().setItem(PREF, JSON.stringify(pref));
  listeners.forEach((l) => l());
}
export function finisciDemo() {
  if (!archivioPersonale) return;
  chiudiArchivioDemo(); mem.clear();
  for (const [slug, p] of archivioPersonale.progressi) mem.set(slug, p);
  pref = archivioPersonale.preferenze; archivioPersonale = null;
  eseguiMigrazioni();
  listeners.forEach((l) => l());
}
