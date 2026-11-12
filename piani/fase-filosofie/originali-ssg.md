# Originali · Filosofia del diritto SSG con il testo IURIS (`filosofia-ssg-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Filosofia del diritto SSG ha ora **un solo Originale**, `filosofia-ssg-iuris-v1`
(221 pagine: 1–192 lezioni del corso, 193–221 Incampo, *Sul dovere giuridico*), al posto di `filosofia-ssg-lezioni-v1`
(sbobinature, PDF) e `filosofia-ssg-incampo-v1` (riassunto, PDF). Stessa strada di Filosofia M-Z
([`originali-mz.md`](originali-mz.md)).
Controlli verdi: `npm run check:letture`, `check-originali`, `check-review-plan`, `check-segni-migrati`,
`npx tsc --noEmit -p .`. Non lanciati: `npm run build`, `check:build`, `sync-content` (non serviva: `corso.json` aveva
già le pagine nuove e nessun `fonte`).

## Catalogo e rimozioni

- `src/lib/originali-catalogo.json`: al posto dei due PDF, nella stessa posizione, `filosofia-ssg-iuris-v1` (materia
  `filosofia-del-diritto-ssg`, «Filosofia del diritto · testo IURIS», `testoFonte: testi/filosofia-ssg-iuris.txt`,
  `testoMarkdown: true`, 221 pagine, sha `527437bc…`).
- Tolti: `public/originali/filosofia-ssg-lezioni.pdf` e `filosofia-ssg-incampo.pdf` con le due eccezioni in
  `.gitignore`; le cartelle `letture-src/` e `public/letture/` dei due documenti; le loro voci in `revisioni.json`
  (216 + 21), `confini-sezioni.json` (indietro, `avanti`, `verificati`), `fonti.json`, `catalogo.json` ed
  `estrazione-verifica.json` (da `extract-letture --solo`); le due voci del dizionario `FONTE` di `sezioni-letture.mjs`.
  Aggiornata la `_nota` di `confini-sezioni.json`. I documenti vecchi restano nella storia git (d261ddf), da cui li
  legge `allinea-originali`; i PDF di partenza restano in `Filosofia del Diritto SSG/00 - Appunti e fonti/`.
- `glossario-filosofia-del-diritto-ssg.json` resta com'è.

## Due ritocchi al testo (prima dell'estrazione)

Il controllo «titolo dopo una frase interrotta» ha trovato due punti in cui un titolo spezzava una frase al cambio pagina:
- p. 110 finiva con «Questo potere che governa la nostra» e la p. 111 ripartiva con «### Il potere biopolitico»
  (che ridice la frase per intero): tolto il frammento;
- p. 179 finiva con «A Oxford» e la p. 180 riprendeva dopo «### Diritto, letteratura e cinema» con «è stato avviato…»:
  «A Oxford» spostato dopo il titolo. Sha aggiornato nel catalogo (prima `0b02b0e2…`).

## Estrazione, sezioni e confini

- `extract-letture.py --solo filosofia-ssg-iuris-v1` (con `/usr/bin/python3`): 221 pagine, 2.329 blocchi.
  `sezioni-letture.mjs --scrivi --solo`: **77 sezioni per 77 lezioni**.
- Ogni sezione si apre con il titolo della sua lezione, scelto a mano confrontando i titoli `###` della sintesi di
  ogni lezione con quelli del testo (le lezioni del Percorso sono più fitte delle «Lezione N» del corso):
  25 sezioni si aprono con `## Lezione N · …`, 7 con `## Capitolo N` (Incampo), u01-l1 con «## Filosofia del diritto»
  (p. 1), u18-l1 con «## Parte seconda» (p. 193), le altre 43 con un `###`. In `confini-sezioni.json`: 45 sezioni riportano blocchi alla
  precedente, 2 ricevono blocchi in `avanti` (u01-l2 da «Una prima definizione», p. 4; u06-l1 da «La funzione del
  diritto», p. 53); nessun `verificati`. Scelte da notare: u02-l2 da «Resta la forma»; u03-l2 da «Che cos'è la norma
  giuridica» (p. 27); u05-l4 da «Che cosa significa interpretare una norma» (la ripresa Antigone/Porzia della lezione
  10 resta in u05-l3); u10-l3 da «Legalità e legittimità» (p. 112: il biopotere resta in u10-l2); u11-l1 da
  «Osservatore e osservante» (la Lezione 19 fino allo schema ad albero resta in u10-l3); u14-l2 da «Dall'ordinamento
  alla governance»; u16-l1 da «Il ritorno del soggettivo»; u17-l2 da «Diritto, letteratura e cinema»; u17-l4 da
  «Film as law»; u20-l2 da «I due significati della norma fondamentale» (prima del Capitolo 8, come la sintesi);
  u20-l4 da «Validità da parte dei destinatari».
- Due blocchi a fine pagina con frase che continua alla pagina dopo (p051-b004, p188-b014) diventavano titoli per la
  regola del «titolo isolato» di `sync-letture`: in `revisioni.json` con `senzaRegole`, come per M-Z. Titoli pubblicati
  653 = righe `#` del testo.
- `check-estrazione-letture.mjs`: Filosofia SSG tra i testi IURIS (soglie ≥ 600 titoli, ≥ 1.600 capoversi e voci,
  mediana ≤ 60), apertura con un titolo pretesa, un solo documento per la materia; conteggi 8 documenti, 1.254 pagine
  (invariate: 192 + 29 = 221), 5 testi senza PDF, 3 PDF pubblicati. `check-originali.mjs`: un solo Originale SSG,
  221 pagine, solo testo. `check-review-plan.mjs`: niente da cambiare.

| Misure del testo pubblicato | |
|---|---|
| Pagine / blocchi / sezioni | 221 / 2.329 / 77 |
| Titoli | 653 (= righe `#` del testo) |
| Capoversi / voci d'elenco | 1.537 / 352 |
| Mediana parole per capoverso | 45 |

## Segni

- Comandi (modo pagine; `--per-lezione` non serviva, quote sopra l'85%):
  `node scripts/allinea-originali.mjs filosofia-ssg-lezioni-v1 filosofia-ssg-iuris-v1 --report ../piani/fase-filosofie/allineamento-filosofia-ssg-lezioni-v1.md`
  `node scripts/allinea-originali.mjs filosofia-ssg-incampo-v1 filosofia-ssg-iuris-v1 --scostamento 192 --report ../piani/fase-filosofie/allineamento-filosofia-ssg-incampo-v1.md`
- **Frasi sicure** (soglia 40): sbobinature **3.490/3.699 = 94,3%** (per parole 96,6%; 4 senza corrispondenza: le
  sbobinature sono state condensate di circa un quarto), Incampo **818/829 = 98,7%**. Tabelle: 318 e 132 KB in
  `public/letture/filosofia-ssg-iuris-v1/`. Pagina più bassa: p. 57 (le pp. 57–62 delle sbobinature erano quasi vuote).
- `SOSTITUZIONI_ORIGINALI` (`src/lib/migrazione-segni.ts`): `filosofia-ssg-lezioni-v1 → filosofia-ssg-iuris-v1`
  (sigla `sl`) e `filosofia-ssg-incampo-v1 → filosofia-ssg-iuris-v1` (`si`).
- `check-segni-migrati.mjs`, controllo «Filosofia SSG»: 14 casi a mano (8 sbobinature, 6 Incampo: nomi, date, un
  tratto esatto, due segni del lettore PDF), pagina attesa = vecchia + scostamento (±1); i due documenti nello stesso
  progresso; idempotenza; segni vecchi conservati; pagina di lettura Incampo 12 → 204. Campione: sbobinature
  193/200 (96,5%), Incampo 199/200 (99,5%), tutti entro 2 pagine.

## Note per il coordinatore

- **Link rotti nei contenuti** (non toccati, come da consegna): 69 fonti degli approfondimenti
  `Filosofia del Diritto SSG/05 - Contenuti/oltre-43.json` … `oltre-51.json` puntano a
  `https://therealgalli.github.io/IURIS/originali/filosofia-ssg-lezioni.pdf#page=N` (47) e `…/filosofia-ssg-incampo.pdf#page=N`
  (22), PDF che non saranno più pubblicati. Vanno riscritte (per esempio come fonte senza `url` «Filosofia del diritto ·
  testo IURIS, pp. …», con le pagine di Incampo + 192).
- README (riga SSG) e INDICE (riga Filosofia SSG, che parla ancora di «sbobinature pp. 1–192» e «Incampo pp. 1–29»)
  da aggiornare con l'Originale «testo IURIS».
- `sezioni-letture.mjs --scrivi --solo filosofia-ssg-iuris-v1` cancella `public/letture/filosofia-ssg-iuris-v1/`,
  tabelle comprese: dopo, rifare `sposta-blocchi --scrivi`, `sync-letture` e i due allineamenti. Se cambia il testo
  (sha), rifare anche estrazione e le due revisioni `senzaRegole` (la base cambia se cambia il blocco).
- Altri file toccati: `src/lib/letture-catalogo.json` e `public/letture/` (rigenerati da `sync-letture`).
