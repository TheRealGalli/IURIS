// Corsi di studio (classi): ogni corso elenca le sue materie. Per aggiungere una classe basta una voce qui.
// Tutto il resto (percorso, domande, statistiche, mappa, originali) è già per materia: scegliere il corso
// significa mostrare e usare solo le materie del corso.

export interface CorsoDiStudio {
  /** Identificativo stabile: finisce nelle preferenze e nei backup, non cambiarlo. */
  id: string;
  /** Etichetta completa, usata nell'elenco dei corsi e nei messaggi. */
  breve: string;
  /** Etichetta del riquadro, senza la classe (es. «LMG · I anno»). */
  sigla: string;
  /** Classe mostrata accanto alla sigla (es. «A-L»), se il corso è sdoppiato. */
  lettere?: string;
  universita: string;
  laurea: string;
  anno: number;
  /** Classe o lettere dei cognomi, se il corso è sdoppiato. */
  classe?: string;
  /** Slug delle materie del manifest, nell'ordine in cui compaiono. */
  materie: string[];
  /** `false`: il corso si vede nell'elenco ma non si può scegliere (contenuti in arrivo). */
  disponibile?: boolean;
  /** Materie annunciate ma non ancora pronte: si vedono nell'elenco, non si aprono. */
  inArrivo?: MateriaInArrivo[];
}

export interface MateriaInArrivo { nome: string; colore: string }

// Comuni al primo anno di Giurisprudenza; colori distinti da Filosofia (blu) e Romano (rosso).
const IN_ARRIVO_LMG: MateriaInArrivo[] = [
  { nome: 'Diritto costituzionale', colore: '#3f7a52' },
  { nome: 'Diritto privato', colore: '#b07a1e' },
];

export const CORSI: CorsoDiStudio[] = [
  {
    id: 'uniba-lmg-1-al',
    breve: 'LMG · I anno · A-L',
    sigla: 'LMG · I anno',
    lettere: 'A-L',
    universita: 'Università di Bari Aldo Moro',
    laurea: 'Giurisprudenza (magistrale a ciclo unico, LMG/01)',
    anno: 1,
    classe: 'cognomi A-L',
    materie: ['filosofia-del-diritto', 'diritto-romano'],
    inArrivo: IN_ARRIVO_LMG,
  },
  // M-Z e SSG: visibili ma non selezionabili finché non ci sono i loro contenuti. Per ora le stesse materie di A-L come segnaposto, finché non arriva l'elenco ufficiale delle materie
  // (e dei docenti) di ciascun corso. Sostituire `materie` e `inArrivo` quando c'è.
  {
    id: 'uniba-lmg-1-mz',
    breve: 'LMG · I anno · M-Z',
    sigla: 'LMG · I anno',
    lettere: 'M-Z',
    universita: 'Università di Bari Aldo Moro',
    laurea: 'Giurisprudenza (magistrale a ciclo unico, LMG/01)',
    anno: 1,
    classe: 'cognomi M-Z',
    disponibile: false,
    materie: ['filosofia-del-diritto', 'diritto-romano'],
    inArrivo: IN_ARRIVO_LMG,
  },
  {
    id: 'uniba-ssg-1',
    breve: 'SSG · I anno',
    sigla: 'SSG · I anno',
    universita: 'Università di Bari Aldo Moro',
    laurea: 'Scienze dei servizi giuridici (L-14)',
    anno: 1,
    disponibile: false,
    materie: ['filosofia-del-diritto', 'diritto-romano'],
    inArrivo: IN_ARRIVO_LMG,
  },
];

/** Corso usato quando non ne è stato scelto nessuno (dati precedenti al selettore) o quello salvato non esiste più. */
export const CORSO_PREDEFINITO = CORSI[0];

export const corsoDisponibile = (c: CorsoDiStudio) => c.disponibile !== false;

/** Corso salvato, se esiste ed è disponibile; altrimenti (mai scelto, tolto, ancora in arrivo) il predefinito. */
export function corsoDi(id: string | undefined): CorsoDiStudio {
  const c = CORSI.find((x) => x.id === id);
  return c && corsoDisponibile(c) ? c : CORSO_PREDEFINITO;
}

export const descriviCorso = (c: CorsoDiStudio) =>
  [c.laurea, c.universita, `${['I', 'II', 'III', 'IV', 'V', 'VI'][c.anno - 1] ?? c.anno} anno`, c.classe].filter(Boolean).join(' · ');

/** Materie del corso nell'ordine del corso; quelle assenti dal manifest vengono ignorate. */
export function materieDelCorso<M extends { slug: string }>(corso: CorsoDiStudio, materie: M[]): M[] {
  return corso.materie.map((s) => materie.find((m) => m.slug === s)).filter((m): m is M => !!m);
}

/** Link WhatsApp per inviare sbobine o materiale, con il corso scelto già nel messaggio. */
export const WHATSAPP_MATERIALE = '393925689596';
export const linkMateriale = (c: CorsoDiStudio) =>
  `https://wa.me/${WHATSAPP_MATERIALE}?text=${encodeURIComponent(`Ciao Carlo! Ho del materiale per il corso ${c.breve} (${c.universita}): `)}`;
