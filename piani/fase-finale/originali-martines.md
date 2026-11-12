# Originali · Diritto costituzionale Martines (`costituzionale-martines-v1`)

Stato: **fatto** (12 novembre 2026). Controlli verdi: `check-estrazione-letture`, `check-confini-letture`,
`check-originali`, `check-review-plan`, tutto `npm run check:letture`. Non lanciati (li lancia il coordinatore):
`sync-content`, `npm run build`, `check:build`.

## Verifica del PDF prima della pubblicazione

- `Martines, riassunto (267 pp).pdf`: PDF StuDocu (copertina con logo, filigrana «Azione Universitaria» su ogni
  pagina, banner «This document is available free of charge on StuDocu.com» a pagine alterne). Testo estraibile.
- **Nessun dato personale**: nessuna email né «Scaricato da …» nel testo di nessuna delle 267 pagine; le immagini del
  PDF (19 diverse, estratte e guardate una per una: logo, filigrana, banner, tabelle/schemi alle pp. 26, 28–29) non
  contengono nomi; pagine 1, 2, 3 e 267 controllate anche come immagine. Metadati: solo produttore Quartz e data.
- Autore del riassunto non indicato: la descrizione del catalogo lo dice.

## Che cosa è stato fatto

1. PDF copiato in `studio/public/originali/costituzionale-martines.pdf` (sha256 `50afb453…8e28`), eccezione in
   `.gitignore`, voce `costituzionale-martines-v1` in `studio/src/lib/originali-catalogo.json`
   (materia `diritto-costituzionale-martines`, 267 pagine, `pagineOmesse: [1]` = copertina StuDocu, `dividiTitoli: true`).
2. **Estrazione** (`extract-letture.py --solo`). Il riassunto è testo giustificato senza righe vuote: l’estrazione
   normale dava un blocco per pagina (349 blocchi) e le lezioni, che cominciano quasi sempre a un paragrafo numerato a
   metà pagina, non si potevano separare. Aggiunta a `extract-letture.py` un’opzione per documento, `dividiTitoli`
   (solo se presente nel catalogo, gli altri PDF non cambiano): un capoverso nuovo comincia a ogni riga che apre un
   paragrafo numerato («12. …», «3- …», «13. b) …») o una parte/capitolo/sezione. Le parole restano identiche
   (controllo `coperturaToken` dello script). Risultato: **517 blocchi**, 138.560 parole, nessuna pagina senza testo.
3. `sezioni-letture.mjs --scrivi --solo costituzionale-martines-v1`: **111 sezioni, una per lezione** (u01–u28).
4. `sync-letture.mjs` + `check-confini-letture.mjs`: corretti tutti i confini in `letture-src/confini-sezioni.json`,
   lezione per lezione, confrontando i titoli dei paragrafi del riassunto con i `###` delle sintesi:
   - 72 sezioni con blocchi iniziali riportati alla precedente (85 blocchi);
   - 12 sezioni con blocchi finali portati avanti (13 blocchi: titoli di paragrafo o di sezione che aprono la lezione
     dopo, es. «3. Stati unitari e Stati composti», «12. La libertà di manifestazione del pensiero», «SEZIONE VI»);
   - `verificati`: 8 sezioni che cominciano al cambio pagina a metà di un paragrafo continuo (la lezione comincia lì
     ma il paragrafo no: u02-l3, u02-l6, u03-l3, u04-l3, u08-l2, u11-l5, u14-l2, u15-l2) e 73 sezioni che cominciano
     con un paragrafo numerato del riassunto (n. > 1), che il controllo scambierebbe per voce d’elenco.
   Aggiornata la `_nota` del file. Esito: «487 sezioni, nessuna spezzata a metà frase o elenco».
5. Glossario del lettore `letture-src/glossario-diritto-costituzionale-martines.json`: le 210 voci del glossario di
   costituzionale A-L i cui id esistono anche in Martines (38 escluse perché assenti). 1.683 collegamenti nel testo.
6. Conteggi e materie aggiornati: `check-estrazione-letture.mjs` (10 documenti, 9 PDF, 1.368 pagine, materia nella
   copertura delle lezioni), `check-originali.mjs` (1 originale per `diritto-costituzionale-martines`),
   `check-review-plan.mjs` (materia nell’elenco «Studio reale Originali»).

## Numeri

| | prima | dopo |
|---|---|---|
| Documenti negli Originali | 9 (8 PDF) | 10 (9 PDF) |
| Pagine PDF | 1.101 | 1.368 |
| Blocchi Martines | — | 517 (111 sezioni, 111/111 lezioni coperte) |
| Blocchi totali | 7.014 | 7.531 |

## Note per il coordinatore

- `sync-letture.mjs` riscrive tutti i documenti: ~49 file di `public/letture/` di altre materie risultano modificati
  solo perché i collegamenti seguono i `corso.json` attuali (lavoro degli altri subagenti, es. privato u25-l2 con
  `affidamento-dei-figli`). Al sync finale si riallineano comunque.
- `sezioni-letture.mjs` legge le pagine delle lezioni da `public/content/diritto-costituzionale-martines/corso.json`:
  se in seguito cambiano le `pagine` delle lezioni Martines, va rifatto il passo 3–4 (`--solo`), poi
  `sposta-blocchi.mjs --scrivi`.
- Numerazione: le pagine del lettore sono quelle del PDF (= numero stampato + 1, per la copertina).
- Nessun dubbio aperto sui dati personali.
