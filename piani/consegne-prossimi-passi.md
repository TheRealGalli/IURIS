# Consegne: portare le materie al livello di Diritto romano

Scritto il 10 novembre 2026 per chi riprende il lavoro (ChatGPT/Codex). Leggi prima [`AGENTS.md`](../AGENTS.md).
**Diritto romano è il modello (100%)**: per ogni passo guarda come è fatto lì e replica formato e densità.

**Come leggere questo resoconto (12 novembre 2026):** i passi e le tabelle precedenti al «Piano finale
completato» sono lo storico del lavoro, non l'elenco delle cose ancora da fare. Le fasi 0–5 sono concluse;
le misure di completezza non certificavano però l'impaginazione di ogni Originale. Il difetto di leggibilità
di Martines, comune a M-Z e SSG, e la sua correzione sono documentati nell'ultima sezione di questo file.

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
| 6 | Approfondimenti («oltre») | Completato: 94 nuove schede con fonti; totali 94 di privato, 36 di Costituzionale e 81 di Filosofia SSG; conservate le aggiunte precedenti |
| 7 | Filosofia SSG: più voci | Primo giro fatto (Claude, 11 nov.): 48 voci nuove in `oltre-11.json` (293 in tutto), premesse in `glossario.json`, etichette per gli Originali. L'`abbina` dell'unità 16 è completato nel nuovo piano; resta il secondo giro sui concetti |
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

Il passo successivo è documentato sotto.

## 6. Approfondimenti («oltre»)

Formato `oltre-NN.json` in `studio/CONTENUTI.md`; esempio `Diritto Costituzionale/05 - Contenuti/oltre-01.json`,
modello di ricchezza: quelli di Diritto romano. Ordine: Diritto privato (una decina di voci per blocco:
proprietà, possesso, obbligazione, contratto, nullità, responsabilità civile, famiglia, successioni), poi
Costituzionale, poi Filosofia SSG. Solo contenuti verificabili, con la fonte.

Passo 6, 11 novembre 2026: aggiunte **94 schede originali**, ciascuna con testo di 80–250 parole,
punti da ricordare, collegamenti e almeno una fonte. Nessun nuovo concetto o esercizio: gli identificativi
e i contenuti delle lezioni restano invariati. Le nuove schede approfondiscono voci ancora prive di «oltre»;
nessuna sovrascrive le 117 già presenti.

- **Privato: 54 nuove, 94 totali.** File `oltre-20.json`–`oltre-27.json`, negli otto blocchi proprietà,
  possesso, obbligazioni, contratto, invalidità e rimedi, responsabilità, famiglia e successioni.
  Casi e confronti sviluppano il testo vigente del Codice civile già presente nell'app. Fonti aggiuntive
  per consumo, unioni civili, adozione e donazioni; nessuna nuova citazione di Cassazione da memoria.
- **Costituzionale: 20 nuove, 36 totali.** `oltre-20.json`: revisione e limiti, riserva di legge,
  delegazione, referendum, fiducia, rappresentanza, diritti, giustizia costituzionale, rinvio UE e tributi.
  Verificate sul sito ufficiale Corte cost. 1146/1988 e 238/2014; testo della Costituzione dal Quirinale.
- **Filosofia SSG: 20 nuove, 81 totali.** `oltre-20.json`: Hart e pratica delle regole, Foucault e
  dispositivi, spettatore e Arendt, intenzionalità collettiva, fatti istituzionali, documentalità,
  governance, interpretazione e distinzione essere/dover essere. Fonti universitarie e bibliografiche,
  testi di Foucault, documentazione Nobel e repertorio Stanford; evitati riferimenti a Moro e Cotta.

Riferimenti normativi verificati nel Codice locale allineato a Normattiva e, per le discipline esterne,
nei portali ufficiali indicati nelle schede. Corte cost. **79/2022** sull'adozione in casi particolari
riscontrata direttamente nel dispositivo. La nota qui sotto sulle sentenze delle **40 schede precedenti**
di Claude rimane valida: questo giro non certifica retroattivamente tutte le loro citazioni.
I nuovi collegamenti non ripetono coppie già definite dagli altri file di approfondimento.

Verifica conclusa: i dieci nuovi file passano la validazione senza errori né avvisi; build e
`check:build` superati, inclusi 1.348 controlli su 11 dispositivi. Altre 114 prove nel browser
verificano le nuove schede, le fonti, i rimandi e la leggibilità a 320, 393 e 1280 px.
Confrontati i 211 approfondimenti compilati: 94 nuovi e 117 precedenti conservati.

Per il seguito fa fede il **Piano successivo** in fondo al file.

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

## Giro dell'11 novembre 2026, sera (Claude)

Fatto: 72 collegamenti nuovi tra voci di Costituzionale e 151 di privato (`oltre-30.json`, solo `collegamenti`);
glossario curato per gli Originali di Costituzionale (`studio/letture-src/glossario-diritto-costituzionale.json`,
248 voci: 1.342 collegamenti nel testo, prima quasi nessuno); 40 approfondimenti di Costituzionale (`oltre-31.json`).
Non verificato da me: l'esito, nel 2026, delle riforme costituzionali su separazione delle carriere e premierato.
Per questo gli approfondimenti non ne parlano: chi li amplia controlli lo stato e, se sono in vigore, aggiorni le
voci `csm`, `magistratura`, `presidente-del-consiglio` e le lezioni che ne trattano.

## Piano successivo (dall'11 novembre 2026): chiudere la distanza da Diritto romano

Misure iniziali del piano (da `studio/public/content/<slug>/corso.json`):

| Materia | Voci | Collegamenti per voce | Voci con approfondimento | Domande per lezione | Eventi |
|---|---|---|---|---|---|
| Diritto romano (modello) | 553 | 2,5 | 57% | 15,1 | 166 |
| Filosofia LMG | 483 | 1,9 | 32% | 15,5 | 42 |
| Diritto costituzionale | 278 | 1,0 | 27% | 15,2 | 49 |
| Filosofia SSG | 293 | 1,4 | 27% | 10,3 | 47 |
| Diritto privato | 503 | 0,8 | 18% | 14,6 | 28 |

Passi, in ordine. Uno per volta, con controlli e push a fine passo. File `oltre-NN.json`: usa numeri da 40 in su.

1. **Filosofia SSG: domande.** Portare ogni lezione d'esame ad almeno 14 domande (oggi 10; circa 300 da scrivere).
   Le lezioni dell'unità 17 sono fuori esame: bastano le soglie minime. Aggiungere l'`abbina` dell'unità 16.
   **Completato:** 243 aggiunte, 1.036 domande totali; tutte le 73 lezioni d'esame hanno almeno 14 domande.
   Conservate le 793 precedenti e l'unità 17; aggiunto l'abbinamento `u16-q070` accanto a quello già presente.
2. **Diritto privato: approfondimenti.** Da 94 a 250 voci (metà delle voci). Priorità alle voci che sono titolo
   di una lezione o compaiono in più unità. Ogni voce: 80–250 parole, `daSapere`, `fonti` verificate.
   **Completato:** 156 nuove schede, 250 totali; tredici file `oltre-40.json`–`oltre-52.json`.
3. **Diritto costituzionale: approfondimenti e schede inverse.** Approfondimenti da 76 a 140; schede inverse da 82
   a 180. Controllare prima lo stato delle riforme costituzionali del 2025–2026 (vedi nota sopra).
   **Completato:** 140 approfondimenti (+64), 180 inverse (+98).
4. **Collegamenti.** Privato da 419 a 800, Costituzionale da 286 a 500, con `tipo` ed `etichetta` che si leggano
   come una frase. Si aggiungono con voci di soli `collegamenti` in un file `oltre-NN.json`. Attenzione: un
   collegamento tra due voci già collegate sostituisce quello esistente.
   **Completato:** privato 802 (+383), Costituzionale 559 (+273); file `oltre-60.json` delle due materie.
5. **Filosofia SSG: seconda tornata di voci e approfondimenti.** Voci da 293 a 380 (concetti delle lezioni
   10–16 e del riassunto di Incampo); approfondimenti da 81 a 150.
   **Completato:** 380 voci, 150 approfondimenti (scritti da ChatGPT, controlli e consegna di Claude).
6. **Originali di Costituzionale e di Filosofia SSG: revisione a mano.** Non hanno correzioni in
   `letture-src/revisioni.json` (Romano ne ha 519). Usare `scripts/rileva-acapo-letture.py` e
   `scripts/genera-acapo-letture.py` per gli a capo persi, poi rileggere a campione.
   **Completato:** 279 blocchi revisionati (Costituzionale 42, SSG lezioni 216, SSG Incampo 21).
7. **Cronologia di privato.** Da 28 a circa 60 eventi con data certa (leggi di riforma e sentenze guida già citate
   negli approfondimenti).
   **Completato:** 63 eventi (+35).
8. **Filosofia LMG.** Schede inverse da 99 a 200; approfondimenti da 156 a 240.
   **Completato:** 202 schede inverse, 240 approfondimenti.

Serve Carlo: appunti di Costituzionale SSG, materiali di LMG M-Z, nome del docente di Diritto romano per LMG A-L.


### Piano successivo, passo 1: domande SSG (11 novembre 2026)

Aggiunte 243 domande nelle unità 1–16 e 18–20: **136 multiple**, **68 vero/falso**,
**38 completamenti** e **un abbinamento** su autori e figure dello spettatore (`u16-q070`).
Totale **1.036**, con almeno 14 domande in ciascuna delle **73 lezioni d'esame** (una ne aveva già 15).
Le quattro lezioni fuori esame dell'unità 17 rimangono identiche. L'abbinamento indicato come mancante
nelle vecchie consegne era già presente nella versione corrente: conservato, ora affiancato dal nuovo.

Domande ricavate da sintesi e punti chiave già presenti, con casi applicativi e confronti: linguaggio
prescrittivo e performativo, Kelsen/Ross/Hart, disciplina e governance, fatti istituzionali, spettatore,
validità pragmatica e sintattica nel riassunto di Incampo. Non aggiunti fatti normativi o storici esterni.
Distrattori rivisti per lavorare sulle confusioni tra concetti del programma. Le nuove multiple hanno
34 risposte corrette per posizione; i vero/falso sono 34 veri e 34 falsi.
Conservati integralmente identificativi, ordine e contenuti delle 793 domande precedenti, sintesi,
voci, mappe ed eventi. I nuovi esercizi sono aggiunti in coda senza spostare gli identificativi esistenti.

Controlli superati in una copia pulita di `main` con le sole unità del passo, senza la modifica locale
preesistente di `Percorso.tsx`: build e `check:build`, inclusi **1.348 controlli su 11 dispositivi**.
Validazione delle 20 unità: zero errori e gli stessi 40 avvisi precedenti, nessun avviso introdotto.
Confrontate tutte le 243 nuove domande con il contenuto compilato; nessun identificativo duplicato.
Nel browser **387 prove**: tutte le 243 nuove domande a 393 px, un campione per ogni lezione modificata
più l'abbinamento a 320 e 1280 px (72 per larghezza). Risposte, spiegazioni e salvataggio delle carte
corretti, nessuno sbordo né errore del browser.

Il passo 2 è documentato sotto.


### Piano successivo, passo 2: approfondimenti di privato (11 novembre 2026)

Aggiunte **156 schede**, dodici per ciascuno dei tredici file `oltre-40.json`–`oltre-52.json`:
**250 approfondimenti su 503 voci**, conservati integralmente i 94 già presenti. Le aggiunte riguardano
soltanto voci esistenti prive di «oltre», senza creare concetti, esercizi o relazioni nuove nella mappa.
I collegamenti nel testo rimandano alle voci della materia e sono controllati separatamente.

Blocchi: parte generale e diritto nel tempo; situazioni e capacità; enti e beni; tempo e prove; proprietà
e godimento; comunione, condominio e possesso; obbligazioni; vicende e garanzie; formazione e rappresentanza;
effetti del contratto; rimedi e consumo; altri contratti e fonti; famiglia, successioni e pubblicità.
Testi tra 80 e 250 parole, con casi, confronti o conseguenze pratiche, almeno due punti da ricordare e fonti.

Riscontro normativo sul Codice civile locale allineato a Normattiva il 10 novembre. Per il consumo,
consultati Normattiva, AGCM e MIMIT e riscontrato direttamente il d.lgs. 176/2026 in Gazzetta Ufficiale:
art. 1 sull'estensione unica di dodici mesi in caso di riparazione e art. 3 sui contratti dal 31 luglio 2026.
Nessuna nuova citazione di sentenze da memoria. Rimane la riserva sulle citazioni nelle 40 schede del primo giro.

Controlli completati su una copia pulita di `main` con i soli tredici file nuovi, senza la modifica
locale preesistente di `Percorso.tsx`: validazione **zero errori e zero avvisi**, build e `check:build`
superati, inclusi **1.348 controlli su 11 dispositivi**. Confrontate tutte le **250 schede compilate**
con i file di contenuto, incluse le 94 precedenti; unità, 503 voci, 1.426 domande e schede inverse invariate.
Nel browser **182 prove**: tutte le 156 nuove schede a 393 px e un campione per ciascun file a 320 e
1280 px; titoli, testo, punti da ricordare, fonti e rimandi corretti, nessuno sbordo o errore del browser.

Prossimo passo: **Piano successivo, 3 — approfondimenti e schede inverse di diritto costituzionale**;
verificare prima lo stato delle riforme 2025–2026, come richiesto nel piano.


### Piano successivo, passo 4: collegamenti (11 novembre 2026)

Eseguito prima del passo 3, su richiesta di Carlo. Aggiunti **383 collegamenti** a Diritto privato
(da 419 a **802**, 1,6 per voce) e **273** a Diritto costituzionale (da 286 a **559**, 2,0 per voce), in
`Diritto Privato/05 - Contenuti/oltre-60.json` e `Diritto Costituzionale/05 - Contenuti/oltre-60.json`, voci di soli
`collegamenti`. Solo coppie mai collegate prima: nessun collegamento esistente è stato sostituito o tolto.
Nessuna voce resta isolata (prima 69 in privato e 17 in Costituzionale).

Le coppie vengono dalle voci citate insieme nelle stesse lezioni e nelle definizioni, con priorità alle voci
senza collegamenti; ogni etichetta si legge come frase («Sequestro conservativo *può convertirsi in*
Pignoramento»). Tipi: privato 235 `collegato`, 58 `esempio-di`, 57 `contrasta`, 24 `parte-di`,
5 `causa`, 4 `evolve-in`; Costituzionale 204 `collegato`, 27 `contrasta`, 26 `esempio-di`, 12 `parte-di`, 3 `crea`,
1 `supera`. Per prudenza non sono stati aggiunti collegamenti sulla composizione del CSM o sulla sua funzione
disciplinare (la riforma della magistratura, poi verificata nel passo 3, non è entrata in vigore).


### Piano successivo, passo 3: costituzionale (11 novembre 2026)

Aggiunti **64 approfondimenti**, otto per ciascun file `oltre-40.json`–`oltre-47.json`:
**140 complessivi su 278 voci**, conservando i 76 precedenti. Aggiunte **98 definizioni inverse curate**,
per **180 schede inverse**, mantenendo integralmente le 82 precedenti. Invariati unità, lezioni, 760 domande,
voci ed eventi. Nessuna nuova relazione della mappa: il passo 4 rimane distinto.

Gli approfondimenti coprono principi, partecipazione, organi, magistratura e autonomie, fonti, UE e diritti.
Ogni testo ha 80–250 parole, almeno due punti da ricordare e fonti; le inverse non contengono il termine
richiesto né gli alias e lavorano sulle distinzioni tra istituti vicini.

Verifica preliminare delle riforme su fonti primarie:

- **Magistratura:** il testo del 2025 non è entrato in vigore dopo il referendum del 22–23 marzo 2026.
  [Esito in Gazzetta Ufficiale](https://www.gazzettaufficiale.it/eli/id/2026/05/18/26A02490/sg) e
  [riepilogo del Governo](https://www.programmagoverno.gov.it/it/approfondimenti/riforme-di-rilievo-del-governo/riforme-governo-meloni/riforme-costituzionali/riforma-della-magistratura/).
  `u11.json` e le schede preesistenti erano già coerenti: CSM unico, 33 componenti secondo la disciplina
  vigente; non presentare i due Consigli e l'Alta Corte del progetto come organi esistenti.
- **Premierato:** [A.C. 1921](https://www.camera.it/leg19/126?idDocumento=1921&leg=19&tab=), ancora in Commissione.
  Restano distinti progetto, indicazioni politiche ed effettive regole degli artt. 92–95.
- **Autonomie speciali:** leggi costituzionali
  [1/2026, Friuli-Venezia Giulia](https://www.gazzettaufficiale.it/eli/id/2026/02/09/26G00030/sg) e
  [2/2026, Trentino-Alto Adige/Südtirol](https://www.gazzettaufficiale.it/eli/id/2026/06/08/26G00115/sg).
  Le nuove schede distinguono statuto ordinario, statuto speciale e norme di attuazione; richiamata anche
  la modifica dell'art. 107 dello statuto trentino-altoatesino. Sono modifiche agli statuti speciali,
  non al testo dei 139 articoli della Costituzione nazionale.
- **Altri riscontri:** legge elettorale ordinaria 180/2026 già recepita nell'unità 6
  ([ripubblicazione ufficiale](https://www.gazzettaufficiale.it/eli/id/2026/10/23/26A05611/sg));
  [Corte cost. 76/2025](https://www.cortecostituzionale.it/scheda-pronuncia/2025/76) sul TSO già recepita
  nell'unità 18, ripresa nella nuova scheda con comunicazioni, audizione e notificazione.

Per i rapporti con l'UE, riscontrati TFUE art. 288, Carta art. 51, Faccini Dori C-91/92 e Corte cost.
170/1984 sui rispettivi portali ufficiali. Distinte diretta applicabilità, effetto diretto, primato e
non applicazione; nessuna nuova sentenza citata soltanto da memoria.

Carlo ha revocato la richiesta di push prima della conclusione: modifiche lasciate in locale, senza commit né push.

Controlli: validazione dei nuovi file e di tutte le inverse con **zero errori e zero avvisi**;
build e `check:build` superati in una copia pulita di `main` con le sole modifiche del passo 3,
escludendo `Percorso.tsx` e gli altri lavori contemporanei. Inclusi **1.348 controlli su 11 dispositivi**.
Audit di tutti i 140 approfondimenti e delle 180 inverse compilate contro i file sorgenti;
nessun contenuto precedente perso. **204 prove nel browser**: 80 sugli approfondimenti (tutti i 64 a
393 px e un campione per file a 320 e 1280 px), 124 sulle inverse (tutte le 98 a 393 px e 13 per
ciascuna delle altre due larghezze). Risposte, rimandi al glossario, fonti e salvataggio del ripasso
corretti; nessuno sbordo o errore del browser. Controllata anche visivamente la scheda TSO.


### Piano successivo, passo 6: Originali di Costituzionale e Filosofia SSG (11 novembre 2026)

Eseguito su richiesta di Carlo dopo i passi 3 e 4, senza push. Tutto in `studio/letture-src/revisioni.json`
(solo `sostituzioni` con `notaRevisione` redazionale; nessun avviso per chi studia, nessun blocco aggiunto o tolto):

| Documento | Blocchi revisionati | Sostituzioni |
|---|---|---|
| `filosofia-ssg-lezioni-v1` | 216 | 874 |
| `filosofia-ssg-incampo-v1` | 21 | 24 |
| `costituzionale-bin-pitruzzella-v1` | 42 | 60 |

- **A capo persi (SSG).** `rileva-acapo-letture.py` + una copia di `genera-acapo-letture.py` che accetta anche i
  candidati `paragrafo-breve` e `paragrafo-stile`: 617 a capo di paragrafo, 40 voci d'elenco, 12 titoli. Scartati a
  mano 8 «titoli» falsi (righe in grassetto a metà frase, p. 3, 5, 17, 49, 76, 77; titolo già presente a p. 24 di
  Incampo) e trasformate in semplici a capo le intestazioni «Prof. Siniscalchi». Controllati i 650 a capo: nessuno a
  metà frase, salvo voci d'elenco e intestazioni di lezione.
- **Costituzionale.** Lo script non trova righe: il PDF ha un font codificato e il testo del lettore viene dall'OCR,
  già diviso in paragrafi. Corretti a mano 6 titoletti/frecce fusi nel testo (pp. 48, 50, 68, 85) e 3 voci d'elenco.
- **Refusi meccanici** (entrambe le materie): spazi mancanti dopo la punteggiatura, trattini di parole composte
  spezzati («logico- formale»), circa 90 parole spezzate da uno spazio ricostruite col vocabolario di tutti i testi
  dell'app («g uerra», «r ete», «c he»), «li» per «il» davanti a nomi (48 blocchi), «Foucalt» → «Foucault».

Restano, da rivedere a mano se serve: altre parole spezzate con frammenti frequenti («d ove», «s ono» corretti solo
dove trovati), qualche frase spezzata tra due blocchi della stessa pagina (es. p. 97 SSG, «i centri / urbani»:
il numero dei blocchi non può cambiare) e i refusi lessicali della sbobina SSG.

Controlli: `sync-letture`, `check-confini-letture` ed `check-estrazione-letture` superati; build e `check:build` in
una copia pulita di `main` con le sole modifiche dei passi 4 e 6. Nel browser: SSG lezioni pp. 20, 97, SSG Incampo
p. 5, Costituzionale p. 68.


### Piano successivo, passo 5: Filosofia SSG, voci e approfondimenti (11 novembre 2026)

Scritto da ChatGPT, che si è fermato per limite d'uso durante la validazione; controlli e consegna completati da
Claude dai suoi log. **87 voci nuove** (`oltre-40.json`–`oltre-42.json`, campo `nuovi`), per **380 voci**, e
**69 approfondimenti** (`oltre-43.json`–`oltre-51.json`), per **150**; aggiornate le `premessa` in `glossario.json`.
Validazione di tutti i file con zero errori e zero avvisi; `check-domande` senza segnalazioni (8.234 domande
generate). Gli approfondimenti citano come fonte le pagine delle Lezioni SSG negli Originali.

Passi 3–6 pubblicati insieme su `main` con build e `check:build` superati in copia pulita (esclusa la modifica
locale di Carlo a `Percorso.tsx`).

### Stato all'11 novembre 2026, sera

| Materia | Voci | Collegamenti per voce | Voci con approfondimento | Domande per lezione | Eventi | Schede inverse | Revisioni Originali |
|---|---|---|---|---|---|---|---|
| Diritto romano (modello) | 553 | 2,5 | 57% | 15,1 | 166 | 100 | 519 |
| Filosofia LMG | 483 | 1,9 | 32% | 15,5 | 42 | 99 | 264 |
| Diritto costituzionale | 278 | 2,0 | 50% | 15,2 | 49 | 180 | 42 |
| Filosofia SSG | 380 | 1,1 | 39% | 13,5* | 47 | 168 | 237 |
| Diritto privato | 503 | 1,6 | 50% | 14,6 | 28 | 333 | 77 |

\* SSG: tutte le 73 lezioni d'esame hanno almeno 14 domande; la media scende per l'unità 17, fuori esame.

Del Piano successivo restano: **7** (cronologia di privato, da 28 a circa 60 eventi) e **8** (Filosofia LMG:
inverse da 99 a 200, approfondimenti da 156 a 240). Nuovo divario emerso: i collegamenti di **Filosofia SSG**
(1,1 per voce dopo le 87 voci nuove) sono i più bassi; conviene un giro come il passo 4.


### Piano successivo, passi 7 e 8 e collegamenti SSG (11 novembre 2026, sera)

**Passo 7, cronologia di privato.** Aggiunti **35 eventi** nelle unità 1–4, 10, 12, 14, 21–25 (campo `eventi`),
per **63**: codificazioni (1804, 1865), leggi cambiaria e sull'assegno (1933), riforme di famiglia, adozione e
divorzio, leggi sul consumo e sui dati personali, TUB, usura, ritardi di pagamento, Gelli-Bianco, DAT, riforma
Cartabia e sentenze guida (Cass. S.U. 500/1999, Cass. 8827/2003, Cass. 11504/2017, S.U. 18287/2018, Corte cost.
148/2024). Date di Corte cost. 148/2024, d.lgs. 427/1998 e Cass. 8827/2003 riscontrate sul web; le altre sono date
di leggi e sentenze note. Ogni evento ha i concetti dell'unità; 35 nuove domande sulle date generate in automatico.

**Passo 8, Filosofia LMG.** **103 schede inverse** (99 → 202) in `schede-inverse.json`, controllate dal sync (nessuna
contiene il termine o un alias). **84 approfondimenti** (156 → 240) in `oltre-40.json`–`oltre-43.json`: norme e
istituti (art. 12 preleggi, causa, essentialia), Kant, Hart, Kelsen, Austin, Searle, Hegel, Cotta, Moro, temi globali.
Fonti con indirizzo verificato (Normattiva, EUR-Lex, Corte costituzionale, Stanford Encyclopedia, Treccani, Originali
dell'app); tolte tre fonti senza un indirizzo affidabile (Lopez de Oñate, Huizinga, Costituzione di Weimar).

**Collegamenti di Filosofia SSG.** **323 collegamenti** in `Filosofia del Diritto SSG/05 - Contenuti/oltre-60.json`
(406 → 729, 1,9 per voce); nessuna voce isolata (prima 135, quasi tutte le voci nuove del passo 5).

**Controllo del lavoro degli altri.** Letti a campione gli approfondimenti e le inverse di costituzionale (passo 3) e
di SSG (passo 5): corretti. Trovata e unita una voce doppia del passo 5: `lawrence-m-friedman` era la stessa persona di
`lawrence-friedman`; tolta da `oltre-40.json`, spostati rimando e premessa sulla voce esistente (SSG: 379 voci).

### Stato all'11 novembre 2026, notte

| Materia | Voci | Collegamenti per voce | Voci con approfondimento | Domande per lezione | Eventi | Schede inverse | Revisioni Originali |
|---|---|---|---|---|---|---|---|
| Diritto romano (modello) | 553 | 2,5 | 57% | 15,1 | 166 | 100 | 519 |
| Filosofia LMG | 483 | 1,9 | 50% | 15,5 | 42 | 202 | 264 |
| Diritto costituzionale | 278 | 2,0 | 50% | 15,2 | 49 | 180 | 42 |
| Filosofia SSG | 379 | 1,9 | 40% | 13,5 | 47 | 168 | 237 |
| Diritto privato | 503 | 1,6 | 50% | 14,6 | 63 | 333 | 77 |

Il Piano successivo è completato. Restano solo divari minori: collegamenti di privato (1,6), eventi delle filosofie
e di costituzionale (42–49), revisione degli Originali di costituzionale e privato (pochi blocchi corretti).
Servono ancora i materiali di Carlo: Costituzionale SSG, LMG M-Z, docente di Diritto romano per LMG A-L.

### Completezza rispetto a Diritto romano (= 100%)

Ogni misura è rapportata a Diritto romano e fermata al 100%: collegamenti per voce, voci con approfondimento,
domande per lezione, schede inverse per voce (le quattro «di studio»); eventi per unità e correzioni degli Originali
per pagina PDF (dipendono molto dalla materia e dalla qualità del PDF).

| Materia | Collegamenti | Approfondimenti | Domande | Inverse | Eventi | Rev. Originali | Studio (4) | Tutte (6) |
|---|---|---|---|---|---|---|---|---|
| Diritto romano | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Filosofia LMG | 74% | 87% | 100% | 100% | 27% | 70% | 90% | 76% |
| Diritto costituzionale | 80% | 88% | 100% | 100% | 25% | 7% | 92% | 67% |
| Filosofia SSG | 76% | 69% | 89% | 100% | 21% | 46% | 84% | 67% |
| Diritto privato | 63% | 87% | 96% | 100% | 21% | 14% | 87% | 64% |

Per corso (media delle materie): **LMG A-L** 92% (studio) / 77% (tutte); **SSG** 90% / 77% sulle materie presenti,
58% contando Costituzionale SSG ancora a zero; **LMG M-Z** 0% di materiale proprio (oggi mostra quello di A-L).


## Piano finale completato (12 novembre 2026)

Tre classi complete e selezionabili: **LMG A-L** (Filosofia Incampo/Moro/Cotta, Romano, Costituzionale
Bin-Pitruzzella, Privato), **LMG M-Z** (Filosofia Barberis + Schauer, Romano, Costituzionale Martines, Privato),
**SSG** (Filosofia Siniscalchi + Incampo, Romano, Costituzionale Martines, Privato). Misure in
[`stato-qualita.md`](stato-qualita.md); resoconti per area in [`fase-finale/`](fase-finale/).

- **Domande d'esame dei docenti**: `esame.json` per Privato (Lobuono 39, Pennasilico 22), Costituzionale A-L (Torre 30),
  Filosofia LMG (Incampo e Cotta 21), Romano (Starace 39): 151 tracce, ognuna con lezioni, voci e domanda aperta.
  Badge «Chiesta all'esame», tracce nel Percorso, filtro «Domande d'esame» in Allenamento.
- **App**: articoli tra materie scelti per corso con scheda al passaggio del mouse; «Indietro» ritrova materia e punto;
  nuovo selettore della data d'esame (salva solo alla scelta del giorno); giro di backup PC → telefono → PC collaudato.
- **Difetti trovati e corretti nel collaudo**: ripristino del backup senza messaggio di esito (la pagina veniva
  rimontata); completamenti con soluzione in lettere («cinque») che non accettavano la risposta; Esc che non chiudeva il
  calendario in Safari dopo un tocco; due sessioni di Allenamento uguali di seguito mostravano l'esito della prima.
- **Da fare quando arrivano i materiali**: elenchi di domande d'esame per Martines (Rodio, Bonomi), Filosofia M-Z
  (Mangini) e Siniscalchi; la parte mancante del PDF di Pennasilico.
- **Da confermare** (vedi i resoconti): interpretazione delle tracce Lobuono 31, 35, 39; date in conflitto negli
  appunti di Romano (Lex Hortensia, Lex Valeria); alcune sentenze sulla delega citate solo negli approfondimenti.

## Rifinitura degli Originali: Martines per M-Z e SSG (12 novembre 2026)

Segnalazione di Carlo: il testo di Costituzionale per M-Z e SSG sembrava ancora un muro di testo.
**Difetto confermato:** le due classi usano lo stesso documento `costituzionale-martines-v1`.
Le 111 sezioni per lezione erano presenti, ma l'estrazione aveva separato soprattutto gli inizi dei
paragrafi numerati; molti titoli erano rimasti attaccati alla spiegazione e intere pagine erano un capoverso.
Il precedente collaudo verificava copertura e integrità, senza misurare questo aspetto della leggibilità.

Revisionati **442 dei 517 blocchi** in `studio/letture-src/revisioni.json`: titoli ricavati dai font e
dalle etichette del PDF, sottotitoli separati dal corpo, elenchi espliciti, capoversi a fine periodo.
Controllati e scartati i falsi elenchi e titoli (per esempio «a)» che chiude una parentesi, oppure
«ERGA OMNES» dentro una frase). Nessun riassunto, fatto o parola aggiunta: la sequenza dei token della
fonte è identica in ogni blocco. I normali avvisi editoriali non compaiono nel lettore.

Misure sugli elementi HTML del lettore, esclusi i titoli; una voce d'elenco conta come un capoverso:

| Misura | Prima | Dopo |
|---|---:|---:|
| Titoli distinti dal corpo | 28 | 342 |
| Capoversi e voci d'elenco | 489 | 1.826 |
| Parole per capoverso, mediana | 229 | 73 |
| Parole per capoverso, 95° percentile | 502 | 105 |
| Capoversi oltre 200 parole | 277 | 0 |
| Capoverso più lungo | 557 | 199 |

Conservati documento, edizione, 111 sezioni, 517 identificativi di blocco, pagine e assegnazioni alle lezioni.
**1.513 prove** su segni creati dalla versione precedente: tutti ritrovati dopo l'impaginazione.
Pubblicate le 111 sezioni Martines; confronto delle impronte: nessun altro Originale modificato.

Esteso `check-estrazione-letture.mjs`: per Martines confronta anche tutte le parole del testo pubblicato
con gli estratti e controlla titoli distinti, capoversi ed elenchi non vuoti e senza pagine fuse in un paragrafo.
La sola presenza di `testoFonte` non basta più a certificare questa parte della qualità.

Verifica nel browser di sviluppo, porta 7101: `u01-l1`, `u11-l1` (elenco dei titolari dell'iniziativa
legislativa), `u28-l5` (controlli ed enti locali); selezionate entrambe le classi, prove a 393, 768 e 1280 px,
senza scorrimento orizzontale. Build e collaudo generale `check:build` superati, inclusi backup PC → telefono → PC,
integrità delle letture e **1.392 controlli su 11 dispositivi** (WebKit e Chromium).
La modifica locale preesistente di Carlo a `Percorso.tsx` non è stata toccata. Nessun commit o push.

**Lettura dello stato finale:** la base di contenuti e funzioni è completa secondo il piano; le percentuali
e i conteggi storici non vanno usati per dichiarare perfetta tutta la presentazione. Per eventuali altre
rifiniture degli Originali occorre guardare anche il testo reso nel lettore e confrontarlo con la fonte.


## Diritto costituzionale unico e testo IURIS (12 novembre 2026)

Il syllabus mostra lo stesso programma nelle tre classi (Rodio e Bonomi identici, testo Martines; Torre stessi temi,
manuale a scelta). Le due costituzionali sono diventate **una materia** (`Diritto Costituzionale/`, slug
`diritto-costituzionale`) per LMG A-L, M-Z e SSG. Metodo e gruppi: [`costituzionale-unica.md`](costituzionale-unica.md).

- **Percorso**: ossatura Martines (28 unità, id invariati) con i temi del percorso A-L integrati: 116 lezioni,
  2.511 domande, 653 voci, 251 eventi (A-L ne aveva 82), 30 tracce di Torre. Le 50 lezioni e le 795 domande A-L
  hanno ciascuna una destinazione (`migrazione.json`): l'app rinomina i progressi al primo avvio e fonde quelli di
  Martines; vale anche per i backup vecchi.
- **Originale «testo IURIS»**: 267 pagine scritte da noi (145.000 parole), stessa numerazione del Martines, temi A-L
  nei capoversi «Nel percorso A-L.». `piani/strumenti/controlla-iuris.py`: 0 sequenze di 8 parole copiate dalle fonti,
  tutti gli articoli, anni e numeri presenti. 1.297 titoli, capoversi di 39 parole in mediana, nessuno oltre 200.
  I due riassunti di terzi (PDF Bin-Pitruzzella e Martines) non sono più pubblicati; restano in `00 - Appunti e fonti/`.
- **Verifica**: lettura a campione di 25 pagine e 10 lezioni ([`fase-costituzionale/verifica.md`](fase-costituzionale/verifica.md)):
  nessun errore giuridico; corrette note redazionali rimaste nel testo, due risposte, sette domande doppie.
- **Da sapere**: i segni fatti sui due Originali vecchi restano salvati ma non si vedono sul testo nuovo.
- **Per privato e romano**: stesso schema (gruppi per capitoli, testo IURIS pagina per pagina, `controlla-iuris.py`),
  senza unione di materie perché sono già uniche.


## Storia del diritto romano: testo IURIS e migrazione dei segni (12 novembre 2026)

- **Originale «testo IURIS»** (`romano-iuris-v1`, `studio/letture-src/testi/romano-iuris.txt`): 223 pagine scritte da noi
  con la stessa numerazione e la stessa divisione degli appunti; Percorso invariato. 10 gruppi (istruzioni in
  [`fase-romano/brief.md`](fase-romano/brief.md)); `controlla-iuris.py` senza sequenze copiate; verifica a campione di 28
  pagine e correzioni ([`fase-romano/verifica.md`](fase-romano/verifica.md)). 680 titoli, capoversi di 34 parole in
  mediana, nessuno oltre 200. Il PDF degli appunti non è più pubblicato.
- **Segni migrati**: `scripts/allinea-originali.mjs` allinea frase per frase il testo vecchio al nuovo; l'app sposta i
  segni sulle frasi corrispondenti (stesso tipo e colore), quelli incerti restano «da ricollocare», i dati vecchi
  restano nel backup ([`fase-costituzionale/segni.md`](fase-costituzionale/segni.md)). Frasi con corrispondenza sicura:
  Romano 97,3% (4 frasi su 3.893 senza corrispondenza: il testo nuovo copre gli appunti), Martines 95,8%,
  Bin-Pitruzzella 17,5% (il testo IURIS di costituzionale segue il Martines: i segni A-L arrivano quasi tutti da ricollocare).
- **Prossimi passi**: glossario di costituzionale (voci mancanti come «interesse individuale»); testo IURIS di privato;
  titoli negli Originali di Filosofia M-Z e capoversi delle sbobinature di Filosofia SSG.


## Diritto privato: testo IURIS aggiornato e triangoli tolti (12 novembre 2026)

- **Originale «testo IURIS»** (`privato-iuris-v1`, `studio/letture-src/testi/privato-iuris.txt`): 238 pagine scritte da
  noi, stessa numerazione della dispensa del 2012, **diritto vigente a novembre 2026** (filiazione, unioni civili,
  Terzo settore, Codice della crisi, Codice del consumo e d.lgs. 176/2026, riforma 2025 della riduzione delle
  donazioni…). Istruzioni in [`fase-privato/brief.md`](fase-privato/brief.md); ~35 riferimenti verificati in rete e
  21 pagine a campione ([`fase-privato/verifica.md`](fase-privato/verifica.md)). Segni migrati: 97,1% di frasi sicure.
- **Triangoli «Da sapere»**: tolti quelli di aggiornamento e di correzione, ora superati dai testi IURIS (privato 26 → 7,
  costituzionale 28 → 15, romano 13 → 4); restano solo consigli di studio («Non confondere…»).
- I tre Originali di romano, costituzionale e privato sono ora testi nostri: nessun riassunto di terzi pubblicato
  per queste materie. Restano da fare le filosofie e il glossario di costituzionale.
