# Mappa personale: schede in riga e collegamenti al passaggio (12 novembre 2026)

Problemi segnalati da Carlo: la mappa era una colonna verticale lunghissima, le schede erano lunghe e illeggibili da lontano, le etichette stavano sopra le schede e le frecce attraversavano tutto. Inoltre, con «Adatta», il testo diventava microscopico.

## Scelte di design

- **Layout «Schede»**, al posto dell'albero da sinistra a destra. È la forma predefinita ovunque: pagina Mappa → Personale, pannello del lettore, iPad e telefono. Lo «Schema» rientrato resta come seconda forma, per leggere di seguito tutto il testo segnato.
  - I titoli `#`/`##` aprono una **fascia**: un'intestazione grande, con una riga di separazione fra una fascia e l'altra.
  - I titoli `###` e quelli di livello inferiore aprono un **gruppo**, rientrato e con un filetto a sinistra.
  - Le fasce e i gruppi si susseguono in verticale, nell'ordine delle pagine.
  - Le parti segnate consecutive dello stesso titolo formano una **riga di schede**: una griglia con al più 4 colonne, che va a capo; sul telefono le colonne sono 2.
  - Un capoverso segnato che introduce un elenco è la prima scheda della riga e le voci gli stanno accanto: «i cinque significati» stanno su una riga. Se il capoverso non è segnato, diventa una piccola intestazione in corsivo con le voci in riga sotto.
  - Ogni intestazione ha un pulsante per piegarla e un contatore delle schede, con il numero dei collegamenti.
- **Schede compatte**, tutte della stessa altezza (118 px; 112 px sul telefono). Ogni scheda mostra:
  - il campione del colore e il tipo del segno (evidenziato, sottolineato o entrambi), con il colore anche sul bordo sinistro;
  - la pagina;
  - le prime 3 righe del passaggio;
  - fino a 3 chip dei concetti del glossario che il passaggio nomina.

  Al passaggio del mouse, oppure al primo tocco su iPad e telefono, la scheda si apre **sopra le vicine senza spostarle** e mostra tutto il testo segnato e tutti i chip. Il secondo tocco, o il clic, apre il passaggio negli Originali come prima.
- **Collegamenti spenti di base.** Si vedono solo indicatori discreti:
  - un numero colorato sul chip del concetto che ha collegamenti;
  - il conteggio sull'intestazione.

  Passando su una scheda, su un titolo o su un chip (oppure toccandoli), si accendono **solo i suoi** collegamenti. Le frecce sono curve fra le due schede: dal bordo inferiore a quello superiore, oppure sopra la riga se le schede stanno sulla stessa riga. Ogni freccia ha un'etichetta su sfondo pieno, con il **numero e il colore** della freccia (il verbo della relazione, oppure «torna: concetto»).
- **Posizione delle etichette.** Ogni etichetta si posa nel primo spazio libero lungo la curva o negli spazi fra le righe sopra e sotto le due schede. Non copre mai una scheda né un'altra etichetta. Se l'etichetta intera non entra, resta solo il numero.
- **Riquadro «Collegamenti».** Sta fuori dallo zoom, quindi resta leggibile a ogni zoom.
  - Sul computer sta in alto a destra, nella fascia dei comandi: chiuso, non copre nessuna scheda.
  - Nel pannello del lettore e sul telefono sta sotto la mappa.
  - Elenca «**Concetto A** verbo → **Concetto B**» con lo stesso numero e lo stesso colore della freccia.
  - Passando su una voce, la sua freccia si evidenzia. Il clic porta in vista i due capi del collegamento e mantiene accesi i collegamenti; si spengono con la ×, con Esc o con un clic sullo sfondo.
  - Contiene l'interruttore **«Mostra tutti i collegamenti»**.
  - Uscendo da una scheda, i collegamenti restano accesi per 300 ms: il tempo di raggiungere il riquadro.
- **Leggibilità a zoom basso.** Sotto lo zoom di circa 0,85 i titoli si ingrandiscono a gradini di 0,1, fino a 3 volte, e vanno su una riga sola. Usano solo una trasformazione CSS, quindi le schede non si spostano. «Adatta» non scende sotto lo zoom 0,3. Così i titoli restano sopra gli 11 px a schermo, e il controllo lo verifica. Zoom e trascinamento non sono cambiati: mouse, rotella, pizzico, touch, Apple Pencil e doppio clic. Il tema chiaro e quello scuro usano i token esistenti.
- **Prestazioni.**
  - Le posizioni delle schede si misurano una volta per layout: al cambio di lezione, forma, rami aperti o larghezza (ResizeObserver più un fotogramma), mai al passaggio del mouse.
  - Il passaggio del mouse è gestito da un solo gestore delegato, che cambia stato solo quando cambia la scheda o il concetto sotto il puntatore.
  - Le schede sono memorizzate: a ogni passaggio si ridisegnano solo lo strato SVG con le frecce **accese** e alcune classi.

## File toccati

- `studio/src/lib/mappa-geometrica.ts`:
  - nuove funzioni `fasceGeometriche`, `aspettoSegno`, `scalaTitoli`, `curvaFra`, `posaEtichetta`;
  - `semanticaGeometrica` restituisce anche `menzioni`, cioè i chip per nodo, esclusi i concetti generici.
- `studio/src/components/MappaGeometrica.tsx`: riscritto con i componenti Lezione, Fasce, Scheda, Intestazione, Strato e Collegamenti. Vista ha i titoli che crescono da lontano e la funzione `mostra`. Lo schema è conservato.
- `studio/src/components/MappaGeometrica.css`: nuovi stili per fasce, schede, etichette e riquadro.
- `studio/src/components/ui.tsx`: nuova icona `fasce`.
- `studio/scripts/check-mappa-geometrica.mjs`:
  - nuovo scenario sul layout a fasce: riga delle voci, ordine dei titoli, scala dei titoli, etichette fuori dalle schede su una griglia;
  - controlli del sorgente adattati: niente frecce di base, misure indipendenti dal passaggio, interruttore «Mostra tutti».
- `studio/scripts/check-responsive.mjs`: sul telefono la mappa personale si apre nelle schede (prima si apriva nello schema).
- Nuovi file:
  - `studio/scripts/check-mappa-personale.mjs`, eseguibile con `npm run check:mappa` e aggiunto a `check:build`;
  - `studio/scripts/lib/segni-mappa.mjs`, che genera circa 300 segni di prova per testo, e in più il caso «denso».
- Non toccati: `Percorso.tsx`, i contenuti, i dati salvati e il formato dei segni.

## Controllo nel browser (`check-mappa-personale`)

Configurazioni: Chromium e WebKit su PC 1366×860, iPad Pro 11 in orizzontale e iPhone 16 (WebKit). Su ognuna, le 6 materie con circa 300 segni ciascuna; Filosofia M-Z è in tema scuro. In tutto 969 controlli, tutti superati.

Per ogni materia e configurazione si verifica che:
- le schede della stessa sezione stiano sulla stessa riga: almeno 3 per riga su PC e iPad, 2 sul telefono, mai più di 4, righe regolari;
- le schede chiuse non superino i 150 px di altezza;
- non ci siano frecce né etichette prima del passaggio;
- al passaggio o al tocco si accendano solo i collegamenti della scheda;
- nessuna etichetta stia sopra una scheda o sopra un'altra etichetta;
- l'elenco abbia tante voci quante sono le frecce, con lo stesso numero e lo stesso colore;
- la scheda aperta mostri tutto il testo;
- al mouse i collegamenti si spengano all'uscita, e al touch il secondo tocco apra gli Originali;
- «Mostra tutti» accenda tutti i collegamenti senza sovrapposizioni;
- i titoli restino leggibili con «Adatta» (almeno 11 px);
- il pannello del lettore abbia le schede in riga e nessuna freccia di base;
- non ci siano errori in pagina.

**Caso denso.** I 300 segni stanno tutti sulle frasi delle tre lezioni più lunghe di Romano: 44 schede e 53 parti segnate in una sola lezione.

| Misura (PC) | Chromium | WebKit |
|---|---|---|
| Cambio di lezione fino al disegno della lezione densa | 36 ms | 63 ms |
| Accensione dei collegamenti al passaggio (con il giro di Playwright) | 72 ms | 42 ms |
| 40 passaggi rapidi su schede diverse | 462 ms in tutto | 918 ms in tutto |
| Task lungo più lungo (Chromium) | nessuno oltre 50 ms | — |

**Prima apertura della mappa.** Dall'indirizzo alle schede disegnate servono 0,85–0,95 s (privato 1,9 s), su ogni dispositivo. Il tempo è quasi tutto nella preparazione delle sezioni annotate in `useMappaGeometrica`, che non è cambiata. Il pannello del lettore richiede 20–360 ms; per privato 1,4 s al primo calcolo, perché la sua preparazione è più pesante.

## Verifiche

Tutte superate:
- `npx tsc --noEmit -p .`
- `npx vite build`
- `node scripts/check-mappa-geometrica.mjs` (11 scenari)
- `node scripts/check-mappa-corpus.mjs`
- `npm run check:letture`
- `node scripts/check-responsive.mjs` (1392 controlli su 11 dispositivi)
- `node scripts/check-tour.mjs`
- `node scripts/check-mappa-personale.mjs` (969 controlli)

## Schermate (in questa cartella)

- Prima della modifica: `prima-pc-chromium-<materia>.png` (6 materie), `prima-ipad-diritto-romano.png`, `prima-telefono-diritto-romano.png`, `prima-collegamento-acceso.png`.
- Dopo la modifica:
  - `dopo-pc-chromium-<materia>.png` (6 materie; Filosofia M-Z in tema scuro), `dopo-ipad-diritto-romano.png`, `dopo-telefono-diritto-romano.png`;
  - `dopo-collegamento-acceso.png`, cioè un collegamento acceso con etichetta e riquadro;
  - `dopo-denso-acceso.png` e `dopo-denso-mostra-tutti.png`, cioè il caso denso;
  - `dopo-pannello-lettore*.png`, cioè il pannello del lettore su PC, iPad e telefono.

## Dubbi e possibili passi successivi

- Con segni sparsi (uno o due per titolo) molte righe hanno una sola scheda: la mappa resta lunga in verticale, anche se ogni riga è compatta. Se Carlo vuole, i gruppi `###` con una o due schede si potrebbero affiancare.
- La prima apertura per privato (circa 1,9 s con 300 segni) dipende dalla preparazione delle sezioni, non dal layout. Si può ottimizzare a parte.

## Prima apertura più veloce (12 novembre 2026)

Misure con Playwright su `dist/` servito in locale (PC 1366×860, senza service worker), 300 segni di prova per testo (`scripts/lib/segni-mappa.mjs`), mediana di 3 prove in Chromium e 2 in WebKit. «Disegno» = dal cambio dell'indirizzo (o dal clic sul pulsante del pannello) al primo fotogramma con una scheda; «completa» = fino alla scomparsa di «Lettura della struttura dei testi…».

| Caso | Prima: disegno | Prima: completa | Dopo: disegno | Dopo: completa |
|---|---|---|---|---|
| Privato, pagina Mappa, Chromium | 1.541 ms | 1.881 ms | 120 ms | 562 ms |
| Costituzionale, pagina Mappa, Chromium | 699 ms | 898 ms | 113 ms | 635 ms |
| Romano, pagina Mappa, Chromium | 565 ms | 876 ms | 95 ms | 511 ms |
| Privato, pagina Mappa, WebKit | 1.598 ms | 1.890 ms | 182 ms | 685 ms |
| Costituzionale, pagina Mappa, WebKit | 829 ms | 877 ms | 199 ms | 755 ms |
| Romano, pagina Mappa, WebKit | 652 ms | 874 ms | 161 ms | 580 ms |
| Privato, pannello del lettore (primo), Chromium / WebKit | 1.552 / 1.590 ms | — | 152 / 103 ms | — |
| Costituzionale, pannello (primo), Chromium / WebKit | 731 / 822 ms | — | 153 / 135 ms | — |
| Romano, pannello (primo), Chromium / WebKit | 580 / 679 ms | — | 132 / 118 ms | — |

Aperture successive: pagina Mappa 28–38 ms (Chromium) e 55–72 ms (WebKit), come prima; pannello riaperto 68–93 ms (Chromium) e 92–116 ms (WebKit, compreso il giro del clic di Playwright; prima 105–140 ms). Nessun task oltre i 55 ms.

**Dove andava il tempo** (profilo CPU di Chromium, privato):
- 830 ms in `collegaArticoli`: per **ogni blocco** ricostruiva l'insieme degli articoli noti del Codice civile (migliaia di voci). Per questo privato era il doppio delle altre materie.
- 220 ms nella preparazione dei blocchi (`renderMd`, pulizia dell'HTML) e 250 ms negli alberi delle sezioni (`semanticaGeometrica`, `strutturaBlocco`): la mappa compariva solo dopo aver fatto **tutte** le sezioni annotate.

**Correzioni** (nessun cambiamento dei dati salvati né del risultato finale della mappa):
- `letture-client.ts`: articoli noti calcolati una volta per atto (`articoliNoti`, in cache); `collegaArticoli` esce subito da un blocco senza «art»; `sezioniArrivate` (sezioni già scaricate, leggibili senza attesa) e `blocchiGiaPronti`.
- `letture-hooks.ts`: caricamento in due tempi. Prima si preparano e si disegnano la lezione aperta nel lettore (`useMappaGeometrica(chiave)`) e le prime due del testo; le altre si preparano a lotti dopo il primo fotogramma, con l'avviso «Lettura della struttura dei testi…» finché non hanno finito. Nel disegno si preparano solo le sezioni della vista iniziale; riaprendo la mappa le sezioni già arrivate sono subito nello stato.
- `MappaGeometrica.tsx`: la lezione mostrata è quella scelta dall'elenco oppure, finché non se ne sceglie una, quella aperta nel lettore all'apertura o la prima: si assesta mentre le lezioni arrivano.
- `LettoreTesto.tsx`: il pannello passa la sezione aperta come priorità.
- `check-mappa-personale.mjs`: prima di misurare il layout e il caso denso aspetta che la mappa sia completa.

Verifiche superate: `npx tsc --noEmit -p .`, `npx vite build`, `check-mappa-personale` (969 controlli), `check-mappa-geometrica` (11 scenari), `check-mappa-corpus`, `check-segni-migrati`, `npm run check:letture`.
