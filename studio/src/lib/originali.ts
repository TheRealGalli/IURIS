import catalogo from './originali-catalogo.json';

export interface DocumentoOriginale {
  id: string;
  materia: string;
  titolo: string;
  descrizione: string;
  file: string;
  pagine: number;
  sha256: string;
}

export interface RettangoloSegno { x: number; y: number; w: number; h: number }
export interface SegnoOriginale {
  id: string;
  pagina: number;
  testo: string;
  rettangoli: RettangoloSegno[];
  tipo: 'evidenziato' | 'sottolineato';
  colore: 'giallo' | 'verde' | 'rosa';
  creata: string;
}
export interface LetturaOriginale {
  pagina: number;
  segni: SegnoOriginale[];
}

export const ORIGINALI: DocumentoOriginale[] = catalogo;
export const originaliMateria = (slug: string) => ORIGINALI.filter((d) => d.materia === slug);
export const paginaValida = (n: number, pagine: number) => Math.max(1, Math.min(pagine, Math.round(n) || 1));

/** Coordinate proporzionali alla pagina: i segni restano allineati cambiando zoom o schermo. */
export function normalizzaSegno(segno: Omit<SegnoOriginale, 'id' | 'creata'>, pagine: number): Omit<SegnoOriginale, 'id' | 'creata'> {
  if (!Number.isInteger(segno.pagina) || segno.pagina < 1 || segno.pagina > pagine) throw new Error('Pagina non valida');
  if (!['evidenziato', 'sottolineato'].includes(segno.tipo) || !['giallo', 'verde', 'rosa'].includes(segno.colore)) throw new Error('Segno non valido');
  const rettangoli = segno.rettangoli.filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite)).map((r) => {
    const x = Math.max(0, Math.min(1, r.x)), y = Math.max(0, Math.min(1, r.y));
    return { x, y, w: Math.max(0, Math.min(1 - x, r.w)), h: Math.max(0, Math.min(1 - y, r.h)) };
  }).filter((r) => r.w > 0 && r.h > 0);
  const testo = segno.testo.trim().slice(0, 10000);
  if (!rettangoli.length || rettangoli.length > 1000 || !testo) throw new Error('Seleziona prima un passaggio del testo');
  return { pagina: segno.pagina, testo, rettangoli, tipo: segno.tipo, colore: segno.colore };
}
