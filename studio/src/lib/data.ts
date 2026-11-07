import { createContext, useContext } from 'react';
import type { Concetto, Corso, Domanda, Evento, Lezione, Manifest, Relazione, Unita } from './types';
import { creaDomandeGlossario, creaSchedeInverse } from './inverse';
import { creaDomandeCronologia } from './domande-eventi';

export async function fetchManifest(): Promise<Manifest> {
  const r = await fetch('content/manifest.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('manifest non trovato');
  return r.json();
}

export interface Indice {
  corso: Corso;
  unitaById: Map<string, Unita>;
  lezioni: Lezione[];
  lezioneById: Map<string, Lezione>;
  concettoById: Map<string, Concetto>;
  domandaById: Map<string, Domanda>;
  schedeInverse: Domanda[];
  domandeGlossario: Domanda[];
  domandeCronologia: Domanda[];
  requisitiDomanda: Map<string, RequisitiDomanda>;
  domandePerLezione: Map<string, Domanda[]>;
  domandePerConcetto: Map<string, Domanda[]>;
  relazioniPerConcetto: Map<string, Relazione[]>;
  eventiPerConcetto: Map<string, Evento[]>;
  /** pagine totali coperte dalle lezioni (unione) */
  pagineTotali: number;
}

export interface RequisitiDomanda { lezioni: string[]; unita: string[]; tutti?: RequisitiDomanda[] }

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v); else m.set(k, [v]);
}

export function indicizza(corso: Corso): Indice {
  const lezioni = corso.unita.flatMap((u) => u.lezioni);
  const schedeInverse = creaSchedeInverse(corso);
  const domandeGlossario = creaDomandeGlossario(corso, schedeInverse);
  const domandeCronologia = creaDomandeCronologia(corso);
  const domande = [...corso.domande, ...domandeGlossario, ...domandeCronologia];
  const domandePerLezione = new Map<string, Domanda[]>();
  const domandePerConcetto = new Map<string, Domanda[]>();
  for (const q of domande) {
    if (!q.glossario && !q.cronologia && !q.inversa) push(domandePerLezione, q.lezione, q);
    for (const c of q.concetti ?? []) push(domandePerConcetto, c, q);
  }
  const relazioniPerConcetto = new Map<string, Relazione[]>();
  for (const r of corso.relazioni) { push(relazioniPerConcetto, r.da, r); push(relazioniPerConcetto, r.a, r); }
  const eventiPerConcetto = new Map<string, Evento[]>();
  for (const e of corso.eventi) for (const c of e.concetti ?? []) push(eventiPerConcetto, c, e);
  const lessonIds = new Set(lezioni.map((l) => l.id));
  const riferimentiConcetti = new Map(corso.concetti.map((c) => [c.id, new Set(c.lezioni.filter((id) => lessonIds.has(id)))]));
  for (const l of lezioni) for (const id of l.concetti) riferimentiConcetti.get(id)?.add(l.id);
  for (const q of corso.domande) if (lessonIds.has(q.lezione)) for (const id of q.concetti ?? []) riferimentiConcetti.get(id)?.add(q.lezione);
  const requisitiDomanda = new Map<string, RequisitiDomanda>();
  for (const q of corso.domande) requisitiDomanda.set(q.id, { lezioni: lessonIds.has(q.lezione) ? [q.lezione] : [], unita: [q.unita] });
  for (const q of domandeGlossario) {
    const c = corso.concetti.find((c) => c.id === q.glossario)!;
    requisitiDomanda.set(q.id, { lezioni: [...riferimentiConcetti.get(c.id)!], unita: c.unita });
  }
  const requisitoEvento = (e: Evento): RequisitiDomanda => {
    const pertinenti = lezioni.filter((l) => l.unita === e.unita && (!e.fonteNome || l.fonteNome === e.fonteNome));
    const riferimenti = e.pagine ? pertinenti.filter((l) => l.pagine && l.pagine[0] <= e.pagine![1] && l.pagine[1] >= e.pagine![0])
      : pertinenti.filter((l) => (e.concetti ?? []).some((id) => riferimentiConcetti.get(id)?.has(l.id)));
    return { lezioni: riferimenti.map((l) => l.id), unita: [e.unita] };
  };
  const eventiById = new Map(corso.eventi.map((e) => [e.id, e]));
  for (const q of domandeCronologia) requisitiDomanda.set(q.id, q.eventiCronologia
    ? { lezioni: [], unita: [q.unita], tutti: q.eventiCronologia.map((id) => requisitoEvento(eventiById.get(id)!)) }
    : requisitoEvento(eventiById.get(q.cronologia!)!));
  const pagine = new Set<string>();
  for (const l of lezioni) if (l.pagine) for (let p = l.pagine[0]; p <= l.pagine[1]; p++) pagine.add(`${l.fonte ?? ''}:${p}`);
  return {
    corso,
    unitaById: new Map(corso.unita.map((u) => [u.id, u])),
    lezioni,
    lezioneById: new Map(lezioni.map((l) => [l.id, l])),
    concettoById: new Map(corso.concetti.map((c) => [c.id, c])),
    domandaById: new Map(domande.map((q) => [q.id, q])),
    schedeInverse, domandeGlossario, domandeCronologia, requisitiDomanda,
    domandePerLezione, domandePerConcetto, relazioniPerConcetto, eventiPerConcetto,
    pagineTotali: pagine.size,
  };
}

const cache = new Map<string, Promise<Indice>>();
export function caricaCorso(file: string): Promise<Indice> {
  if (!cache.has(file)) {
    cache.set(file, fetch(file, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`corso non trovato: ${file}`); return r.json(); })
      .then((c: Corso) => indicizza(c)));
  }
  return cache.get(file)!;
}

export const CorsoContext = createContext<Indice | null>(null);
export function useCorso(): Indice {
  const c = useContext(CorsoContext);
  if (!c) throw new Error('useCorso fuori dal CorsoContext');
  return c;
}

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"'’]/g, '').trim();

export function testoDomanda(q: Domanda): string {
  switch (q.tipo) {
    case 'verofalso': return q.affermazione;
    case 'completa': return q.testo.replace(/\{\{([^}]+)\}\}/g, '____');
    case 'ordina': case 'abbina': return q.consegna;
    default: return q.domanda;
  }
}
