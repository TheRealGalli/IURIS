# Originali · Storia del diritto romano con il testo IURIS (`romano-iuris-v1`)

Stato: **fatto** (12 novembre 2026). Controlli verdi: `npm run check:letture` (estrazione, confini, letture, ordine
dei segni, mappa geometrica, mappa sul corpus, selezione), `check-originali`, `check-review-plan`.
Non lanciati (tocca al coordinatore): `sync-content`, `npm run build`, `check:build`.

## Correzioni al testo (richieste dal coordinatore, `verifica.md`)

Fatte in `studio/letture-src/testi/romano-iuris.txt` e negli stessi punti di
`Diritto Romano /00 - Appunti e fonti/testo-iuris/rNN.txt`, con uno script che applica ogni modifica a tutti e due i
file. Le pagine coincidono, tranne la p. 196: nel testo pubblicato è vuota, in r09 c'è scritto «(Pagina bianca.)», come
già prima.
- p. 9: il Principato va dal 27 a.C. al 284 d.C. e coincide in gran parte con l'età classica della giurisprudenza, che
  tramonta convenzionalmente nel 235 d.C. Tolto «per lo più con regni brevissimi». La *Collatio* ora è in corsivo.
- p. 198 (*Edictum Theoderici*): tolti il «870 d.C.» e la giustificazione. Ora c'è scritto solo che data e
  attribuzione sono incerte (fine del V – inizio del VI secolo d.C.).
- p. 121: tolte le due frasi interpretative (il «criterio che unisce i tre comportamenti…» e «La domanda, quindi…»).
  p. 202: tolte le due aggiunte. Al loro posto c'è l'inciso degli appunti «(a differenza del Teodosiano)».
- *Lex Hortensia* sempre 287 a.C. (pp. 15, 25 e 138). Alle pp. 15 e 25 c'è anche l'altra data, tra parentesi:
  «secondo una datazione meno seguita, 286 a.C.» e «per alcuni 286 a.C.». Così il controllo trova il riferimento della fonte.
- p. 159: «Giavoleno, Aristone, Pomponio e più tardi Ulpiano». p. 82: tolto «la fonte esita». p. 219: «rapporti
  giuridici di una materia». p. 95: «un percorso formativo in larga parte comune». p. 223: sottoelenco del *codex*
  messo su una riga, aggiunto «d.C.» a 429–438 e 528–534.
- Stile, applicato con uno script:
  - Capitoli in una sola forma, `## Capitolo IV · Titolo`, con i numeri romani (II–XI, XIII). Il cap. II è
    «Le leggi antiche e la tradizione»: il titolo intero ripeteva otto parole della fonte. Ho tenuto `##` per i
    capitoli: separa i capitoli dai paragrafi, e anche costituzionale fa così.
  - Paragrafi numerati solo nella forma `### N. …`, senza «§ N.» e senza «(§ N)». Le pp. 170–175 diventano
    «### 1. …» … «### 6. …»; per la p. 170 c'è un ritocco minimo («e i suoi singoli attori»), per lo stesso motivo
    del cap. II. Alla p. 155 è tornato il numero: «### 3. Maestri e allievi».
  - Niente più `####`: tutti diventano `###`. I titoli doppi di fila nella stessa pagina sono stati fusi in un solo
    titolo («### 3. Interessi nuovi: continuità e novità»…), 21 casi in tutto. A p. 77 le parti seconda–quarta di
    Lenel, che erano titoli senza testo, sono diventate un capoverso.
    Restano titoli consecutivi solo tra una pagina e l'altra, nelle pagine che negli appunti hanno soltanto il
    titolo (pp. 100, 101, 153, 154 e 170–175). Non c'è testo da mettere.
  - Costituzioni giustinianee numerate nell'ordine di lettura: 1 *Haec*, 2 *Summa*, 3 *Deo auctore*, 4 *Tanta*,
    5 *Imperatoriam*, 6 *Omnem*, 7 *Cordi*. Le «fasi» stanno nello stesso titolo, per esempio
    «### 3. Seconda fase, la raccolta degli *iura*: la costituzione *Deo auctore* (dicembre 530)».
  - Rinvii al manuale in un'unica forma, «(Bretone, p. N)». Sono 40.
- `controlla-iuris.py` sul file intero: errori solo alle pp. 1 (frontespizio), 177 (336, voluto) e 198. La p. 198 ora
  segnala «870» come riferimento della fonte assente, perché il 870 è stato tolto su richiesta. I file r01–r10
  hanno 0 errori, salvo queste stesse pagine.

## Catalogo e rimozioni

- `src/lib/originali-catalogo.json`: `romano-pennacchio-2021-22-v1` sostituito, nella stessa posizione, da
  `romano-iuris-v1` (materia `diritto-romano`, «Storia del diritto romano · testo IURIS», `testoFonte:
  testi/romano-iuris.txt`, `testoMarkdown: true`, 223 pagine, `sha256` del testo corretto). `romano-manuale-integrazioni-v1`
  non è cambiato.
- Tolti il PDF `public/originali/romano-pennacchio-2021-22.pdf` e la sua eccezione in `.gitignore`, le cartelle
  `letture-src/` e `public/letture/romano-pennacchio-2021-22-v1/` e le voci in `revisioni.json`, `confini-sezioni.json`
  (anche `verificati`), `catalogo.json` ed `estrazione-verifica.json`. `fonti.json` non aveva voci per quel documento.
  Il testo vecchio resta nella storia git e `allinea-originali.mjs` lo legge da lì.
- `glossario-diritto-romano.json` resta com'è e collega anche il testo nuovo: 1.292 collegamenti.
- Dati degli utenti non toccati.

## Sezioni e confini

- `sezioni-letture.mjs`: una sezione ora diventa `soloTitolo` con `integrazione` anche quando la sua lezione sta in
  una raccolta `manuale-ricostruito` della stessa materia. Prima l'informazione veniva solo dal catalogo vecchio.
  Così le pp. 170–175 (u14-l1…l6) rimandano ancora alle integrazioni dal Percorso.
- **92 sezioni per 92 lezioni**: u01–u13 più le sei di u14, che hanno solo il titolo. Con `confini-sezioni.json`
  26 sezioni riportano 123 blocchi alla sezione precedente. Ho scelto i confini a mano, uno per uno, guardando il
  titolo della lezione, i confini vecchi del Pennacchio e i titoli `###` della pagina. Tutte le 92 sezioni si aprono
  con un titolo; `check-estrazione-letture` ora lo pretende per questo documento. Nessun `verificati`.
  Due casi sono discutibili: u02-l6 parte da «Cicerone, De legibus», come dice il titolo della lezione, mentre il
  vecchio confine partiva dal *De oratore*; u06-l3 parte da «3. Una professione aristocratica: Schulz», e la
  definizione di Cicerone e il *docere* restano alla u06-l2.

## Controlli aggiornati

- `check-estrazione-letture.mjs`: i controlli del testo IURIS valgono per ogni documento `testoMarkdown`, con soglie
  per documento. Il numero dei titoli pubblicati deve essere uguale a quello delle righe `#` del testo. Per Romano:
  almeno 650 titoli, 2.800 capoversi e voci, mediana ≤ 60, nessun capoverso oltre 200 parole, testo integrale.
  Conteggi: 11 documenti, 1.242 pagine, 4 testi senza PDF, 6 PDF.
- `check-originali.mjs`: il primo originale di Romano è `romano-iuris-v1`, solo testo, 223 pagine; nessun PDF.
- `check-mappa-corpus.mjs` e `fixtures/segni-campione.json`: tolti i segni del Pennacchio e generati segni di prova
  sul testo nuovo. Sono 2.408 di campione, con le stesse regole di `genera-segni-campione.mjs`, e 287 di stress,
  quanti nel vecchio backup e con le stesse forme: capoversi interi, prime frasi, metà finali, titoli, voci, 6 segni
  su due blocchi. Soglia di stress per Romano: 287. Si ritrovano tutti nel loro nodo. Nuovo controllo: se un documento
  delle soglie non ha segni di prova, il controllo fallisce.
- `check-review-plan.mjs`, `check-build.mjs`, `check-letture-selection.mjs`: non citavano il Pennacchio e non
  cambiano.

## Misure sul testo pubblicato

| | |
|---|---|
| Pagine / blocchi | 223 / 3.004 (circa 95.100 parole) |
| Titoli resi (h1–h6) | 680, come le righe `#` del testo |
| Capoversi | 1.582 |
| Voci d'elenco | 1.368 |
| Mediana parole per capoverso | 34 |
| Capoversi o voci > 200 parole | 0 |
| Tabelle | 1 |
| Collegamenti al glossario | 1.292 |

## Note per il coordinatore

- File toccati da me: `.gitignore`, `studio/src/lib/originali-catalogo.json`, `studio/src/lib/letture-catalogo.json`
  (rigenerato), `studio/letture-src/{catalogo,confini-sezioni,estrazione-verifica,revisioni}.json`,
  `studio/letture-src/romano-iuris-v1/`, `studio/public/letture/romano-iuris-v1/`, `studio/scripts/sezioni-letture.mjs`,
  `check-estrazione-letture.mjs`, `check-originali.mjs`, `check-mappa-corpus.mjs`, `fixtures/segni-campione.json`, il
  testo e gli rNN. Le altre modifiche in `src/lib` (`store.ts`, `letture.ts`, `originali.ts`, `data.ts`, `backup-dati.ts`,
  `LettoreTesto.tsx`, `package.json`) non sono mie: sono della migrazione dei segni.
- `sezioni-letture.mjs --scrivi --solo romano-iuris-v1` cancella `public/letture/romano-iuris-v1/`. Se la tabella
  `allineamento-romano-pennacchio-2021-22-v1.json` della migrazione è già lì, va rigenerata dopo.
- Se cambia il testo: aggiornare lo `sha256`, cancellare `letture-src/romano-iuris-v1/`, rifare estrazione, sezioni,
  `sposta-blocchi`, `sync-letture`, e rigenerare i segni di prova di Romano (gli id dei blocchi possono cambiare).
- AGENTS.md e README non li ho toccati. Lì si può citare Romano come secondo testo IURIS.
