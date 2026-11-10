# Consegne: portare le materie al livello di Diritto romano

Scritto il 10 novembre 2026 per chi riprende il lavoro (ChatGPT/Codex). Leggi prima [`AGENTS.md`](../AGENTS.md).
**Diritto romano è il modello (100%)**: per ogni passo guarda come è fatto lì e replica formato e densità.

Regole valide per tutti i passi:

- Un passo alla volta, nell'ordine. A fine passo: `cd studio && npm run build && npm run check:build`, poi commit
  in italiano e push su `main`. Mai push senza controlli verdi. Mai includere `studio/src/views/Percorso.tsx`.
- `export PATH=/usr/local/bin:$PATH` per node; per gli script Python con pypdf usa `/usr/bin/python3` o il
  `python3` senza quel PATH.
- Non inventare: ciò che non è verificato va detto in `noteRedazione`. Norme recenti: verifica su Normattiva.
- Aggiorna a fine passo la tabella qui sotto (colonna «Stato») e i numeri in `README.md` e `INDICE.md`.

| Passo | Che cosa | Stato |
|---|---|---|
| 1 | Glossario degli Originali di privato | Completato: 361 voci, 476 etichette; collegamenti ripetuti nei capoversi |
| 2 | Più domande per privato | |
| 3 | Schede inverse di privato | |
| 4 | Stile delle unità 12–27 di privato | |
| 5 | Quadro di privato e di Filosofia | |
| 6 | Approfondimenti («oltre») | |
| 7 | Filosofia SSG: più voci | |
| 8 | «art. N Cost.» da privato alla Costituzione | |

## 1. Glossario degli Originali di privato (il più visibile)

Problema: negli Originali di privato i termini collegati al glossario sono pochi. Romano e Filosofia hanno un
elenco curato (`studio/letture-src/glossario-diritto-romano.json`: `[{ "id": "...", "etichette": ["...", "..."] }]`)
che collega il termine **in ogni paragrafo**; privato non ce l'ha e collega solo la prima occorrenza per sezione.

- Crea `studio/letture-src/glossario-diritto-privato.json` con le voci più importanti (almeno 200 delle 503):
  per ciascuna le forme con cui compare nella dispensa (singolare, plurale, sinonimi, latino). Solo etichette di
  almeno 4 caratteri e non ambigue («causa», «termine», «parte» collegano troppo: usale solo in forma estesa,
  es. «causa del contratto»).
- Aggiungi `alias` alle voci nelle unità (`@concetto id|Nome|tipo|alias;alias|…` nei sorgenti) quando la dispensa
  usa un nome diverso.
- Poi `node scripts/sync-content.mjs && node scripts/sync-letture.mjs` e controlla a campione tre sezioni nel
  browser (porta 7101): i collegamenti devono essere giusti, non solo tanti.

## 2. Più domande per privato

Il passo 1 introduce `glossario-diritto-privato.json`, con locuzioni, plurali e varianti di apostrofo. Le parole
polisemiche sono escluse come etichette isolate; aggiunti nei sorgenti gli alias «datio in solutum»,
«responsabilità contrattuale», «responsabilità aquiliana», «promessa di pagamento» e «ricognizione di debito».
Corretto anche il sync: le etichette curate si collegano una volta per capoverso, le automatiche una volta per
sezione. Copertura degli Originali e testo di fonte conservati. Build e `check:build` riusciti, inclusi 1.348
controlli su 11 dispositivi; verificate nel browser proprietà (u08-l1), novazione (u13-l3) e legittimari (u26-l3).
I collegamenti di privato passano da 356 a 3.497. Ripartire dal passo 2.

Oggi circa 10 domande per lezione; Romano ne ha 15. Porta ogni lezione ad almeno 14: aggiungi soprattutto
**casi pratici** (multipla: «Tizio vende a Caio…»), vero/falso sulle confusioni tipiche e completa sui termini.
Si aggiungono in fondo alla sezione `@domande` del sorgente `sorgenti/uNN.txt`, poi
`python3 piani/strumenti/unita.py …` e `validate-content.mjs`. Nei completa niente numeri scritti in lettere.

## 3. Schede inverse di privato

Formato e regole in `studio/CONTENUTI.md`; esempio: `Diritto Costituzionale/05 - Contenuti/schede-inverse.json`
e `Filosofia del Diritto SSG/05 - Contenuti/schede-inverse.json`. Una scheda per le voci principali (almeno 250):
dalla definizione al nome. Attenzione agli alias uguali tra voci diverse: il sync si ferma.

## 4. Stile delle unità 12–27 di privato

Sono corrette ma vaghe: troppe formule come «nei termini di legge», «nei presupposti previsti», «secondo la
disciplina» (32 volte nell'unità 25). Sostituiscile con la regola precisa (termine, soggetto, effetto) presa
dall'articolo, che ora è nel Codice dell'app aggiornato a Normattiva (`05 - Contenuti/norme/libro-*.json`).
Modello di tono: `sorgenti/u11.txt`. Non cambiare la sostanza; non allungare oltre 550 parole per lezione.

## 5. Quadro (vista d'insieme in Mappa)

Formato in `studio/CONTENUTI.md`; esempi: `Diritto Costituzionale/05 - Contenuti/quadro.json` e
`Diritto Romano /05 - Contenuti/quadro.json`. Da fare per **Diritto privato** (schemi: fonti e gerarchia;
situazioni soggettive; diritti reali; vicende dell'obbligazione; invalidità del contratto a confronto; successioni
e quote) e per le due **Filosofia del diritto**.

## 6. Approfondimenti («oltre»)

Formato `oltre-NN.json` in `studio/CONTENUTI.md`; esempio `Diritto Costituzionale/05 - Contenuti/oltre-01.json`,
modello di ricchezza: quelli di Diritto romano. Ordine: Diritto privato (una decina di voci per blocco:
proprietà, possesso, obbligazione, contratto, nullità, responsabilità civile, famiglia, successioni), poi
Costituzionale, poi Filosofia SSG. Solo contenuti verificabili, con la fonte.

## 7. Filosofia SSG: più voci

Ha 245 voci su 77 lezioni (3 per lezione; Romano 5,6). Aggiungi le voci che le lezioni usano ma non definiscono
(autori, opere, concetti), con `premessa` per le persone. Manca anche un `abbina` nell'unità 16.

## 8. «art. N Cost.» da privato alla Costituzione

Negli Originali gli articoli si collegano all'atto della materia (`collegaArticoli` in
`studio/src/lib/letture-client.ts`). Da privato un «art. 3 Cost.» non apre nulla, perché la Costituzione sta in
Diritto costituzionale. Serve un collegamento che cambi materia e apra `/norme/3`: guarda come `scegliMateria`
funziona in `studio/src/App.tsx`. Farlo solo se le materie del corso scelto comprendono Diritto costituzionale.

## Fuori elenco (servono materiali di Carlo)

Costituzionale SSG e le materie di LMG M-Z: non si possono fare finché non arrivano gli appunti. Per Diritto
romano LMG A-L va solo indicato il docente giusto in `studio/src/data/corsi.ts` quando Carlo lo comunica.
