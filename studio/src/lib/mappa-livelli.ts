// Livello dei nodi della mappa per unità, con la stessa logica del pannello Concetti e delle statistiche.
import type { Domanda, NodoMappa } from './types';
import type { Progresso } from './store';
import { livello, padronanza, type Livello } from './srs';

/**
 * Domande di ogni nodo: quelle del suo concetto più quelle di tutti i discendenti, senza doppioni.
 * Così un nodo di raccordo («5 significati di diritto romano») si accende quando si risponde sui suoi figli.
 */
export function domandeNodiMappa<N extends NodoMappa>(radice: N, perConcetto: Map<string, Domanda[]>): Map<N, Domanda[]> {
  const out = new Map<N, Domanda[]>();
  const visita = (n: N): Map<string, Domanda> => {
    const qs = new Map<string, Domanda>();
    for (const q of (n.concetto ? perConcetto.get(n.concetto) : undefined) ?? []) qs.set(q.id, q);
    for (const f of (n.figli ?? []) as N[]) for (const [id, q] of visita(f)) qs.set(id, q);
    out.set(n, [...qs.values()]);
    return qs;
  };
  visita(radice);
  return out;
}

/** `ignoto` se nessuna domanda del nodo è stata vista; altrimenti media sulle sole domande viste. */
export function livelloNodo(p: Progresso, domande: Domanda[] | undefined, now = new Date()): { livello: Livello; totali: number; viste: number } {
  const m = padronanza(p, domande, now);
  return { livello: m.totali ? livello(m.media, m.viste) : 'ignoto', totali: m.totali, viste: m.viste };
}
