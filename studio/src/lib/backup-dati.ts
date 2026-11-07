import type { Preferenze, Progresso } from './store';
import { elementiAzioneSegno, type AzioneSegno, type LetturaOriginale, type SegnoOriginale } from './originali';

type Oggetto = Record<string, unknown>;
export interface BackupDati {
  formato: 'iuris-backup'; versione: 1; esportato?: string;
  materie: Record<string, Progresso>;
  preferenze?: Preferenze;
  sessioni: Record<string, unknown>;
  altriDati: Record<string, string>;
}
export interface RiepilogoBackup {
  tipo: 'totale' | 'materia'; esportato?: string; materie: string[];
  segni: number; documenti: number; sessioni: number; preferenze: boolean; altriDati: number;
}

const errore = (dove: string): never => { throw new Error(`Backup non valido: ${dove}`); };
const oggetto = (v: unknown, dove: string): Oggetto => v && typeof v === 'object' && !Array.isArray(v) ? v as Oggetto : errore(dove);
const testo = (v: unknown, dove: string, vuoto = false): string => typeof v === 'string' && (vuoto || v.trim().length > 0) ? v : errore(dove);
const numero = (v: unknown, dove: string, intero = false): number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && (!intero || Number.isSafeInteger(v)) ? v : errore(dove);
const array = (v: unknown, dove: string): unknown[] => Array.isArray(v) ? v : errore(dove);
const opzionale = (o: Oggetto, k: string, fn: (v: unknown, dove: string) => unknown, dove: string) => { if (o[k] !== undefined) fn(o[k], `${dove}.${k}`); };
const intero = (v: unknown, dove: string) => numero(v, dove, true);
const positivo = (v: unknown, dove: string) => intero(v, dove) > 0 ? v : errore(dove);
const booleano = (v: unknown, dove: string) => typeof v === 'boolean' ? v : errore(dove);
const scelta = (v: unknown, valori: unknown[], dove: string) => valori.includes(v) ? v : errore(dove);
export const slugBackupValido = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 160;
const slug = (v: unknown, dove: string) => slugBackupValido(v) ? v : errore(dove);
const data = (v: unknown, dove: string) => {
  const s = testo(v, dove);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s) || !Number.isFinite(Date.parse(s))) errore(dove);
  return s;
};
const giorno = (v: unknown, dove: string) => {
  const s = testo(v, dove);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) errore(dove);
  return s;
};
const mappa = (v: unknown, dove: string, fn: (v: unknown, dove: string) => unknown) => {
  const o = oggetto(v, dove);
  for (const [k, value] of Object.entries(o)) { testo(k, dove); fn(value, `${dove}[${k}]`); }
  return o;
};

function segno(v: unknown, dove: string): SegnoOriginale {
  const s = oggetto(v, dove);
  testo(s.id, `${dove}.id`); positivo(s.pagina, `${dove}.pagina`); data(s.creata, `${dove}.creata`);
  const contenuto = testo(s.testo, `${dove}.testo`);
  if (contenuto.length > 10000) errore(`${dove}.testo troppo lungo`);
  scelta(s.tipo, ['evidenziato', 'sottolineato'], `${dove}.tipo`);
  scelta(s.colore, ['giallo', 'verde', 'rosa'], `${dove}.colore`);
  const rettangoli = array(s.rettangoli, `${dove}.rettangoli`);
  if (!rettangoli.length || rettangoli.length > 1000) errore(`${dove}.rettangoli`);
  for (const value of rettangoli) {
    const r = oggetto(value, `${dove}.rettangolo`);
    const x = numero(r.x, dove), y = numero(r.y, dove), w = numero(r.w, dove), h = numero(r.h, dove);
    if (!w || !h || x + w > 1 + 1e-9 || y + h > 1 + 1e-9) errore(`${dove}.coordinate`);
  }
  return s as unknown as SegnoOriginale;
}

function lettura(v: unknown, dove: string) {
  const l = oggetto(v, dove);
  positivo(l.pagina, `${dove}.pagina`);
  const segni = array(l.segni, `${dove}.segni`).map((s, i) => segno(s, `${dove}.segni[${i}]`));
  if (new Set(segni.map((s) => s.id)).size !== segni.length) errore(`${dove}: ID dei segni duplicati`);
  if (l.storiaSegni === undefined) return;
  const storia = oggetto(l.storiaSegni, `${dove}.storiaSegni`);
  const pile = ['indietro', 'avanti'] as const;
  for (const direzione of pile) for (const v of array(storia[direzione], `${dove}.${direzione}`)) {
    const a = oggetto(v, `${dove}.azione`);
    scelta(a.tipo, ['aggiungi', 'rimuovi'], `${dove}.azione.tipo`);
    intero(a.posizione, `${dove}.azione.posizione`); segno(a.segno, `${dove}.azione.segno`);
    if (a.altri !== undefined) {
      if (a.tipo !== 'rimuovi') errore(`${dove}.azione.tipo`);
      for (const value of array(a.altri, `${dove}.azione.altri`)) {
        const altro = oggetto(value, `${dove}.azione.altri`);
        intero(altro.posizione, `${dove}.azione.posizione`); segno(altro.segno, `${dove}.azione.segno`);
      }
      const elementi = elementiAzioneSegno(a as unknown as AzioneSegno);
      if (new Set(elementi.map((e) => e.segno.id)).size !== elementi.length || new Set(elementi.map((e) => e.posizione)).size !== elementi.length) errore(`${dove}: segni duplicati nella cancellazione`);
    }
  }
  if ((storia.indietro as unknown[]).length + (storia.avanti as unknown[]).length > 50) errore(`${dove}: cronologia troppo lunga`);
  // Una cronologia importata deve essere ripercorribile, senza duplicare o perdere segni.
  for (const direzione of pile) {
    const presenti = [...segni];
    for (const a of [...storia[direzione] as AzioneSegno[]].reverse()) {
      const aggiunge = (a.tipo === 'aggiungi') !== (direzione === 'indietro');
      const elementi = elementiAzioneSegno(a).sort((a, b) => aggiunge ? a.posizione - b.posizione : b.posizione - a.posizione);
      for (const e of elementi) {
        const i = presenti.findIndex((s) => s.id === e.segno.id);
        if (aggiunge) {
          if (i >= 0 || e.posizione > presenti.length) errore(`${dove}: cronologia incoerente`);
          presenti.splice(e.posizione, 0, e.segno);
        } else {
          const s = presenti[i];
          if (!s || i !== e.posizione || s.testo !== e.segno.testo || s.creata !== e.segno.creata || s.pagina !== e.segno.pagina || s.tipo !== e.segno.tipo || s.colore !== e.segno.colore
            || s.rettangoli.length !== e.segno.rettangoli.length || s.rettangoli.some((r, k) => ['x', 'y', 'w', 'h'].some((c) => r[c as keyof typeof r] !== e.segno.rettangoli[k][c as keyof typeof r]))) errore(`${dove}: cronologia incoerente`);
          presenti.splice(i, 1);
        }
      }
    }
  }
}

export function validaProgresso(v: unknown, dove: string): Progresso {
  const p = oggetto(v, dove);
  if (p.versione !== 1) errore(`${dove}.versione non supportata`);
  intero(p.nuovePerGiorno, `${dove}.nuovePerGiorno`);
  mappa(p.lezioni, `${dove}.lezioni`, (v, d) => {
    const l = oggetto(v, d); opzionale(l, 'studiata', data, d); opzionale(l, 'letta', data, d);
    if (l.verificaIniziale !== undefined) {
      const verifica = oggetto(l.verificaIniziale, d); giorno(verifica.giorno, d);
      const ids = array(verifica.domande, d); ids.forEach((id) => testo(id, d));
      if (ids.length > 6 || new Set(ids).size !== ids.length) errore(`${d}.verificaIniziale`);
    }
  });
  mappa(p.carte, `${dove}.carte`, (v, d) => {
    const c = oggetto(v, d); data(c.due, `${d}.due`);
    for (const k of ['stability', 'difficulty', 'scheduled_days']) numero(c[k], `${d}.${k}`);
    for (const k of ['reps', 'lapses']) intero(c[k], `${d}.${k}`);
    scelta(c.state, [0, 1, 2, 3], `${d}.state`);
    opzionale(c, 'learning_steps', intero, d); opzionale(c, 'elapsed_days', numero, d);
    opzionale(c, 'last_review', data, d); opzionale(c, 'introdotta', data, d);
  });
  mappa(p.esiti, `${dove}.esiti`, (v, d) => {
    const e = oggetto(v, d); scelta(e.ultimo, [1, 2, 3, 4], `${d}.ultimo`);
    const n = intero(e.n, `${d}.n`), giuste = intero(e.giuste, `${d}.giuste`);
    if (giuste > n) errore(d); if (n || e.quando !== '') data(e.quando, `${d}.quando`);
  });
  mappa(p.giorni, `${dove}.giorni`, (v, d) => {
    const g = oggetto(v, d);
    for (const k of ['lette', 'risposte', 'corrette']) intero(g[k], `${d}.${k}`);
    numero(g.secondi, `${d}.secondi`); if ((g.corrette as number) > (g.risposte as number)) errore(d);
  });
  for (const k of Object.keys(p.giorni as Oggetto)) giorno(k, `${dove}.giorni`);
  opzionale(p, 'esame', giorno, dove); opzionale(p, 'ultimaLezione', testo, dove);
  if (p.originali !== undefined) mappa(p.originali, `${dove}.originali`, lettura);
  return p as unknown as Progresso;
}

function domanda(v: unknown, dove: string) {
  const q = oggetto(v, dove);
  testo(q.id, `${dove}.id`); testo(q.lezione, dove, true); testo(q.unita, dove, true);
  scelta(q.livello, ['base', 'medio', 'avanzato'], `${dove}.livello`);
  if (q.concetti !== undefined) array(q.concetti, dove).forEach((id) => testo(id, dove));
  opzionale(q, 'inversa', testo, dove); opzionale(q, 'fonteNome', testo, dove); opzionale(q, 'spiegazione', (v, d) => testo(v, d, true), dove);
  if (q.pagine !== undefined) {
    const p = array(q.pagine, dove); if (p.length !== 2 || (positivo(p[0], dove) as number) > (positivo(p[1], dove) as number)) errore(`${dove}.pagine`);
  }
  const testi = (...keys: string[]) => keys.forEach((k) => testo(q[k], `${dove}.${k}`, true));
  switch (q.tipo) {
    case 'flashcard': testi('domanda', 'risposta'); break;
    case 'multipla': {
      testi('domanda'); const opzioni = array(q.opzioni, dove); opzioni.forEach((v) => testo(v, dove, true));
      if (!opzioni.length || intero(q.corretta, dove) >= opzioni.length) errore(`${dove}.corretta`); break;
    }
    case 'verofalso': testi('affermazione', 'spiegazione'); booleano(q.vero, dove); break;
    case 'completa': testi('testo'); break;
    case 'aperta': testi('domanda', 'traccia'); array(q.punti, dove).forEach((v) => {
      const p = oggetto(v, dove); testo(p.testo, dove, true); array(p.chiavi, dove).forEach((v) => testo(v, dove, true));
    }); break;
    case 'ordina': testi('consegna'); array(q.elementi, dove).forEach((v) => testo(v, dove, true)); break;
    case 'abbina': testi('consegna'); array(q.coppie, dove).forEach((v) => {
      const coppia = array(v, dove); if (coppia.length !== 2) errore(dove); coppia.forEach((v) => testo(v, dove, true));
    }); break;
    default: errore(`${dove}.tipo`);
  }
}

export function validaSessione(v: unknown, dove: string) {
  const sessione = oggetto(v, dove), s = oggetto(sessione.s, `${dove}.s`);
  testo(sessione.origine, `${dove}.origine`, true); data(sessione.quando, `${dove}.quando`);
  testo(s.titolo, `${dove}.titolo`); booleano(s.registra, dove); opzionale(s, 'orale', booleano, dove);
  array(s.domande, dove).forEach((q, i) => domanda(q, `${dove}.domande[${i}]`));
  const coda = array(sessione.coda, `${dove}.coda`); coda.forEach((q, i) => domanda(q, `${dove}.coda[${i}]`));
  const i = intero(sessione.i, `${dove}.i`), voti = array(sessione.voti, `${dove}.voti`);
  voti.forEach((v) => scelta(v, [1, 2, 3, 4], dove));
  if (i > coda.length || voti.length !== i) errore(`${dove}: posizione e risposte incoerenti`);
}

function validaPreferenze(v: unknown): Preferenze {
  const p = oggetto(v, 'preferenze');
  opzionale(p, 'materia', slug, 'preferenze'); opzionale(p, 'tema', (v, d) => scelta(v, ['auto', 'chiaro', 'scuro'], d), 'preferenze');
  opzionale(p, 'voce', booleano, 'preferenze'); return p as Preferenze;
}

export function chiaveExtraValida(k: string): boolean {
  return k.startsWith('iuris:v1:') && k.length > 'iuris:v1:'.length && k.length <= 320
    && k !== 'iuris:v1:pref' && !k.startsWith('iuris:v1:prog:') && !k.startsWith('iuris:v1:sessione:');
}

/** Controlla anche campi futuri conservati nel JSON, senza accettare numeri non finiti o chiavi pericolose. */
function jsonSicuro(v: unknown, profondita = 0): void {
  if (profondita > 100) errore('struttura troppo annidata');
  if (typeof v === 'number' && !Number.isFinite(v)) errore('numero non finito');
  if (v && typeof v === 'object') for (const [k, value] of Object.entries(v)) {
    if (['__proto__', 'prototype', 'constructor'].includes(k)) errore('chiave non consentita');
    jsonSicuro(value, profondita + 1);
  }
}

export function preparaBackup(v: unknown, materiaLegacy?: string): { dati: BackupDati; riepilogo: RiepilogoBackup } {
  jsonSicuro(v); const o = oggetto(v, 'contenuto');
  const totale = o.formato === 'iuris-backup';
  let dati: BackupDati;
  if (totale) {
    if (o.versione !== 1) errore('versione del backup non supportata');
    const materie = mappa(o.materie, 'materie', validaProgresso);
    const sessioni = mappa(o.sessioni ?? {}, 'sessioni', validaSessione);
    const altriDati = oggetto(o.altriDati ?? {}, 'altriDati');
    for (const [k, v] of Object.entries(altriDati)) if (!chiaveExtraValida(k) || typeof v !== 'string') errore('altriDati');
    dati = { formato: 'iuris-backup', versione: 1, materie: materie as Record<string, Progresso>,
      preferenze: validaPreferenze(o.preferenze), sessioni, altriDati: altriDati as Record<string, string> };
  } else {
    if (o.formato !== undefined) errore('formato non riconosciuto');
    const materia = slug(o.materia ?? materiaLegacy, 'materia del vecchio backup mancante');
    dati = { formato: 'iuris-backup', versione: 1, materie: { [materia]: validaProgresso(o.progresso ?? o, materia) }, sessioni: {}, altriDati: {} };
  }
  for (const id of [...Object.keys(dati.materie), ...Object.keys(dati.sessioni)]) slug(id, 'identificativo materia');
  if (o.esportato !== undefined) dati.esportato = data(o.esportato, 'data di esportazione');
  const documenti = Object.values(dati.materie).flatMap((p) => Object.values(p.originali ?? {})) as LetturaOriginale[];
  return { dati, riepilogo: { tipo: totale ? 'totale' : 'materia', ...(dati.esportato ? { esportato: dati.esportato } : {}),
    materie: [...new Set([...Object.keys(dati.materie), ...Object.keys(dati.sessioni)])].sort(),
    segni: documenti.reduce((n, l) => n + l.segni.length, 0), documenti: documenti.length,
    sessioni: Object.keys(dati.sessioni).length, preferenze: dati.preferenze !== undefined, altriDati: Object.keys(dati.altriDati).length } };
}

export function leggiBackup(json: string, materiaLegacy?: string) {
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new Error('Il file non contiene un backup JSON valido'); }
  return preparaBackup(value, materiaLegacy);
}
