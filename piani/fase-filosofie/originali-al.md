# Originali · Filosofia del diritto A-L con il testo IURIS (`filosofia-al-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Filosofia del diritto LMG A-L ha ora **un solo Originale**, `filosofia-al-iuris-v1`
(161 pagine: 1–100 Incampo, 101–131 Moro, 132–161 Cotta), al posto dei tre PDF degli appunti `filosofia-incampo-v1`,
`filosofia-moro-v1` e `filosofia-cotta-v1`. Stessa strada di Filosofia M-Z e SSG ([`originali-mz.md`](originali-mz.md),
[`originali-ssg.md`](originali-ssg.md)).
Controlli verdi: `npm run check:letture`, `check-originali`, `check-review-plan`, `check-segni-migrati`,
`npx tsc --noEmit -p .`. Non lanciati: `npm run build`, `check:build`, `sync-content` (non serviva: `corso.json` aveva
già le pagine nuove di u09–u14 e nessun `fonte`). La prova nel browser (porta 7101) non è stata possibile: il pannello
del browser era bloccato dal controllo dei permessi; i controlli coprono lettore, segni e mappa.

## Catalogo e rimozioni

- `src/lib/originali-catalogo.json`: al posto dei tre PDF, nella stessa posizione (dopo Romano), `filosofia-al-iuris-v1`
  (materia `filosofia-del-diritto`, «Filosofia del diritto · testo IURIS», `testoFonte: testi/filosofia-al-iuris.txt`,
  `testoMarkdown: true`, 161 pagine, sha `9fe7f2ce…`). Testo invariato: nessun ritocco prima dell'estrazione.
- Tolti: `public/originali/filosofia-incampo.pdf`, `filosofia-moro.pdf`, `filosofia-cotta.pdf` con le tre eccezioni in
  `.gitignore` (la cartella `public/originali/` ora è vuota: **nessun PDF pubblicato**); le cartelle `letture-src/` e
  `public/letture/` dei tre documenti; le loro voci in `revisioni.json` (90 + 25 + 149), `confini-sezioni.json`
  (Incampo e Cotta, `avanti` di Cotta), `fonti.json` (le tre fonti di Incampo: ora il file è `{}`), `catalogo.json` ed
  `estrazione-verifica.json` (da `extract-letture --solo`). `sezioni-letture.mjs`: `FONTE` ora è vuoto (il testo nuovo
  copre tutte le unità, come M-Z e SSG). `extract-letture.py`: tolte le due sezioni «pilota» fisse di Incampo.
  I documenti vecchi restano nella storia git (d261ddf, Moro c39171d), da cui li legge `allinea-originali`.
- `glossario-filosofia-del-diritto.json` resta com'è (i collegamenti compaiono nel testo nuovo: «[[aristotele|…]]»…).
- Nessun contenuto della materia rimandava ai PDF vecchi (cercato in tutto il repository).

## Estrazione, sezioni e confini

- `extract-letture.py --solo filosofia-al-iuris-v1` (con `/usr/bin/python3`): 161 pagine, 1.984 blocchi.
  `sezioni-letture.mjs --scrivi --solo`: **63 sezioni per 63 lezioni**.
- Confini scelti a mano lezione per lezione, confrontando i primi titoli `###` della sintesi di ogni lezione con i titoli
  del testo intorno all'inizio della pagina. Regola: la sezione si apre dal titolo che introduce l'argomento con cui
  comincia la sintesi; se la pagina comincia con la coda (una o poche frasi) dell'argomento precedente, quella coda
  resta alla lezione prima. In `confini-sezioni.json`: **17 sezioni riportano 24 blocchi alla precedente**, **11
  ricevono 30 blocchi in `avanti`**; nessun `verificati`. Ogni sezione si apre con un `##`/`###`:
  - u01-l1 con «## Filosofia del diritto» (p. 1), u09-l1 con «## Parte seconda · Il diritto e lo Stato (A. Moro)»
    (p. 101), u12-l1 con «## Parte terza · Il diritto nell'esistenza (S. Cotta)» (p. 132), u12-l3 con «## Parte II»,
    u14-l1 con «## Parte IV»;
  - in `avanti` (la lezione parte dal titolo in fondo alla pagina prima): u01-l2 da «Il dovere e l'ordinamento»,
    u01-l3 da «La restituzione dei doni», u01-l4 da «L'obiezione della storia», u01-l5 da «La filosofia come metafisica»,
    u02-l2 da «Le lacune», u03-l4 da «Che cosa sono le norme costitutive», u04-l3 da «L'autonomia logica del processo»,
    u05-l6 da «L'art. 32 del codice penale», u06-l4 da «Alice e la Regina di Cuori», u07-l6 da «Il primato della forma
    sul fine», u13-l3 da «Il gioco»;
  - casi discutibili (la coda resta alla lezione prima, che nella sintesi la tratta come ultimo punto): u03-l5 parte da
    «Il primato della norma costitutiva fondamentale» (la sanzione delle norme costitutive resta con «Contro la tesi di
    Kelsen»), u04-l2 da «Tre osservazioni alla tesi di Conte» (thetico/rhetico resta con «La verità dell'enunciato
    innestato»), u13-l1 da «Dualità, libertà, angoscia» («Capitolo V» e l'uomo indigente restano in u12-l4), u13-l2 da
    «Politica e guerra» (l'ambivalenza della politica resta in u13-l1, la frase è a cavallo di pagina).
- Tre blocchi a fine pagina con una frase che continua alla pagina dopo (p142-b012, p143-b012, p148-b017) diventavano
  titoli per la regola del «titolo isolato» di `sync-letture`: in `revisioni.json` con `senzaRegole`, come per M-Z e SSG.
  Titoli pubblicati 464 = righe `#` del testo.

| Misure del testo pubblicato | |
|---|---|
| Pagine / blocchi / sezioni | 161 / 1.984 / 63 |
| Titoli | 464 (= righe `#` del testo) |
| Capoversi / voci d'elenco | 1.200 / 811 |
| Tabelle | 1 |
| Mediana parole per capoverso | 36 |

## Controlli adattati (senza indebolirli)

- `check-estrazione-letture.mjs`: Filosofia A-L tra i testi IURIS (soglie ≥ 450 titoli, ≥ 1 tabella, ≥ 1.900 capoversi e
  voci, mediana ≤ 60), apertura con un titolo pretesa, un solo documento per la materia; conteggi 6 documenti,
  1.254 pagine (invariate: 100 + 31 + 30 = 161), 6 testi senza PDF, **0 PDF pubblicati**. I controlli puntuali che
  usavano i blocchi di Incampo ora usano il testo nuovo: la prima sezione si apre con «## Filosofia del diritto»; il
  capoverso d'apertura (p001-b006) è identico alla riga del testo sorgente; citazione greca di Aristotele conservata
  (p001-b007) insieme al collegamento al glossario; «res cogitans» (p002-b012); «nullum crimen sine lege» (p006-b001).
  Il vecchio controllo su una `notaRevisione` di Incampo non ha più oggetto (il testo nuovo non ha revisioni di contenuto).
- `check-originali.mjs`: un solo Originale A-L, 161 pagine, solo testo. Lo scenario «Documenti e materie hanno storie
  indipendenti» usava due PDF di filosofia: ora ogni materia ha un solo Originale, quindi il secondo documento della
  stessa materia è un documento di prova costruito nel test (stessa materia, id diverso); lo scenario resta identico.
- `check-mappa-corpus.mjs` e `fixtures/segni-campione.json`: tolti i segni di Incampo, Moro e Cotta; per
  `filosofia-al-iuris-v1` **1.616 segni di campione** generati sul testo nuovo con le regole di
  `genera-segni-campione.mjs` (tutti al loro posto) e, come stress, **i 184 segni del backup di prova** (Incampo 154,
  Moro 30) portati sul testo nuovo da `migraSegno` con le tabelle di allineamento: 178 al loro posto, 6 «da ricollocare»
  in coda alla mappa. Soglia di stress: 178 (prima: Incampo 154 + Moro 30 sul testo vecchio).
- `check-letture.mjs`, `check-letture-selection.mjs`, `check-review-plan.mjs`, `check-build.mjs`, `check-tour.mjs`:
  niente da cambiare (`check-letture` prende il primo Originale di filosofia A-L e usa `u01-l1`, `u01-l2`, `p001-b001`,
  che esistono nel testo nuovo).

## Segni (Carlo studia A-L)

- Comandi (modo pagine, `--report` in questa cartella):
  `node scripts/allinea-originali.mjs filosofia-incampo-v1 filosofia-al-iuris-v1 --report ../piani/fase-filosofie/allineamento-filosofia-incampo-v1.md`
  `node scripts/allinea-originali.mjs filosofia-moro-v1 filosofia-al-iuris-v1 --scostamento 100 --report ../piani/fase-filosofie/allineamento-filosofia-moro-v1.md`
  `node scripts/allinea-originali.mjs filosofia-cotta-v1 filosofia-al-iuris-v1 --scostamento 131 --report ../piani/fase-filosofie/allineamento-filosofia-cotta-v1.md`
- **Frasi sicure** (soglia 40, frasi piene): Incampo **2.138/2.174 = 98,3%** (per parole 99,2%; 2 senza
  corrispondenza), Moro **576/579 = 99,5%** (99,7%), Cotta **712/726 = 98,1%** (99,1%). Tabelle: 208, 111 e 123 KB in
  `public/letture/filosofia-al-iuris-v1/`. Pagine con più frasi basse: Incampo pp. 28 e 92 (circa un quarto), Cotta
  pp. 141 e 151 (8%).
- `SOSTITUZIONI_ORIGINALI` (`src/lib/migrazione-segni.ts`): `filosofia-incampo-v1` (sigla `fi`), `filosofia-moro-v1`
  (`fm`), `filosofia-cotta-v1` (`fc`) → `filosofia-al-iuris-v1`.
- `check-segni-migrati.mjs`, controllo «Filosofia A-L»: 16 casi a mano (8 Incampo, 4 Moro, 4 Cotta: nomi, date, un
  tratto esatto, due segni del lettore PDF), pagina attesa = vecchia + scostamento (±1), tutti sulla frase giusta; i tre
  documenti nello stesso progresso; idempotenza; segni vecchi conservati; pagina di lettura Cotta 5 → 136. Campione
  (soglia ≥ 90%, più alta dell'85% di M-Z e SSG): Incampo 200/200, Moro 200/200, Cotta 199/200, tutti entro 2 pagine.
  In più, i **segni del backup di prova** (veri segni sul vecchio lettore): Incampo **148/154 = 96,1%** sicuri, Moro
  **30/30**, tutti entro 2 pagine; soglia ≥ 90% e nessun segno sicuro oltre 2 pagine.

## Note per il coordinatore

- README e INDICE (riga Filosofia A-L) parlano ancora dei PDF di Incampo, Moro e Cotta: da aggiornare («testo IURIS»).
  Anche AGENTS.md, nella parte «Originali», presenta ancora i PDF in `public/originali/` come caso normale: ora non ce
  n'è più nessuno.
- `sezioni-letture.mjs --scrivi --solo filosofia-al-iuris-v1` cancella `public/letture/filosofia-al-iuris-v1/`,
  tabelle comprese: dopo, rifare `sposta-blocchi --scrivi`, `sync-letture`, i tre allineamenti e i segni di prova di
  `segni-campione.json` (gli id dei blocchi possono cambiare). Se cambia il testo (sha), rifare anche l'estrazione e le
  tre revisioni `senzaRegole` (la base cambia se cambia il blocco).
- Filosofia M-Z e SSG non hanno segni di prova in `segni-campione.json` (nessun backup di prova per loro): il controllo
  della mappa sul corpus non li copre con un campione.
- Altri file toccati: `src/lib/letture-catalogo.json` e `public/letture/` (rigenerati da `sync-letture`, che riscrive
  anche gli altri documenti senza cambiarli).
