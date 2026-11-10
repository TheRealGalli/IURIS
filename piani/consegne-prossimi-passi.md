# Consegne: portare le materie al livello di Diritto romano

Scritto il 10 novembre 2026 per chi riprende il lavoro (ChatGPT/Codex). Leggi prima [`AGENTS.md`](../AGENTS.md).
**Diritto romano è il modello (100%)**: per ogni passo guarda come è fatto lì e replica formato e densità.

Regole valide per tutti i passi:

- Un passo alla volta, nell'ordine. A fine passo: `cd studio && npm run build && npm run check:build`, poi commit
  in italiano e push su `main`. Mai push senza controlli verdi. Mai includere `studio/src/views/Percorso.tsx`.
- `export PATH=/usr/local/bin:$PATH` per node; per gli script Python con pypdf usa `/usr/bin/python3` o il
  `python3` senza quel PATH.
- Non inventare: ciò che non è verificato va detto in `noteRedazione`. Norme recenti: verifica su Normattiva.
- Aggiorna a fine passo la tabella qui sotto (colonna «Stato») e i numeri in `README.md` e `INDICE.md`.

| Passo | Che cosa | Stato |
|---|---|---|
| 1 | Glossario degli Originali di privato | Completato: 361 voci, 476 etichette; collegamenti ripetuti nei capoversi |
| 2 | Più domande per privato | Completato: 392 nuove domande, 1.426 totali; tutte le 98 lezioni hanno almeno 14 domande |
| 3 | Schede inverse di privato | Completato: 333 schede curate, con copertura di tutte le 27 unità |
| 4 | Stile delle unità 12–27 di privato | Completato: revisionate 67 lezioni, precisate 64 sintesi; tutte entro 550 parole |
| 5 | Quadro di privato e di Filosofia | Completato: 20 schemi, 7 di privato, 6 di Filosofia LMG e 7 di Filosofia SSG |
| 6 | Approfondimenti («oltre») | Avviato (Claude, 11 nov.): 40 voci di Diritto privato in `oltre-10.json`, 61 di Filosofia SSG in `oltre-10.json` (riprese da Filosofia LMG). Da fare: altre voci di privato, Costituzionale (ne ha 16). Usare numeri di file nuovi, non questi |
| 7 | Filosofia SSG: più voci | Primo giro fatto (Claude, 11 nov.): 48 voci nuove in `oltre-11.json` (293 in tutto), premesse in `glossario.json`, etichette per gli Originali. Manca l'`abbina` dell'unità 16 e un secondo giro sui concetti |
| 8 | «art. N Cost.» da privato alla Costituzione | Fatto (Claude, 11 nov.): il collegamento cambia materia e apre l'articolo, se il corso ha Diritto costituzionale |

## 1. Glossario degli Originali di privato (il più visibile)

Problema: negli Originali di privato i termini collegati al glossario sono pochi. Romano e Filosofia hanno un
elenco curato (`studio/letture-src/glossario-diritto-romano.json`: `[{ "id": "...", "etichette": ["...", "..."] }]`)
che collega il termine **in ogni paragrafo**; privato non ce l'ha e collega solo la prima occorrenza per sezione.

- Crea `studio/letture-src/glossario-diritto-privato.json` con le voci più importanti (almeno 200 delle 503):
  per ciascuna le forme con cui compare nella dispensa (singolare, plurale, sinonimi, latino). Solo etichette di
  almeno 4 caratteri e non ambigue («causa», «termine», «parte» collegano troppo: usale solo in forma estesa,
  es. «causa del contratto»).
- Aggiungi `alias` alle voci nelle unità (`@concetto id|Nome|tipo|alias;alias|…` nei sorgenti) quando la dispensa
  usa un nome diverso.
- Poi `node scripts/sync-content.mjs && node scripts/sync-letture.mjs` e controlla a campione tre sezioni nel
  browser (porta 7101): i collegamenti devono essere giusti, non solo tanti.

## 2. Più domande per privato

Il passo 1 introduce `glossario-diritto-privato.json`, con locuzioni, plurali e varianti di apostrofo. Le parole
polisemiche sono escluse come etichette isolate; aggiunti nei sorgenti gli alias «datio in solutum»,
«responsabilità contrattuale», «responsabilità aquiliana», «promessa di pagamento» e «ricognizione di debito».
Corretto anche il sync: le etichette curate si collegano una volta per capoverso, le automatiche una volta per
sezione. Copertura degli Originali e testo di fonte conservati. Build e `check:build` riusciti, inclusi 1.348
controlli su 11 dispositivi; verificate nel browser proprietà (u08-l1), novazione (u13-l3) e legittimari (u26-l3).
I collegamenti di privato passano da 356 a 3.497.

Oggi circa 10 domande per lezione; Romano ne ha 15. Porta ogni lezione ad almeno 14: aggiungi soprattutto
**casi pratici** (multipla: «Tizio vende a Caio…»), vero/falso sulle confusioni tipiche e completa sui termini.
Si aggiungono in fondo alla sezione `@domande` del sorgente `sorgenti/uNN.txt`, poi
`python3 piani/strumenti/unita.py …` e `validate-content.mjs`. Nei completa niente numeri scritti in lettere.

Passo 2: aggiunte quattro domande a ciascuna lezione, con 196 multiple, 98 vero/falso e 98 completamenti.
Totale: **1.426 domande**, almeno 14 per ciascuna delle 98 lezioni (16 nelle prime lezioni che ospitano anche
ordina e abbina). Posizioni delle risposte corrette delle nuove multiple bilanciate: 49 per ciascun indice.
Le 1.034 domande precedenti, compresi identificativi e risposte, sono conservate integralmente; invariati
sintesi, voci e mappe. Sostituiti i nuovi completamenti che ripetevano la risposta di uno già presente nella
stessa lezione. Validazione delle 27 unità senza errori, build e `check:build` riusciti, inclusi 1.348 controlli
su 11 dispositivi. Verificata l'identità delle 1.426 domande nella versione compilata; risolte correttamente
24 nuove domande nel browser (u01-l1, u17-l2, u26-l4 a 393 e 1280 px), senza sbordi né errori.
Le schede inverse sono documentate nel passo seguente.

## 3. Schede inverse di privato

Formato e regole in `studio/CONTENUTI.md`; esempio: `Diritto Costituzionale/05 - Contenuti/schede-inverse.json`
e `Filosofia del Diritto SSG/05 - Contenuti/schede-inverse.json`. Una scheda per le voci principali (almeno 250):
dalla definizione al nome. Attenzione agli alias uguali tra voci diverse: il sync si ferma.

Passo 3: creato `Diritto Privato/05 - Contenuti/schede-inverse.json` con **333 definizioni curate** di voci
principali, distribuite su tutte le 27 unità. Selezionati istituti e distinzioni riconoscibili; le definizioni
non contengono il termine atteso o i suoi alias e non sono duplicati fra loro. Le 1.426 domande delle lezioni
restano invariate; le nuove carte hanno identificativi `glossario-inversa-…`.
Validazione e compilazione delle 333 carte riuscite; verificata l'identità delle 1.426 domande delle lezioni.
Completate 12 prove di ripasso nel browser, su telefono e desktop, con salvataggio delle nuove carte.
Build e `check:build` superati, inclusi 1.348 controlli su 11 dispositivi senza sbordi.
Il passo successivo è documentato sotto.

## 4. Stile delle unità 12–27 di privato

Sono corrette ma vaghe: troppe formule come «nei termini di legge», «nei presupposti previsti», «secondo la
disciplina» (32 volte nell'unità 25). Sostituiscile con la regola precisa (termine, soggetto, effetto) presa
dall'articolo, che ora è nel Codice dell'app aggiornato a Normattiva (`05 - Contenuti/norme/libro-*.json`).
Modello di tono: `sorgenti/u11.txt`. Non cambiare la sostanza; non allungare oltre 550 parole per lezione.

Passo 4, 10 novembre 2026: rilette tutte le **67 lezioni** delle unità 12–27; precisate **64 sintesi**.
Sostituiti i rinvii generici con soggetto, termine, presupposto ed effetto: valuta estera, eccezioni nella
delegazione, offerta al creditore, mora degli eredi, pegno e ipoteca, forma e nomina, rimedi contrattuali,
recesso e garanzia del consumatore, contratti speciali, titoli, famiglia, successioni e donazioni.
Le altre tre sintesi non richiedevano interventi. Nessuna supera **550 parole**; sorgenti e JSON sono allineati.
Precisate anche tre voci e due risposte di flashcard collegate. Identificativi, ordine e numero di lezioni,
concetti ed esercizi sono conservati; restano **1.426 domande** e **333 schede inverse**.
Riferimenti puntuali nelle `noteRedazione` delle 16 unità, interne e non mostrate allo studente.

Riscontro principale: articoli dei sei libri del Codice civile locale, allineati a Normattiva nel passo
precedente. Per le discipline esterne, consultati i portali ufficiali:
[ritardi commerciali](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=002G0265&atto.dataPubblicazioneGazzetta=2002-10-23&tipoDettaglio=vigente),
[pegno non possessorio e patto marciano](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=16G00076&atto.dataPubblicazioneGazzetta=2016-05-03&tipoDettaglio=vigente),
[prelazione agraria](https://www.normattiva.it/atto/caricaDettaglioAtto?atto.codiceRedazionale=065U0590&atto.dataPubblicazioneGazzetta=1965-06-09&tipoDettaglio=vigente),
[sanzioni e pagamento tardivo degli assegni](https://prefettura.interno.gov.it/sites/default/files/64/2024-06/legge-15-dicembre-1990-n-386.pdf).

Controlli: validazione delle 16 unità senza errori, build e `check:build` riusciti, inclusi **1.348 controlli
su 11 dispositivi**. Verificate nel browser le sintesi più lunghe di tutte le 16 unità a 393 e 1280 px:
**32 prove** su testo, titoletti, tabelle, collegamenti e assenza di sbordi, senza errori del browser.
Confrontate tutte le 67 lezioni compilate con i file revisionati e controllata la conservazione degli
identificativi, dei conteggi e delle domande precedenti, salvo le due risposte esplicitamente precisate.

Il passo successivo è documentato sotto.

## 5. Quadro (vista d'insieme in Mappa)

Formato in `studio/CONTENUTI.md`; esempi: `Diritto Costituzionale/05 - Contenuti/quadro.json` e
`Diritto Romano /05 - Contenuti/quadro.json`. Da fare per **Diritto privato** (schemi: fonti e gerarchia;
situazioni soggettive; diritti reali; vicende dell'obbligazione; invalidità del contratto a confronto; successioni
e quote) e per le due **Filosofia del diritto**.

Passo 5, 11 novembre 2026: creati i tre `quadro.json`, con **20 schemi** in Mappa → Quadro.
Ogni rete ha anche un elenco testuale di confronto per la lettura sul telefono; i concetti collegati
appartengono alla stessa materia. Le due Filosofie conservano i propri programmi e identificativi.

- **Diritto privato (7)**: fonti e gerarchia, situazioni soggettive, diritti reali, vicende dell'obbligazione,
  invalidità e rimedi, percorso successorio, confronto fra quote legali e riserva. Le quote dichiarano i
  familiari concorrenti e la massa di calcolo; fonti UE e autonomia privata sono spiegate a lato della piramide.
- **Filosofia LMG (6)**: classificazioni del dovere, validità degli atti e delle norme, parola e status deontico,
  persona e Stato in Moro, forme della coesistenza e tre prospettive della giustizia in Cotta.
- **Filosofia SSG (7)**: confronto Kelsen–Ross–Hart, ordinamento a gradi, fatti istituzionali di Searle e
  documentalità, punti di vista e osservanza, governance e dispositivi, spettatore giuridico, riassunto di Incampo.

Contenuti ricavati dalle lezioni e voci già presenti: per privato, unità 1–3, 8–9, 11–20, 26–27 e articoli
del Codice civile dell'app; per LMG, Incampo (unità 1–7), Moro (9–11) e Cotta (12–14); per SSG, lezioni
1–16 e riassunto di Incampo (18–20), con richiamo distinto all'approfondimento sul cinema fuori esame.
Il Quadro aggiunge una vista di sintesi: lezioni, esercizi, identificativi e progressi non vengono modificati.

Controlli eseguiti su una copia pulita di `main` con le sole aggiunte del passo 5, per separare il lavoro
da modifiche concorrenti su Filosofia SSG. Build e `check:build` riusciti, inclusi **1.348 controlli su
11 dispositivi**. Verificati nella versione compilata tutti i **20 schemi e 113 riferimenti ai concetti**;
lezioni e domande conservate dopo la normale risoluzione degli alias. Nel browser completate **60 prove**
(ogni schema a 320, 393 e 1280 px) su apertura delle schede, testo, collegamenti, geometria delle reti e
assenza di sbordi della pagina; nessun testo fuori dai nodi o etichetta sopra i nodi, nessun errore del browser.

Ripartire dal **passo 6: approfondimenti «oltre»**.

## 6. Approfondimenti («oltre»)

Formato `oltre-NN.json` in `studio/CONTENUTI.md`; esempio `Diritto Costituzionale/05 - Contenuti/oltre-01.json`,
modello di ricchezza: quelli di Diritto romano. Ordine: Diritto privato (una decina di voci per blocco:
proprietà, possesso, obbligazione, contratto, nullità, responsabilità civile, famiglia, successioni), poi
Costituzionale, poi Filosofia SSG. Solo contenuti verificabili, con la fonte.

## 7. Filosofia SSG: più voci

Ha 245 voci su 77 lezioni (3 per lezione; Romano 5,6). Aggiungi le voci che le lezioni usano ma non definiscono
(autori, opere, concetti), con `premessa` per le persone. Manca anche un `abbina` nell'unità 16.

## 8. «art. N Cost.» da privato alla Costituzione

Negli Originali gli articoli si collegano all'atto della materia (`collegaArticoli` in
`studio/src/lib/letture-client.ts`). Da privato un «art. 3 Cost.» non apre nulla, perché la Costituzione sta in
Diritto costituzionale. Serve un collegamento che cambi materia e apra `/norme/3`: guarda come `scegliMateria`
funziona in `studio/src/App.tsx`. Farlo solo se le materie del corso scelto comprendono Diritto costituzionale.

## Fuori elenco (servono materiali di Carlo)

Costituzionale SSG e le materie di LMG M-Z: non si possono fare finché non arrivano gli appunti. Per Diritto
romano LMG A-L va solo indicato il docente giusto in `studio/src/data/corsi.ts` quando Carlo lo comunica.

## Nota dell'11 novembre 2026 (Claude)

- **Due assistenti nella stessa cartella**: l'11 novembre Claude e ChatGPT hanno lavorato insieme sugli stessi file.
  Prima di scrivere un file controlla `git status` e `git log -3`; non riscrivere file che non hai creato tu in
  questa sessione; per i file `oltre-NN.json` scegli sempre un numero libero.
- Al Quadro di ChatGPT sono stati aggiunti tre schemi: «Il diritto privato nel tempo» (privato), «Perché devo
  seguire le regole?» e «Gli autori del corso nel tempo» (Filosofia SSG).
- Le 40 voci di `Diritto Privato/05 - Contenuti/oltre-10.json` citano sentenze e date da conoscenza di manuale
  (Cass. S.U. 500/1999, 13533/2001, 26972/2008, 26242/2014, 18287/2018 e altre): non sono state ricontrollate una
  per una su una banca dati. Chi le amplia verifichi numero e anno.
- Gli approfondimenti di Filosofia SSG in `oltre-10.json` sono ripresi da quelli di Filosofia LMG per le 61 voci
  comuni, tolte le frasi su Cotta e Moro, che nel corso SSG non ci sono.
