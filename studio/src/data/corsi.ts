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
  /** Docente di ogni materia in questo corso (slug → nome): una materia condivisa può avere docenti diversi. */
  docenti?: Record<string, string>;
}

export interface MateriaInArrivo { nome: string; colore: string; docente?: string; cfu?: number; semestre?: 'I' | 'II' | 'Annuale' }

// Docenti, CFU e semestri: catalogo UniBa 2026/27 consultato l'8 novembre 2026 (vedi piani/potenziamento.md).
// Colori distinti tra loro e da quelli delle materie vere (blu, rosso, verde).
const IST_ROMANO = { nome: 'Istituzioni di diritto romano', colore: '#a8456f', cfu: 9, semestre: 'II' } as const;
const STORIA_ITALIANO = { nome: 'Storia del diritto italiano', colore: '#6b5b95', docente: 'Francesco Mastroberti', semestre: 'II' } as const;

/** Docente della materia nel corso, se noto. */
export const docenteDi = (c: CorsoDiStudio, slug: string) => c.docenti?.[slug];

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
    materie: ['filosofia-del-diritto', 'diritto-romano', 'diritto-costituzionale', 'diritto-privato'],
    docenti: { 'filosofia-del-diritto': 'Antonio Incampo', 'diritto-romano': 'S.R. Alessandrì', 'diritto-costituzionale': 'A. Torre', 'diritto-privato': 'Michele Lobuono' },
    inArrivo: [
      { ...IST_ROMANO, docente: 'Andrea Lovato' },
      { ...STORIA_ITALIANO, cfu: 10 },
    ],
  },
  // M-Z: visibile ma non selezionabile finché non ci sono i suoi contenuti. Avrà appunti e materie propri (docenti diversi):
  // le materie di A-L qui sotto sono solo un segnaposto. Sostituire `materie` e `inArrivo` quando arriva il materiale.
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
    materie: ['filosofia-del-diritto', 'diritto-romano', 'diritto-costituzionale', 'diritto-privato'],
    // I docenti sono quelli di M-Z per la stessa disciplina (le materie restano un segnaposto, tranne Diritto privato,
    // che è comune alle tre classi).
    docenti: { 'filosofia-del-diritto': 'M. Mangini', 'diritto-romano': 'Pia Starace', 'diritto-costituzionale': 'R.G. Rodio', 'diritto-privato': 'Mauro Pennasilico' },
    inArrivo: [
      // Catalogo: Piacente; elenco docenti UniBa: Gonzalez Roldan. Da verificare.
      { ...IST_ROMANO, docente: 'Daniele Vittorio Piacente' },
      { ...STORIA_ITALIANO, cfu: 10 },
    ],
  },
  {
    id: 'uniba-ssg-1',
    breve: 'SSG · I anno',
    sigla: 'SSG · I anno',
    universita: 'Università di Bari Aldo Moro',
    laurea: 'Scienze dei servizi giuridici (L-14)',
    anno: 1,
    // Filosofia del diritto ha un programma proprio (lezioni di Siniscalchi e Incampo); Diritto romano usa gli stessi appunti di LMG,
    // quindi la stessa materia e gli stessi progressi.
    // Diritto costituzionale SSG avrà appunti diversi da quelli di LMG A-L: sarà una materia a sé
    // (cartella e slug propri), non quella di LMG. Finché non c'è, resta una card disattivata.
    materie: ['filosofia-del-diritto-ssg', 'diritto-romano', 'diritto-privato'],
    // Romano: a SSG insegna Starace (Bretone ed. 2024, senza i capp. I e XII); gli appunti sono quelli di A-L.
    docenti: { 'filosofia-del-diritto-ssg': 'Guglielmo Siniscalchi', 'diritto-romano': 'Pia Starace', 'diritto-privato': 'Michele Lobuono' },
    inArrivo: [
      { nome: 'Diritto costituzionale', colore: '#4f7f3a', docente: 'Andrea Bonomi', cfu: 12, semestre: 'Annuale' },
      { ...STORIA_ITALIANO, cfu: 9 },
      // Catalogo: Lopez; elenco docenti UniBa: Buonamassa. Da verificare.
      { nome: 'Abilità informatiche per giuristi', colore: '#2f7f86', docente: 'Ugo Lopez', cfu: 3, semestre: 'I' },
      { nome: 'Lingua inglese', colore: '#5c6b7a', docente: 'Paola Francesca Rizzi', cfu: 6, semestre: 'II' },
    ],
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

/** Link WhatsApp per inviare sbobine o materiale: messaggio breve, chi scrive aggiunge che materiale ha. */
export const WHATSAPP_MATERIALE = '393925689596';
export const linkMateriale = (c: CorsoDiStudio) =>
  `https://wa.me/${WHATSAPP_MATERIALE}?text=${encodeURIComponent('Ciao Carlo! Ho del materiale: ')}`;
