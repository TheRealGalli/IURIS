// Ripetizione spaziata (FSRS) e calcolo della padronanza: tutto in locale, senza AI.
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import type { Indice, RequisitiDomanda } from './data';
import type { Domanda, Lezione } from './types';
import { aggiorna, DOMANDE_VERIFICA_INIZIALE, giornoDi, haAttivita, type CartaSalvata, type Progresso } from './store';
import { giorniTra, isoDi, oggiISO } from './util';

export { Rating };
export type Voto = Grade; // 1 di nuovo · 2 difficile · 3 bene · 4 facile

// FSRS standard, come in Anki: obiettivo 90% di ricordo; le domande nuove passano dai passi brevi (1 e 10 minuti)
// prima di entrare nel ciclo a giorni
const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 });

const daSalvata = (c: CartaSalvata): Card => ({
  ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined,
});
const daSalvare = (c: Card): CartaSalvata => ({
  ...c, due: c.due.toISOString(), last_review: c.last_review?.toISOString(),
});

export function registraRisposta(slug: string, domanda: string, voto: Voto, now = new Date()) {
  aggiorna(slug, (p) => {
    const salvata = p.carte[domanda];
    const prima = salvata ? daSalvata(salvata) : createEmptyCard(now);
    // La prima introduzione rimane stabile anche dopo più ripetizioni nello stesso giorno.
    // Per le vecchie carte con una sola risposta conosciamo ancora quella data.
    const introdotta = salvata?.introdotta ?? (!salvata ? now.toISOString() : salvata.reps === 1 ? p.esiti[domanda]?.quando : undefined);
    const { card } = scheduler.next(prima, now, voto);
    p.carte[domanda] = { ...daSalvare(card), ...(introdotta ? { introdotta } : {}) };
    const e = p.esiti[domanda] ?? { ultimo: voto, n: 0, giuste: 0, quando: '' };
    e.ultimo = voto; e.n += 1; if (voto >= 3) e.giuste += 1; e.quando = now.toISOString();
    p.esiti[domanda] = e;
    const g = giornoDi(p, isoDi(now));
    g.risposte += 1; if (voto >= 3) g.corrette += 1;
  });
}

const FATTORE: Record<number, number> = { 1: 0.3, 2: 0.65, 3: 0.95, 4: 1 };

/** 0–1: quanto la domanda è "sicura" adesso. null se mai vista. */
export function padronanzaDomanda(p: Progresso, id: string, now = new Date()): number | null {
  const c = p.carte[id];
  if (!c) return null;
  const r = scheduler.retrievability(daSalvata(c), now);
  const voto = p.esiti[id]?.ultimo ?? 3;
  // La stabilità pesa poco: una risposta giusta e recente conta già come «la sai»; col tempo cala il ricordo (r).
  const stab = Math.min(1, c.stability / 21);
  return Math.max(0, Math.min(1, r * (FATTORE[voto] ?? 0.9) * (0.8 + 0.2 * stab)));
}

/**
 * `valore`: media su tutte le domande (le non viste contano 0), cioè avanzamento complessivo.
 * `media`: media sulle sole domande viste, cioè quanto sai ciò che hai già provato: decide il livello (li sai, così così…).
 */
export function padronanza(p: Progresso, domande: Domanda[] | undefined, now = new Date()) {
  if (!domande?.length) return { valore: null as number | null, media: null as number | null, viste: 0, totali: 0 };
  let s = 0, viste = 0;
  for (const q of domande) {
    const m = padronanzaDomanda(p, q.id, now);
    if (m != null) { s += m; viste++; }
  }
  return { valore: viste ? s / domande.length : 0, media: viste ? s / viste : null, viste, totali: domande.length };
}

export type Livello = 'ignoto' | 'debole' | 'medio' | 'forte';
export function livello(v: number | null, viste = 1): Livello {
  if (v == null || viste === 0) return 'ignoto';
  if (v < 0.4) return 'debole';
  if (v < 0.75) return 'medio';
  return 'forte';
}

export type StatoLezione = 'nuova' | 'studiata' | 'in-ripasso' | 'padroneggiata';
export function statoLezione(idx: Indice, p: Progresso, l: Lezione): StatoLezione {
  const studiata = !!p.lezioni[l.id]?.studiata;
  const m = padronanza(p, idx.domandePerLezione.get(l.id));
  if (m.valore != null && m.valore >= 0.75) return 'padroneggiata';
  if (m.viste >= Math.ceil(m.totali / 2) && m.totali > 0) return 'in-ripasso';
  if (studiata) return 'studiata';
  return 'nuova';
}

export const ETICHETTA_STATO: Record<StatoLezione, string> = {
  nuova: 'Da studiare', studiata: 'Studiata', 'in-ripasso': 'In ripasso', padroneggiata: 'Padroneggiata',
};

export function pagineStudiate(idx: Indice, p: Progresso): number {
  const set = new Set<string>();
  for (const l of idx.lezioni) {
    if (!p.lezioni[l.id]?.studiata || !l.pagine) continue;
    for (let x = l.pagine[0]; x <= l.pagine[1]; x++) set.add(`${l.fonte ?? ''}:${x}`);
  }
  return set.size;
}

/** Porta le verifiche ancora nuove davanti al resto, conservando l'ordine interno e le ripetizioni. */
export function ordinaRipasso(domande: Domanda[], verifiche: Domanda[]): Domanda[] {
  const prioritarie = new Set(verifiche.map((q) => q.id));
  if (!prioritarie.size) return domande;
  const ordinate = [...domande.filter((q) => prioritarie.has(q.id)), ...domande.filter((q) => !prioritarie.has(q.id))];
  return ordinate.every((q, i) => q === domande[i]) ? domande : ordinate;
}

export type FamigliaRipasso = 'lezioni' | 'glossario' | 'cronologia';
export const famigliaDomanda = (q: Domanda): FamigliaRipasso => q.glossario || q.inversa ? 'glossario' : q.cronologia ? 'cronologia' : 'lezioni';
const conteggiVuoti = (): Record<FamigliaRipasso, number> => ({ lezioni: 0, glossario: 0, cronologia: 0 });

/** I prerequisiti precalcolati non includono mai altre lezioni solo perché vicine nell'indice. */
export function domandeSbloccate(idx: Indice, p: Progresso): Domanda[] {
  const studiate = new Set(idx.lezioni.filter((l) => p.lezioni[l.id]?.studiata).map((l) => l.id));
  const corsoCompleto = idx.lezioni.length > 0 && studiate.size === idx.lezioni.length;
  const unitaComplete = new Set(idx.corso.unita.filter((u) => u.lezioni.length > 0 && u.lezioni.every((l) => studiate.has(l.id))).map((u) => u.id));
  const soddisfatto = (r: RequisitiDomanda): boolean => r.tutti ? r.tutti.every(soddisfatto)
    : r.lezioni.length ? r.lezioni.some((id) => studiate.has(id)) : corsoCompleto || r.unita.some((id) => unitaComplete.has(id));
  return [...idx.domandaById.values()].filter((q) => {
    if (p.carte[q.id]) return true; // Le carte provate volontariamente continuano il proprio ciclo FSRS.
    const r = idx.requisitiDomanda.get(q.id);
    if (!r) return corsoCompleto;
    return soddisfatto(r);
  });
}

/** Mix 3:1:1 stabile; la rotazione continua fra giorni senza debiti accumulati dai vecchi registri. */
function mescolaFamiglie(nuove: Domanda[], idx: Indice, p: Progresso, limite: number): Domanda[] {
  const giro: FamigliaRipasso[] = ['lezioni', 'glossario', 'lezioni', 'cronologia', 'lezioni'];
  const posizioni = conteggiVuoti();
  const pool = { lezioni: [] as Domanda[], glossario: [] as Domanda[], cronologia: [] as Domanda[] };
  let turno = Object.keys(p.carte).filter((id) => idx.domandaById.has(id)).length % giro.length;
  for (const q of nuove) pool[famigliaDomanda(q)].push(q);
  const out: Domanda[] = [];
  while (out.length < limite) {
    let aggiunta = false;
    for (let tentativo = 0; tentativo < giro.length; tentativo++) {
      const f = giro[turno]; turno = (turno + 1) % giro.length;
      if (posizioni[f] >= pool[f].length) continue;
      out.push(pool[f][posizioni[f]++]); aggiunta = true; break;
    }
    if (!aggiunta) break;
  }
  return out;
}

/** Tutte le famiglie condividono il budget; le sei verifiche fisse restano l'unica eccezione. */
export function ripassoDiOggi(idx: Indice, p: Progresso, now = new Date()) {
  const scadute: Domanda[] = [];
  const sbloccate = domandeSbloccate(idx, p);
  const nuove = sbloccate.filter((q) => !p.carte[q.id]);
  const sbloccatePerFamiglia = conteggiVuoti();
  for (const q of sbloccate) {
    sbloccatePerFamiglia[famigliaDomanda(q)]++;
    if (p.carte[q.id] && new Date(p.carte[q.id].due) <= now) scadute.push(q);
  }
  const oggi = isoDi(now);
  const giorno = (data?: string) => {
    if (!data) return null;
    const d = new Date(data);
    return Number.isFinite(d.getTime()) ? isoDi(d) : null;
  };
  const nuoveFatteOggi = Object.entries(p.carte)
    .filter(([id, c]) => giorno(c.introdotta ?? (c.reps === 1 ? p.esiti[id]?.quando : undefined)) === oggi).length;
  const verificaOggi = new Set<string>();
  for (const l of idx.lezioni) {
    const qs = (idx.domandePerLezione.get(l.id) ?? []).filter((q) => !q.inversa);
    const lezione = p.lezioni[l.id];
    if (lezione?.studiata) {
      const verifica = lezione.verificaIniziale;
      // Compatibilità con le lezioni segnate oggi prima dell'introduzione della riserva.
      const ids = verifica ? verifica.giorno === oggi ? verifica.domande : []
        : giorno(lezione.studiata) === oggi ? qs.slice(0, DOMANDE_VERIFICA_INIZIALE).map((q) => q.id) : [];
      for (const id of ids) verificaOggi.add(id);
    }
  }
  // prima le domande che sai peggio: ultimo voto più basso, poi quelle che stai dimenticando di più
  const peso = (q: Domanda) => ({ voto: p.esiti[q.id]?.ultimo ?? 3, r: scheduler.retrievability(daSalvata(p.carte[q.id]), now) as number });
  scadute.sort((a, b) => { const x = peso(a), y = peso(b); return x.voto - y.voto || x.r - y.r; });
  const limite = Math.max(0, p.nuovePerGiorno - nuoveFatteOggi);
  const ordinarie = mescolaFamiglie(nuove, idx, p, limite);
  const incluse = new Set(ordinarie.map((q) => q.id));
  const extra = nuove.filter((q) => verificaOggi.has(q.id) && !incluse.has(q.id));
  const selezionate = [...ordinarie, ...extra];
  // Sono prioritarie solo le verifiche non ancora introdotte: una risposta le riporta al normale ciclo FSRS.
  const verifiche = selezionate.filter((q) => verificaOggi.has(q.id));
  const nuovePerFamiglia = conteggiVuoti();
  for (const q of selezionate) nuovePerFamiglia[famigliaDomanda(q)]++;
  return { scadute, nuove: selezionate, verifiche, nuoveTotali: nuove.length,
    nuoveFatteOggi, extraNuove: extra.length, inAttesa: nuove.length - selezionate.length,
    nuovePerFamiglia, sbloccatePerFamiglia };
}

export function prossimaScadenza(p: Progresso): Date | null {
  let min: number | null = null;
  for (const c of Object.values(p.carte)) {
    const t = +new Date(c.due);
    if (min == null || t < min) min = t;
  }
  return min == null ? null : new Date(min);
}

/** Piano verso l'esame: quante lezioni al giorno per finire entro la data, tenendo l'ultimo 20% per il ripasso. */
export function pianoEsame(idx: Indice, p: Progresso) {
  const daStudiare = idx.lezioni.filter((l) => !p.lezioni[l.id]?.studiata);
  if (!p.esame) return { giorni: null as number | null, perGiorno: null as number | null, daStudiare, oggi: daStudiare.slice(0, 2) };
  const giorni = giorniTra(oggiISO(), p.esame);
  const giorniStudio = Math.max(1, Math.floor(giorni * 0.8));
  const perGiorno = daStudiare.length ? Math.ceil(daStudiare.length / giorniStudio) : 0;
  const giaOggi = idx.lezioni.filter((l) => p.lezioni[l.id]?.studiata?.startsWith(oggiISO())).length;
  return { giorni, perGiorno, daStudiare, oggi: daStudiare.slice(0, Math.max(0, perGiorno - giaOggi)) };
}

export function serieGiorni(p: Progresso): number {
  let n = 0;
  const d = new Date();
  const attivo = (iso: string) => haAttivita(p.giorni[iso]);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!attivo(iso(d))) d.setDate(d.getDate() - 1); // oggi non ancora iniziato: la serie resta viva
  while (attivo(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
