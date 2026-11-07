# IURIS · Studio

[Apri IURIS online](https://formaiuris.it/)

Lezioni, glossario, mappe, cronologia ed esercizi con ripasso spaziato per lo studio del diritto.
Il sito funziona nel browser, senza account, server applicativo o sincronizzazione dei progressi.

## Progressi personali

I progressi sono salvati nel browser e rimangono dopo la chiusura della pagina e gli aggiornamenti del sito.
Ogni browser e dispositivo ha un archivio distinto; chi usa lo stesso profilo del browser condivide l'archivio.
Da **Backup → Scarica backup completo** puoi conservare un unico file e trasferirlo con **Scegli un backup**.
Il file include tutte le materie presenti nell'archivio, anche quelle aggiunte in futuro, progressi e storico, quiz sospesi, preferenze, evidenziazioni, sottolineature, cronologia dei segni e pagine lette negli Originali.
Prima del ripristino viene mostrato il contenuto del file. Sono compatibili anche i precedenti backup di una materia.
Per passare dalla versione locale al sito online, scarica il backup dalla prima e importalo nel secondo.
Lo stesso trasferimento serve passando dal vecchio indirizzo `github.io` a `formaiuris.it`, perché ogni origine ha il proprio archivio.
Cancellando i dati del sito si eliminano anche i progressi locali.

## Originali

La sezione raccoglie i quattro PDF di appunti e riassunti usati come fonti del Percorso.
Il lettore permette di scorrerli, riprendere dall'ultima pagina e segnare il testo.
Il documento occupa la sezione sotto una barra compatta con icone fisse; il selettore offre **Riempi lo spazio** e **Pagina intera**.
I segni si aprono dall'icona **Segni salvati**. Il menu **Documento e scorciatoie** riporta i comandi da tastiera e il download del PDF originale.
Un passaggio selezionato si salva con un clic su **Salva segno**, con **Invio** o con **Spazio**.
**Esc**, **Canc** o **Backspace** annullano la selezione; **H** e **U** scelgono evidenziatore e sottolineatura, **1/2/3** scelgono giallo, verde e rosa. I campi di inserimento mantengono i normali comandi da tastiera.
La **Gomma** (**E**) rimuove i segni interi toccati dal testo selezionato, sia evidenziati sia sottolineati, anche dall'elenco salvato. Puoi selezionare prima di premere la gomma oppure attivarla e trascinare sul passaggio; una sola azione Annulla recupera l'intera cancellazione. Con la selezione da tastiera, Invio o Spazio applicano la gomma.
Le frecce curve accanto alle pagine annullano e ripristinano le modifiche ai segni (anche con Ctrl/⌘Z e Ctrl+Y/⌘⇧Z).
La cronologia conserva fino a 50 azioni per documento ed è inclusa nel backup.
I PDF di partenza rimangono invariati; i segni sono personali e salvati con i progressi della materia.
Il file scaricato dal lettore è il PDF originale, senza i segni personali: questi sono nel backup dei progressi.

Il catalogo in `studio/src/lib/originali-catalogo.json` indica file, pagine, materia e hash SHA-256.
Per sostituire un PDF con una versione diversa occorre assegnare un nuovo ID di documento, così i vecchi segni non vengono applicati a pagine cambiate.
Il lettore e le sue risorse vengono caricati quando si apre questa sezione.

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

