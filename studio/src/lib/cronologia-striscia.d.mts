export interface EventoStriscia { id: string; anno: number; data: string; titolo: string; descrizione: string; tipo: string; concetti?: string[] }
export const SOGLIA_VOCE_SPECIFICA: number;
export const MAX_VUOTO: number;
export function puntiScala(anni: number[], k: number, maxVuoto?: number): { A: number[]; X: number[]; vuoti: number[] };
export function attiCitati(e: EventoStriscia): Set<string>;
export function frequenzaVoci(eventi: EventoStriscia[]): Map<string, number>;
export function correlati(a: EventoStriscia, b: EventoStriscia, freq: Map<string, number>): boolean;
export function gruppiCorrelati<E extends EventoStriscia>(eventi: E[], freq: Map<string, number>): E[][];
export function disponiEtichette<E extends EventoStriscia>(eventi: E[], X: number[], indice: Map<number, number>, opzioni: {
  bordo: number; etichettaW: number; maxCorsie: number; passo?: number; distacco?: number; freq: Map<string, number>;
}): { etichette: { eventi: E[]; x: number; corsia: number }[]; corsie: number };
