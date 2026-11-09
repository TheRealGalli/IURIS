# Piano: Diritto privato (LMG · I anno · A-L)

Stato: **in attesa delle fonti**. Si fa **dopo Diritto costituzionale**, appena arrivano gli appunti. La cartella `Diritto Privato/` è pronta (`00 - Appunti e fonti/`,
`05 - Contenuti/`), ma per ora non contiene materiale: quando Carlo aggiunge appunti o PDF, mettili in
`00 - Appunti e fonti/` e segui questo piano. Le regole generali sono in [`../AGENTS.md`](../AGENTS.md).

## Primi passi quando arrivano le fonti

1. **Riconosci il materiale**: che cos'è (sbobinature, riassunto di un manuale, dispense del docente), di quale
   manuale (es. Torrente–Schlesinger, Trimarchi, Gazzoni, Bianca…), quale edizione o anno, quante pagine.
   Se ci sono più testi, la materia ha più `fonti` (vedi «Materie con più testi» in `studio/CONTENUTI.md`).
2. **Estrai il testo per pagina** in `00 - Appunti e fonti/testo/` (righe `=== pagina N ===`), con pypdf.
   Se il testo esce illeggibile (simboli a caso: succede con i PDF StuDocu), usa l'OCR di
   [`strumenti/ocr.m`](strumenti/ocr.m): circa 7 secondi a pagina, conviene lanciarlo in background.
3. **Controlla i dati personali**: filigrane con nome o email di chi ha scaricato il file non vanno pubblicate
   (niente PDF di quel tipo negli Originali).
4. **Mappa i capitoli**: dall'indice del PDF, se c'è, o dai titoli in maiuscolo. Una unità per capitolo
   (o per blocco di 6–15 pagine se i capitoli sono molto lunghi), 3–5 lezioni per unità. Scrivi la tabella delle
   unità in questo file, nella sezione sotto.
5. **Verifica l'aggiornamento**: il diritto privato cambia spesso (filiazione, famiglia, successioni, contratti
   dei consumatori, riforma Cartabia per il processo). Se il materiale è vecchio, la sintesi descrive la disciplina
   vigente e il campo `note` spiega che cosa è cambiato (con la fonte normativa).

## Struttura tipica del corso (solo orientamento)

Un corso di Istituzioni di diritto privato del primo anno di solito copre: fonti e interpretazione; situazioni
giuridiche soggettive; persone fisiche e giuridiche; beni, proprietà e diritti reali; possesso; obbligazioni;
contratto in generale (requisiti, effetti, invalidità, risoluzione); singoli contratti; fatti illeciti e
responsabilità civile; famiglia; successioni; tutela dei diritti (trascrizione, prescrizione, prove).
L'ordine e i confini veri vengono dal materiale di Carlo, non da questo elenco.

## Come scrivere le lezioni di questa materia

- È una materia di **istituti e articoli del Codice civile**: per ogni istituto la sintesi dice che cos'è,
  dove sta (articolo c.c., citato esatto), quali sono i requisiti o gli elementi, gli effetti, le eccezioni,
  e un esempio pratico.
- Tabelle per le distinzioni (nullità/annullabilità, diritti reali/di credito, possesso/detenzione,
  responsabilità contrattuale/extracontrattuale, tipi di prescrizione e decadenza).
- Domande: definizioni, requisiti da elencare, casi pratici brevi («Tizio vende a Caio…: il contratto è valido?»),
  articoli da abbinare agli istituti, termini e numeri (`completa`), procedimenti da mettere in ordine.
- Eventi in cronologia: solo poche date certe (Codice civile 1942, Costituzione 1948, riforma del diritto di
  famiglia 1975, riforma della filiazione 2012–2013, unioni civili 2016…). Con poche date l'unità può averne 0.
- Id canonici: scegli id brevi e stabili (`contratto`, `obbligazione`, `proprieta`, `possesso`, `nullita`,
  `annullabilita`, `responsabilita-civile`, `capacita-giuridica`, `capacita-di-agire`, …) e scrivili in
  `studio/CONTENUTI.md` in una sezione «ID CANONICI (diritto privato)» prima di cominciare.

## Materia e attivazione

- `Diritto Privato/05 - Contenuti/materia.json`: nome «Diritto privato», `breve` «Privato», manuale e fonte
  secondo il materiale, colore `#b07a1e` (quello già usato per la materia «in arrivo»).
- `.gitignore`: `!/Diritto Privato/`, `/Diritto Privato/*`, `!/Diritto Privato/05 - Contenuti/`.
- `studio/src/data/corsi.ts`: `'diritto-privato'` nelle `materie` di A-L (e M-Z segnaposto), via da `inArrivo` in
  tutti i corsi; attese in `studio/scripts/check-corsi.mjs`; riga in `README.md`; build e controlli.

## Unità

Da compilare quando arrivano le fonti.

| Unità | Capitolo | Argomenti | Pagine | Stato |
|---|---|---|---|---|
| | | | | |
