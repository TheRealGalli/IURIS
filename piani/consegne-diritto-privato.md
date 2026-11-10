# Consegne: completare Diritto privato (unità 12–27)

Scritto il 10 novembre 2026 per chi riprende il lavoro (ChatGPT/Codex). Leggi prima [`AGENTS.md`](../AGENTS.md)
(ambiente, porte, git) e poi questo file: basta per ripartire senza rileggere la cronologia.

## Dove siamo

- Fatte e pubblicate su `main` le unità **1–11 su 27** (pp. 1–95 di 238): 31 lezioni, 221 voci, 332 domande.
  Ultimo commit: `71d6952`. Build e `check:build` verdi su quel commit.
- Mancano **16 unità** (u12–u27, pp. 96–238). La tabella con capitoli e pagine è in
  [`diritto-privato.md`](diritto-privato.md): segna «fatta» ogni unità finita.
- La sezione Codice civile è completa e non va toccata: collega da sola gli articoli citati come «art. N c.c.».
- `studio/src/views/Percorso.tsx` ha una modifica non committata di un'altra sessione: **non includerla mai** nei
  commit (aggiungi i file per nome, non `git add -A`).

## Pubblicazione: controlla che il push sia arrivato online

Ogni push su `main` fa partire «Pubblica IURIS su GitHub Pages», che ripete build e controlli (15–20 minuti) e solo
dopo pubblica. Se un controllo fallisce il sito resta alla versione precedente. È successo con `15fab0b` (run 77):
era stato pubblicato senza passare `check-domande` (completamenti con «sei», «due»); corretto nel commit dopo.
Quindi: **mai push senza `check:build` verde in locale**, e dopo il push verifica l'esito:

```bash
curl -s "https://api.github.com/repos/TheRealGalli/IURIS/actions/runs?per_page=3" | python3 -c "import json,sys
for r in json.load(sys.stdin)['workflow_runs']: print(r['run_number'], r['head_sha'][:7], r['status'], r['conclusion'])"
```

Al 10 novembre 2026 sera i run 78 (`7ce2236`) e 79 (`71d6952`) erano ancora in coda: la prima cosa da fare è
controllare che 79 sia finito con `success`.

## Giri consigliati

Un giro = scrivere le unità, poi una sola volta sync, controlli, commit e push.

| Giro | Unità | Blocco | Pagine |
|---|---|---|---|
| 1 | u12–u15 | Obbligazioni e garanzie | 96–126 |
| 2 | u16–u20 | Il contratto in generale | 127–171 |
| 3 | u21–u24 | Singoli contratti, titoli di credito, fatto illecito | 172–210 |
| 4 | u25–u27 | Famiglia, successioni, donazione e trascrizione | 211–238 |

## Il ciclo per ogni unità

```bash
export PATH=/usr/local/bin:$PATH        # node x64, sempre
# 1. leggere le pagine (i riquadri illeggibili escono come «[riquadro illeggibile]»)
python3 piani/strumenti/pagine.py "Diritto Privato/00 - Appunti e fonti/testo/torrente-dispense.txt" 96 101
# 2. scrivere "Diritto Privato/05 - Contenuti/sorgenti/u12.txt"
# 3. costruire e validare (0 errori; gli avvisi «sintesi corta» sono accettati)
python3 piani/strumenti/unita.py "Diritto Privato/05 - Contenuti/sorgenti/u12.txt"
node studio/scripts/validate-content.mjs "Diritto Privato/05 - Contenuti/u12.json"
```

A fine giro:

```bash
cd studio && node scripts/sync-content.mjs && node scripts/check-domande.mjs   # rapido: va fatto prima del build
npm run build && npm run check:build                                            # alcuni minuti
```

Poi: «fatta» nella tabella, numero di unità aggiornato in `README.md`, `INDICE.md`, `AGENTS.md` (oggi «11 unità
su 27»), commit in italiano e push su `main`.

## Il formato del sorgente

La spiegazione è in testa a [`strumenti/unita.py`](strumenti/unita.py). **Il modello da imitare è
`sorgenti/u11.txt`** (possesso): stessa struttura, stessa densità, stesso tono. In breve:

- `@unita id|ordine|titolo|capitolo|pag-pag` (cinque campi, niente `|` finale), `@abstract`, `@note` (o `-`),
  `@redazione` (ripetibile).
- `@lezione id|titolo|pag-pag|minuti|concetti`, poi la sintesi in markdown, `@punti`, `@memoria` (`voce :: dettaglio`).
- `@concetto id|Nome|tipo|alias;alias|pag-pag|breve` e **sulla riga dopo la definizione estesa** (obbligatoria).
- `@relazione da|a|tipo|etichetta`, `@evento …` (solo date certe), `@mappa` (rientri di due spazi, `[id]`, `{nota}`).
- `@domande`: `F` flashcard, `M` multipla (quattro opzioni, indice da 0), `V` vero/falso, `C` completa con
  `{{buco}}`, `A` aperta (traccia con `\n`, punti `testo=chiave,chiave;…`), `O` ordina, `B` abbina.
- Il carattere `|` separa i campi: non usarlo mai dentro i testi.

## Standard di qualità (quelli delle unità 1–11)

- **Lezioni**: 2–4 per unità, 350–550 parole ciascuna, titoletti `###`, una tabella per ogni distinzione, grassetti
  sui termini chiave, un esempio pratico per istituto, collegamenti `[[id]]` alle voci.
- **Articoli**: sempre «art. 1321 c.c.» / «artt. 1325 e 1418 c.c.». Controlla numero e contenuto sul testo in
  `Diritto Privato/05 - Contenuti/norme/libro-*.json`, non a memoria.
- **Domande per lezione** (minimo del validatore): 4 flashcard, 2 multipla, 2 vero/falso, 1 completa, 1 aperta;
  **per unità** almeno 1 ordina e 1 abbina. Nelle unità fatte: circa 10 domande per lezione, con almeno un caso
  pratico («Tizio vende a Caio…») tra le multiple.
- **Completa**: la parola nel buco non può essere un numero scritto in lettere («sei», «otto», «dieci»):
  `check-domande` la rifiuta. Metti nel buco il termine giuridico e lascia il numero nel testo.
- **Voci**: la definizione estesa diventa la risposta della carta di glossario. Deve dire da sola che cos'è
  (almeno 40 caratteri, comincia con il genere: «Azione con cui…», «Contratto con cui…»; mai «Esempi…», «Vi si…»).
  Riusa gli id già definiti nelle unità precedenti (elenco: `grep -h '^@concetto' sorgenti/*.txt | cut -d'|' -f1`).
- **Secoli** sempre con l'era («XIX secolo d.C.»).
- **Dispensa del 2012**: la sintesi descrive il diritto di oggi. In `@note` una frase per chi studia
  («Aggiornato: …»), in `@redazione` che cosa è cambiato e con quale legge. Se un punto non è verificato, dillo in
  `@redazione`; non inventare.
- **Pagine fitte o illeggibili**: segui l'ordine degli argomenti della dispensa e il testo vigente del Codice, e
  annotalo in `@redazione`.

## Dove serve più attenzione

- **u13–u15**: mora e interessi (tasso legale variabile, interessi moratori nelle transazioni commerciali,
  d.lgs. 231/2002); patto marciano e pegno non possessorio (d.l. 59/2016); art. 2929-bis c.c. (2015).
- **u20–u21**: Codice del consumo (d.lgs. 206/2005 e modifiche: garanzie nella vendita di beni di consumo, d.lgs.
  170/2021; clausole vessatorie); gli artt. 1519-bis ss. c.c. sono abrogati (già segnati nella sezione Codice).
- **u22**: nove capitoli in 17 pagine: scegli i contratti trattati davvero e fai 4–5 lezioni; locazioni e
  affitti brevi, leasing (l. 124/2017) se compaiono.
- **u24**: tre pagine soltanto per l'illecito: integra con gli artt. 2043–2059 c.c. e i criteri sul danno non
  patrimoniale, dichiarandolo in `@redazione`.
- **u25 Famiglia** (otto capitoli in 12 pagine, la parte più superata): stato unico di figlio e responsabilità
  genitoriale (l. 219/2012, d.lgs. 154/2013), divorzio breve (l. 55/2015), negoziazione assistita (d.l. 132/2014),
  unioni civili e convivenze (l. 76/2016), riforma Cartabia e tribunale per le persone, i minorenni e le famiglie
  (d.lgs. 149/2022), cognome dei figli (Corte cost. 131/2022). Verifica ogni regola sul testo vigente.
- **u26 Successioni**: quote dei legittimari dopo la riforma della filiazione; patto di famiglia (artt. 768-bis
  ss. c.c.); certificato successorio europeo. Verifica se la riforma dell'azione di restituzione contro i terzi
  (artt. 561–563 c.c.) è in vigore prima di scriverla.
- **u27**: è l'ultima: aggiorna anche lo stato in `piani/potenziamento.md` e togli «in corso» da README, INDICE e
  AGENTS.

## Dopo l'ultima unità (facoltativo, da proporre a Carlo)

Schede inverse, `quadro.json` e serie di esercizi (`serie`) per Diritto privato, come per Diritto costituzionale;
verifica degli articoli del Codice modificati dopo luglio 2022 (vedi [`diritto-privato.md`](diritto-privato.md)).
