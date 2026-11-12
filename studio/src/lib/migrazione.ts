// Migrazione dei progressi quando i contenuti di una materia cambiano struttura (id di lezioni e domande) o quando
// due materie diventano una (Diritto costituzionale A-L e Martines → `diritto-costituzionale`, novembre 2026).
// Qui solo funzioni pure, senza archivio: le usa store.ts e le prova scripts/check-migrazione.mjs.
import type { Migrazione, FonteMigrazione, TabellaMigrazione } from './types';
import type { Progresso } from './store';

export type { Migrazione, FonteMigrazione, TabellaMigrazione } from './types';

/** Versione dei contenuti su cui sono stati salvati i progressi: senza il campo, i dati sono di prima delle migrazioni. */
export const versioneDi = (p: Progresso) => p.versioneContenuto ?? 1;

const ugualiTutto = (d: FonteMigrazione) => d.lezioni === 'uguali' && d.domande === 'uguali';
const senzaTabella = (d: FonteMigrazione) => d.lezioni === 'tabella' || d.domande === 'tabella';
/** Il manifest porta solo la descrizione della migrazione: le tabelle arrivano con corso.json. */
export const haTabelle = (m: Migrazione) => m.da.every((d) => !senzaTabella(d));

/** Progressi che contengono id di lezioni o domande (cioè che una tabella cambierebbe). */
const haId = (p: Progresso) => Object.keys(p.lezioni ?? {}).length > 0 || Object.keys(p.carte ?? {}).length > 0
  || Object.keys(p.esiti ?? {}).length > 0 || !!p.ultimaLezione;

/** id → nuovo id; `null` = scartato. Gli id di unità (`uNN-…`) assenti dalla tabella si scartano; gli altri
 *  (schede del glossario, della cronologia: derivano da voci ed eventi, che non cambiano id) restano. */
function mappa(tab: TabellaMigrazione): (id: string) => string | null {
  if (tab === 'uguali' || tab === 'tabella') return (id) => id;
  return (id) => Object.prototype.hasOwnProperty.call(tab, id) ? tab[id] ?? null : /^u\d+[-_]/.test(id) ? null : id;
}

const quando = (s?: string) => { const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? t : -Infinity; };
const piuRecente = (a?: string, b?: string) => (quando(b) > quando(a) ? b : a) ?? b;

type Lez = Progresso['lezioni'][string];
type Carta = Progresso['carte'][string];
type Esito = Progresso['esiti'][string];
type Giorno = Progresso['giorni'][string];

function fondiLezione(a: Lez, b: Lez): Lez {
  const r: Lez = { ...b, ...a };
  const studiata = piuRecente(a.studiata, b.studiata), letta = piuRecente(a.letta, b.letta);
  if (studiata) r.studiata = studiata; else delete r.studiata;
  if (letta) r.letta = letta; else delete r.letta;
  const v = a.verificaIniziale ?? b.verificaIniziale;
  if (v) r.verificaIniziale = v; else delete r.verificaIniziale;
  return r;
}
/** La carta ripassata più di recente (a parità, quella con più ripetizioni). */
const cartaPiuAvanzata = (a: Carta, b: Carta): Carta => {
  const qa = quando(a.last_review), qb = quando(b.last_review);
  return qb > qa || (qb === qa && b.reps > a.reps) ? b : a;
};
/** L'esito con più risposte (a parità, il più recente): niente somme, così fondere due volte non raddoppia. */
const esitoPiuAvanzato = (a: Esito, b: Esito): Esito => (b.n > a.n || (b.n === a.n && quando(b.quando) > quando(a.quando)) ? b : a);
const giornoMassimo = (a: Giorno, b: Giorno): Giorno => ({ ...b, ...a,
  lette: Math.max(a.lette, b.lette), risposte: Math.max(a.risposte, b.risposte),
  corrette: Math.max(a.corrette, b.corrette), secondi: Math.max(a.secondi, b.secondi) });

function unisci<T>(a: Record<string, T> = {}, b: Record<string, T> = {}, fondi: (x: T, y: T) => T): Record<string, T> {
  const r: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) r[k] = k in r ? fondi(r[k], v) : v;
  return r;
}

/** Rinomina gli id di lezioni e domande secondo la tabella di una fonte. */
export function rinomina(p: Progresso, d: Pick<FonteMigrazione, 'lezioni' | 'domande'>): Progresso {
  const r: Progresso = structuredClone(p);
  if (d.lezioni === 'uguali' && d.domande === 'uguali') return r;
  const lez = mappa(d.lezioni), dom = mappa(d.domande);
  const lezioni: Progresso['lezioni'] = {};
  for (const [id, l] of Object.entries(r.lezioni ?? {})) {
    const nuovo = lez(id);
    if (!nuovo) continue;
    const copia = { ...l };
    if (copia.verificaIniziale) {
      const domande = [...new Set(copia.verificaIniziale.domande.map(dom).filter((x): x is string => !!x))];
      copia.verificaIniziale = { ...copia.verificaIniziale, domande: domande.slice(0, 6) };
    }
    lezioni[nuovo] = lezioni[nuovo] ? fondiLezione(lezioni[nuovo], copia) : copia;
  }
  const rinominaMappa = <T>(m: Record<string, T> = {}, fondi: (x: T, y: T) => T) => {
    const out: Record<string, T> = {};
    for (const [id, v] of Object.entries(m)) {
      const nuovo = dom(id);
      if (nuovo) out[nuovo] = nuovo in out ? fondi(out[nuovo], v) : v;
    }
    return out;
  };
  r.lezioni = lezioni;
  r.carte = rinominaMappa(r.carte, cartaPiuAvanzata);
  r.esiti = rinominaMappa(r.esiti, esitoPiuAvanzato);
  if (r.ultimaLezione) {
    const nuova = lez(r.ultimaLezione);
    if (nuova) r.ultimaLezione = nuova; else delete r.ultimaLezione;
  }
  return r;
}

/** Fonde due progressi della stessa materia (id già uguali): in caso di conflitto vince il dato più avanzato o
 *  più recente; a parità vince `a`. Fondere due volte gli stessi dati dà lo stesso risultato. */
export function fondi(a: Progresso, b: Progresso): Progresso {
  const r: Progresso = { ...structuredClone(b), ...structuredClone(a) };
  r.lezioni = unisci(a.lezioni, b.lezioni, fondiLezione);
  r.carte = unisci(a.carte, b.carte, cartaPiuAvanzata);
  r.esiti = unisci(a.esiti, b.esiti, esitoPiuAvanzato);
  r.giorni = unisci(a.giorni, b.giorni, giornoMassimo);
  const esame = a.esame ?? b.esame;
  if (esame) r.esame = esame; else delete r.esame;
  const ultima = a.ultimaLezione ?? b.ultimaLezione;
  if (ultima) r.ultimaLezione = ultima; else delete r.ultimaLezione;
  if (!a.nuovePerGiornoPersonalizzato && b.nuovePerGiornoPersonalizzato) {
    r.nuovePerGiorno = b.nuovePerGiorno; r.nuovePerGiornoPersonalizzato = true;
  }
  if (a.originali || b.originali) r.originali = unisci(structuredClone(a.originali), structuredClone(b.originali),
    (x, y) => (y.segni.length > x.segni.length ? y : x));
  return r;
}

export interface EsitoMigrazione {
  stato: 'nulla' | 'rimandata' | 'fatta';
  progresso?: Progresso;
  /** materie di origine fuse (le loro chiavi vanno tolte dopo aver salvato) */
  assorbite: string[];
  /** i progressi della materia stessa sono stati rinominati con una tabella (la sessione salvata non vale più) */
  rinominata: boolean;
}

/**
 * Calcola la migrazione dei progressi verso `materia`. `progressi` = progressi salvati per slug (assenti = mai salvati).
 * Se serve una tabella non ancora caricata (`"tabella"`, dal manifest) non fa nulla: `rimandata`.
 */
export function migraProgressi(materia: string, m: Migrazione, progressi: Record<string, Progresso | null | undefined>): EsitoMigrazione {
  const t = progressi[materia] ?? null;
  const propria = m.da.find((d) => d.materia === materia);
  const daRinominare = !!t && !!propria && !ugualiTutto(propria) && versioneDi(t) < m.versione
    && versioneDi(t) <= (propria.finoAVersione ?? Infinity) && haId(t);
  const altre = m.da.filter((d) => d.materia !== materia && progressi[d.materia]);
  if ((daRinominare && senzaTabella(propria!)) || altre.some(senzaTabella)) return { stato: 'rimandata', assorbite: [], rinominata: false };
  if (!altre.length && (!t || versioneDi(t) >= m.versione)) return { stato: 'nulla', assorbite: [], rinominata: false };
  let r: Progresso | null = t ? (daRinominare ? rinomina(t, propria!) : structuredClone(t)) : null;
  for (const d of altre) {
    const p = rinomina(progressi[d.materia]!, d);
    r = r ? fondi(r, p) : p;
  }
  r!.versioneContenuto = m.versione;
  return { stato: 'fatta', progresso: r!, assorbite: altre.map((d) => d.materia), rinominata: daRinominare };
}

/** Per il manifest: la stessa migrazione senza le tabelle (al loro posto `"tabella"`). */
export function descrizioneMigrazione(m: Migrazione): Migrazione {
  const d = (t: TabellaMigrazione): TabellaMigrazione => (t === 'uguali' ? 'uguali' : 'tabella');
  return { versione: m.versione, da: m.da.map((x) => ({ ...x, lezioni: d(x.lezioni), domande: d(x.domande) })) };
}

/** Controllo di forma (sync e app): una migrazione malformata non si applica. */
export function migrazioneValida(v: unknown): v is Migrazione {
  const o = v as Migrazione;
  const tab = (t: unknown) => t === 'uguali' || t === 'tabella'
    || (!!t && typeof t === 'object' && !Array.isArray(t) && Object.values(t).every((x) => x === null || typeof x === 'string'));
  return !!o && typeof o === 'object' && Number.isSafeInteger(o.versione) && o.versione >= 2 && Array.isArray(o.da)
    && o.da.every((d) => !!d && typeof d.materia === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.materia)
      && (d.finoAVersione === undefined || Number.isSafeInteger(d.finoAVersione)) && tab(d.lezioni) && tab(d.domande));
}
