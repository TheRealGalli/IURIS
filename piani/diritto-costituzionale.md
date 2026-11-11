# Piano: Diritto costituzionale (LMG · I anno · A-L)

Stato: **18 unità completate e validate**. Questo piano propone una strada; adattala se leggendo i testi
trovi una divisione migliore. Le regole generali (formato, controlli, trappole dell'ambiente) sono in
[`../AGENTS.md`](../AGENTS.md) e [`../studio/CONTENUTI.md`](../studio/CONTENUTI.md).

Passo 6, 11 novembre 2026: aggiunte **20 schede «Oltre gli appunti»** in `oltre-20.json`, che portano
gli approfondimenti a **36** senza modificare i 16 precedenti. Esempi e distinzioni su fonti, referendum,
fiducia, rappresentanza, diritti, giustizia costituzionale e rapporti con l'UE; ogni scheda ha fonti e punti
da ricordare. Riferimenti principali: Costituzione, legge 87/1953, TFUE art. 267 e Corte cost. 1146/1988,
238/2014, consultate sul portale ufficiale. Controlli nel riepilogo del passo 6 delle consegne.

## Aggiornamento del piano successivo, passo 3 (11 novembre 2026)

64 approfondimenti nuovi in `oltre-40.json`–`oltre-47.json`: **140 complessivi**;
98 inverse nuove in `schede-inverse.json`: **180 complessive**. Conservati i contenuti precedenti.
Riforme 2025–2026 verificate prima delle aggiunte: magistratura non approvata al referendum,
premierato ancora progetto, modifiche vigenti agli statuti speciali. Fonti e riscontri nel
[resoconto del passo 3](consegne-prossimi-passi.md#piano-successivo-passo-3-costituzionale-11-novembre-2026).

## La fonte

Una sola, in `Diritto Costituzionale/00 - Appunti e fonti/` (fuori da git):
**`Bin-Pitruzzella, riassunto completo (258 pp).pdf`**, riassunto di R. Bin, G. Pitruzzella, *Diritto costituzionale*.

Il testo del PDF non si può estrarre (font cifrati), quindi è stato ricavato con l'OCR di macOS:
**`testo/bin-pitruzzella-258.txt`**, con righe `=== pagina N ===` che corrispondono alle pagine del PDF.
Lavora su questo file; apri il PDF solo per controllare tabelle, schemi o parole dubbie. L'OCR è buono ma non
perfetto: numeri di articoli, date e percentuali vanno confrontati con il PDF o con la Costituzione.

| Pagine PDF | Contenuto | Uso |
|---|---|---|
| 1–3 | frontespizio e indice (i numeri stampati nell'indice sono sfalsati di 1–3 pagine: valgono quelli qui sotto) | — |
| 4–171 | il riassunto: introduzione e capitoli I–XIII | le unità |
| 172 | «Errata corrige della VII edizione» | correzioni da applicare |
| 173–204 | **domande e risposte** (da www.diritto-manuali.com), divise per argomento | ottime per le domande dei quiz e per le `aperta` |
| 205–258 | **la Costituzione**: introduzione sull'Assemblea Costituente e testo degli articoli | citazioni esatte degli articoli |

C'era anche una versione da 130 pagine dello stesso riassunto: è la stessa base ma accorciata (mancano per esempio
i tre presupposti del decreto-legge, la riforma dell'ordinamento giudiziario, la legge comunitaria), senza domande
né Costituzione. È stata scartata: si lavora solo sulla versione completa.

Ogni pagina porta il marchio StuDocu e nome ed email di chi ha scaricato il file: queste righe sono già tolte dal
file di testo. **Non pubblicare il PDF originale**: negli Originali va solo la versione ripulita (vedi «Attivazione», punto 4).

Da chiedere a Carlo se serve: docente della classe A-L ed edizione del manuale indicata nel programma, data dell'esame.

### Attenzione: il riassunto è vecchio

Il PDF contiene l'«Errata corrige della **VII edizione**» e cita come recente la riforma dell'ordinamento giudiziario del 2007: il riassunto segue un'edizione di Bin–Pitruzzella
di molti anni fa. Parla di «legge finanziaria», «fonti comunitarie», «Ministro di grazia e giustizia», ecc.
Per l'esame conta il diritto vigente: la sintesi descrive la disciplina di oggi e il campo `note` dell'unità
dice che cosa è cambiato rispetto agli appunti. Aggiornamenti principali da verificare e integrare
(controlla sempre il testo vigente, per esempio su Normattiva o sul sito della Camera):

| Tema | Negli appunti | Oggi |
|---|---|---|
| Numero dei parlamentari | 630 deputati, 315 senatori | 400 e 200 (l. cost. 1/2020, confermata dal referendum del settembre 2020); senatori a vita di nomina presidenziale al massimo 5 in tutto |
| Elettorato del Senato | 25 anni per votare | 18 anni (l. cost. 1/2021); per essere eletti restano 40 anni |
| Leggi elettorali | fino al «Mattarellum» o al «Porcellum» | sent. Corte cost. 1/2014 e 35/2017; l. 165/2017 storica, oggi l. 180/2026 (dal 24 ottobre 2026), documentata in u06 |
| Bilancio | legge finanziaria, art. 81 vecchio | pareggio/equilibrio di bilancio (l. cost. 1/2012); legge di bilancio unica (l. 196/2009, l. 163/2016) |
| Unione europea | «Comunità», «fonti comunitarie», legge comunitaria | Trattato di Lisbona (in vigore dal 1° dicembre 2009): TUE e TFUE; l. 234/2012 (legge di delegazione europea e legge europea) |
| Regioni | da verificare se il testo è prima o dopo il 2001 | l. cost. 1/1999 e 3/2001 (nuovo Titolo V, art. 117) |
| Giustizia | «Ministro di grazia e giustizia» | Ministro della giustizia; giusto processo all'art. 111 (l. cost. 2/1999) |
| Costituzione modificata | — | art. 9 e 41 (ambiente, l. cost. 1/2022), art. 119 (insularità, l. cost. 2/2022), art. 33 (sport, l. cost. 1/2023) |
| Difesa della Patria | servizio militare obbligatorio, obiezione di coscienza | leva sospesa dal 2005 (l. 226/2004) |
| Enti locali | province come negli anni '90 | l. 56/2014 (città metropolitane, province di secondo grado) |

Non serve riscrivere il manuale: basta che ogni lezione non insegni come vigente una regola abrogata.

## Materia

`Diritto Costituzionale/05 - Contenuti/materia.json` (proposta; il colore è quello già usato per la materia
«in arrivo», così Carlo la riconosce):

```json
{
  "nome": "Diritto costituzionale",
  "breve": "Costituzionale",
  "manuale": "R. Bin, G. Pitruzzella, Diritto costituzionale (Giappichelli)",
  "fonte": {
    "file": "Bin-Pitruzzella, riassunto completo (258 pp).pdf",
    "descrizione": "Riassunto del manuale (VII edizione) con domande e risposte e testo della Costituzione",
    "pagine": 258
  },
  "colore": "#3f7a52"
}
```

Controlla i campi esatti su `Filosofia del Diritto/05 - Contenuti/materia.json` e `Diritto Romano /05 - Contenuti/materia.json`.

## Unità proposte

Pagine = pagine del PDF (da usare in `pagine`), prese dai titoli numerati del riassunto. Verifica inizio e fine
aprendo le pagine di confine: un capitolo può cominciare a metà pagina.

| Unità | Capitolo | Argomenti (paragrafi del riassunto) | Pagine |
|---|---|---|---|
| u01 | Introduzione e Cap. I | diritto e norma; 1. potere politico e legittimazione (Weber); 2. Stato: sovranità, territorio, cittadinanza (anche dell'UE), Stato-apparato, persona giuridica, enti pubblici, uffici e organi | 4–14 |
| u02 | Cap. II, § 1 | forme di Stato e di governo; evoluzione: Stato assoluto e liberale, partiti di massa, alternative alla democrazia pluralista nel XX secolo, Stato sociale e sua razionalizzazione, caratteri della democrazia pluralista | 15–21 |
| u03 | Cap. II, §§ 2–6 | rappresentanza politica, democrazia diretta e rappresentativa, separazione dei poteri, regola di maggioranza, Stato unitario/federale/regionale, Unione europea | 22–32 |
| u04 | Cap. III | significati di «Costituzione»; la Costituzione italiana: origini, struttura, contenuti, rigidità e revisione | 33–38 |
| u05 | Cap. IV, §§ 1.1–1.6 | forme di governo: monarchia costituzionale, forme di governo e sistema dei partiti, parlamentare e varianti, presidenziale, semipresidenziale, altre | 39–44 |
| u06 | Cap. IV, § 1.7 | sistemi elettorali e legislazione di contorno: elettorato, ineleggibilità e incompatibilità, campagne elettorali, formule, sistema italiano (**aggiornare**) | 45–53 |
| u07 | Cap. V, §§ 1–2 | forma di governo italiana: fiducia (art. 94), trasformazioni del sistema politico, crisi; il Governo: regole, formazione, organi necessari e non, indirizzo politico, organi ausiliari | 54–68 |
| u08 | Cap. V, § 3 | il Parlamento: struttura, funzionamento, funzioni, controllo, bilancio (**aggiornare**) | 69–79 |
| u09 | Cap. V, § 4 | il Presidente della Repubblica: elezione, controfirma, irresponsabilità e reati, nomina del Presidente del Consiglio, atti, Consiglio supremo di difesa, supplenza | 80–87 |
| u10 | Cap. VI | Regioni ed enti locali: storia, competenze, raccordi (Commissione bicamerale, Conferenze), finanza, forma di governo regionale e locale | 88–95 |
| u11 | Cap. VII | giudici ordinari e speciali, principi sulla giurisdizione (giudice naturale, garanzie del processo), CSM, Ministro della giustizia | 96–100 |
| u12 | Cap. VIII | fonti: nozioni generali, fonti di cognizione, fonti-fatto e fonti-atto, consuetudine, rinvio, interpretazione, antinomie e criteri, riserve di legge e legalità | 101–112 |
| u13 | Cap. IX, §§ 1–5 | Costituzione e leggi costituzionali; procedimento legislativo (iniziativa, approvazione, promulgazione, pubblicazione); leggi rinforzate e atipiche; delega e decreto legislativo; decreto-legge e conversione | 113–124 |
| u14 | Cap. IX, §§ 6–9 | altri decreti con forza di legge, regolamenti parlamentari e degli organi costituzionali, referendum abrogativo come fonte, regolamenti dell'esecutivo | 125–130 |
| u15 | Cap. X | fonti delle autonomie: statuti e leggi regionali, potestà legislativa, regolamenti regionali, fonti degli enti locali | 131–137 |
| u16 | Cap. XI | fonti comunitarie (oggi: diritto dell'UE): diretta applicabilità ed effetto diretto, rapporti con il diritto interno, giurisprudenza della Corte di giustizia e della Corte costituzionale, attuazione | 138–146 |
| u17 | Cap. XII | giustizia costituzionale: la Corte, vizi delle leggi, giudizio incidentale e in via principale, decisioni, conflitti di attribuzione, accuse al Presidente, ammissibilità del referendum | 147–157 |
| u18 | Cap. XIII | diritti e doveri: tutela delle libertà, uguaglianza, libertà individuali, sfera pubblica (religione, pensiero e stampa…), diritti civici, culturali e sociali, sfera economica, doveri | 158–171 |

Se un'unità viene troppo lunga (più di 5–6 lezioni), dividila: gli id restano stabili se si usa il primo numero
libero e un `ordine` intermedio (vedi `CONTENUTI.md`).

**Domande e risposte (pp. 173–204)**: sono divise per argomento (fonti, Costituzione e fonti dello Stato, …).
Quando scrivi un'unità, cerca in quelle pagine le domande sullo stesso argomento e trasformale in domande del quiz
(con `pagine` della risposta). Le risposte citano le pagine del manuale («pag. 289 del Manuale»): non riportare
quei numeri, non corrispondono al PDF.

## Come scrivere le lezioni di questa materia

- È una materia di **istituti e articoli**: per ogni istituto la sintesi dice che cos'è, dove sta (articolo della
  Costituzione o legge, citati esatti), come funziona (procedimento a passi, maggioranze, termini) e perché esiste.
- Tabelle per i confronti (forme di governo, sistemi elettorali, tipi di sentenze della Corte, fonti e criteri,
  leggi rinforzate e atipiche).
- Domande che rendono all'orale: «Che cosa prevede l'art. 77?», procedimenti da mettere in ordine (`ordina`:
  procedimento legislativo, revisione costituzionale art. 138, conversione del decreto-legge), abbinamenti
  articolo ↔ istituto (`abbina`), maggioranze e termini (`completa`), confronti (`aperta`).
- Numeri e termini (60 giorni, maggioranza assoluta, due terzi, 50%+1 per il quorum referendario) vanno
  controllati sul testo della Costituzione (pp. 205–258, ma attenzione: è il testo dell'epoca; verifica
  le parti modificate dopo).
- Eventi per la cronologia con date certe, per esempio: Statuto albertino (4 marzo 1848), referendum istituzionale
  (2 giugno 1946), entrata in vigore della Costituzione (1 gennaio 1948), prima sentenza della Corte costituzionale
  (1956), Trattati di Roma (25 marzo 1957), prime elezioni regionali ordinarie (1970), Trattato di Maastricht (1992),
  riforma del Titolo V (2001), Trattato di Lisbona (in vigore 1 dicembre 2009), riduzione dei parlamentari (2020).
  Sentenze sul rapporto con il diritto europeo: Van Gend en Loos (1963), Costa c. ENEL (1964), Simmenthal (1978),
  Granital (Corte cost. 170/1984).

## Id canonici proposti

Aggiungili a `studio/CONTENUTI.md` in una sezione «ID CANONICI (diritto costituzionale)» quando inizi, così
tutte le unità li usano allo stesso modo.

- Stato e forme: `stato`, `sovranita`, `popolo`, `territorio`, `cittadinanza`, `cittadinanza-europea`, `persona-giuridica`, `ente-pubblico`, `organo`, `forma-di-stato`, `stato-assoluto`, `stato-liberale`, `stato-sociale`, `stato-democratico-pluralista`, `stato-federale`, `stato-regionale`, `separazione-dei-poteri`, `rappresentanza-politica`, `democrazia-diretta`, `principio-di-maggioranza`, `partiti-politici`
- Costituzione: `costituzione`, `costituzione-italiana`, `costituzione-rigida`, `costituzione-flessibile`, `statuto-albertino`, `assemblea-costituente`, `revisione-costituzionale`, `principi-supremi`
- Forme di governo e elezioni: `forma-di-governo`, `governo-parlamentare`, `governo-presidenziale`, `governo-semipresidenziale`, `governo-direttoriale`, `rapporto-di-fiducia`, `sistema-elettorale`, `sistema-proporzionale`, `sistema-maggioritario`, `elettorato-attivo`, `elettorato-passivo`, `ineleggibilita`, `incompatibilita`
- Organi: `parlamento`, `camera-dei-deputati`, `senato`, `parlamento-in-seduta-comune`, `governo`, `presidente-del-consiglio`, `consiglio-dei-ministri`, `ministri`, `presidente-della-repubblica`, `controfirma`, `corte-costituzionale`, `csm`, `magistratura`, `cnel`, `consiglio-di-stato`, `corte-dei-conti`, `regioni`, `enti-locali`, `unione-europea`, `corte-di-giustizia-ue`
- Fonti: `fonti-del-diritto`, `fonti-atto`, `fonti-fatto`, `consuetudine`, `legge-ordinaria`, `legge-costituzionale`, `decreto-legge`, `decreto-legislativo`, `legge-delega`, `regolamento`, `regolamenti-parlamentari`, `referendum-abrogativo`, `statuto-regionale`, `legge-regionale`, `regolamento-ue`, `direttiva-ue`, `criterio-cronologico`, `criterio-gerarchico`, `criterio-di-specialita`, `criterio-di-competenza`, `abrogazione`, `annullamento`, `riserva-di-legge`, `principio-di-legalita`, `primato-del-diritto-ue`
- Giustizia costituzionale: `giudizio-incidentale`, `giudizio-in-via-principale`, `questione-di-legittimita`, `sentenza-di-accoglimento`, `sentenza-di-rigetto`, `sentenza-interpretativa`, `sentenza-manipolativa`, `conflitto-di-attribuzione`
- Diritti: `diritti-inviolabili`, `principio-di-uguaglianza`, `liberta-personale`, `liberta-di-domicilio`, `liberta-di-circolazione`, `liberta-di-corrispondenza`, `liberta-di-riunione`, `liberta-di-associazione`, `liberta-religiosa`, `liberta-di-manifestazione-del-pensiero`, `diritti-sociali`, `liberta-di-iniziativa-economica`, `doveri-costituzionali`

## Attivazione nell'app (insieme alla prima unità: da quel momento il sync la mette nel manifest e `check-corsi` la pretende in un corso)

1. `.gitignore`: `!/Diritto Costituzionale/`, `/Diritto Costituzionale/*`, `!/Diritto Costituzionale/05 - Contenuti/`.
2. `studio/src/data/corsi.ts`: `'diritto-costituzionale'` nelle `materie` di `uniba-lmg-1-al` (e di
   `uniba-lmg-1-mz`, che per ora copia A-L come segnaposto); togli «Diritto costituzionale» da `inArrivo` in tutti i
   corsi (per SSG chiedi a Carlo se la materia è nel suo piano di studi: la L-14 ha di solito
   «Istituzioni di diritto pubblico»).
3. `studio/scripts/check-corsi.mjs`: aggiorna le attese su `materie` e `inArrivo` del corso A-L.
4. Originali: **sì**, con un PDF ripulito: `studio/public/originali/costituzionale-bin-pitruzzella.pdf` (senza filigrana StuDocu, senza l'email dell'autore a piè di pagina, copertina e p. 3 bianche, metadati azzerati). Si rigenera dal PDF originale tenendo il terzo flusso di contenuto fuori da ogni pagina e togliendo la riga in corpo 6,3 a y≈68. Il testo viene dall'OCR del PDF pulito (`studio/letture-src/testi/costituzionale-bin-pitruzzella.txt`, prodotto con `studio/scripts/testo-ocr.py`), letto da `extract-letture.py` tramite il campo `testoOcr` del catalogo. Le appendici (errata, domande, Costituzione) sono sezioni proprie.
   seguendo i passi in `AGENTS.md`.
5. `README.md`: riga nella tabella delle materie. Poi `npm run build && npm run check:build`.

## Avanzamento finale — 9 novembre 2026

Tutte le 18 unità sono scritte e validate: **50 lezioni, 536 domande esplicite, 278 concetti unificati**, 168 pagine del percorso (pp. 4–171). Le sintesi comprendono 37.141 parole. Ogni lezione ha le sei tipologie richieste; ogni unità aggiunge ordinamento e abbinamento. Le domande automatiche di glossario e cronologia si aggiungono al catalogo esplicito.

| Unità | Stato | Contenuto e correzioni principali |
|---|---|---|
| u01–u03 | completate | Stato, democrazia, rappresentanza e UE; cittadinanza aggiornata, territorio diplomatico e istituzioni corretti |
| u04–u06 | completate | Costituzione, forme di governo ed elezioni; legge elettorale 180/2026 |
| u07–u09 | completate | Governo, Parlamento, bilancio e Capo dello Stato; termini, organi e responsabilità distinti |
| u10–u11 | completate | Autonomie, giudici e CSM; quadro vigente e riforme proposte distinti |
| u12–u14 | completate | Fonti, leggi, decreti, referendum e regolamenti; corretti presupposti, sanatorie, autodichia e delegificazione |
| u15–u16 | completate | Fonti territoriali ed europee; art. 123, competenze, effetti diretti, cooperazione fra Corti e attuazione aggiornati |
| u17–u18 | completate | Corte, decisioni, conflitti e diritti; garanzie personali, cinema, istruzione, economia e doveri aggiornati |

### Fonti e scelte da conservare

- Letto il riassunto pp. 4–171 e l’errata corrige p. 172. Confrontate le risposte pertinenti, in particolare pp. 178–182, 188, 191–196 e 198–203; per il diritto vigente prevalgono i testi istituzionali richiamati nelle note delle unità. Il testo costituzionale dell’epoca allegato al PDF non è trattato come testo attuale.
- Il PDF originale contiene dati personali di terzi (filigrana di chi l'ha scaricato, email dell'autore): negli Originali c'è solo la versione ripulita, verificata con OCR su tutte le 258 pagine.
- Attivata solo in LMG A–L e nel segnaposto non selezionabile M–Z. SSG mantiene il programma distinto di Filosofia e il Diritto romano condiviso; Privato attende le fonti.
- Confermata la legge 9 ottobre 2026, n. 180, in vigore dal 24 ottobre 2026: https://www.gazzettaufficiale.it/eli/id/2026/10/09/26G00201/sg . Le lezioni distinguono il quadro elettorale vigente dai modelli storici.
- Confermata la mancata approvazione della revisione giustizia nel referendum di marzo 2026: https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.codiceRedazionale=26A02490&atto.dataPubblicazioneGazzetta=2026-05-18&tipoSerie=serie_generale&tipoVigenza=originario . CSM attuale: 30 elettivi più 3 di diritto.
- Bilancio: documenti 2026 DFP/DPFP e nuova cornice UE; non riprodotto il vecchio DPEF. Ulteriori fonti e precisazioni stanno nelle note di u08.

### Interfaccia e verifica

La griglia Materie è su due colonne con quattro simboli per LMG A–L, nome al passaggio e al fuoco della tastiera, puntini colorati per le materie pronte e riquadro grigio disabilitato per Privato. Il componente condiviso `GrigliaMaterie.tsx` è usato anche nel menu mobile. Non contiene la scritta «in arrivo».

- Validatore di tutte le 18 unità: 0 errori e 0 avvisi.
- Sync: 18 unità, 50 lezioni, 168 pagine, 278 concetti e 536 domande; nessun ID irrisolto.
- Verifica mirata della griglia già passata: quattro pulsanti, disabilitazione, cambio materia e nome accessibile da tastiera.
- Build x64 e suite `check:build` completate: domande, copertura del ripasso, mappe, corsi, backup e letture superati. Responsive: 1.348 controlli su 11 configurazioni WebKit/Chromium. Dopo la sola correzione della dicitura sulle pagine fuori percorso, build e controllo risorse ripetuti; verifica responsive finale in corso.
- Verifica mirata di Costituzionale: aperte tutte le 50 lezioni senza errori, avanzamento dalla prima alla seconda unità, glossario, mappe, cronologia, allenamento, stato vuoto corretto degli Originali e griglia mobile 2×2 con cambio materia. Archivio di prova isolato.
- La porta 7100 non viene riavviata o ricaricata; prove sulla 7101 con archivio di prova separato.

### Ripresa tecnica

I JSON in `05 - Contenuti/` sono il risultato da conservare. Gli strumenti temporanei `/private/tmp/iuris-costituzionale-*.py` servivano a strutturare contenuti redatti sulla fonte; non sono una fonte alternativa e rigenerarli alla cieca può sovrascrivere miglioramenti fatti direttamente nei JSON (u01, u11, u13, u16 e note finali). I nuovi ID sono registrati in `studio/CONTENUTI.md`.

Usare Node x64 per build e controlli (`PATH=/usr/local/bin:$PATH`). Non eseguire sync in parallelo a controlli che leggono il manifest: il sync ricrea `public/content`. Nessun commit o push per questo lotto senza una nuova richiesta di Carlo.
