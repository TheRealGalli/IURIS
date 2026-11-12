# Correzioni dopo la verifica (12 novembre 2026)

Sulla base di `verifica.md`. File toccati: `u02`, `u03`, `u07`, `u11`, `u14`, `u15`, `migrazione.json`,
`mappa-g02`, `g03`, `g05`, `g06`. Nessun sync né build.

## Domande corrette

- `u03-q103` (vero/falso): ora «Il decreto-legge non convertito in legge entro sessanta giorni dalla pubblicazione
  perde efficacia fin dall'inizio (ex tunc)», vero; la spiegazione cita l'art. 77, terzo comma, e la legge che regola
  i rapporti sorti dal decreto.
- `u03-q094`: non c'è più la «disapplicazione». Ora è annullamento: cessazione dell'efficacia dal giorno dopo la
  pubblicazione (art. 136 Cost.), inapplicabilità anche ai rapporti pendenti, salvi quelli esauriti (art. 30 l. 87/1953).
- `u03-q105` (dettaglio): nella spiegazione ho aggiunto l'art. 3 c.p. e «salve le immunità di diritto interno e
  internazionale».
- `u14-q510`: riscritta sulla sua lezione (u14-l4, p. 128, dove la sintesi tratta l'art. 78 e la l. 145/2016).
  Nuova domanda: «Nella politica di difesa, come si distinguono la deliberazione dello stato di guerra e le missioni
  internazionali?». Le opzioni sono specifiche e la spiegazione cita gli artt. 78 e 87, la l. 145/2016 e il Consiglio
  supremo di difesa. Concetti: `indirizzo-politico`, `governo`, `consiglio-supremo-di-difesa`; `pagine` [128, 128].
  L'id resta lo stesso, quindi `u07-q026` di A-L continua a puntarci.

## Doppioni eliminati (nessuno aveva `esame`)

| Eliminata | Resta | Vecchi id A-L rimappati |
|---|---|---|
| `u15-q564` | `u10-q006` | `u14-q033` |
| `u02-q515` | `u15-q077` | `u12-q021` |
| `u02-q533` | `u15-q078` | `u12-q041` |
| `u07-q520` | `u11-q078` | `u04-q003`, `u04-q025` |
| `u11-q508` | `u15-q042` | `u13-q013` |
| `u02-q540` (trovata con lo script) | `u14-q021`, legalità formale e sostanziale | `u12-q048` |
| `u15-q551` (trovata con lo script) | `u10-q012`, completa: regolamento a maggioranza assoluta | `u14-q009` |

Si conservano gli id Martines e si tolgono le `q5NN`. Lo script (Jaccard sulle parole + SequenceMatcher > 0,85, tutte le
unità) ha trovato anche coppie che non sono doppioni e restano come sono:
- la serie «Commenti l'art. N»;
- i passi diversi di «Come nasce una legge» e del giudizio incidentale;
- `u11-q521`, legge rinforzata, diversa dalla riserva rinforzata;
- `u15-q570`, che è un'aperta con traccia mentre `u10-q002` è una flashcard.

Togliendo due flashcard, `u02-l8` è scesa a 3 flashcard (sotto la soglia di 4). Ho aggiunto `u02-q542`: differenza tra
riserva rinforzata per contenuto (art. 16) e per procedimento (art. 79), presa dalla tabella della sintesi.

## Controlli

- `validate-content.mjs`: 0 errori e 0 avvisi su u02, u03, u07, u11, u14 e u15.
- `migrazione.json`: le 795 domande e le 50 lezioni puntano tutte a id esistenti. La voce Martines è «uguali» e non
  la tocca nessuna eliminazione, perché sono tutte `q5NN`.
- Mappe g01–g11: nessun id inesistente. Nessun riferimento residuo agli id eliminati.
