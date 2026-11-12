# Originali · Filosofia del diritto M-Z con il testo IURIS (`filosofia-mz-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Filosofia del diritto M-Z ha ora **un solo Originale**, `filosofia-mz-iuris-v1`
(132 pagine: 1–56 Barberis, 57–132 Schauer), al posto di `filosofia-mz-barberis-v1` e `filosofia-mz-schauer-v1`.
Controlli verdi: `npm run check:letture`, `check-originali`, `check-review-plan`, `check-segni-migrati`,
`npx tsc --noEmit -p .`. Non lanciati: `npm run build` e `check:build` (tocca al coordinatore).
`sync-content.mjs` l'ho lanciato una volta, come concesso: `public/content/filosofia-del-diritto-mz/corso.json` aveva
ancora le pagine vecchie di Schauer (1–76) e il campo `fonte`, da cui dipendono `sezioni-letture` e i controlli.

## Catalogo e rimozioni

- `src/lib/originali-catalogo.json`: al posto dei due riassunti, nella stessa posizione, `filosofia-mz-iuris-v1`
  (materia `filosofia-del-diritto-mz`, «Filosofia del diritto · testo IURIS», `testoFonte: testi/filosofia-mz-iuris.txt`,
  `testoMarkdown: true`, 132 pagine, sha `2231d1e5…`).
- Tolti: `letture-src/testi/filosofia-mz-barberis.txt` e `-schauer.txt`, le cartelle `letture-src/` e `public/letture/`
  dei due documenti, le loro voci in `revisioni.json` (una, Schauer p070-b006), `confini-sezioni.json` (indietro,
  `avanti`), `catalogo.json` ed `estrazione-verifica.json` (da `extract-letture --solo`), il dizionario `FONTE` di
  `sezioni-letture.mjs` (il testo nuovo copre tutte le unità, senza filtro per fonte). Aggiornata la `_nota` di
  `confini-sezioni.json`. I testi vecchi restano nella storia git (d261ddf): `allinea-originali` li legge da lì.
- `glossario-filosofia-del-diritto-mz.json` resta com'è.

## Estrazione, sezioni e confini

- `extract-letture.py --solo filosofia-mz-iuris-v1` (con `/usr/bin/python3`: il python3 di `/usr/local/bin` non ha
  pypdf): 132 pagine, 1.213 blocchi. `sezioni-letture.mjs --scrivi --solo`: **58 sezioni per 58 lezioni**.
- Confini: le lezioni cominciano a inizio pagina, i titoli a metà pagina. Ogni sezione ora si apre con il titolo
  `##`/`###` della sua lezione (capitolo o paragrafo), scelto a mano lezione per lezione (lo script di supporto
  confronta il prefisso del titolo e calcola gli spostamenti). In `confini-sezioni.json`: 37 sezioni riportano blocchi
  alla precedente, 14 ricevono blocchi in `avanti` dalla precedente; nessun `verificati`. Scelte da notare:
  - la p. 57 («## Parte seconda · Il ragionamento giuridico») apre la sezione u10-l1;
  - u02-l3 parte da «2.3 Il neoidealismo» e tiene «Croce e Gentile»; u02-l4 parte da «2.4 L'ermeneutica»;
  - u05-l5 parte da «Habermas e la teoria critica»; «Uno sguardo d'insieme sulle sociologie» resta in u05-l4;
  - u10-l3 da «Il carattere generale delle norme»; u12-l2 da «4.2 Autorità vincolante…» (il 4.3 resta lì);
    u12-l3 da «4.4»; u14-l2 da «6.3» («si autopurifica», sotto 6.2, resta in u14-l1); u15-l3 da «7.4».
- Due blocchi a fine pagina con una frase che continua alla pagina dopo (p076-b009, p126-b008) diventavano titoli per
  la regola del «titolo isolato» di `sync-letture`: messi in `revisioni.json` con `senzaRegole` (come già il vecchio
  Schauer p070-b006). Così i titoli pubblicati sono 259, come le righe `#` del testo.
- `check-estrazione-letture.mjs`: Filosofia M-Z tra i testi IURIS (soglie: ≥ 250 titoli, ≥ 1.100 capoversi e voci,
  mediana ≤ 60), apertura con un titolo pretesa anche qui, un solo documento per la materia; conteggi 9 documenti,
  1.254 pagine (invariate), 4 testi senza PDF. `check-originali.mjs`: un solo Originale M-Z, 132 pagine, solo testo.
  `check-review-plan.mjs` e `check-build.mjs`: niente da cambiare.

| Misure del testo pubblicato | |
|---|---|
| Pagine / blocchi / sezioni | 132 / 1.213 / 58 |
| Titoli | 259 (= righe `#` del testo) |
| Capoversi / voci d'elenco | 816 / 341 |
| Mediana parole per capoverso | 44 |

## Segni

- `allinea-originali.mjs`: nuova opzione `--scostamento N` (solo modo pagine): la pagina p del vecchio corrisponde
  alla p+N del nuovo. La tabella conserva le pagine vecchie dei blocchi e dichiara `scostamento`; in
  `src/lib/allineamento.ts` il campo facoltativo `scostamento`, in `migrazione-segni.ts` usato per la pagina stimata
  dei segni «da ricollocare» e per la pagina di lettura iniziale.
- Comandi (`--report` per tenere i resoconti in questa cartella):
  `node scripts/allinea-originali.mjs filosofia-mz-barberis-v1 filosofia-mz-iuris-v1 --report ../piani/fase-filosofie/allineamento-filosofia-mz-barberis-v1.md`
  `node scripts/allinea-originali.mjs filosofia-mz-schauer-v1 filosofia-mz-iuris-v1 --scostamento 56 --report ../piani/fase-filosofie/allineamento-filosofia-mz-schauer-v1.md`
- **Frasi sicure** (soglia 40): Barberis **798/805 = 99,1%**, Schauer **950/979 = 97,0%**. Letti a mano 16 casi fra 40
  e 60: tutti sulla frase giusta. Tabelle: 111 e 115 KB in `public/letture/filosofia-mz-iuris-v1/`.
- `SOSTITUZIONI_ORIGINALI`: `filosofia-mz-barberis-v1 → filosofia-mz-iuris-v1` (sigla `fb`) e
  `filosofia-mz-schauer-v1 → filosofia-mz-iuris-v1` (`fs`).
- `check-segni-migrati.mjs`, controllo «Filosofia M-Z»: 14 casi a mano (7 per documento: nomi, date, un tratto esatto,
  un segno del lettore PDF), pagina attesa = vecchia + scostamento (±1); i due documenti nello stesso progresso;
  idempotenza; segni vecchi conservati; pagina di lettura Schauer 10 → 66. Campione: Barberis 197/200 (98,5%),
  Schauer 191/200 (95,5%), tutti entro 2 pagine.

## Note per il coordinatore

- `sezioni-letture.mjs --scrivi --solo filosofia-mz-iuris-v1` cancella `public/letture/filosofia-mz-iuris-v1/`, tabelle
  comprese: dopo, rifare i due allineamenti. Se cambia il testo (sha), rifare estrazione, sezioni, `sposta-blocchi`,
  `sync-letture`, le due revisioni `senzaRegole` (la base cambia se cambia il blocco) e gli allineamenti.
- README (riga M-Z) e INDICE parlano ancora di «Originali solo testo» dei riassunti: da aggiornare («testo IURIS»).
- Altri file toccati: `src/lib/letture-catalogo.json` e `public/letture/` (rigenerati da `sync-letture`, che riscrive
  anche gli altri documenti senza cambiarli).
