# Romano: le unità 14 e 15 nel testo IURIS (pp. 224–235)

Stato: **fatto** (12 novembre 2026). Storia del diritto romano ha ora **un solo testo**, `romano-iuris-v1` (235 pagine).
Il documento `romano-manuale-integrazioni-v1` («integrazioni dal Percorso») non esiste più.
Controlli verdi: `npm run check:letture`, `check-originali`, `check-review-plan`, `check-segni-migrati`,
`npx tsc --noEmit -p .`. Verdi anche `check-domande`, `check-corsi`, `check-backup` e `check-migrazione`.
Il coordinatore deve ancora lanciare `sync-content`, `npm run build` e `check:build`.

## Testo

- `studio/letture-src/testi/romano-iuris.txt` ha 12 pagine nuove, pp. 224–235: una per lezione, nell'ordine u14-l1…l6 e
  u15-l1…l6. Sono state scritte di nuovo, nello stile del testo IURIS (`##` per il capitolo, `### N. …` per i
  paragrafi, `###` per i sottotitoli, capoversi brevi, «• », latino in corsivo tra «»), a partire dalle sintesi del
  Percorso, che coincidono con il testo delle integrazioni. Non si parla di ricostruzione. I rinvii al manuale sono
  nella forma solita: «(Bretone, pp. 287–289)», uno per paragrafo e uno per capitolo. La p. 224 apre il
  «Capitolo XI · I modi di una tecnica», la p. 230 il «Capitolo XII · Le idee giusnaturalistiche». Una tabella:
  la bipartizione di Gaio e la tripartizione di Ulpiano, a p. 235.
- Pp. 170–175 (negli appunti solo i titoli): sono state riassorbite. La p. 170 tiene il titolo del capitolo XI e la
  riga «Il capitolo è svolto alle pp. 224–229», con l'elenco dei sei paragrafi e la pagina di ciascuno e il rinvio al
  capitolo XII (pp. 230–235). Le pp. 171–175 restano vuote, come la p. 196, e la numerazione degli appunti non
  cambia. Le pp. 170–175 non hanno più lezioni: stanno in coda alla sezione u10-l3 (pp. 169–175).
- Le stesse pagine sono anche in `Diritto Romano /00 - Appunti e fonti/testo-iuris/`: `r08.txt` (pp. 170–175) e il
  nuovo `r11.txt` (pp. 224–235). Il testo pubblicato e gli rNN coincidono, tranne la p. 196, come prima.
  `controlla-iuris.py`: nessun errore nuovo. Resta solo quello della p. 177, che è voluto.

## Unità

- `u14.json` e `u15.json`: tolti `ricostruita` e `manuale` dall'unità, dalle lezioni e dalle domande.
  Le pagine sono state aggiornate:
  - u14 → pp. 224–229 (u14-lN = p. 223+N);
  - u15 → pp. 230–235 (u15-lN = p. 229+N);
  - voci di u14: pagina spostata di 54;
  - voci di u15: pagina della prima lezione che le cita;
  - eventi: pagina della lezione che ne parla;
  - domande: pagina della lezione.
- `abstract` e `note`: niente più «unità ricostruita». La nota dice che gli appunti non svolgono il capitolo (XI: solo
  i titoli) e consiglia di ripassare sul Bretone. `noteRedazione` dice da dove viene il testo, cita le pagine del manuale
  e il formato di prima. Sono 0 errori e 0 avvisi; formato a 2 spazi come prima, nessuna riformattazione.
- Ritocchi minori:
  - `u10.json`, `noteRedazione`: il rinvio al capitolo XI;
  - `materia.json`: fonte «Testo IURIS», 235 pagine;
  - `CONTENUTI.md`: nessuna unità usa più il formato «ricostruita». Il formato resta supportato.

## Originali e codice tolto

- `originali-catalogo.json`: `romano-iuris-v1` ha 235 pagine e sha `9a53e7d3…`; `romano-manuale-integrazioni-v1` è
  stato tolto. Cancellata `public/letture/romano-manuale-integrazioni-v1/`.
- Codice usato solo da quel documento, tolto:
  - il tipo `manuale-ricostruito` in `extract-letture.py`, `sezioni-letture.mjs` (anche `integrazione`/`soloTitolo`
    calcolati), `sync-letture.mjs`, `check-confini-letture.mjs`, `check-build.mjs` e `check-estrazione-letture.mjs`;
  - `scripts/lib/lettura-percorso.mjs`, cancellato;
  - in `check-letture.mjs`, lo scenario «Integrazioni manuale»;
  - `tipoFonte`, `manuale` e `integrazione` in `letture.ts` e `originali.ts`, con il ramo `soloManuale` della
    proiezione;
  - in `LettoreTesto.tsx`, «Ricostruzione dal Percorso», «Sezione N dell'integrazione» e il riquadro «Leggi la
    lezione completa».
- `soloTitolo` resta generico.
- `extract-letture.py --solo` ora toglie dal catalogo sorgente anche i documenti usciti da `originali-catalogo.json`.
- Estrazione:
  - `extract-letture.py --solo romano-iuris-v1`, 3.186 blocchi;
  - `sezioni-letture.mjs --scrivi --solo romano-iuris-v1`, 98 sezioni per 98 lezioni;
  - `sposta-blocchi` applica gli stessi 123 spostamenti;
  - poi `sync-letture` e `check-confini`.
- Ogni lezione di u01–u15 ha la sua sezione (copertura di 510 lezioni nel controllo). Misure di Romano: 730 titoli,
  2 tabelle, 1.684 capoversi, 1.447 voci, mediana 34 parole.
- `letture-src/catalogo.json`: stesso ordine di prima, solo senza le integrazioni.
- **Attenzione, `public/content/diritto-romano/corso.json`**: non potevo lanciare `sync-content`, quindi ho
  corretto a mano solo le pagine di u14 e u15 e tolto `ricostruita` e `manuale`. Servivano a `sezioni-letture` e ai
  controlli. Il file non è in git, e il prossimo `sync-content` lo rigenera uguale.
- Conteggi in `check-estrazione-letture`: 10 documenti, 1.254 pagine. In `check-originali`: un solo originale per
  Romano, di 235 pagine.

## Segni

- `allinea-originali.mjs romano-pennacchio-2021-22-v1 romano-iuris-v1` è stato rifatto: 3.319/3.413 frasi sicure
  (97,2%). Le pp. 174–175 vecchie (solo titoli) ora non hanno corrispondenza: i segni su quei titoli vanno «da
  ricollocare».
- Nuova opzione `--stesse-lezioni`: un allineamento per lezione con identità degli id, senza `migrazione.json`.
  `allinea-originali.mjs romano-manuale-integrazioni-v1 romano-iuris-v1 --stesse-lezioni --soglia 40` legge il vecchio
  dalla storia git (d261ddf) e trova 410/431 frasi sicure (95,1%). Sopra 40 le frasi cadono quasi tutte nella
  pagina della lezione giusta: 4 su 47 casi tra 40 e 55 cadono altrove, comunque su un contenuto equivalente.
  Resoconto: `allineamento-romano-manuale-integrazioni-v1.md`.
- `migrazione-segni.ts`: coppia `{ romano-manuale-integrazioni-v1 → romano-iuris-v1, sigla 'ri' }`.
- `check-segni-migrati.mjs`, nuovo controllo «Romano, unità 14 e 15»:
  - 11 casi a mano, 2 sul tratto esatto; ogni segno deve finire alla p. 223 + sezione vecchia;
  - campione 193/200 (96,5%);
  - convivenza con un segno sugli appunti nello stesso progresso (due voci in `segniMigrati`);
  - idempotenza.

## Dubbi

- Il contenuto delle pp. 224–235 resta quello del Percorso. Non viene dagli appunti e va verificato sul Bretone,
  come scritto nelle `noteRedazione`. Il punto più incerto è «Verità e apparenza».
- Le pp. 171–175 sono vuote. In alternativa si potevano tenere i titoli con un rinvio su ogni pagina; ho scelto
  l'indice unico a p. 170.
