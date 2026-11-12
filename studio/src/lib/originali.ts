import catalogo from './originali-catalogo.json';

export interface DocumentoOriginale {
  id: string;
  materia: string;
  titolo: string;
  descrizione: string;
  file?: string;
  pagine: number;
  sha256?: string;
  /** Documento solo testo, senza PDF pubblicato: testo ripulito in letture-src (sha256 è la sua impronta). */
  testoFonte?: string;
  /** Il testo è già in Markdown (titoli `### `, elenchi «• », tabelle): l'estrazione lo divide solo ai capoversi. */
  testoMarkdown?: boolean;
  tipoFonte?: 'manuale-ricostruito';
}

/** Colori dei segni, nell'ordine delle scorciatoie 1–6. Non hanno un significato fisso: lo decide chi studia. */
export const COLORI_SEGNO = ['giallo', 'verde', 'rosa', 'azzurro', 'viola', 'arancio'] as const;
export type ColoreSegno = typeof COLORI_SEGNO[number];
export interface RettangoloSegno { x: number; y: number; w: number; h: number }
export interface AncoraTesto {
  edizione: number;
  blocco: string;
  inizio: number;
  fine: number;
  citazione: string;
  prefisso: string;
  suffisso: string;
}
export interface SegnoOriginale {
  id: string;
  pagina: number;
  testo: string;
  rettangoli: RettangoloSegno[];
  tipo: 'evidenziato' | 'sottolineato';
  colore: ColoreSegno;
  creata: string;
  /** Gli indici si riferiscono al textContent del blocco, non al Markdown o ai pixel. */
  ancoreTesto?: AncoraTesto[];
}
export interface AzioneSegno {
  tipo: 'aggiungi' | 'rimuovi';
  segno: SegnoOriginale;
  posizione: number;
  /** Una passata della gomma può rimuovere più segni con un solo Annulla. */
  altri?: { segno: SegnoOriginale; posizione: number }[];
}
export interface StoriaSegniOriginali {
  indietro: AzioneSegno[];
  avanti: AzioneSegno[];
}
export interface LetturaOriginale {
  pagina: number;
  segni: SegnoOriginale[];
  storiaSegni?: StoriaSegniOriginali;
  sezioneTesto?: string;
  bloccoTesto?: string;
  /** Segni già portati qui da un documento sostituito (id del documento vecchio → id dei suoi segni già trattati,
   *  anche quelli non ricreati): la migrazione (lib/migrazione-segni.ts) non li ripete. */
  segniMigrati?: Record<string, string[]>;
}

export const idSezioneTestoValido = (id: unknown): id is string => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]{0,159}$/i.test(id);

/** Valida gli ancoraggi prima di scrivere, mantenendo citazione e offset esatti. */
export function normalizzaAncoreTesto(valore: AncoraTesto[]): AncoraTesto[] {
  if (!Array.isArray(valore) || !valore.length || valore.length > 1000) throw new Error('Ancoraggio del testo non valido');
  let caratteri = 0;
  const ancore = valore.map((a) => {
    if (!a || !Number.isSafeInteger(a.edizione) || a.edizione < 1 || !idSezioneTestoValido(a.blocco)
      || !Number.isSafeInteger(a.inizio) || !Number.isSafeInteger(a.fine) || a.inizio < 0 || a.fine <= a.inizio || a.fine > 10_000_000
      || typeof a.citazione !== 'string' || !a.citazione.trim() || a.citazione.length !== a.fine - a.inizio
      || typeof a.prefisso !== 'string' || a.prefisso.length > 80 || typeof a.suffisso !== 'string' || a.suffisso.length > 80) throw new Error('Ancoraggio del testo non valido');
    caratteri += a.citazione.length;
    return { edizione: a.edizione, blocco: a.blocco, inizio: a.inizio, fine: a.fine, citazione: a.citazione, prefisso: a.prefisso, suffisso: a.suffisso };
  });
  if (caratteri > 10000 || new Set(ancore.map((a) => `${a.edizione}:${a.blocco}:${a.inizio}:${a.fine}`)).size !== ancore.length) throw new Error('Ancoraggio del testo non valido');
  return ancore;
}

/** Confronto semantico usato anche per controllare la cronologia importata. */
export function segniIdentici(a: SegnoOriginale, b: SegnoOriginale): boolean {
  if (a.id !== b.id || a.testo !== b.testo || a.creata !== b.creata || a.pagina !== b.pagina || a.tipo !== b.tipo || a.colore !== b.colore
    || a.rettangoli.length !== b.rettangoli.length || a.rettangoli.some((r, i) => ['x', 'y', 'w', 'h'].some((k) => r[k as keyof typeof r] !== b.rettangoli[i][k as keyof typeof r]))) return false;
  const aa = a.ancoreTesto ?? [], bb = b.ancoreTesto ?? [];
  return aa.length === bb.length && aa.every((r, i) => r.edizione === bb[i].edizione && r.blocco === bb[i].blocco && r.inizio === bb[i].inizio && r.fine === bb[i].fine
    && r.citazione === bb[i].citazione && r.prefisso === bb[i].prefisso && r.suffisso === bb[i].suffisso);
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

export const elementiAzioneSegno = (azione: AzioneSegno) => [{ segno: azione.segno, posizione: azione.posizione }, ...(azione.altri ?? [])];

function eseguiAzioneSegno(segni: SegnoOriginale[], azione: AzioneSegno, inversa = false): SegnoOriginale[] {
  const aggiunge = (azione.tipo === 'aggiungi') !== inversa;
  const elementi = elementiAzioneSegno(azione), ids = new Set(elementi.map((e) => e.segno.id));
  const presenti = new Set(segni.map((segno) => segno.id));
  if (ids.size !== elementi.length) return segni;
  if (aggiunge) {
    if (elementi.some((e) => presenti.has(e.segno.id))) return segni;
    const prossimi = [...segni];
    for (const e of elementi.sort((a, b) => a.posizione - b.posizione)) prossimi.splice(Math.max(0, Math.min(prossimi.length, e.posizione)), 0, e.segno);
    return prossimi;
  }
  if (elementi.some((e) => !presenti.has(e.segno.id))) return segni;
  return segni.filter((segno) => !ids.has(segno.id));
}

/** La gomma rimuove il segno intero toccato dalla selezione, su una sola pagina. */
export function segnoNellaSelezione(segno: SegnoOriginale, pagina: number, rettangoli: RettangoloSegno[]): boolean {
  return segno.pagina === pagina && segno.rettangoli.some((a) => rettangoli.some((b) =>
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-7
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > Math.min(a.h, b.h) * .25));
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

export const ORIGINALI = catalogo as DocumentoOriginale[];
export const originaliMateria = (slug: string) => ORIGINALI.filter((d) => d.materia === slug);
export const paginaValida = (n: number, pagine: number) => Math.max(1, Math.min(pagine, Math.round(n) || 1));

/** Coordinate proporzionali alla pagina: i segni restano allineati cambiando zoom o schermo. */
export function normalizzaSegno(segno: Omit<SegnoOriginale, 'id' | 'creata'>, pagine: number): Omit<SegnoOriginale, 'id' | 'creata'> {
  if (!Number.isInteger(segno.pagina) || segno.pagina < 1 || segno.pagina > pagine) throw new Error('Pagina non valida');
  if (!['evidenziato', 'sottolineato'].includes(segno.tipo) || !(COLORI_SEGNO as readonly string[]).includes(segno.colore)) throw new Error('Segno non valido');
  const rettangoli = segno.rettangoli.filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite)).map((r) => {
    const x = Math.max(0, Math.min(1, r.x)), y = Math.max(0, Math.min(1, r.y));
    return { x, y, w: Math.max(0, Math.min(1 - x, r.w)), h: Math.max(0, Math.min(1 - y, r.h)) };
  }).filter((r) => r.w > 0 && r.h > 0);
  const testo = segno.testo.trim().slice(0, 10000);
  const ancoreTesto = segno.ancoreTesto === undefined ? undefined : normalizzaAncoreTesto(segno.ancoreTesto);
  if ((!rettangoli.length && !ancoreTesto) || rettangoli.length > 1000 || !testo) throw new Error('Seleziona prima un passaggio del testo');
  return { pagina: segno.pagina, testo, rettangoli, tipo: segno.tipo, colore: segno.colore, ...(ancoreTesto ? { ancoreTesto } : {}) };
}
