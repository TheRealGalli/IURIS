import type { Indice } from './data';
import { DOCUMENTI_LETTURA, linkTesto } from './letture-client';
import type { AttiCorso } from './materie-corso';

export type AzioneTour =
  | { click: string; soloSe?: string }
  /** seleziona l'n-esimo paragrafo lungo; `seManca`: solo se non c'è già una selezione nel paragrafo della visita */
  | { seleziona: number; seManca?: boolean }
  | { esempioStatistiche: true }
  /** una pausa visibile tra un gesto e l'altro */
  | { pausa: number }
  /** il mouse passa sopra un elemento (anteprime al passaggio: solo con il mouse) */
  | { passaMouse: string };

/** Quello che la visita scopre strada facendo (per esempio l'articolo citato nella lezione), conservato anche
 *  quando la visita cambia materia per un momento. */
export interface StatoVisita { articolo?: { art: string; materia: string; fuori: boolean } }
type Rotta = string | ((idx: Indice, stato: StatoVisita) => string | null);

export interface PassoTour {
  id: string; sezione: string; titolo: string; testo: string;
  /** Versione per telefono e iPad: più breve, parla di tocchi e dei comandi touch. */
  touch?: string; titoloTouch?: string;
  /** `null` dalla funzione = la funzione non c'è in questa materia: la tappa si salta. */
  route: Rotta; target: string; azioni?: AzioneTour[];
  /** Sul touch il bersaglio può essere più piccolo (il riquadro della guida occupa metà schermo). */
  targetTouch?: string;
  /** Bersaglio da illuminare insieme al principale (per esempio la scheda dell'articolo aperta al passaggio). */
  anche?: string;
  /** Bersaglio quando le azioni della tappa sono già state fatte (tornando indietro). */
  targetDopo?: string;
  /** Materia in cui mostrare la tappa; senza, quella con cui è partita la visita. */
  materia?: string | ((stato: StatoVisita) => string | undefined);
  /** Prima di cambiare pagina la freccetta preme questo comando (il collegamento che porta alla tappa). */
  premiPrima?: string;
  /** Si arriva alla tappa da un comando della pagina precedente: sul touch niente tappa «ponte». */
  dallaPagina?: boolean;
  /** Tappa «ponte» sul touch: resta sulla pagina e indica dove si va e come ci si arriva. */
  ponte?: boolean;
  /** Testo della tappa ponte che porta qui (sul touch). */
  arrivo?: string;
}

/** Il pulsante Menu della barra in basso (telefono e iPad). */
export const MENU_TOUCH = '.mobile-tabs button[aria-label="Apri menu"]';
/** Selettore speciale: il riquadro illumina la selezione del testo, non il paragrafo. */
export const SELEZIONE = '::selection';

const CITA_ATTO = /\bartt?\.\s*\d+[^.;\n]{0,24}?(?:\bCost\b|Costituzione|c\.\s?c\.|cod\.\s*civ|codice civile)/i;
const CITA = /\bartt?\.\s*\d+/i;
/** Una lezione che cita un articolo (della Costituzione o del Codice civile, o dell'atto della materia stessa). */
function lezioneConArticolo(idx: Indice): string | null {
  const re = idx.corso.norme ? CITA : CITA_ATTO;
  return idx.lezioni.find((l) => re.test(l.sintesi))?.id ?? null;
}

export interface OpzioniTour { touch: boolean; telefono: boolean; atti: AttiCorso }

export function passiTour(idx: Indice, opz: OpzioniTour = { touch: false, telefono: false, atti: {} }): PassoTour[] {
  const doc = DOCUMENTI_LETTURA.find((d) => d.materia === idx.corso.materia.slug && d.sezioni.some((s) => !s.soloTitolo));
  const meta = doc?.sezioni.find((s) => !s.soloTitolo && idx.lezioneById.has(s.lezione ?? ''));
  const l = idx.lezioneById.get(meta?.lezione ?? '') ?? idx.lezioni[0];
  const testo = doc && meta ? linkTesto(doc.id, meta.id).replace(/^#/, '') : '/originali';
  const lezione = `/lezione/${l.id}`, mappa = `/mappa?u=${l.unita}`;
  const slug = idx.corso.materia.slug;

  // Domande d'esame dei docenti: la lezione della visita se ne ha, altrimenti la prima che ne ha.
  const conTracce = idx.traccePerLezione.has(l.id) ? l.id : [...idx.traccePerLezione.keys()].find((id) => idx.lezioneById.has(id));
  const inversa = idx.schedeInverse[0]?.inversa;
  // Articoli: nella materia attiva se ha l'atto o se una lezione lo cita; altrimenti, per un momento, nella materia
  // del corso che ospita la Costituzione (o il Codice civile).
  const ospite = [opz.atti.costituzione, opz.atti.codice].find((a) => a?.inCorso)?.slug;
  const materiaArticoli = idx.corso.norme || lezioneConArticolo(idx) ? slug : ospite;
  const nomeAtto = idx.corso.norme?.nome ?? (materiaArticoli === opz.atti.codice?.slug && !opz.atti.costituzione?.inCorso ? 'Codice civile' : 'Costituzione');

  const passi: (PassoTour | false)[] = [
    { id: 'benvenuto', sezione: 'Oggi', route: '/', target: '.hero-main', titolo: 'Ciao, sono la I di IURIS.', touch: 'Ti mostro IURIS dall’inizio alla fine: la freccetta apre le pagine e prova i comandi. Le prove restano in un archivio temporaneo: i tuoi dati non cambiano.', testo: 'Ti accompagno dentro il tuo spazio di studio, dalla prima pagina all’ultima. La freccetta apre le pagine e prova i comandi per te: vai avanti e indietro con i tuoi tempi. Le prove sono temporanee: il tuo archivio personale resta al sicuro.' },
    { id: 'oggi', sezione: 'Oggi', route: '/', target: '.hero-main .kpi', titolo: 'Leggere e ricordare: due misure diverse.', touch: 'Le pagine crescono quando segni una lezione come Studiata; la padronanza stima quanto ricordi. La data dell’esame aiuta a distribuire lo studio.', testo: 'Le pagine aumentano quando segni una lezione come Studiata. La padronanza cresce con le risposte e stima quanto ricordi adesso. I giorni di fila raccontano la costanza, mentre la data dell’esame ti aiuta a distribuire le lezioni ancora da studiare.' },
    { id: 'ripasso', sezione: 'Oggi', route: '/', target: '.cta-card', titolo: 'La prossima cosa da fare è già qui.', touch: 'Qui trovi sempre la prossima cosa da fare: ripassi in scadenza e domande nuove sugli argomenti studiati.', testo: 'Questo riquadro raccoglie i ripassi in scadenza e le nuove domande sugli argomenti studiati. Sotto trovi le prossime lezioni, il calendario e i concetti da rinforzare. Ora ti porto nel Percorso.' },
    { id: 'percorso', sezione: 'Percorso', route: '/percorso', target: '.unit-head', titolo: 'Una materia, ordinata in unità.', arrivo: 'Il Percorso si apre dal Menu, in basso a destra: lì trovi tutte le sezioni.', touch: 'La materia è divisa in unità: tocca un’unità per vedere le sue lezioni, con pagine, tempi e progressi.', testo: 'Ogni unità contiene le sue lezioni, le pagine, i tempi indicativi e i progressi. La freccia apre e richiude l’elenco. Entriamo nella prima lezione: vedrai cosa contiene, senza perdere il filo del programma.' },
    { id: 'lezione', sezione: 'Percorso', route: '/percorso', target: '.prose', targetTouch: '.prose h3, .prose p', azioni: [{ click: `.unit-lesson[href="#/lezione/${l.id}"]` }], titolo: 'La lezione, da capire e da ripetere.', touch: 'Ogni lezione ha la sintesi con i concetti collegati, i punti da dire all’esame e quelli da sapere a memoria.', testo: 'Qui trovi la sintesi e i concetti collegati. Più in basso, i punti chiave da dire all’esame e gli elementi da sapere a memoria. A lato puoi aprire il testo esteso, fare un quiz o vedere la mappa dell’unità.' },
    !!conTracce && { id: 'esame-lezione', sezione: 'Percorso', route: `/lezione/${conTracce}`, target: '.riquadro-esame, .chip-esame', titoloTouch: 'Chiesta all’esame.', titolo: 'Chiesta all’esame: le tracce dei docenti.', touch: 'Il segno «Chiesta all’esame» indica le tracce date dai docenti su questa lezione: prima quelle del tuo docente, poi delle altre classi.', testo: 'Il segno «Chiesta all’esame» indica le tracce che i docenti hanno dato all’esame su questo argomento: prima quelle del docente del tuo corso, poi quelle delle altre classi. Ogni traccia porta alle lezioni e alle domande per rispondere.' },
    { id: 'studiata', sezione: 'Percorso', route: lezione, target: '[data-tour="studiata"]', azioni: [{ click: '[data-tour="studiata"]', soloSe: '[data-tour="studiata"][aria-pressed="false"]' }], titoloTouch: 'Studiata: un tocco collega tutto.', titolo: 'Studiata: un clic collega tutto.', touch: 'Un tocco su Studiata e la lezione entra nel ripasso. Lo stato compare anche negli Originali.', testo: 'Ho segnato questa lezione come Studiata nell’archivio di prova. Lo stesso stato compare negli Originali e attiva anche i termini e le date pertinenti. Ogni lezione appena studiata può aggiungere fino a sei verifiche immediate al ripasso.' },
    { id: 'originali', sezione: 'Originali', dallaPagina: true, route: lezione, target: '.lettura-intestazione', azioni: [{ click: '.lesson-aside a[href*="originali"]' }], titolo: 'Un solo testo IURIS per materia.', touch: 'Dalla lezione si apre il testo IURIS, uno per materia, diviso come le lezioni. Il tasto Testo in alto porta a sezioni e segni.', testo: 'Dalla lezione siamo passati agli Originali: ogni materia ha un solo testo IURIS, scritto per il corso e diviso come le lezioni del Percorso. Il lettore ricorda sezione e paragrafo; dal menu con i tre puntini trovi fonte e comandi.' },
    { id: 'selezione', sezione: 'Originali', route: testo, target: SELEZIONE, targetDopo: '.lettura-segno.evidenziato', azioni: [{ seleziona: 0 }], titolo: 'Prima scegli il passaggio.', touch: 'Tieni premuta una parola e allarga la selezione con le maniglie. Il colore è solo un’anteprima: niente è ancora salvato.', testo: 'La freccetta ha selezionato un tratto del testo, come faresti trascinando il mouse. Il colore che vedi è soltanto l’anteprima dello strumento attivo: nulla è ancora salvato. Nella prossima tappa scegliamo lo strumento.' },
    { id: 'strumento', sezione: 'Originali', route: testo, target: '.originali-strumenti', azioni: [{ seleziona: 0, seManca: true }, { click: '[aria-label="Evidenzia"]' }, { click: '[aria-label="Giallo"]' }], titolo: 'Poi lo strumento e il colore.', touch: 'Nella barra in alto scegli evidenziatore o sottolineatura e il colore: la selezione ne mostra l’anteprima.', testo: 'Nella barra scegli evidenziatore o sottolineatura e uno dei sei colori: la selezione ne mostra l’anteprima. Puoi anche usare H, U e i numeri da 1 a 6.' },
    { id: 'evidenzia', sezione: 'Originali', route: testo, target: '.lettura-segno.evidenziato', azioni: [{ seleziona: 0, seManca: true }, { click: '[aria-label="Salva segno"]' }], titolo: 'Infine salvi: ecco il segno.', touch: 'Ecco il segno giallo, salvato nel testo e nella Mappa personale. Nella visita uso Salva; a te basta un tocco fuori dalla selezione.', testo: 'Ho premuto Salva segno: puoi farlo anche con Invio o con la barra spaziatrice. Il passaggio resta nel testo e compare nella Mappa personale. Nella visita i segni restano solo nell’archivio temporaneo.' },
    { id: 'sottolinea', sezione: 'Originali', route: testo, target: '.lettura-segno.sottolineato', azioni: [{ seleziona: 1 }, { pausa: 700 }, { click: '[aria-label="Sottolinea"]' }, { click: '[aria-label="Rosa"]' }, { pausa: 500 }, { click: '[aria-label="Salva segno"]' }], titolo: 'Di nuovo, con la sottolineatura.', touch: 'Stessi tre gesti: selezione, sottolineatura rosa, salvataggio. I colori li scegli tu: non sono quelli della padronanza.', testo: 'Stessi tre gesti su un secondo passaggio: selezione, Sottolinea in rosa, Salva segno. Hai sei colori da usare secondo il tuo metodo: sono distinti dai colori automatici della padronanza.' },
    { id: 'annulla', sezione: 'Originali', route: testo, target: '.originali-cronologia', azioni: [{ click: '[aria-label="Annulla ultima modifica ai segni"]' }, { click: '[aria-label="Ripristina modifica ai segni"]' }], titolo: 'Puoi cambiare idea.', touch: 'Le frecce in alto annullano e ripristinano l’ultima modifica; la gomma cancella i segni che selezioni.', testo: 'Hai visto sparire e ricomparire l’ultima sottolineatura: sono Annulla e Ripristina. Con la Gomma selezioni i segni da rimuovere. Anche la cronologia delle modifiche è conservata nel backup completo.' },
    // Sul telefono la Mappa personale non sta nel lettore: si apre solo dalla sezione Mappa.
    !opz.telefono && { id: 'mappa-lettura', sezione: 'Originali', route: testo, target: '.lettura-pannello', azioni: [{ click: '[aria-label="Mappa personale"]', soloSe: '.lettura:not(:has(.lettura-pannello-mappa))' }], titolo: 'I tuoi segni diventano una mappa.', touch: 'Il pannello Mappa raccoglie i passaggi segnati nella struttura del testo, con gli stessi colori.', testo: 'Questo pannello raccoglie i passaggi appena segnati nella struttura del testo, con gli stessi colori. Puoi tornare al passaggio o aprire la mappa completa: andiamo a vederla.' },
    { id: 'personale', sezione: 'Mappe', route: '/mappa?personale=1', target: '.mg-segnato', titolo: 'La Mappa personale nasce dal tuo studio.', arrivo: opz.telefono ? 'Sul telefono la Mappa personale si apre solo da qui: Menu in basso a destra, poi Mappa e Personale.' : 'Tocca Menu, in basso a destra, poi Mappa e Personale.', touch: 'I tuoi segni, lezione per lezione: le schede della stessa sezione stanno in riga. Tocca una scheda per i collegamenti e per tornare al testo.', testo: 'Ecco i segni della visita, dentro la loro lezione: le schede della stessa sezione stanno in riga, con i colori che hai scelto. Passando sopra una scheda si accendono i suoi collegamenti; un clic ti riporta al punto di lettura.' },
    { id: 'mappa-unita', sezione: 'Mappe', route: mappa, target: '.map-shell', titolo: 'La mappa dell’unità mostra la struttura.', touch: 'Ogni unità ha la sua mappa: allarga con due dita e trascina. Tocca un concetto per la sua scheda.', testo: 'Questa mappa è già pronta per ogni unità. I rami si aprono e si richiudono, puoi spostarti, ingrandire e adattare la vista. Toccare un concetto apre i suoi dettagli e i collegamenti.' },
    { id: 'rami', sezione: 'Mappe', route: mappa, target: '.map-tools', azioni: [{ click: '[data-tour="apri-mappa"]' }], titolo: 'Apriamo i rami insieme.', touch: 'Il tasto con i cursori raccoglie unità e comandi. Ho premuto Apri tutto: i colori seguono i tuoi ripassi.', testo: 'Ho premuto Apri tutto: puoi vedere come gli argomenti si articolano. Il pulsante accanto richiude i rami e Adatta riporta l’intera mappa nella finestra. Le parti con domande collegate cambiano colore in base ai tuoi ripassi.' },
    { id: 'grafo', sezione: 'Mappe', route: '/mappa?grafo=1', target: '.map-shell', titolo: 'Tutti i collegamenti, oltre la singola unità.', touch: 'Collegamenti mette in rete i concetti di tutta la materia. Tocca un punto per vedere solo i suoi legami.', testo: 'La costellazione mette in relazione i concetti dell’intera materia. Puoi cercare un concetto, filtrare e seguirne le relazioni. È utile per costruire un discorso trasversale quando ripeti per l’esame.' },
    { id: 'allenamento', sezione: 'Allenamento', route: '/allena', target: '.main .page-narrow', targetTouch: '.mobile-training-choice', titolo: 'Il ripasso si adatta alle risposte.', touch: 'Qui scegli come allenarti: ripasso del giorno, quiz libero, orale. Il ripasso spaziato decide quando tornare su ogni domanda.', testo: 'Qui scegli ripasso del giorno, quiz libero o allenamento per l’orale. Il ripasso spaziato decide quando riproporre ogni scheda. Il limite iniziale è 35 nuove al giorno per materia, modificabile in Progressi; le domande in scadenza sono sempre incluse.' },
    idx.corso.domande.some((q) => q.esame?.length) && { id: 'esame-allena', sezione: 'Allenamento', route: '/allena?modo=docenti', target: '.setup-opt.on', targetTouch: '.mobile-training-choice', titolo: 'Domande d’esame, prima del tuo docente.', touch: 'Domande d’esame: le tracce dei docenti, prima quelle del tuo corso e poi delle altre classi.', testo: 'Il filtro Domande d’esame raccoglie le tracce date dai docenti: prima quelle del docente del tuo corso, poi quelle delle altre classi. Rispondi a voce e confronta con i punti da dire.' },
    { id: 'quiz', sezione: 'Allenamento', route: `/allena?l=${l.id}`, target: '.qcard', titolo: 'Dalla lezione alla verifica.', touch: 'Il quiz della lezione: risposte ed errori decidono da soli il prossimo ripasso. Puoi interromperlo e riprenderlo.', testo: 'Questo è il quiz della lezione appena aperta. Le risposte corrette, gli errori e la facilità con cui ricordi aiutano a programmare il prossimo ripasso. Puoi interrompere una sessione e riprenderla più tardi: anche i quiz sospesi sono nel backup.' },
    !!inversa && { id: 'inverse', sezione: 'Allenamento', route: `/allena?modo=inverse&c=${encodeURIComponent(inversa)}`, target: '.qcard', titolo: 'Al contrario: di che concetto si tratta?', touch: 'Le schede inverse partono dalla definizione: devi trovare il termine. Entrano nel ripasso con le lezioni studiate.', testo: 'Le schede inverse partono dalla definizione e chiedono il termine del glossario. Entrano nel ripasso quando studi le lezioni pertinenti; da Allenamento puoi anticiparle.' },
    { id: 'cronologia', sezione: 'Cronologia', route: '/cronologia', target: '.tl-item', titolo: 'Ogni data ha un contesto.', touch: 'La cronologia collega eventi, concetti e lezioni. I colori indicano il tipo di evento.', testo: 'La cronologia collega eventi, periodi, concetti e lezioni. I filtri distinguono leggi, opere, giuristi e istituzioni: qui i colori indicano il tipo di evento. Le date pertinenti entrano anche negli esercizi di ripasso.' },
    { id: 'glossario', sezione: 'Glossario', route: '/glossario', target: '.term', titolo: 'Un concetto non resta isolato.', touch: 'Cerca qualsiasi termine, anche in latino. Ogni voce apre la sua scheda con definizione, legami e quiz.', testo: 'Il glossario raccoglie i termini ricercabili della materia. Ogni scheda collega definizione, lezioni, relazioni e quiz. Anche le parole collegate negli Originali portano qui. Con Cerca, oppure ⌘K o Ctrl+K, trovi termini, lezioni e date.' },
    { id: 'concetto', sezione: 'Glossario', route: `/concetto/${idx.corso.concetti[0].id}`, target: '.main .page', targetTouch: '.main .page h1', titolo: 'La scheda tiene insieme il significato e i legami.', touch: 'La scheda tiene insieme definizione, collegamenti e domande. I puntini colorati mostrano come stai andando.', testo: 'Puoi leggere la definizione, seguirne le relazioni e allenarti sulle domande collegate. I puntini della padronanza mostrano come stai andando su ciò che hai già provato.' },
    !!materiaArticoli && { id: 'citazione', sezione: 'Articoli', materia: materiaArticoli, route: (i) => { const id = lezioneConArticolo(i); return id ? `/lezione/${id}` : null; }, target: '.prose a.ax', anche: '.pop-articolo', azioni: opz.touch ? [] : [{ passaMouse: '.prose a.ax' }], titolo: `Gli articoli citati si aprono da soli.`, arrivo: 'Le citazioni degli articoli sono nelle lezioni e negli Originali: le apri dal Percorso, nel Menu.', titoloTouch: 'Un tocco su «art.» e leggi l’articolo.', touch: 'Le citazioni come «art. 3 Cost.» o «art. 1321 c.c.» sono sottolineate, nelle lezioni e negli Originali: un tocco apre l’articolo.', testo: 'Nelle lezioni e negli Originali le citazioni come «art. 3 Cost.» o «art. 1321 c.c.» sono sottolineate. Passandoci sopra con il mouse compare la scheda dell’articolo con il testo; un clic lo apre, anche se sta in un’altra materia del corso.' },
    !!materiaArticoli && { id: 'articolo', sezione: 'Articoli', dallaPagina: true, premiPrima: '.pop-articolo a.btn, .prose a.ax', materia: (s) => s.articolo?.materia, route: (_i, s) => (s.articolo && !s.articolo.fuori ? `/norme/${s.articolo.art}` : null), target: '.norma-sel', targetTouch: '.norma-sel .norma-testa', titolo: 'L’articolo, nel suo atto.', titoloTouch: 'L’articolo, nel suo atto.', touch: `Si apre l’articolo nel testo vigente, con lezioni e domande collegate. Indietro ti riporta alla lezione.`, testo: `L’articolo si apre nella sezione ${nomeAtto === 'Codice civile' ? 'Codice civile' : 'Costituzione o Codice civile'}, con il testo vigente, le lezioni e le domande che lo citano. Il tasto Indietro del browser ti riporta alla lezione, nello stesso punto. La sezione è anche nel menu della materia che ospita l’atto.` },
    { id: 'statistiche', sezione: 'Progressi', route: '/progressi', target: '.grid.g4', azioni: [{ esempioStatistiche: true }], titolo: 'I numeri raccontano azioni concrete.', touch: 'Ho aggiunto qualche risposta di prova. Le pagine contano le lezioni Studiate; la padronanza stima il ricordo di oggi.', testo: 'Ho aggiunto alcune risposte di prova per mostrarti le statistiche. Le pagine contano quelle delle lezioni Studiate, senza duplicare le pagine della stessa fonte. Le risposte e la percentuale di corrette sono storiche; la padronanza stima invece il ricordo attuale e può calare senza ripassi.' },
    { id: 'colori', sezione: 'Progressi', route: '/progressi', target: '[data-tour="concetti"]', titolo: 'Grigio, rosso, giallo, verde.', touch: 'Grigio: mai verificato. Sulle domande già viste: rosso sotto il 40%, giallo dal 40%, verde dal 75%.', testo: 'Grigio significa mai verificato. Sulle domande già viste, sotto il 40% è rosso, dal 40% è giallo, dal 75% è verde. La padronanza complessiva include anche le domande mai affrontate, che contano zero: puoi conoscere bene ciò che hai provato e avere ancora molto da completare.' },
    { id: 'calendario', sezione: 'Progressi', route: '/progressi', target: '.cal', titolo: 'Puoi leggere anche il singolo giorno.', touch: 'Più verde significa più attività; il giorno dell’esame è rosso. Tocca un giorno per vederne il dettaglio.', testo: 'Più verde nel calendario significa più attività, mentre il giorno dell’esame è rosso. Tocca un giorno per risposte, lezioni e tempo di lettura. Nelle barre, l’altezza conta le risposte e la parte verde quelle corrette.' },
    { id: 'backup', sezione: 'Backup', route: '/backup', target: '.backup-guida', titolo: 'L’ultima tappa è la più importante.', arrivo: 'Tocca Menu, in basso a destra, poi Backup completo.', touch: 'I tuoi dati restano in questo browser: per ritrovarli usa lo stesso dispositivo e browser. Il backup ti evita di ricominciare.', testo: 'I dati normalmente restano dopo la chiusura della pagina e gli aggiornamenti. Per ritrovarli usa lo stesso browser, profilo, dispositivo e indirizzo del sito. Safari e Chrome hanno archivi separati. Se il browser rimuove i dati del sito, il backup evita di ricominciare da capo.' },
    { id: 'backup-file', sezione: 'Backup', route: '/backup', target: '[data-tour="scarica-backup"]', titolo: 'Un solo backup per tutte le materie.', touch: 'Scarica backup completo crea un solo file con tutto: progressi, ripassi, segni e mappe di ogni materia.', testo: 'Scarica backup completo crea un unico file: progressi, risposte, ripassi, quiz sospesi, sottolineature, evidenziazioni, cronologia dei segni, mappe personali, punti di lettura e preferenze. Non occorre un file per ogni materia. Conserva una copia recente nei tuoi documenti o in una cartella cloud.' },
    { id: 'ripristino', sezione: 'Backup', route: '/backup', target: '[data-tour="carica-backup"]', titolo: 'Per riprendere basta quel file.', touch: 'Carica backup, controlla l’anteprima e conferma: recuperi tutto, anche su un altro dispositivo.', testo: 'Scegli Carica backup, seleziona il file e controlla l’anteprima. Conferma Ripristina questo backup: recuperi tutto fino al momento della copia, anche su un altro browser o dispositivo. Le materie nel file vengono sostituite con la copia, le altre restano conservate.' },
    { id: 'fine', sezione: 'Backup', route: '/backup', target: '.backup-intro', titolo: 'Adesso tocca a te.', touch: 'La visita è finita e le prove vengono cancellate. Apri il tuo Backup per salvare i progressi veri. Puoi rifare la visita da Demo interattiva.', testo: 'La visita è finita. Le lezioni e i segni che abbiamo provato verranno rimossi dall’archivio temporaneo. Puoi aprire il tuo Backup reale per salvare tutti i tuoi progressi, oppure uscire e tornare a Oggi. La visita si rifà quando vuoi da Demo interattiva.' },
  ];
  const elenco = passi.filter((p): p is PassoTour => !!p);
  if (!opz.touch) return elenco;
  // Sul telefono e sull'iPad le sezioni si aprono dal Menu in basso: prima di cambiare sezione una tappa breve
  // dice dove si va e come ci si arriva, così il salto non è più «di netto».
  const conPonti: PassoTour[] = [];
  elenco.forEach((p, i) => {
    const prima = elenco[i - 1];
    if (prima && prima.sezione !== p.sezione && !p.dallaPagina) conPonti.push({
      id: `ponte-${p.id}`, ponte: true, sezione: p.sezione, route: '', target: MENU_TOUCH,
      titolo: `Ora: ${p.sezione}.`, testo: p.arrivo ?? `Tocca Menu, in basso a destra, e scegli ${p.sezione}.`,
    });
    conPonti.push(p);
  });
  return conPonti;
}
