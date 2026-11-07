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
export interface AzioneSegno {
  tipo: 'aggiungi' | 'rimuovi';
  segno: SegnoOriginale;
  posizione: number;
}
export interface StoriaSegniOriginali {
  indietro: AzioneSegno[];
  avanti: AzioneSegno[];
}
export interface LetturaOriginale {
  pagina: number;
  segni: SegnoOriginale[];
  storiaSegni?: StoriaSegniOriginali;
}

const LIMITE_STORIA_SEGNI = 50;

/** I vecchi backup permettono di annullare gli ultimi segni già presenti. */
export function cronologiaSegni(lettura?: LetturaOriginale): StoriaSegniOriginali {
  if (lettura?.storiaSegni) return {
    indietro: lettura.storiaSegni.indietro.slice(-LIMITE_STORIA_SEGNI),
    avanti: lettura.storiaSegni.avanti.slice(-LIMITE_STORIA_SEGNI),
  };
  const segni = lettura?.segni ?? [];
  const inizio = Math.max(0, segni.length - LIMITE_STORIA_SEGNI);
  return { indietro: segni.slice(inizio).map((segno, i) => ({ tipo: 'aggiungi', segno, posizione: inizio + i })), avanti: [] };
}

function eseguiAzioneSegno(segni: SegnoOriginale[], azione: AzioneSegno, inversa = false): SegnoOriginale[] {
  const aggiunge = (azione.tipo === 'aggiungi') !== inversa;
  const posizione = segni.findIndex((segno) => segno.id === azione.segno.id);
  if (aggiunge) {
    if (posizione >= 0) return segni;
    const prossimi = [...segni];
    prossimi.splice(Math.max(0, Math.min(segni.length, azione.posizione)), 0, azione.segno);
    return prossimi;
  }
  if (posizione < 0) return segni;
  return [...segni.slice(0, posizione), ...segni.slice(posizione + 1)];
}

/** Applica una nuova modifica senza mutare il documento precedente; una modifica nuova chiude il ramo redo. */
export function applicaAzioneSegno(lettura: LetturaOriginale, azione: AzioneSegno): LetturaOriginale {
  const segni = eseguiAzioneSegno(lettura.segni, azione);
  if (segni === lettura.segni) return lettura;
  const storia = cronologiaSegni(lettura);
  return { ...lettura, segni, storiaSegni: { indietro: [...storia.indietro, azione].slice(-LIMITE_STORIA_SEGNI), avanti: [] } };
}

/** null significa che non esiste un'azione applicabile nella direzione richiesta. */
export function spostaCronologiaSegni(lettura: LetturaOriginale, direzione: 'indietro' | 'avanti'): LetturaOriginale | null {
  const storia = cronologiaSegni(lettura);
  const pila = storia[direzione];
  const azione = pila[pila.length - 1];
  if (!azione) return null;
  const segni = eseguiAzioneSegno(lettura.segni, azione, direzione === 'indietro');
  if (segni === lettura.segni) return null;
  const altra = direzione === 'indietro' ? 'avanti' : 'indietro';
  return { ...lettura, segni, storiaSegni: {
    ...storia, [direzione]: pila.slice(0, -1), [altra]: [...storia[altra], azione].slice(-LIMITE_STORIA_SEGNI),
  } };
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
