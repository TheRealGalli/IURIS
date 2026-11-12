# Originali · Filosofia del diritto M-Z (`filosofia-mz-barberis-v1`, `filosofia-mz-schauer-v1`)

Stato: **fatto** (12 novembre 2026). Controlli verdi: tutto `npm run check:letture` (estrazione, confini, letture,
segni, mappe, selezione), `check-originali`, `check-review-plan`. Non lanciati (li lancia il coordinatore):
`sync-content`, `npm run build`, `check:build` (`check-build.mjs` è stato aggiornato, vedi sotto).

## Vincolo dei dati personali

- I due PDF StuDocu hanno in ogni pagina nome ed email di chi ha scaricato: **nessun PDF in `public/originali`**,
  nessuna voce `file` nel catalogo. Si pubblica solo il testo già ripulito (`00 - Appunti e fonti/testo/barberis.txt`
  e `schauer.txt`, legature corrette e intestazioni tolte dai subagenti di contenuto).
- La p. 1 di entrambi (copertina StuDocu: titolo e università del caricamento, «Bari Aldo Moro» / «Palermo») è
  **vuota** nel testo pubblicato.
- Scansione di testi, `.md`, JSON pubblicati e glossario: nessun «@», «studocu», «downloaded», «scaricato da»,
  `messages.pdf…`, nessun nome proprio estraneo (elenco delle parole maiuscole non presenti nel corso letto a mano:
  solo parole comuni, refusi della fonte come «Aristotale», «Trinuty», «Lewellyn», e autori citati).
  `check-estrazione-letture` ora lo verifica a ogni esecuzione per i documenti solo testo.

## Opzione nuova: documento solo testo (`testoFonte`)

Prima esistevano solo PDF pubblicati (eventualmente con `testoOcr`) e la raccolta `manuale-ricostruito` (testo dal
Percorso). Aggiunta un'opzione minima, usata solo da questi due documenti (gli altri non cambiano):

- `src/lib/originali-catalogo.json`: `testoFonte: "testi/<file>.txt"` (in `letture-src/`), `sha256` = impronta di
  quel testo, nessun `file`. Il lettore già nascondeva il pulsante «Consulta la fonte PDF» quando manca `file`.
- `scripts/extract-letture.py`: con `testoFonte` legge il testo diviso `=== pagina N ===` (come l'OCR; righe vuote =
  capoversi), controlla l'impronta, non apre alcun PDF. Commento nel codice.
- `src/lib/originali.ts`: campo facoltativo `testoFonte` nel tipo.
- `scripts/check-build.mjs`: un documento con `testoFonte` non deve dichiarare un PDF (prima avrebbe fallito su
  `d.file.startsWith`). `check-estrazione-letture.mjs`: impronta del testo, niente `file`, niente dati di chi scarica.

Testi pubblicati: `studio/letture-src/testi/filosofia-mz-barberis.txt` (56 pp.) e `filosofia-mz-schauer.txt` (76 pp.).
Stesse parole del testo pulito (controllo token per pagina), solo divisi in capoversi: Barberis era una riga per pagina,
diviso ai titoli («CAPITOLO n:», «1.2. …», voci «•») e a fine frase ogni ~70–130 parole; Schauer: righe unite quando
la frase continua, capoversi ai titoli di capitolo/paragrafo. Un capoverso forzato in Schauer p. 70 («L’onere della
prova riflette…», inizio di u19-l3). Script di costruzione nello scratchpad della sessione (non nel repository).

## Che cosa è stato fatto

1. Catalogo: `filosofia-mz-barberis-v1` («Barberis · Giuristi e filosofi, riassunto») e `filosofia-mz-schauer-v1`
   («Schauer · Il ragionamento giuridico, riassunto»), materia `filosofia-del-diritto-mz`, autore del riassunto non
   indicato (lo dice la descrizione).
2. `extract-letture.py --solo` per i due documenti: Barberis **334 blocchi** (26.658 parole), Schauer **462 blocchi**
   (26.159 parole); copertura dei token verificata.
3. `sezioni-letture.mjs`: `FONTE` con `barberis` e `schauer`; `--scrivi --solo`: **31 sezioni** Barberis (u01–u06),
   **27** Schauer (u10–u19), una per lezione.
4. Confini (`letture-src/confini-sezioni.json`), lezione per lezione dal titolo che apre la lezione nella sintesi:
   Barberis 66 blocchi riportati indietro, 1 avanti («2.3. NEOIDEALISMO.»); Schauer 14 indietro, 29 avanti (titoli
   di capitolo «III …», «VII …», «X», paragrafi «3.4», «4.2», «5.2», «9.2», ecc.). Nessun `verificati` necessario.
   Aggiornata la `_nota`. `revisioni.json`: un solo blocco (`p070-b006` di Schauer) con `senzaRegole`, perché la regola
   dei titoli isolati lo trasformava in titolo (è l'inizio di una frase che continua a p. 71).
5. Glossario del lettore `letture-src/glossario-filosofia-del-diritto-mz.json`: **63 voci** con id comuni a Filosofia
   LMG/SSG (persone, opere, correnti; etichette dalle voci curate di LMG/SSG, dal nome e dagli alias M-Z, cognome per le
   persone, solo etichette presenti nel testo). Escluse le etichette generiche («norma», «autorità», «analogia»,
   «filosofia del diritto», «Romano», «Croce»…). Collegamenti nel testo: Barberis 586, Schauer 321.
6. Controlli aggiornati: `check-estrazione-letture.mjs` (12 documenti, 1.500 pagine, 2 testi senza PDF, materia nella
   copertura delle lezioni), `check-originali.mjs` (2 originali M-Z, solo testo), `check-review-plan.mjs` (materia
   nell'elenco «Studio reale Originali»), `check-build.mjs` (sopra).

## Numeri

| | prima | dopo |
|---|---|---|
| Documenti negli Originali | 10 (9 PDF) | 12 (9 PDF + 2 solo testo) |
| Pagine | 1.368 | 1.500 |
| Blocchi totali | 7.531 | 8.327 |
| Sezioni Filosofia M-Z | — | 58 (58/58 lezioni coperte) |

## Note per il coordinatore

- `sync-letture.mjs` riscrive tutti i documenti: come nel giro di Martines, file di `public/letture/` di altre materie
  risultano modificati solo perché seguono i `corso.json` attuali.
- `sezioni-letture.mjs` legge le pagine delle lezioni da `public/content/filosofia-del-diritto-mz/corso.json`: se
  cambiano le `pagine` delle lezioni M-Z, rifare `sezioni-letture.mjs --scrivi --solo <id>`, `sposta-blocchi.mjs --scrivi`,
  `sync-letture.mjs`.
- Se si corregge il testo pulito, va ricostruito il testo pubblicato, aggiornato `sha256` nel catalogo e rifatta
  l'estrazione con `--replace-base` (i blocchi possono cambiare id: rifare i confini).
- Il messaggio di `sync-letture.mjs` conta come «pagine PDF originali» anche le 132 pagine solo testo (solo il testo
  del messaggio; nessun effetto).
- AGENTS.md (sezione «Originali») non è stato toccato: si può aggiungere una riga sull'opzione `testoFonte`.
