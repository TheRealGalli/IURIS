// Corsi di studio (classi): ogni corso elenca le sue materie. Per aggiungere una classe basta una voce qui.
// Tutto il resto (percorso, domande, statistiche, mappa, originali) è già per materia: scegliere il corso
// significa mostrare e usare solo le materie del corso.

export interface CorsoDiStudio {
  /** Identificativo stabile: finisce nelle preferenze e nei backup, non cambiarlo. */
  id: string;
  /** Etichetta corta per il selettore. */
  breve: string;
  universita: string;
  laurea: string;
  anno: number;
  /** Classe o lettere dei cognomi, se il corso è sdoppiato. */
  classe?: string;
  /** Slug delle materie del manifest, nell'ordine in cui compaiono. */
  materie: string[];
}

export const CORSI: CorsoDiStudio[] = [
  {
    id: 'uniba-lmg-1-al',
    breve: 'LMG · I anno · A-L',
    universita: 'Università di Bari Aldo Moro',
    laurea: 'Giurisprudenza (magistrale a ciclo unico, LMG/01)',
    anno: 1,
    classe: 'cognomi A-L',
    materie: ['filosofia-del-diritto', 'diritto-romano'],
  },
];

/** Corso usato quando non ne è stato scelto nessuno (dati precedenti al selettore) o quello salvato non esiste più. */
export const CORSO_PREDEFINITO = CORSI[0];

export function corsoDi(id: string | undefined): CorsoDiStudio {
  return CORSI.find((c) => c.id === id) ?? CORSO_PREDEFINITO;
}

export const descriviCorso = (c: CorsoDiStudio) =>
  [c.laurea, c.universita, `${['I', 'II', 'III', 'IV', 'V', 'VI'][c.anno - 1] ?? c.anno} anno`, c.classe].filter(Boolean).join(' · ');

/** Materie del corso nell'ordine del corso; quelle assenti dal manifest vengono ignorate. */
export function materieDelCorso<M extends { slug: string }>(corso: CorsoDiStudio, materie: M[]): M[] {
  return corso.materie.map((s) => materie.find((m) => m.slug === s)).filter((m): m is M => !!m);
}
