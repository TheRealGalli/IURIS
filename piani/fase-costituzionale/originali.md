# Originali · Diritto costituzionale unico (`costituzionale-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Controlli verdi: tutto `npm run check:letture` (estrazione, confini, letture,
segni, mappe, selezione), `check-originali`, `check-review-plan`, `controlla-iuris.py` (0 errori).
Non sono stati lanciati (tocca al coordinatore): `sync-content`, `npm run build`, `check:build`.

## Catalogo

- `studio/src/lib/originali-catalogo.json`: tolti `costituzionale-bin-pitruzzella-v1` e `costituzionale-martines-v1`.
  Aggiunto `costituzionale-iuris-v1` (materia `diritto-costituzionale`, «Diritto costituzionale · testo IURIS»,
  `testoFonte: testi/costituzionale-iuris.txt`, `testoMarkdown: true`, 267 pagine, `sha256` del testo, nessun `file`).
  Non servono `pagineOmesse`: la p. 1 è il frontespizio IURIS e apre la sezione u01-l1.
- La descrizione dice: testo scritto da IURIS sul programma comune alle tre classi, ordine del Martines con i temi
  del percorso A-L, aggiornato al diritto vigente.

## Opzione nuova: `testoMarkdown` (solo per questo documento)

Con l'estrazione normale il testo IURIS si rovinava in tre punti: le **tabelle** (33 righe `|`) finivano su una
riga sola; una riga normale dopo un elenco senza riga vuota (p. 80) entrava nell'ultima voce; le righe ripetute ai
bordi delle pagine si potevano togliere come intestazioni. Con `testoMarkdown: true` nel catalogo,
`extract-letture.py` (funzione `markdown_blocks`, commentata) fa **un blocco per capoverso**: titoli `#`, tabelle e
capoversi restano come sono, «• » diventa «- », una riga normale dopo un elenco apre un blocco nuovo, nessuna riga
viene tolta. Il controllo delle parole per pagina resta. Campo aggiunto anche al tipo in `src/lib/originali.ts`.
Gli altri documenti non cambiano.

`revisioni.json`: due blocchi con `senzaRegole` (`p047-b021`, `p159-b016`). Sono frasi che continuano alla pagina
dopo («Considerare il popolo come titolare…», «La lunghezza del mandato…»), e la regola dei titoli isolati li
trasformava in titoli.

## Correzioni al testo (richieste dal coordinatore, `verifica.md`)

Le ho fatte in `letture-src/testi/costituzionale-iuris.txt` e negli stessi punti di `testo-iuris/gNN.txt`. Le
pagine 2–267 dei gNN coincidono col testo pubblicato; la p. 1, il frontespizio, c'è solo nel testo pubblicato.
- Tolte le 12 note sulla fonte (pp. 58, 60, 122, 123, 132, 134, 136 ×2, 142, 147, 154, 158) e anche le altre 5
  dello stesso tipo trovate cercando «la fonte» e «per errore»: p. 132 sentenza del 1983 «citata dalla fonte, numero non
  verificato», p. 142 «Dopo la stagione richiamata dalla fonte», p. 148 Corte dei conti «secondo la fonte, dieci
  sezioni» (riscritto senza numeri non verificati), p. 151 «Per la fonte» → «Secondo una parte della dottrina», p. 159
  «non dall'art. 83 come indica la fonte». Il controllo vuole che ci siano gli artt. 111 (p. 122) e 83 (p. 159),
  così li ho citati in frasi corrette: il giusto processo dell'art. 111 vale anche nei giudizi contro
  l'amministrazione; l'elezione del Presidente avviene con le maggioranze dell'art. 83.
- p. 194: la citazione comincia con «È compito della Repubblica…». p. 265: tolti i due punti doppi.
- p. 154: aggiunta una frase. La riforma sulla separazione delle carriere, con il doppio CSM, è stata respinta al
  referendum di marzo 2026, e il CSM resta uno solo.
- Titoli numerati: oltre a «13. Cinema e teatro», i capitoli dei gruppi g08 e g09 (Corte costituzionale e libertà)
  avevano 31 titoli «### N. …». Toglierne uno solo avrebbe lasciato un buco nella numerazione, così li ho tolti tutti
  e il testo è uniforme. Restano gli elenchi «1) 2) 3)» dei limiti della delega, che sono voci.

## Rimozioni

- I due PDF in `public/originali/` e le loro eccezioni in `.gitignore`. Le righe `.gitignore` della cartella
  `Diritto Costituzionale Martines/` le ho lasciate: decide il coordinatore.
- `letture-src/costituzionale-*-v1/`, `public/letture/costituzionale-*-v1/` (vecchi),
  `letture-src/testi/costituzionale-bin-pitruzzella.txt`, le voci in `revisioni.json`, `confini-sezioni.json`
  (anche `avanti` e `verificati`), `catalogo.json`, `estrazione-verifica.json`; `APPENDICI` vuoto in
  `sezioni-letture.mjs`. `fonti.json` non aveva voci di questi documenti.
- `glossario-diritto-costituzionale-martines.json` cancellato. Le sue 210 voci erano già tutte in
  `glossario-diritto-costituzionale.json` (248 voci), con le stesse etichette, e tutte esistono nel nuovo `corso.json`.
- I dati degli utenti non li ho toccati. I riferimenti rimasti ai documenti vecchi sono in `check-migrazione.mjs`,
  `check-corsi.mjs` e `src/lib/migrazione.ts`, che servono alla migrazione, e in `check-originali.mjs`, che controlla
  che la materia Martines non abbia più Originali.

## Sezioni e confini

`sezioni-letture.mjs --scrivi --solo`: **113 sezioni per 116 lezioni**. u02-l4+u02-l7, u03-l3+u03-l6 e
u26-l1+u26-l2 condividono la pagina d'inizio, quindi la sezione. Le lezioni cominciano a metà pagina, così ho
calcolato i confini con uno script dello scratchpad: per ogni confine somiglianza dei blocchi con la sintesi delle due
lezioni, preferenza per un titolo «###». Li ho poi letti tutti e ne ho corretti due a mano: u02-l8 parte da «Fonti
separate dalla legge», u04-l2 da «Situazioni attive e passive».
Risultato in `confini-sezioni.json`: 78 sezioni con 655 blocchi riportati alla precedente, 12 con 52 blocchi portati
avanti. Nessun `verificati`. 112 sezioni su 113 si aprono con un titolo. L'unica eccezione è u03-l7, che apre con il
capoverso A-L sui trattati dopo Lisbona. `check-confini-letture`: 494 sezioni, nessuna spezzata.

## Controlli aggiornati

- `check-estrazione-letture.mjs`: 11 documenti, 1.242 pagine, 7 PDF, 3 testi solo testo. Tolta la materia Martines
  dalla copertura delle lezioni. I controlli di Martines sono diventati controlli sul testo IURIS: parole uguali alla
  base, almeno 1.200 titoli, tabelle conservate, ogni capoverso o voce ≤ 200 parole, almeno 3.500 capoversi e voci,
  mediana ≤ 80.
- `check-originali.mjs`: costituzionale ha un solo originale, il testo IURIS senza PDF; Martines non ne ha nessuno.
- `check-review-plan.mjs`: tolta la materia Martines. `check-build.mjs` non cambia (gestisce già `testoFonte`).

## Misure sul testo pubblicato

| | |
|---|---|
| Pagine / blocchi | 267 / 4.469 (145.541 parole) |
| Titoli (`h1–h6` resi) | 1.297, come le righe `#` del testo |
| Tabelle | 6 |
| Capoversi e voci d'elenco (P + LI) | 4.081, di cui circa 2.670 capoversi e 1.411 voci |
| Mediana parole per capoverso | 39 |
| Capoversi o voci > 200 parole | 0 |
| Collegamenti al glossario | glossario curato di 248 voci |

## Note per il coordinatore

- `sync-letture.mjs` riscrive tutti i documenti: alcuni file di `public/letture/` di altre materie possono
  risultare modificati solo perché seguono i `corso.json` attuali.
- Se cambiano le `pagine` delle lezioni di costituzionale, vanno rifatti `sezioni-letture.mjs --scrivi --solo
  costituzionale-iuris-v1`, `sposta-blocchi.mjs --scrivi` e `sync-letture.mjs`. Se gli id dei blocchi restano
  quelli, i confini restano validi.
- Se cambia il testo: aggiornare lo `sha256` nel catalogo, cancellare `letture-src/costituzionale-iuris-v1/` e
  rifare l'estrazione. Gli id dei blocchi possono cambiare, quindi vanno controllati i confini e le due revisioni.
- AGENTS.md (sezione «Originali») e `README.md` non li ho toccati: lì si può aggiungere `testoMarkdown`.
