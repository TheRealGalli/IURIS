# Guida per chi lavora su IURIS (ChatGPT/Codex e altri assistenti)

Questo file raccoglie quello che serve per lavorare bene sul progetto senza dover riscoprire tutto.
Sono consigli e scorciatoie, non vincoli rigidi: se trovi un modo migliore, usalo e aggiorna questo file.

## Lavoro in corso

1. **Diritto costituzionale completato e potenziato** (LMG · I anno · A-L): 18 unità, 50 lezioni e 760 domande,
   più schede inverse, approfondimenti, testo della Costituzione, Quadro ed esercizi dedicati.
   Fonti, aggiornamenti e controlli in [`piani/diritto-costituzionale.md`](piani/diritto-costituzionale.md);
   che cosa resta da fare (anche per Filosofia SSG) in [`piani/potenziamento.md`](piani/potenziamento.md).
2. **Diritto privato, in corso** (materia unica per le tre classi): fatte 11 unità su 27 e la sezione Codice civile.
   [`piani/diritto-privato.md`](piani/diritto-privato.md) ha la tabella delle unità, gli aggiornamenti da fare (la
   dispensa è del 2012) e il modo più rapido di scrivere un'unità (`piani/strumenti/unita.py`).
3. **Corsi con appunti propri.** Diritto romano è condiviso tra LMG A-L e SSG (stessi appunti, stessi progressi).
   Diritto costituzionale **SSG** avrà appunti diversi da quelli di LMG: quando arrivano, sarà una materia nuova
   (cartella propria, es. `Diritto Costituzionale SSG/`, slug `diritto-costituzionale-ssg`, come Filosofia SSG), non
   un'estensione di quella di LMG. Per ora è una card disattivata in `corsi.ts`. Anche **LMG M-Z** avrà materiale
   tutto suo: le materie elencate oggi per M-Z sono solo un segnaposto.

## Chi è l'utente

Carlo studia Giurisprudenza a Bari (LMG, I anno, classe A-L). Scrive in italiano, spesso dettando a voce:
interpreta con buon senso le parole trascritte male. Vuole schermate leggibili e scorrevoli e dettagli rifiniti.
Rispondi in italiano.

## Porte: non disturbare lo studio

- **7100** = versione stabile su cui Carlo studia (`npm run studio`). Non riavviarla e non ricaricarla mentre studia.
- **7101** = sviluppo (`npm run dev -- --port 7101`, configurato in `.claude/launch.json`). Usa questa per le prove.

## Com'è fatto il progetto

```
IURIS/
├── AGENTS.md, README.md, INDICE.md, piani/
├── <Materia>/00 - Appunti e fonti/   ← PDF e materiali originali (NON in git)
├── <Materia>/05 - Contenuti/          ← i contenuti che l'app legge (in git)
└── studio/                             ← app Vite + React + TypeScript, tutta nel browser
    ├── CONTENUTI.md                    ← formato dei file di contenuto: leggilo per primo
    ├── scripts/                        ← sync, validazione, estrazione letture, controlli
    ├── letture-src/                    ← testo dei PDF per gli «Originali», diviso per lezione
    ├── public/originali/               ← i PDF pubblicati negli Originali
    └── src/data/corsi.ts               ← corsi (classi) e materie di ciascun corso
```

- Lo **slug** di una materia deriva dal nome della cartella (`Diritto Costituzionale` → `diritto-costituzionale`).
- Una cartella materia entra nell'app solo quando `05 - Contenuti/` ha almeno un `uNN.json`: prima il sync la
  salta («in preparazione»). Dal primo `uNN.json` la materia è nel manifest e `check-corsi` pretende che sia
  in un corso e non più tra gli `inArrivo`: fai il passo 6 qui sotto insieme alla prima unità.
- `.gitignore` pubblica solo cartelle elencate: per una nuova materia vanno aggiunte le tre righe
  `!/<Materia>/`, `/<Materia>/*`, `!/<Materia>/05 - Contenuti/` (copia lo schema delle altre). I PDF sono esclusi
  ovunque, tranne quelli elencati per `studio/public/originali/`.
- L'app si pubblica su GitHub Pages dal ramo `main` (`.github/workflows/pages.yml`): tutto ciò che va in git
  finisce online. Niente dati personali di terzi (vedi la nota sul PDF di costituzionale nel suo piano).

## Ambiente: le piccole trappole già incontrate

- **Node**: `node_modules` è installato per x64. Con il node arm64 di Homebrew la build fallisce
  («Cannot find module @rollup/rollup-darwin-arm64»). Prima di build e controlli:
  `export PATH=/usr/local/bin:$PATH` (node x64 in `/usr/local/bin`).
- **Python**: usa `python3` (pypdf è installato nei pacchetti utente; con `python3 -I` non si vede).
- Mancano `pdftotext`, `pdftoppm`, `tesseract`. Per leggere un PDF: pypdf. Per un PDF senza testo leggibile
  c'è un piccolo OCR con il framework Vision di macOS: vedi `piani/strumenti/ocr.m` (compila con `clang`).
- `swiftc` è rotto (module map duplicata degli strumenti da riga di comando): usa Objective-C con `clang`.

## Aggiungere una materia: la strada già battuta

1. **Fonti** in `<Materia>/00 - Appunti e fonti/`. Testo per pagina in `00 - Appunti e fonti/testo/`
   (righe `=== pagina N ===`): comodo da leggere a blocchi di 8–12 pagine.
2. **`05 - Contenuti/materia.json`**: nome, breve, docente, manuale, fonte (o `fonti` se i testi sono più d'uno),
   pagine, `colore`. Il colore deve essere diverso da quello di tutte le altre materie e di quelle «in arrivo».
3. **Unità** `uNN.json`, una per capitolo, nel formato di `studio/CONTENUTI.md`. Dopo ognuna:
   `node studio/scripts/validate-content.mjs "<Materia>/05 - Contenuti/uNN.json"` (gli avvisi non bloccano,
   gli errori sì). Ne basta una scritta bene per prendere il ritmo; poi le altre vanno più veloci.
4. **Sync**: `cd studio && node scripts/sync-content.mjs` stampa le statistiche e gli id citati ma non definiti.
5. **`glossario.json`**: per ogni persona serve una `premessa` («Giurista italiano (1909–2004), …»), altrimenti
   la domanda di glossario «Chi era…?» parte con una frase vaga e `check-domande` la segnala. Vale anche per
   opere e voci la cui definizione comincia con «Citato…», «Negli appunti…».
6. **Corso**: in `studio/src/data/corsi.ts` aggiungi lo slug alle `materie` del corso giusto e togli la materia da
   `inArrivo` (in **tutti** i corsi che la elencano: un nome «in arrivo» uguale a una materia vera fa fallire
   `check-corsi`). Aggiorna di conseguenza le attese in `studio/scripts/check-corsi.mjs`.
7. **Originali** (testo integrale dei PDF, facoltativo ma utile): vedi sotto.
8. **Controlli**: `cd studio && npm run build && npm run check:build`. Ci vogliono alcuni minuti
   (l'ultima parte prova l'app su 11 dispositivi con Playwright).
9. Aggiorna la tabella delle materie in `README.md`.

### Qualità dei contenuti: cosa ha funzionato

- **Lezione** = 2–6 pagine, sintesi di circa 200–300 parole per pagina, con titoletti `###`, tabelle per
  le distinzioni e collegamenti `[[id|testo]]` ai concetti. Deve bastare per ripetere senza riaprire gli appunti.
- **Domande per lezione** (sono le soglie del validatore): almeno 4 `flashcard`, 2 `multipla`, 2 `verofalso`,
  1 `completa`, 1 `aperta` (con `traccia` e `punti` con `chiavi`); per unità almeno un `ordina` e un `abbina`.
- **Secoli sempre con l'era**: «XIX secolo d.C.», mai «XIX secolo» da solo (`check-domande` lo pretende).
- **Errori degli appunti**: correggili nella sintesi e annota la correzione nel campo `noteRedazione` dell'unità
  («p. 23 "Kaufman" è Felix Kaufmann…»): resta nel file per chi lavora sui contenuti, l'app non lo mostra.
  Mai inventare: se un punto è dubbio, dillo lì.
- **`note` = avviso «Da sapere» per chi studia** (il triangolino nel Percorso; l'app è pubblica e la usa la classe):
  1–2 frasi brevi e chiare, solo cose utili per studiare (materiale datato → «aggiornato: …», confusioni
  frequenti, nomi e date da ricordare). Niente link, numeri di pagina, refusi, «gli appunti dicono…» o messaggi
  per lo sviluppatore. Se non c'è niente di utile, `note: null` (il triangolino sparisce).
- **Dati personali**: mai email o nomi di chi ha solo caricato o scaricato un file. Chi ha scritto il materiale
  (autore del riassunto, docente) si cita quando è noto.
- **Id dei concetti**: riusa quelli già definiti (in altre unità o tra gli «ID CANONICI» di `CONTENUTI.md`).
  Lo stesso concetto definito in più unità viene unito dal sync.
- **Eventi** solo con date certe (`anno` intero, `data` leggibile, es. «1 gennaio 1948»).
- Materiale datato: se gli appunti descrivono una disciplina superata, la sintesi dice com'è oggi; `note` lo
  dice in breve («Aggiornato: …») e `noteRedazione` spiega che cosa è cambiato e quando (con la fonte normativa).

### Originali (testo dei PDF letto nell'app)

1. Copia il PDF in `studio/public/originali/<slug-breve>.pdf`, aggiungi l'eccezione in `.gitignore` e una voce in
   `studio/src/lib/originali-catalogo.json` (id `…-v1`, `materia`, `titolo`, `descrizione`, `file`, `sha256`, `pagine`).
2. `cd studio && python3 scripts/extract-letture.py --solo <id-documento>`: estrae solo quel PDF, senza
   toccare i documenti già revisionati.
3. In `scripts/sezioni-letture.mjs` aggiungi al dizionario `FONTE` la fonte del documento (se la materia ne ha più
   d'una), poi `node scripts/sezioni-letture.mjs --scrivi --solo <id-documento>`. **Usa sempre `--solo`**: senza,
   ricalcola anche i confini già ritoccati a mano degli altri documenti.
4. `node scripts/sync-letture.mjs`, poi `node scripts/check-confini-letture.mjs`: segnala sezioni che cominciano a
   metà frase. Correggi in `letture-src/confini-sezioni.json` (blocchi da riportare indietro, `avanti`, o
   `verificati` per le eccezioni giuste) e applica con `node scripts/sposta-blocchi.mjs --scrivi`.
5. Facoltativi: `letture-src/glossario-<slug>.json` (termini da collegare nel testo), `letture-src/fonti.json`.
6. Aggiorna i conteggi in `scripts/check-estrazione-letture.mjs` (numero di PDF e di pagine, elenco delle materie),
   `scripts/check-originali.mjs` e l'elenco delle materie in `scripts/check-review-plan.mjs`.

## Git

Commit e push solo quando Carlo lo chiede (di solito vuole il push su `main`). Messaggi di commit in italiano.
Non pubblicare rami di lavoro su GitHub se non serve.
