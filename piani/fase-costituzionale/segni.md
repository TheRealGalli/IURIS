# Segni degli Originali sostituiti: allineamento e migrazione (12 novembre 2026)

Chi aveva evidenziato o sottolineato i documenti vecchi (`costituzionale-martines-v1`, `costituzionale-bin-pitruzzella-v1`,
e tra poco `romano-pennacchio-2021-22-v1`) ritrova i segni sul testo IURIS che li sostituisce. I dati vecchi non si
toccano e restano nel backup.

## Pezzi

| File | Che cosa fa |
|---|---|
| `studio/src/lib/allineamento.ts` | Funzioni pure condivise tra script e app: frasi di un textContent (`frasiDi`), parole piene normalizzate (`parolePiene`), impronta di una frase (`impronta`), formato della tabella (`TabellaAllineamento`). |
| `studio/scripts/allinea-originali.mjs` | Costruisce la tabella e il resoconto (sotto). |
| `studio/scripts/lib/originale-versione.mjs` | Blocchi di un Originale con il textContent del lettore, dal repository o dalla storia git. |
| `studio/src/lib/migrazione-segni.ts` | Migrazione nell'app: `migraSegno` (puro), `applicaMigrazioneSegni` (puro), `migraSegniOriginali` (carica tabella e sezioni nuove, scrive con lo store). Elenco delle coppie in `SOSTITUZIONI_ORIGINALI`. |
| `studio/scripts/check-segni-migrati.mjs` | Prova (nel gruppo `check:backup`). |

Ritocchi: `letture.ts` esporta `occorrenzeCitazione`; `originali.ts` aggiunge `segniMigrati` a `LetturaOriginale`
(validato in `backup-dati.ts`); `store.ts` aggiunge `progressoSalvato` e `dopoOgniMigrazione` (passi rieseguiti alla
fine di `eseguiMigrazioni`: ripristino di un backup, fine della demo); `data.ts` lancia la migrazione dei segni dopo
ogni `caricaCorso` e la registra in `dopoOgniMigrazione`; `LettoreTesto.tsx`: l'avviso sui segni senza
corrispondenza non parla più solo del «vecchio lettore PDF».

## Allineamento (offline)

```
cd studio && export PATH=/usr/local/bin:$PATH
node scripts/allinea-originali.mjs <vecchio> <nuovo> [--per-lezione] [--soglia N] [--commit <rev>] [--report <file>] [--debug <file.json>]
```

- Documento vecchio: da `public/letture/<vecchio>/` se c'è, altrimenti dalla storia git (ultimo commit che lo
  contiene: per costituzionale `0c530ab`, per Romano `6f3c944`). Testo = textContent di `renderMd` (come il lettore).
- Frasi: tagli agli a capo e dopo `. ! ? ; …` seguiti da spazio e maiuscola/cifra/virgolette, saltando le abbreviazioni
  («art.», «n.», «c.c.», «d.lgs.»…).
- Parole piene: minuscole, senza accenti, troncate a 6 lettere; tolte parole sotto 4 lettere e stopword. Pesi: numeri e
  date ×3, nomi propri (maiuscola non a inizio frase) e latino (elenco in `LATINO`) ×2, tutto per l'idf. Punteggio F2
  (il recupero del contenuto vecchio conta più della precisione).
- **Pagine** (Martines, Romano): programmazione dinamica monotona sulle frasi nuove delle pagine p-1…p+1 (più frasi
  vecchie possono andare sulla stessa frase nuova; una frase vecchia prende anche le vicine se il punteggio sale).
  **Per lezione** (`--per-lezione`, Bin-Pitruzzella): lezione A-L → lezione nuova con `migrazione.json`, DP sulle frasi
  delle sezioni nuove di quella lezione; le altre frasi valgono 0,12 in meno.
- Poi, per tutte: ogni capoverso vecchio si cerca come un tutto tra finestre di tre blocchi nuovi (le frasi delle due
  finestre migliori valgono +0,08), candidati fuori ordine dall'indice delle parole, sostegno delle frasi vicine
  (+0,06 per vicina coerente). Punteggio finale = F2 × fiducia (radice di parole piene/6, max 1) + 0,04 × vicine
  coerenti + 0,06 se nella regione del capoverso.
- Uscita: `public/letture/<nuovo>/allineamento-<vecchio>.json` e `piani/fase-<materia>/allineamento-<vecchio>.md`
  (frasi vecchie sotto soglia, pagina per pagina, con l'inizio della frase nuova più vicina: serve anche a controllare
  che il testo nuovo copra tutto).

### Formato della tabella (compatto, `formato: 1`)

`{ formato, vecchio, nuovo, modo, fonteNuovo, soglia, sezioni, vecchi, nuovi, mappa }`
- `fonteNuovo` = `fonteSha256` del testo nuovo nel catalogo: se cambia il testo, l'app ignora la tabella (va rifatta).
- `vecchi[]` = `[idBlocco, pagina, [inizio, fine, …] delle frasi, impronte per frase, pagina nuova probabile]`.
  **Nessun testo vecchio**: solo confini e impronta (codici di 3 caratteri, 18 bit di FNV-1a delle parole piene), così i
  riassunti di terzi non tornano pubblicati.
- `nuovi[]` = `[idBlocco, indice in sezioni, lunghezza del textContent, [inizio, fine, …]]`.
- `mappa[k]` = `[punteggio 0–100, indici globali delle frasi nuove…]` per la frase vecchia k (`[0]` = nessuna).
Dimensioni: Martines 474 KB, Bin-Pitruzzella 458 KB, Romano 363 KB (scaricate solo da chi ha segni da migrare).

## Migrazione nell'app

Per ogni coppia il cui documento nuovo è nel catalogo, se la materia ha segni sul documento vecchio non ancora trattati:
1. Frasi vecchie del segno: per ogni ancora, le frasi del blocco che si sovrappongono agli indici, se le parole della
   citazione tornano (≥ 60% dell'impronta); altrimenti (segno PDF, blocchi rinumerati da una versione precedente)
   ricerca delle parole della citazione nelle frasi della pagina ±1: gruppo contiguo di frasi quasi interamente citate,
   oppure l'unica frase che contiene ≥ 60% delle parole.
2. Frasi nuove = unione della `mappa`; punteggio = media pesata delle frasi coperte. Se la citazione vecchia compare pari
   pari, una sola volta, nelle frasi nuove, si segna solo quel tratto; se no le frasi nuove intere (tratti contigui
   uniti per blocco). Ancore sul textContent dei blocchi nuovi, come i segni normali (`creaAncoraTesto`).
3. Sotto `soglia`, frase non ritrovata, o blocco nuovo di lunghezza diversa: segno **«da ricollocare»**: stessa
   citazione vecchia, ancora su un blocco inesistente `pNNN-ricollocare` della pagina probabile. Il lettore lo conta
   tra i segni senza corrispondenza sicura (avviso «Vedi i segni»), la mappa lo mette in coda «Segni da ricollocare»
   (il concetto c'era già: `daRicollocare` in `mappa-geometrica.ts`). Persi solo i segni senza testo.
4. Segno nuovo: id `<sigla>-<id vecchio>` (`mt`, `bp`, `rp`), stesso tipo, colore e data; in coda ai segni, fuori dalla
   cronologia di Annulla. In `segniMigrati[<vecchio>]` gli id trattati: rieseguire non cambia nulla, un segno migrato
   cancellato non torna. Senza tabella, con tabella di un altro testo o senza rete: nulla cambia, si riprova al
   prossimo caricamento del corso. Dopo un ripristino di backup vecchio: `eseguiMigrazioni` (Martines confluisce in
   costituzionale) e poi i segni. In demo non fa nulla.

## Soglie e precisione misurata

Soglia = punteggio minimo per spostare il segno; tarata leggendo a mano campioni casuali di frasi vecchie con la frase
nuova scelta (`--debug`):

| Documento | Modo | Soglia | Frasi sicure (tabella) | Precisione sopra soglia (campione letto a mano) |
|---|---|---|---|---|
| Martines → IURIS | pagine | 40 | 4.011 / 4.185 = **95,8%** | 15/15 corrette (sotto 40, fra 30 e 40: circa 8/15) |
| Bin-Pitruzzella → IURIS | lezioni | 55 | 710 / 4.059 = **17,5%** | circa 12/15 (fra 45 e 55: circa 8/15; sotto 45: meno di metà) |
| Romano (appunti) → IURIS | pagine | 40 | 3.321 / 3.413 = **97,3%** | 11/12 (anche fra 25 e 40 quasi tutte giuste) |

Campione della prova (segni finti su frasi intere con almeno 5 parole piene, migrati con `migraSegno`): Martines
291/300 = 97,0% spostati (tutti entro 2 pagine), Bin-Pitruzzella 64/300 = 21,3%, Romano 198/200 = 99,0%.

Bin-Pitruzzella è basso per natura: il testo IURIS segue Martines e integra solo i temi A-L, molte frasi A-L (esempi,
domande e risposte, dettagli sui sistemi elettorali passati) non hanno un corrispettivo; con soglie più basse i segni
cadrebbero su frasi dello stesso tema ma sbagliate. Quindi gran parte dei segni A-L di Carlo arriva «da ricollocare»,
con la citazione e la pagina probabile. Il resoconto `allineamento-costituzionale-bin-pitruzzella-v1.md` elenca pagina
per pagina le frasi senza corrispondenza: è anche la lista dei contenuti A-L da verificare nel testo IURIS.

## Prove (`node scripts/check-segni-migrati.mjs`, in `npm run check:backup`)

- 32 casi controllati a mano (Martines: numeri, date, nomi, articoli, frasi generiche, un tratto di frase, due frasi,
  segni del lettore PDF, la stessa frase su due pagine diverse; Bin-Pitruzzella: 7 casi e 2 attesi «da ricollocare»):
  il segno nuovo deve contenere le parole attese, le ancore devono coincidere con il textContent nuovo, tipo, colore e
  data conservati, Martines sulla stessa pagina ±2.
- Idempotenza, segni vecchi conservati, segno migrato cancellato che non torna, Annulla che non tocca i migrati.
- Rinvio senza rete, poi migrazione appena la tabella è raggiungibile.
- Backup vecchio (A-L e Martines separati) ripristinato: progressi fusi e tutti i segni sul testo nuovo; il backup nuovo
  (con `segniMigrati`) si convalida e si ripristina senza doppioni.
- Campioni di precisione per i tre documenti. Il caso Romano si attiva da solo quando `romano-iuris-v1` è nel catalogo
  (ora c'è) e richiede la tabella.
- Verdi anche `npx tsc --noEmit -p .`, `check-migrazione`, `check-ordine-segni`, `check-mappa-geometrica`. Non provato a
  mano nel browser (il pannello del browser non era disponibile).

## Romano

Già fatto una volta sul testo attuale (sha `ce26c116…`): tabella in `public/letture/romano-iuris-v1/` e resoconto in
`piani/fase-romano/allineamento-romano-pennacchio-2021-22-v1.md`. **Se il testo di Romano cambia** (nuovo sha nel
catalogo), basta rifare:

```
cd studio && export PATH=/usr/local/bin:$PATH
node scripts/allinea-originali.mjs romano-pennacchio-2021-22-v1 romano-iuris-v1
node scripts/check-segni-migrati.mjs
```

Con un testo cambiato e la tabella vecchia, l'app non migra (sha diverso) e `check-segni-migrati` fallisce con un
messaggio che dice di rifare la tabella. Lo stesso vale per costituzionale se cambia `costituzionale-iuris.txt`.
Per un altro documento sostituito: aggiungere la coppia a `SOSTITUZIONI_ORIGINALI` e lanciare lo script.
