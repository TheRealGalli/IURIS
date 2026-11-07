# IURIS · Studio

[Apri IURIS online](https://formaiuris.it/)

Lezioni, glossario, mappe, cronologia ed esercizi con ripasso spaziato per lo studio del diritto.
Il sito funziona nel browser, senza account, server applicativo o sincronizzazione dei progressi.

## Progressi personali

I progressi sono salvati nel browser e rimangono dopo la chiusura della pagina e gli aggiornamenti del sito.
Ogni browser e dispositivo ha un archivio distinto; chi usa lo stesso profilo del browser condivide l'archivio.
Da **Backup → Scarica backup completo** puoi conservare un unico file JSON e trasferirlo con **Carica backup**.
Il riepilogo mostra per ogni materia le pagine del Percorso studiate, la relativa percentuale e la padronanza, calcolate come nella Home.
Il file include tutte le materie presenti nell'archivio, anche quelle aggiunte in futuro, progressi e storico, quiz sospesi, preferenze, evidenziazioni, sottolineature, cronologia dei segni e pagine lette negli Originali.
Prima del ripristino, tramite **Carica backup**, viene mostrato il contenuto del file. Sono compatibili anche i precedenti backup di una materia.
Per passare dalla versione locale al sito online, scarica il backup dalla prima e importalo nel secondo.
Lo stesso trasferimento serve passando dal vecchio indirizzo `github.io` a `formaiuris.it`, perché ogni origine ha il proprio archivio.
Cancellando i dati del sito si eliminano anche i progressi locali.

Nel ripasso del giorno, le verifiche ancora nuove delle lezioni appena studiate precedono le domande in scadenza e le nuove ordinarie. La stessa priorità vale quando si riprende una sessione interrotta, conservando le risposte già date. Restano il limite giornaliero per materia e la riserva fissa di fino a sei domande per nuova lezione.

## Originali

La sezione raccoglie i quattro documenti di appunti e riassunti usati come fonti del Percorso, letti come **Testo**: il documento estratto in paragrafi, diviso nelle lezioni del Percorso. Non c'è più un lettore PDF; il PDF originale si scarica solo dal menu **Fonte e comandi** (**Consulta la fonte PDF originale**), senza i segni personali. Il menu riporta anche il curatore di ogni documento e la revisione di Carlo Galli.
Il lettore riprende dall'ultima sezione e dall'ultimo paragrafo letti. Un passaggio selezionato si salva con un clic su **Salva segno**, con **Invio** o con **Spazio**.
**Esc**, **Canc** o **Backspace** annullano la selezione; **H** e **U** scelgono evidenziatore e sottolineatura, **1/2/3** scelgono giallo, verde e rosa. I campi di inserimento mantengono i normali comandi da tastiera.
La **Gomma** (**E**) rimuove i segni interi toccati dal testo selezionato, anche dall'elenco salvato; una sola azione Annulla recupera l'intera cancellazione.
Le frecce curve annullano e ripristinano le modifiche ai segni (anche con Ctrl/⌘Z e Ctrl+Y/⌘⇧Z). La cronologia conserva fino a 50 azioni per documento ed è inclusa nel backup.

### Testo e mappa personale

Le sezioni revisionate correggono in modo puntuale gli errori già segnalati nelle note del Percorso (ogni intervento ha una **Nota sul testo**), ricompongono titoli, elenchi e note a piè di pagina e collegano al glossario la prima occorrenza dei concetti della lezione. Ogni sezione rimanda alla lezione, al quiz e al comando **Studiata**, che è lo stesso stato del Percorso: segnarla nel testo vale per tutte le lezioni della sezione, e una lezione studiata nel Percorso compare con ✓ tra le sezioni del testo; dalla lezione, **Leggi il testo esteso** apre il punto corrispondente.
I segni fatti con il vecchio lettore PDF restano salvati (anche nel backup) e compaiono nel testo quando il passaggio ha una corrispondenza univoca; gli altri restano nell'elenco **Segni salvati** con la loro citazione e la pagina. I vecchi indirizzi `modo=pdf&pagina=N` aprono la sezione che contiene la pagina. I segni nel testo formano la **Mappa personale** (Mappa → Personale, o l'icona nel lettore), che raccoglie i passaggi per lezione e per concetto e riporta al punto di lettura. Tutto è incluso nel backup unico.
I testi si modificano in `studio/letture-src`: Markdown per lezione (gli ID dei blocchi non cambiano), correzioni puntuali in `revisioni.json` (da registrare con `node scripts/revisiona-letture.mjs`), voci del glossario curate in `glossario-<materia>.json`. `npm run sync:letture` li pubblica in `public/letture`, applicando anche le regole di sola forma; `npm run check:letture` verifica estrazione, ancoraggi e mappa.

Il catalogo in `studio/src/lib/originali-catalogo.json` indica file, pagine, materia e hash SHA-256.
Per sostituire un PDF con una versione diversa occorre assegnare un nuovo ID di documento, così i vecchi segni non vengono applicati a pagine cambiate.
I PDF restano pubblicati come fonti verificate (hash) e per il download.

## Sviluppo locale

Serve Node.js 24 per lo stesso ambiente usato nella pubblicazione automatica.

```sh
cd studio
npm ci
npm run studio
```

La versione per studiare è su `http://localhost:7100`; `npm run dev` avvia lo sviluppo sulla porta 7101.

## Pubblicazione su GitHub Pages

Il dominio principale è **formaiuris.it**, collegato a GitHub Pages tramite i DNS gestiti su IONOS.
Anche `www.formaiuris.it` punta a GitHub; il certificato HTTPS viene gestito da GitHub Pages.

In **Settings → Pages → Build and deployment → Source**, seleziona **GitHub Actions**.
Ogni push su `main` genera i contenuti delle materie, costruisce l'app, verifica i file e pubblica `studio/dist`.
Il workflow può anche essere avviato manualmente dalla scheda **Actions**.
I percorsi dell'app sono relativi e le pagine usano l'hash: il sito funziona anche nel percorso di un repository.

Prima di pubblicare puoi eseguire:

```sh
cd studio
npm run build
npm run check:build
```

Il repository include l'app e le cartelle `05 - Contenuti`, necessarie per generare i corsi.
Sono pubblicati soltanto i quattro PDF elencati nel catalogo e presenti in `studio/public/originali/`.
Gli altri PDF, vecchi elaborati, cartelle degli assistenti, backup dei progressi e file temporanei sono esclusi.
Il formato dei contenuti è descritto in [studio/CONTENUTI.md](studio/CONTENUTI.md).

