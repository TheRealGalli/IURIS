# Originali · Diritto privato con il testo IURIS (`privato-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Controlli verdi: `npm run check:letture` (estrazione, confini, letture, ordine dei
segni, mappa geometrica, mappa sul corpus, selezione), `check-originali`, `check-review-plan`, `check-segni-migrati`,
`check-migrazione`, `check-corsi`, `npx tsc --noEmit -p .`.
Non lanciati (tocca al coordinatore): `sync-content`, `npm run build`, `check:build`. `05 - Contenuti/` non toccato.

## Catalogo

- `src/lib/originali-catalogo.json`: `diritto-privato-torrente-dispense-v1` sostituito, nella stessa posizione, da
  `privato-iuris-v1`: materia `diritto-privato`, «Diritto privato · testo IURIS», `testoFonte: testi/privato-iuris.txt`,
  `testoMarkdown: true`, 238 pagine (stessa numerazione della dispensa), `sha256` `de9e9701…71e8`, nessun `file`.
  Descrizione: testo scritto da IURIS sul programma comune alle tre classi, ordine del manuale Torrente–Schlesinger,
  aggiornato al diritto vigente a novembre 2026.

## Rimozioni

- PDF `public/originali/diritto-privato-torrente-dispense.pdf` e la sua eccezione in `.gitignore`.
- Cartelle `letture-src/` e `public/letture/diritto-privato-torrente-dispense-v1/` (cancellate dal disco, non messe
  in stage: l'indice git non è stato toccato).
- Voci del vecchio documento in `revisioni.json` (77 blocchi, quasi tutti riquadri decifrati), `confini-sezioni.json`
  (anche `verificati`), `catalogo.json`, `estrazione-verifica.json`. `fonti.json` non aveva voci.
- `sync-letture.mjs`: l'insieme `FITTI` (pulizia dei riquadri illeggibili) è vuoto, con una nota; le funzioni restano.
  `decifra-riquadri.py` resta, con la nota «non più in uso»: nessun controllo lo richiede.
- `glossario-diritto-privato.json` resta com'è (361 voci) e collega il testo nuovo: 3.542 collegamenti. Gli
  «art. N c.c.» (circa 1.400 nel testo) si collegano da soli nel lettore. Dati degli utenti non toccati: il vecchio
  testo resta nella storia git (commit `d261ddf`) e `allinea-originali.mjs` lo legge da lì.

## Sezioni e confini

- Estrazione: 238 pagine, 4.170 blocchi, testo integrale.
- `sezioni-letture.mjs`: nuovo dizionario `DIVISIONI` (lezioni che cominciano sulla stessa pagina della precedente ma
  hanno una sezione propria, da un blocco preciso). Serve per u26-l3 e u26-l4, che cominciano entrambe a p. 228:
  u26-l4 parte da `p228-b014` («Capitolo 67 · La successione necessaria»). Gli altri documenti non cambiano.
- **98 sezioni per 98 lezioni**, tutte aperte da un titolo (`check-estrazione-letture` ora lo pretende anche per
  privato). In `confini-sezioni.json`: 28 sezioni con 276 blocchi riportati alla precedente, 9 con 125 blocchi portati
  avanti; nessun `verificati`. Confini scelti con uno script (somiglianza con la sintesi della lezione, titoli `###`
  delle pagine p-1…p+1) e poi rivisti a mano uno per uno sui titoli delle sintesi; preferito il titolo di capitolo
  quando apre la lezione.
- Casi discutibili (l'ordine del testo non coincide con quello delle sintesi): u15-l2 parte dal patto commissorio
  (p. 117), così il pegno vero e proprio sta nella sezione di u15-l2 e non in u15-l1; u15-l3 parte da «C) L'ipoteca»
  (p. 119); u15-l4 da «Capitolo 23» (terzo acquirente ed estinzione restano in u15-l3); u27-l3 parte da «La continuità
  delle trascrizioni» (p. 237), così «Gli atti da trascrivere» sta in u27-l3; u24-l3 parte da «Responsabilità
  contrattuale ed extracontrattuale» (p. 209).

## Controlli aggiornati

- `check-estrazione-letture.mjs`: 11 documenti, 1.242 pagine, 5 PDF, 5 testi senza PDF; soglie per
  `privato-iuris-v1` (≥ 900 titoli, ≥ 2 tabelle, ≥ 3.600 capoversi e voci, mediana ≤ 60, nessun capoverso oltre 200
  parole, titoli pubblicati = righe `#` del testo, parole identiche al testo); ogni sezione si apre con un titolo.
  Il vecchio documento non aveva controlli su blocchi precisi.
- `check-originali.mjs`: privato ha un solo originale, il testo IURIS di 238 pagine, senza PDF.
- `check-review-plan.mjs`: aggiunta `diritto-privato` allo studio reale degli Originali (prima era esclusa: 97 sezioni
  per 98 lezioni).
- `check-mappa-corpus.mjs` e `fixtures/segni-campione.json`: 3.345 segni di prova sul testo nuovo (regole di
  `genera-segni-campione.mjs`, solo privato; gli altri documenti invariati); il controllo pretende il campione. Tutti
  al loro posto. Nessun backup di stress (la dispensa non ne aveva).
- `check-segni-migrati.mjs`: caso Privato (sotto). `check-build.mjs`, `check-letture*`, `check-mappa-geometrica`: non
  citavano la dispensa, invariati.

## Segni

- `node scripts/allinea-originali.mjs diritto-privato-torrente-dispense-v1 privato-iuris-v1` (modo pagine, soglia 40):
  5.784 frasi vecchie, 8.435 nuove; **sicure 5.102 / 5.253 piene = 97,1%** (per parole 97,7%), nessuna senza
  corrispondenza, 498 recuperate fuori ordine, mediana 72. Tabella `public/letture/privato-iuris-v1/allineamento-…json`
  (515 KB), resoconto `piani/fase-privato/allineamento-diritto-privato-torrente-dispense-v1.md`.
- Pagine basse: p. 125 (100%: l'unica frase è il titolo «Schemi riassuntivi sulle obbligazioni»), 184 (1 su 3), 4, 46,
  174, 154, 151, 112 (14–17%). Nessuna pagina con contenuto perso.
- Precisione letta a mano (campione casuale): sopra 40, 15/15 corrette; fra 30 e 40, circa 6/8.
- `src/lib/migrazione-segni.ts`: coppia aggiunta a `SOSTITUZIONI_ORIGINALI` (sigla `tp`).
- `check-segni-migrati.mjs`: campione 292/300 = 97,3% spostati (tutti entro 2 pagine), soglia ≥ 85%; 9 casi a mano
  (riquadro decifrato, numeri, latino, elenco, segno del vecchio lettore PDF) migrati nello store sulla stessa pagina
  (±1), con tipo, colore e data; segni vecchi conservati; idempotenza.

## Misure sul testo pubblicato

| | |
|---|---|
| Pagine / blocchi | 238 / 4.170 (circa 151.000 parole) |
| Titoli resi (h1–h6) | 934, come le righe `#` del testo |
| Capoversi | 2.302 |
| Voci d'elenco | 1.461 |
| Mediana parole per capoverso | 46 |
| Capoversi o voci > 200 parole | 0 |
| Tabelle | 2 (p. 228) |
| Collegamenti al glossario | 3.542 |

## Note per il coordinatore

- `sezioni-letture.mjs --scrivi --solo privato-iuris-v1` cancella `public/letture/privato-iuris-v1/`: se si rifà,
  rilanciare dopo `sposta-blocchi.mjs --scrivi`, `sync-letture.mjs` e `allinea-originali.mjs` (la tabella sta lì).
- Se cambia il testo: aggiornare `sha256`, cancellare `letture-src/privato-iuris-v1/`, rifare estrazione, sezioni,
  `sposta-blocchi`, `sync-letture`, l'allineamento dei segni e il campione di privato in `segni-campione.json`
  (gli id dei blocchi possono cambiare; anche `DIVISIONI` e `confini-sezioni.json` vanno ricontrollati).
- AGENTS.md (sezione «Originali», punto 4 cita `decifra-riquadri.py` per la dispensa di privato) e README non li ho
  toccati.
