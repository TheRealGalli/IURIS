// Tipi del corso generato da scripts/sync-content.mjs (formato in CONTENUTI.md).

export type Range = [number, number];

export interface MateriaInfo {
  slug: string;
  nome: string;
  breve?: string;
  colore?: string | null;
  disponibile: boolean;
  fonti: string[];
  file?: string;
  stats?: {
    unita: number; lezioni: number; pagine: number; paginePdf: number | null;
    concetti: number; eventi: number; domande: number;
  };
}
export interface Manifest {
  generatedAt: string;
  materie: MateriaInfo[];
}

export interface Lezione {
  id: string;
  unita: string;
  titolo: string;
  /** pagine del PDF degli appunti; manca nelle lezioni ricostruite dal manuale */
  pagine?: Range;
  /** pagine del manuale, per le unità ricostruite */
  manuale?: Range;
  /** materie con più testi: id e nome del testo (PDF) a cui si riferiscono le pagine */
  fonte?: string;
  fonteNome?: string;
  minuti: number;
  sintesi: string;
  puntiChiave: string[];
  memoria: { voce: string; dettaglio: string }[];
  concetti: string[];
}

export interface NodoMappa {
  testo: string;
  concetto?: string;
  nota?: string;
  figli?: NodoMappa[];
}

export interface Unita {
  id: string;
  ordine: number;
  titolo: string;
  capitolo: string | null;
  pagine?: Range;
  manuale?: Range;
  /** capitolo che gli appunti non trattano, scritto a partire dall'indice del manuale */
  ricostruita?: boolean;
  fonte?: string;
  fonteNome?: string;
  abstract: string;
  note: string | null;
  mappa: NodoMappa;
  lezioni: Lezione[];
}

export type TipoConcetto =
  | 'persona' | 'magistratura' | 'organo' | 'gruppo' | 'norma' | 'fonte' | 'opera'
  | 'istituto' | 'procedura' | 'periodo' | 'evento' | 'concetto' | 'luogo';

export interface Concetto {
  id: string;
  nome: string;
  tipo: TipoConcetto;
  latino?: string;
  alias: string[];
  breve: string;
  definizione: string;
  unita: string[];
  lezioni: string[];
  pagine: { unita: string; pagine: Range; fonteNome?: string }[];
  approfondimenti: { unita: string; titolo: string; testo: string }[];
  /** conoscenze di base che gli appunti danno per scontate (file oltre*.json): non vengono dal materiale del corso */
  oltre?: { testo: string; daSapere: string[]; fonti?: { titolo: string; url: string }[] };
  /** voce aggiunta solo dall'ampliamento, che negli appunti non c'è */
  oltreAppunti?: boolean;
  /** definizione corretta rispetto agli appunti, con motivazione nell'approfondimento */
  rettificato?: boolean;
  /** definizione selezionata per ricordare il termine, senza mostrarlo nella domanda */
  schedaInversa?: string;
  /** domanda di glossario scelta per la voce (glossario.json), altrimenti dipende dal tipo */
  domandaGlossario?: string;
}

export interface Relazione {
  da: string;
  a: string;
  tipo: string;
  etichetta?: string;
  unita: string;
  /** collegamento aggiunto o corretto dall'ampliamento, oltre gli appunti */
  oltre?: boolean;
}

export interface Evento {
  id: string;
  anno: number;
  annoFine?: number | null;
  approssimato?: boolean;
  data: string;
  titolo: string;
  descrizione: string;
  tipo: string;
  concetti?: string[];
  pagine?: Range;
  unita: string;
  fonteNome?: string;
}

interface DomandaBase {
  id: string;
  lezione: string;
  unita: string;
  livello: 'base' | 'medio' | 'avanzato';
  concetti?: string[];
  pagine?: Range;
  fonteNome?: string;
  /** id della voce da ricordare; ripasso indipendente dalle domande della lezione */
  inversa?: string;
  /** Voce del glossario: comprende sia inverse curate sia carte dirette. */
  glossario?: string;
  /** Evento della cronologia, con identità stabile nel ripasso FSRS. */
  cronologia?: string;
  /** Nei quiz Ordina devono essere stati studiati tutti questi eventi. */
  eventiCronologia?: string[];
  /** Serie di esercizi a cui la domanda appartiene (es. «procedimenti»): ha una modalità propria in Allenamento. */
  serie?: string;
}
export type Domanda = DomandaBase & (
  | { tipo: 'flashcard'; domanda: string; risposta: string }
  | { tipo: 'multipla'; domanda: string; opzioni: string[]; corretta: number; spiegazione?: string }
  | { tipo: 'verofalso'; affermazione: string; vero: boolean; spiegazione: string }
  | { tipo: 'completa'; testo: string; spiegazione?: string }
  | { tipo: 'aperta'; domanda: string; traccia: string; punti: { testo: string; chiavi: string[] }[] }
  | { tipo: 'ordina'; consegna: string; elementi: string[]; spiegazione?: string }
  | { tipo: 'abbina'; consegna: string; coppie: [string, string][] }
);
export type TipoDomanda = Domanda['tipo'];

export interface Corso {
  generatedAt: string;
  materia: { slug: string; nome: string; breve?: string; docente?: string; manuale?: string; colore?: string;
    fonte?: { file: string; descrizione: string; pagine: number };
    fonti?: { id: string; nome: string; file: string; descrizione: string; pagine: number }[] };
  unita: Unita[];
  concetti: Concetto[];
  relazioni: Relazione[];
  eventi: Evento[];
  domande: Domanda[];
  mancanti: string[];
  /** posizioni della mappa di tutti i concetti, calcolate da sync-content.mjs */
  grafo?: Record<string, [number, number]>;
  /** testo di un atto normativo, articolo per articolo (norme.json) */
  norme?: Norme;
  /** schemi d'insieme per la vista Quadro della Mappa (quadro.json) */
  quadro?: { schemi: SchemaQuadro[] };
}

export interface Articolo {
  n: string; tema?: string; commi: string[]; modificato?: boolean; abrogato?: boolean; disposizione?: boolean;
  /** serie con numerazione propria (le preleggi): non si confonde con gli articoli dell'atto */
  serie?: string;
  lezioni?: string[]; domande?: string[];
}
export interface Norme {
  /** nome breve della sezione nel menu (es. «Costituzione») */
  nome?: string;
  atto: string; sigla: string; aggiornamento: string; articoli: number;
  fonte?: { titolo: string; url: string };
  /** atto breve (Costituzione): tutto il testo è qui */
  gruppi?: GruppoNorme[];
  /** atto lungo (Codice civile): un file per libro, scaricato quando serve */
  libri?: { id: string; titolo: string; file: string; articoli: number; titoli: string[] }[];
  /** [numero, rubrica, indice del libro, indice del titolo nel libro, abrogato, serie a parte (preleggi)] */
  indice?: [string, string, number, number, 0 | 1, 0 | 1][];
  /** articoli citati nelle lezioni e nelle domande, per esteso */
  programma?: (Articolo & { gruppo: string; libro: number })[];
}
export interface GruppoNorme { titolo: string; articoli: Articolo[] }
export interface VoceQuadro { testo: string; concetto?: string }
export type SchemaQuadro = { id: string; titolo: string; sottotitolo?: string; nota?: string } & (
  | { tipo: 'rete'; nodi: { id: string; testo: string; sotto?: string; concetto?: string; x: number; y: number }[];
      archi: { da: string; a: string; testo: string }[]; elenco?: { chi: string; fa: string; norma?: string }[] }
  | { tipo: 'piramide'; livelli: { titolo: string; nota?: string; voci: VoceQuadro[] }[];
      aLato?: { titolo: string; testo: string; concetto?: string }[] }
  | { tipo: 'fasce'; da: number; a: number; periodi: (VoceQuadro & { da: number; a: number })[];
      corsie: { titolo: string; barre: (VoceQuadro & { da: number; a: number })[] }[] }
);

export const TIPI_CONCETTO: Record<TipoConcetto, string> = {
  persona: 'Persone', magistratura: 'Magistrature', organo: 'Organi', gruppo: 'Gruppi', norma: 'Norme',
  fonte: 'Fonti', opera: 'Opere', istituto: 'Istituti', procedura: 'Procedure', periodo: 'Periodi',
  evento: 'Eventi', concetto: 'Concetti', luogo: 'Luoghi',
};

export const TIPI_DOMANDA: Record<TipoDomanda, string> = {
  flashcard: 'Flashcard', multipla: 'Risposta multipla', verofalso: 'Vero o falso', completa: 'Completa',
  aperta: 'Domanda d\'esame', ordina: 'Ordina', abbina: 'Abbina',
};

export const TIPO_SINGOLARE: Record<TipoConcetto, string> = {
  persona: 'Persona', magistratura: 'Magistratura', organo: 'Organo', gruppo: 'Gruppo', norma: 'Norma',
  fonte: 'Fonte', opera: 'Opera', istituto: 'Istituto', procedura: 'Procedura', periodo: 'Periodo',
  evento: 'Evento', concetto: 'Concetto', luogo: 'Luogo',
};
// verbo da mostrare quando un collegamento non ha un'etichetta propria (si legge «da → verbo → a»)
export const VERBO_RELAZIONE: Record<string, string> = {
  'parte-di': 'fa parte di', crea: 'crea', supera: 'supera', influenza: 'influenza', contrasta: 'si contrappone a',
  'evolve-in': 'evolve in', testimonia: 'è una fonte per conoscere', interpreta: 'interpreta', causa: 'causa',
  'esempio-di': 'è un esempio di', collegato: 'è collegato a',
};
