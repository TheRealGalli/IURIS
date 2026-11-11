# Guida per chi lavora su IURIS (ChatGPT/Codex e altri assistenti)

Questo file raccoglie quello che serve per lavorare bene sul progetto senza dover riscoprire tutto.
Sono consigli e scorciatoie, non vincoli rigidi: se trovi un modo migliore, usalo e aggiorna questo file.

## Lavoro in corso: PIANO FINALE (dall'11 novembre 2026)

Obiettivo: chiudere **tutte e tre le classi** (LMG A-L, LMG M-Z, SSG) con materie complete e fedeli agli appunti,
domande d'esame dei docenti integrate, app uniforme e collaudata. Lo esegue un coordinatore con subagenti, fase per
fase, finché la «Definizione di fatto» in fondo è vera per ogni materia. Stato di partenza e misure:
[`piani/stato-qualita.md`](piani/stato-qualita.md) (qualità rispetto agli appunti) e la tabella «Stato» in fondo a
[`piani/consegne-prossimi-passi.md`](piani/consegne-prossimi-passi.md) (confronto numerico con Romano).

### Mappa delle materie per classe

| Disciplina | LMG A-L | LMG M-Z | SSG | Cartella |
|---|---|---|---|---|
| Storia del diritto romano | ✔ (Alessandrì) | ✔ (Starace) | ✔ (Starace) | `Diritto Romano ` (**una sola materia, comune**) |
| Diritto privato | ✔ (Lobuono) | ✔ (Pennasilico) | ✔ (Lobuono) | `Diritto Privato` (**comune**) |
| Diritto costituzionale | Bin-Pitruzzella (Torre) | **Martines** (Rodio) | **Martines** (Bonomi) | `Diritto Costituzionale` (A-L) · **`Diritto Costituzionale Martines`** (M-Z e SSG, nuova, comune alle due) |
| Filosofia del diritto | Incampo/Moro/Cotta | **Barberis + Schauer** (Mangini) | Siniscalchi + Incampo | `Filosofia del Diritto` · **`Filosofia del Diritto MZ`** (nuova) · `Filosofia del Diritto SSG` |

Docenti come in `studio/src/data/corsi.ts`; Carlo ha indicato che Martines vale per M-Z **e** SSG: una sola materia
(slug `diritto-costituzionale-martines`, nome mostrato «Diritto costituzionale») usata da entrambe le classi, come Romano.
Questo sostituisce il vecchio progetto di una cartella `Diritto Costituzionale SSG`. Slug Filosofia M-Z:
`filosofia-del-diritto-mz`. Se un docente in `corsi.ts` risulta diverso, lo si corregge, la materia resta una.

### Materiale nuovo (già spostato dalla cartella `nuovi`, che non esiste più; nessun PDF è in git)

| File | Che cos'è | Uso |
|---|---|---|
| `Diritto Romano /00 - Appunti e fonti/domande-esame/Starace, domande d'esame (elenco A).pdf` e `(elenco B).pdf` | ~39 tracce d'esame di Starace (B è quasi lo stesso elenco riordinato) | domande d'esame M-Z e SSG; per A-L mostrarle come «domande di un'altra classe» |
| `Diritto Privato/00 - Appunti e fonti/domande-esame/Lobuono, domande d'esame.pdf` | 39 tracce | A-L e SSG |
| `Diritto Privato/00 - Appunti e fonti/domande-esame/Pennasilico, domande d'esame.pdf` | tracce per blocchi tematici | M-Z |
| `Diritto Privato/00 - Appunti e fonti/confronto/Dispensa Torrente-Schlesinger (seconda, da confrontare).pdf` | altra dispensa sullo stesso manuale (239 pp) | **solo confronto**: ogni pagina ha nome ed email di chi l'ha scaricata → mai pubblicarla, mai citarne il nome |
| `Diritto Costituzionale/00 - Appunti e fonti/domande-esame/Torre, domande d'esame.pdf` | 30 tracce | A-L |
| `Filosofia del Diritto/00 - Appunti e fonti/domande-esame/Incampo e Cotta, domande d'esame.pdf` | 21 tracce (19 Incampo, 2 Cotta) | A-L |
| `Diritto Costituzionale Martines/00 - Appunti e fonti/Martines, riassunto (267 pp).pdf` | riassunto del manuale Martines (ed. 2024), testo estraibile, senza dati personali | nuova materia; pubblicabile negli Originali |
| `Filosofia del Diritto MZ/00 - Appunti e fonti/Barberis, Giuristi e filosofi (riassunto, 56 pp).pdf` | storia della filosofia del diritto | nuova materia |
| `Filosofia del Diritto MZ/00 - Appunti e fonti/Schauer, Il ragionamento giuridico (riassunto, 76 pp).pdf` | logica e ragionamento giuridico | nuova materia |

Trappole dei due PDF StuDocu di Filosofia M-Z: in ogni pagina c'è un'intestazione con nome ed email di chi ha scaricato
(da togliere sempre, non pubblicare il PDF) e il font ha sostituito le legature («dire@o» = diretto, «a6enzione» =
attenzione, «giusRzia» = giustizia, «eAca» = etica, «metae2ca» = metaetica). Prima di scrivere le unità: estrarre il
testo per pagina in `00 - Appunti e fonti/testo/` correggendo le legature (mappa di sostituzione verificata a campione,
oppure OCR con `piani/strumenti/ocr.m`). Mancano: domande d'esame per Martines (M-Z e SSG) e per Filosofia M-Z.

### Formato delle domande d'esame (da introdurre, Fase 1)

Le tracce dei docenti sono **domande d'esame certificate**: vanno legate agli appunti e messe in evidenza.
File per materia `05 - Contenuti/esame.json`:

```jsonc
{
  "fonti": [{ "id": "lobuono", "docente": "Michele Lobuono", "corsi": ["uniba-lmg-1-al", "uniba-ssg-1"],
              "file": "domande-esame/Lobuono, domande d'esame.pdf" }],
  "tracce": [{ "id": "esame-lobuono-01", "fonte": "lobuono", "testo": "La rappresentanza e la procura",
               "lezioni": ["u08-l2"], "concetti": ["rappresentanza", "procura"] }]
}
```

- Testo della traccia **come nel PDF** (solo refusi evidenti corretti); `lezioni` e `concetti` obbligatori: ogni
  traccia deve portare dove se ne parla negli appunti. Una traccia senza appunti corrispondenti va segnalata nel
  report (e coperta con una lezione o un approfondimento, se il docente la chiede davvero).
- Per **ogni traccia** almeno una domanda `aperta` nell'unità giusta (`traccia`, `punti` con `chiavi`, come le altre)
  con il campo nuovo `"esame": ["lobuono"]`, così entra nel ripasso.
- App: badge «Chiesta all'esame (prof. X)» su lezione e voce; in Allenamento il filtro «Domande d'esame» con prima le
  tracce del docente del corso scelto e poi quelle delle altre classi; nel Percorso, per ogni unità, l'elenco delle
  tracce collegate. `validate-content`, `sync-content`, `check-domande` e `check-corsi` devono conoscere il formato.

### Fasi e subagenti

Regole per tutti: leggere prima `studio/CONTENUTI.md` e il resto di questo file. **Un subagente per materia/area, e
ognuno tocca solo le sue cartelle** (sotto). I subagenti validano solo i propri file (`validate-content.mjs`); `sync`,
`build` e `check:build` li lancia solo il coordinatore, che integra, controlla e fa commit a fine fase. Prove nel
browser sulla porta 7101 (mai 7100). Ogni subagente scrive il suo resoconto in `piani/fase-finale/<area>.md`
(che cosa ha fatto, numeri prima/dopo, dubbi). Mai inventare: un fatto incerto va nel `noteRedazione` o nel report.
Riprendere ciò che è uguale (id canonici, testo della Costituzione e del Codice civile, approfondimenti «oltre» dello
stesso concetto, persone e opere), **rifare dagli appunti nuovi** ciò che dipende dagli appunti (sintesi, definizioni,
domande, eventi, mappe).

**Fase 0 — coordinatore, subito.** Le modifiche locali di Claude dell'11 novembre (anteprima del glossario negli
Originali, `ConceptPop.tsx`/`LettoreTesto.tsx`; 1.895 collegamenti nelle sintesi; `piani/stato-qualita.md`) hanno già
superato build e `check:build`: committarle prima di iniziare. Non toccare `studio/src/views/Percorso.tsx` (modifica
locale di Carlo, non va nei commit).

**Fase 1 — app (1 subagente, `studio/src`, `studio/scripts`; in parallelo con la Fase 2).**
1. Formato `esame.json` + campo `esame` delle domande: validatore, sync, tipi, UI (sopra). Farlo per primo e
   comunicarlo agli altri subagenti.
2. Citazioni tra materie: oggi negli Originali di privato «art. 3 Cost.» apre la Costituzione di
   `diritto-costituzionale` (`collegaArticoli` in `src/lib/letture-client.ts`, costante `COSTITUZIONALE`). Va scelta la
   materia costituzionale **del corso** (A-L → `diritto-costituzionale`, M-Z/SSG → `diritto-costituzionale-martines`),
   e anche nel Percorso le citazioni di articoli devono mostrare al passaggio del mouse la scheda dell'articolo
   (testo breve) e al clic aprire `/norme/N` dell'altra materia (`ConceptPop.tsx` va esteso: oggi conosce solo i
   concetti della materia corrente). Tornare indietro con il browser deve riportare dove si era.
3. **Calendario su PC**: le date d'esame usano `<input type="date">` (`src/views/Oggi.tsx:236` e `:249`,
   `src/views/Progressi.tsx:148`) e la data viene salvata a ogni cambio (girare il mese la imposta subito). Sostituire con
   un selettore che salva solo alla scelta del giorno o alla conferma (componente unico in `components/ui.tsx`),
   provato con mouse, tastiera, iPad e telefono.
4. Collaudo backup tra dispositivi: estendere `scripts/check-backup.mjs` con il giro completo PC (Chromium) → backup
   → telefono (WebKit, iPhone) → si continua a studiare → backup → PC: lezioni studiate, carte e voti, segni negli
   Originali, mappa personale, date d'esame, corso scelto devono arrivare intatti e sommarsi, anche con le materie nuove
   e con backup di una sola materia. Provarlo anche a mano nel browser.

**Fase 2 — contenuti delle materie esistenti fino al 100% (5 subagenti in parallelo).**
- **Privato** (`Diritto Privato/`): (a) **definizioni**: oggi il 70% sotto le 40 parole → mediana ≥ 60 parole, meno
  del 15% sotto 40, riscrivendo `definizione` dalle dispense (non copiare gli «oltre»); (b) **confronto con la seconda
  dispensa** capitolo per capitolo: ciò che manca nelle nostre lezioni va integrato in sintesi e definizioni (con
  `noteRedazione`), report in `piani/fase-finale/confronto-privato.md`; (c) `esame.json` con Lobuono e Pennasilico;
  (d) collegamenti tra voci da 1,6 a ≥ 2,0 per voce; (e) date degli appunti 1997 e 2007 senza evento; (f) sintesi dove
  una pagina di appunti ha meno di 150 parole di sintesi.
- **Costituzionale A-L** (`Diritto Costituzionale/`): definizioni (45% sotto 40 parole → stesso obiettivo di privato);
  **19 eventi** mancanti (anni elencati in `stato-qualita.md`); `esame.json` con Torre (attenzione: «Sentenza Mancuso»,
  «caso Granital», presa di Roma: se negli appunti mancano, approfondimento con fonti verificate); sintesi corte.
- **Filosofia SSG** (`Filosofia del Diritto SSG/`): le **87 voci del passo 5** vanno nei `concetti` delle lezioni giuste,
  ciascuna con almeno una domanda (oggi 62% delle voci ha domande, obiettivo ≥ 95%); approfondimenti da 150 a ≥ 50% delle
  voci; nessuna traccia d'esame disponibile per Siniscalchi.
- **Filosofia LMG + Diritto romano** (`Filosofia del Diritto/`, `Diritto Romano /`): `esame.json` con Incampo/Cotta e
  con Starace (fonte per M-Z e SSG); Filosofia LMG: 10% delle voci senza domande, eventi 1964 e 2006; Romano: il 9%
  delle domande senza `pagine`.
- Misure obiettivo per ogni materia (le controlla il coordinatore con lo script delle misure di `stato-qualita.md`):
  definizioni mediana ≥ 60 parole; collegamenti ≥ 2,0 per voce e ≥ 2 ogni 100 parole di sintesi; approfondimenti ≥ 50%
  delle voci; ≥ 14 domande per lezione d'esame; ≥ 95% delle voci con domande e citate in una lezione; ogni anno citato
  almeno due volte negli appunti ha un evento; ogni traccia d'esame collegata a lezione, voci e domanda aperta.

**Fase 3 — materie nuove (in parallelo con la Fase 2).** Seguire «Aggiungere una materia» qui sotto.
- **Diritto costituzionale Martines** (`Diritto Costituzionale Martines/`, 267 pp): un coordinatore di materia +
  2-3 subagenti per blocchi di capitoli (Parte prima, organizzazione, fonti, giustizia costituzionale, regioni…),
  un'unità per capitolo. Riprendere: `norme.json` (Costituzione, stesso testo di `Diritto Costituzionale`: copia
  identica, con un controllo che le due copie coincidano), id canonici delle voci, `oltre` e schede inverse degli stessi
  istituti (adattati), Quadro dove gli schemi valgono ancora. Rifare dagli appunti Martines: sintesi, definizioni, domande,
  mappe, eventi. Aggiornamenti normativi: riusare le verifiche del passo 3 (riforma della magistratura respinta al
  referendum di marzo 2026; premierato non approvato; legge elettorale 180/2026; leggi costituzionali 1 e 2 del 2026
  sugli statuti speciali) e controllare l'edizione 2024 del riassunto. Originali: il PDF è pubblicabile.
- **Filosofia del diritto M-Z** (`Filosofia del Diritto MZ/`, Barberis 56 pp + Schauer 76 pp): prima il testo pulito
  (legature, intestazioni StuDocu), poi le unità. Riprendere persone e opere già presenti in Filosofia LMG/SSG (Kelsen,
  Hart, Kant, Bobbio… stessi id) e i loro «oltre»; definizioni e domande dagli appunti di Barberis e Schauer.
  Originali: solo testo, senza PDF e senza nomi di chi ha scaricato.
- Per entrambe: `.gitignore` (tre righe), `materia.json` con colore nuovo, glossario con `premessa` per le persone,
  approfondimenti ≥ 50% delle voci, schede inverse ≈ 35% delle voci, stesse misure obiettivo della Fase 2.

**Fase 4 — integrazione (solo coordinatore).** `corsi.ts`: M-Z diventa disponibile con
`['filosofia-del-diritto-mz', 'diritto-romano', 'diritto-costituzionale-martines', 'diritto-privato']`; SSG aggiunge
`diritto-costituzionale-martines` e lo toglie da `inArrivo`. Aggiornare `check-corsi.mjs`, `check-estrazione-letture.mjs`,
`check-originali.mjs`, `check-review-plan.mjs`, `README.md`, `INDICE.md`. Poi `sync`, `npm run build`, `npm run check:build`.

**Fase 5 — collaudo e qualità (coordinatore + subagenti di verifica, liberi di provare tutto).** Per ogni classe e
materia: lettura a campione di lezioni contro gli appunti (fedeltà, completezza, aggiornamenti), domande (corrette,
legate a pagine e lezioni), mappe e collegamenti (sensati, niente archi assurdi), approfondimenti e fonti, cronologia,
Originali (anteprima al passaggio, articoli tra materie), calendario, backup tra dispositivi, telefono/iPad/PC.
Ogni difetto trovato si corregge; alla fine si aggiorna `piani/stato-qualita.md` con le misure di tutte le materie
(anche le nuove) e si scrive il resoconto finale in `piani/consegne-prossimi-passi.md`.

**Commit e push.** Commit a fine di ogni fase con controlli verdi (messaggi in italiano, senza `Percorso.tsx`). Push su
`main` alla fine, dopo `check:build` completo, salvo diversa indicazione di Carlo.

### Definizione di fatto

Per ogni materia di ogni classe: misure obiettivo raggiunte; tracce d'esame del docente (dove esistono) tutte collegate;
validazione senza errori; build e `check:build` verdi; collaudo della Fase 5 senza difetti aperti; resoconto scritto.

### Contesto utile (dal lavoro precedente)

- Diritto privato è unico per le tre classi; il Codice civile dell'app è allineato a Normattiva
  (`studio/scripts/codice-normattiva.py`, vedi [`piani/diritto-privato.md`](piani/diritto-privato.md)).
- Diritto costituzionale A-L: fonti, aggiornamenti e controlli in [`piani/diritto-costituzionale.md`](piani/diritto-costituzionale.md).
- Tutti i passi del «Piano successivo» precedente sono completati: dettagli in fondo a `consegne-prossimi-passi.md`.

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

- Il lettore mostra soltanto aggiornamenti utili allo studio (`notaAggiornamento` nei blocchi; campo
  `aggiornamento` di `revisiona-letture.mjs`). Le normali `notaRevisione` sono documentazione redazionale interna:
  niente avvisi per OCR, decifrazione dei caratteri, refusi o impaginazione. Gli avvisi sugli aggiornamenti
  normativi nel Percorso restano utili.
- Backup completo: interfaccia essenziale di scaricamento/caricamento, senza percentuali né elenchi dei progressi
  delle materie. Conservare validazione del file e conferma del ripristino.

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
   Se il PDF ha parti in un font senza tabella dei caratteri (simboli a caso al posto del testo, come i riquadri
   della dispensa di privato), non vanno tolte: si decifrano. Vedi `scripts/decifra-riquadri.py`, che scrive le
   revisioni in `letture-src/revisioni.json`. Il numero dei blocchi per pagina non deve cambiare
   (`check-estrazione-letture`): un blocco svuotato resta con `&nbsp;`.
5. Facoltativi: `letture-src/glossario-<slug>.json` (termini da collegare nel testo), `letture-src/fonti.json`.
   Gli articoli citati nel testo («art. 1153 c.c.», «art. 70 Cost.») diventano da soli collegamenti alla sezione
   Codice civile o Costituzione della materia (`collegaArticoli` in `src/lib/letture-client.ts`): non serve marcarli.
6. Aggiorna i conteggi in `scripts/check-estrazione-letture.mjs` (numero di PDF e di pagine, elenco delle materie),
   `scripts/check-originali.mjs` e l'elenco delle materie in `scripts/check-review-plan.mjs`.

## Git

Commit e push solo quando Carlo lo chiede (di solito vuole il push su `main`). Messaggi di commit in italiano.
Non pubblicare rami di lavoro su GitHub se non serve.
