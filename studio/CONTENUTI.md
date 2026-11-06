# Formato dei contenuti di IURIS

Ogni materia ha una cartella `05 - Contenuti/` con:

- `materia.json` — dati della materia (nome, docente, fonte, pagine totali).
- `u01.json`, `u02.json`, … — una **unità di studio** per file (di norma un capitolo degli appunti).
- `schede-inverse.json` — facoltativo: definizioni selezionate per ricordare i termini del glossario.

Lo script `scripts/sync-content.mjs` unisce tutte le unità in un solo file per materia
(`public/content/<slug>/corso.json`) e costruisce glossario, cronologia e mappa globale.
Lo script `scripts/validate-content.mjs <file.json>` controlla un'unità e stampa errori e avvisi.

Tutti i testi sono in **italiano**. I campi "markdown" accettano Markdown semplice
(grassetto, corsivo, elenchi, tabelle) e i link ai concetti `[[id-concetto]]` o `[[id-concetto|testo mostrato]]`.

---

## Unità (`uNN.json`)

```jsonc
{
  "id": "u03",                         // = nome del file
  "ordine": 3,
  "titolo": "Il costume e la legge nell'esperienza arcaica",
  "capitolo": "Capitolo terzo",        // etichetta come negli appunti
  "pagine": [23, 48],                  // pagine del PDF coperte (inizio, fine) — sempre [da, a]
  "abstract": "2–4 frasi: di cosa parla l'unità e perché conta per l'esame.",
  "note": "facoltativo: avvertenze (pagine vuote, punti confusi negli appunti…)",
  "lezioni":   [ /* Lezione */ ],
  "concetti":  [ /* Concetto */ ],
  "relazioni": [ /* Relazione */ ],
  "eventi":    [ /* Evento */ ],
  "mappa":     { /* NodoMappa */ },
  "domande":   [ /* Domanda */ ]
}
```

La posizione nel percorso la decide `ordine`, non il nome del file: un capitolo aggiunto dopo prende il primo
numero libero (`u14.json`) e un `ordine` intermedio, così gli id delle altre unità (e i progressi salvati) non cambiano.

### Unità ricostruite — capitoli in programma che gli appunti non trattano

```jsonc
{
  "id": "u15", "ordine": 12, "capitolo": "Capitolo dodicesimo",
  "ricostruita": true,
  "manuale": [323, 352],               // pagine del manuale (Bretone, Laterza, ed. 1992)
  "pagine": [170, 175],                // facoltativo: solo se nel PDF degli appunti c'è qualcosa (es. i titoli)
  "note": "da dove viene il testo e quali punti sono meno sicuri"
}
```

Ogni lezione ha `manuale` (il paragrafo del manuale) e, se c'è, `pagine`. La sintesi segue i paragrafi dell'indice
e le fonti note (passi del Digesto, di Gaio, di Cicerone); non attribuisce al manuale tesi che non si possono verificare.
L'app mostra l'avviso «ricostruita dal manuale» e le lezioni senza `pagine` non contano nelle pagine studiate.

### Materie con più testi

Se la materia si studia su più PDF (es. Filosofia del diritto: Incampo, Moro, Cotta), `materia.json` li elenca in
`"fonti": [{ "id": "incampo", "nome": "Incampo", "file": "Incampo.pdf", "descrizione": "…", "pagine": 100 }, …]`
e ogni unità dichiara `"fonte": "incampo"`. Tutte le `pagine` dell'unità (lezioni, concetti, eventi, domande) sono
pagine di quel PDF; l'app le mostra come «Incampo pp. 3–5».

### Lezione — la porzione minima che lo studente segna come "studiata"

Da 2 a 6 pagine, seguendo i paragrafi degli appunti. Le lezioni coprono **tutte** le pagine dell'unità, in ordine, senza buchi.

```jsonc
{
  "id": "u03-l2",
  "titolo": "Le XII Tavole e la lotta patrizio-plebea",
  "pagine": [25, 28],
  "minuti": 25,                        // stima di studio
  "sintesi": "markdown",               // vedi regole sotto
  "puntiChiave": ["5–8 frasi brevi: ciò che va detto all'esame"],
  "memoria": [                         // da sapere a memoria: date, nomi, formule latine, elenchi
    { "voce": "451–450 a.C.", "dettaglio": "XII Tavole, redatte dai decemviri legibus scribundis" }
  ],
  "concetti": ["xii-tavole", "decemviri-legibus-scribundis"]   // id dei concetti trattati
}
```

**Regole per la `sintesi`** (è il cuore: lo studente NON riaprirà gli appunti):
- Completa: tutto ciò che può essere chiesto all'esame deve esserci. Riassunto ragionato e fedele, non telegrafico:
  circa 200–300 parole per pagina di appunti.
- Struttura con sottotitoli `###`, elenchi e, quando servono, tabelle. Grassetto sui termini chiave.
- Spiega i termini latini la prima volta che compaiono (traduzione tra parentesi).
- Collega i concetti con `[[id]]` alla loro prima menzione nella lezione.
- Segui l'ordine e i ragionamenti degli appunti («gli appunti sottolineano…»), senza nominare il docente del corso.
- Mai inventare: solo ciò che sta negli appunti. Correggi i refusi evidenti (date, nomi) e, se un passo è
  ambiguo, dillo in una riga ("negli appunti la data è incerta").

### Concetto — voce del glossario e nodo della mappa globale

```jsonc
{
  "id": "pretore-peregrino",           // kebab-case, senza accenti né articoli
  "nome": "Pretore peregrino",
  "tipo": "magistratura",              // vedi TIPI
  "latino": "praetor peregrinus",      // facoltativo
  "alias": ["praetor peregrinus"],     // facoltativo: altri modi in cui compare
  "breve": "Magistrato istituito nel 242 a.C. per le liti tra romani e stranieri.",   // max ~140 caratteri
  "definizione": "markdown, 2–6 frasi: cos'è, quando, perché conta, a cosa si collega.",
  "pagine": [7, 8]
}
```

TIPI: `persona`, `magistratura`, `organo` (senato, comizi…), `gruppo` (patrizi, plebe, pontefici…),
`norma` (leggi, plebisciti, XII Tavole, costituzioni…), `fonte` (categorie di fonti), `opera` (libri, codici),
`istituto` (istituti giuridici: mancipatio, testamento…), `procedura` (legis actiones, processo formulare…),
`periodo`, `evento`, `concetto` (idee astratte: tradizionalismo, formalismo…), `luogo`.

### Schede inverse del glossario (`schede-inverse.json`)

```json
[
  {
    "concetto": "pretore-peregrino",
    "definizione": "Magistrato istituito nel 242 a.C. per le controversie tra romani e stranieri."
  }
]
```

Si selezionano termini tecnici con una definizione breve e riconoscibile, ricavata dal glossario.
Il testo non deve contenere il termine atteso o un suo alias: aggiungere il contesto della teoria o del
periodo quando serve a distinguere risposte simili. Non si invertono automaticamente tutte le definizioni.
`sync-content.mjs` controlla id canonici, duplicati, lunghezze (30–500 caratteri) e risposte già visibili;
poi aggiunge `schedaInversa` alla voce del corso generato.

Le schede si avviano da **Allenamento → Schede inverse**, dal glossario o da **Ricorda il termine** nella voce.
Hanno id stabili `glossario-inversa-<id-concetto>` e una memoria FSRS indipendente dalle altre domande.
Solo dopo la prima risposta entrano nel ripasso del giorno. Non aggiungono domande nuove alle lezioni;
contribuiscono alla padronanza del concetto e agli esercizi sui punti deboli.

**Id dei concetti.** Più unità parlano degli stessi concetti e vengono scritte in parallelo: per non creare doppioni
usa **sempre** gli id dell'elenco `ID CANONICI` (sotto) quando il concetto è lo stesso. Per i concetti nuovi crea l'id
dal nome italiano canonico: `lex-aebutia`, `quinto-mucio-scevola`, `mancipatio`, `ius-honorarium`.
Nomi latini restano latini (`legis-actiones`, non `azioni-di-legge`). Persone: nome completo più noto.

Un concetto già definito in un'altra unità va **ridefinito** nel tuo file solo se la tua unità aggiunge cose
importanti (la tua `definizione` riassume ciò che dice la tua unità). Altrimenti basta citarne l'id
(in `concetti` delle lezioni, nelle relazioni, nei `[[link]]`). In fase di unione le definizioni vengono fuse.

### Relazione — collegamento tra due concetti (archi della mappa globale)

```jsonc
{ "da": "decemviri-legibus-scribundis", "a": "xii-tavole", "tipo": "crea", "etichetta": "redigono" }
```

`tipo`: `parte-di`, `crea`, `supera`, `influenza`, `contrasta`, `evolve-in`, `testimonia` (A è fonte per conoscere B),
`interpreta`, `causa`, `esempio-di`, `collegato`. `etichetta` (facoltativa) = verbo breve mostrato sull'arco.
Gli id possono riferirsi a concetti di altre unità (presi dagli ID CANONICI).

### Evento — per la cronologia interattiva

```jsonc
{
  "id": "ev-lex-aebutia",
  "anno": -120,                        // anni a.C. negativi, d.C. positivi
  "annoFine": null,                    // facoltativo, per i periodi
  "approssimato": true,                // facoltativo: date incerte o secoli
  "data": "fine II sec. a.C.",         // come mostrarla
  "titolo": "Lex Aebutia",
  "descrizione": "1–2 frasi.",
  "tipo": "legge",                     // legge | istituzione | giurisprudenza | politica | codificazione | opera | periodo | altro
  "concetti": ["lex-aebutia", "processo-formulare"],
  "pagine": [8, 8]
}
```

Per i secoli usa l'anno centrale o d'inizio e `approssimato: true` (es. "IV–III sec. a.C." → `anno: -400, annoFine: -201`).
Le grandi età (Repubblica alta, Principato…) sono eventi di tipo `periodo` con `anno` e `annoFine`: diventano le fasce della cronologia.
Id degli eventi: `ev-` + id del concetto principale quando c'è (`ev-lex-aebutia`, `ev-xii-tavole`), così le unità non creano doppioni.

### NodoMappa — mappa mentale dell'unità (albero)

```jsonc
{
  "testo": "Titolo dell'unità",
  "figli": [
    { "testo": "Fonti di cognizione", "concetto": "fonti-di-cognizione", "figli": [
      { "testo": "tecniche ↔ atecniche", "nota": "giuristi vs Cicerone, Plauto" }
    ]}
  ]
}
```

Etichette brevi (max ~45 caratteri), `nota` facoltativa (max ~90), `concetto` facoltativo.
3–4 livelli, 3–7 figli per nodo. Deve far vedere la struttura logica dell'unità, non ripetere la sintesi.

### Domanda

Campi comuni: `id` (`u03-q001`, progressivo), `tipo`, `lezione` (id della lezione), `livello` (`base` | `medio` | `avanzato`),
`concetti` (facoltativo), `pagine` ([da, a]).

| tipo | campi |
|---|---|
| `flashcard` | `domanda`, `risposta` (2–5 frasi) |
| `multipla` | `domanda`, `opzioni` (4 stringhe), `corretta` (indice 0–3), `spiegazione` |
| `verofalso` | `affermazione`, `vero` (true/false), `spiegazione` |
| `completa` | `testo` con i buchi `{{risposta}}`; più risposte accettate: `{{451\|451 a.C.}}`; `spiegazione` facoltativa |
| `aperta` | `domanda` (stile orale d'esame), `traccia` (markdown: risposta ideale, 120–250 parole), `punti`: 3–6 `{ "testo": "punto che deve comparire", "chiavi": ["parole", "radici"] }` |
| `ordina` | `consegna`, `elementi` (4–7, **già nell'ordine giusto**), `spiegazione` facoltativa |
| `abbina` | `consegna`, `coppie` (4–6 `[sinistra, destra]`) |

Quantità per **ogni lezione**: 4–6 `flashcard`, 2–4 `multipla`, 2–3 `verofalso`, 1–2 `completa`, 1 `aperta`.
Per **ogni unità**: almeno 1 `ordina` (se ci sono date o sequenze) e 1–2 `abbina`.

Qualità delle domande:
- Come le farebbe un docente all'orale; varia i livelli (circa 40% base, 40% medio, 20% avanzato).
- `multipla`: distrattori plausibili (stessa categoria, date vicine, confusioni tipiche), mai "tutte le precedenti".
  Varia la posizione della risposta corretta.
- `verofalso`: circa metà false; le false devono contenere un errore preciso e la `spiegazione` lo corregge.
- `aperta.punti.chiavi`: 1–4 parole o radici minuscole che indicano che il punto è stato detto
  (servono a riconoscere la risposta a voce: `["decemvir", "dieci"]`, `["451"]`).
- Ogni risposta deve essere verificabile nelle pagine indicate.

---

## ID CANONICI (diritto romano)

Usali così come sono quando il concetto coincide.

Periodi: `eta-regia`, `repubblica-alta`, `repubblica-media`, `repubblica-tarda`, `principato`, `anarchia-militare`, `dominato`, `eta-postclassica`
Fonti: `fonti-di-cognizione`, `fonti-di-produzione`, `fonti-tecniche`, `fonti-atecniche`, `fonti-primarie`, `fonti-secondarie`, `problema-della-derivazione`, `palinsesto`, `consuetudine`, `lex-publica`, `plebiscito`, `editto`, `editto-del-pretore`, `senatus-consulta`, `interpretatio-prudentium`, `responso`, `costituzioni-imperiali`, `mores-maiorum`
Norme: `xii-tavole`, `leges-liciniae-sextiae`, `lex-hortensia`, `lex-aebutia`, `lex-valeria-de-provocatione`, `legge-delle-citazioni`, `lex-de-imperio`
Organi e magistrature: `senato`, `comizi-curiati`, `comizi-centuriati`, `comizi-tributi`, `concilia-plebis`, `console`, `pretore`, `pretore-urbano`, `pretore-peregrino`, `censore`, `edile-curule`, `questore`, `tribuno-della-plebe`, `decemviri-legibus-scribundis`, `princeps`, `cancelleria-imperiale`
Gruppi: `patrizi`, `plebe`, `pontefici`, `collegio-dei-pontefici`, `giuristi`, `equites`, `peregrini`, `gentes`, `clientela`
Concetti: `tradizionalismo`, `formalismo`, `monopolio-pontificale`, `laicizzazione-della-giurisprudenza`, `imperium`, `auctoritas`, `ius-civile`, `ius-honorarium`, `ius-gentium`, `ius-naturale`, `scientia-iuris`, `diritto-pubblico`, `diritto-privato`, `diritto-romano-storico`, `tradizione-romanistica`, `ius-commune`, `pandettistica`, `romanistica`, `timocrazia`, `promulgatio`, `rogatio`
Procedure e istituti: `legis-actiones`, `processo-formulare`, `formula`, `mancipatio`, `nexum`, `stipulatio`, `testamento`, `patria-potestas`, `pater-familias`
Opere e codici: `tripertita`, `institutiones-di-gaio`, `codex-gregorianus`, `codex-hermogenianus`, `codex-theodosianus`, `collatio-legum-mosaicarum-et-romanarum`, `fragmenta-vaticana`, `epitome-ulpiani`, `lex-romana-visigothorum`, `edictum-theoderici`, `lex-romana-burgundionum`, `compilazione-giustinianea`, `corpus-iuris-civilis`, `digesto`, `codice-giustinianeo`, `institutiones-di-giustiniano`, `novellae`, `edictum-perpetuum`
Persone: `gaio`, `cicerone`, `polibio`, `livio`, `plauto`, `panezio`, `sesto-elio-peto-cato`, `publio-mucio-scevola`, `manio-manilio`, `giunio-bruto`, `quinto-mucio-scevola`, `servio-sulpicio-rufo`, `gneo-flavio`, `tiberio-coruncanio`, `augusto`, `adriano`, `salvio-giuliano`, `labeone`, `capitone`, `papiniano`, `paolo`, `ulpiano`, `modestino`, `diocleziano`, `costantino`, `teodosio-ii`, `giustiniano`, `triboniano`, `savigny`

## Note per Filosofia del diritto

- Le fonti sono **dispense e riassunti** di tre libri (Incampo; Moro, *Il diritto e lo Stato*; Cotta, *Il diritto
  nell'esistenza*), non sbobinature: non scrivere «la professoressa», ma «Incampo osserva…», «per Moro…», «Cotta distingue…».
- È una materia di **argomenti e distinzioni**: la sintesi deve ricostruire i ragionamenti passo per passo (tesi,
  argomenti, esempi, obiezioni), non solo elencare definizioni. Le tabelle servono per le distinzioni (Sein/Sollen,
  regole costitutive/regolative, giustizia individuale/societaria/universale…).
- Termini tedeschi, greci e latini restano in corsivo con la traduzione tra parentesi la prima volta (*Sollen*, «dover essere»).
- Eventi: solo date presenti nel testo o certissime (opere: *Reine Rechtslehre* 1934 e 1960, *Zum ewigen Frieden* 1795,
  *Fenomenologia dello spirito* 1807, Costituzione italiana 1948…). Con poche date l'unità può avere 0–4 eventi.
- Domande: definizioni, distinzioni, autore ↔ tesi, esempi del testo, passaggi di un argomento (`ordina`).

## ID CANONICI (filosofia del diritto)

Persone: `aristotele`, `platone`, `socrate`, `agostino`, `tommaso-d-aquino`, `kant`, `hegel`, `husserl`, `wittgenstein`, `kelsen`, `hart`, `alf-ross`, `john-l-austin`, `john-searle`, `adolf-reinach`, `charles-w-morris`, `amedeo-g-conte`, `gaetano-carcaterra`, `georges-kalinowski`, `gustav-radbruch`, `jacques-maritain`, `giuseppe-capograssi`, `aldo-moro`, `sergio-cotta`, `antonio-incampo`, `norberto-bobbio`, `vico`, `marx`
Opere: `dottrina-pura-del-diritto`, `zum-ewigen-frieden`, `fenomenologia-dello-spirito`, `costituzione-italiana`
Concetti generali: `filosofia-del-diritto`, `diritto`, `diritto-positivo`, `diritto-naturale`, `giuspositivismo`, `giusnaturalismo`, `morale`, `politica`, `potere`, `stato`, `societa`, `persona`, `liberta`, `autorita`, `giustizia`, `legge`, `costituzione`
Norma e ordinamento: `norma-giuridica`, `dovere-giuridico`, `ordinamento-giuridico`, `validita`, `efficacia`, `vigenza`, `sein`, `sollen`, `grundnorm`, `stufenbau`, `sanzione`, `obbligo`, `permesso`, `divieto`
Linguaggio e logica: `atto-linguistico`, `enunciato-performativo`, `enunciato-descrittivo`, `promessa`, `pragmatica`, `sintattica`, `semantica`, `semiotica`, `logica-deontica`, `verita`
Regole: `regola-costitutiva`, `regola-regolativa`, `regola-tecnica`, `regola-eidetico-costitutiva`
Altri: `pubblicita` (Öffentlichkeit), `riconoscimento` (Anerkennung), `coscienza-infelice`, `coesistenza`, `giuridicita`, `ontofenomenologia`

## Ampliamento «oltre gli appunti» (`oltre-NN.json`)

Gli appunti danno per scontate le conoscenze di base (chi era Aristotele, che cos'è la giustizia in senso generale…).
I file `05 - Contenuti/oltre-NN.json` le aggiungono, separate dal testo degli appunti: l'app le mostra nella scheda
della voce come «Oltre gli appunti», con una tinta diversa. Esempio completo: `Filosofia del Diritto/05 - Contenuti/oltre-00.json`.

```jsonc
{
  "voci": [{
    "id": "aristotele",                 // voce esistente
    "oltre": "markdown, 80–250 parole: le conoscenze di base che un docente può chiedere",
    "daSapere": ["2–5 righe brevi: date, opere, formule"],
    "fonti": [                         // facoltativo: riferimenti realmente consultati, visibili nella scheda
      { "titolo": "Autore, opera o risorsa", "url": "https://..." }
    ],
    "collegamenti": [                    // nuovi, o riscritti meglio (sostituiscono quelli tra gli stessi due concetti)
      { "da": "platone", "a": "aristotele", "tipo": "influenza", "etichetta": "è il maestro di" }
    ],
    "togli": [{ "da": "aristotele", "a": "politica" }]   // collegamenti sbagliati o fuorvianti
  }],
  "nuovi": [ /* Concetto senza "pagine": voci che mancano, solo se servono davvero */ ]
}
```

- Solo fatti consolidati, da manuale; niente citazioni inventate, date solo se sicure.
- Non ripetere la definizione degli appunti: completala. Se gli appunti usano un significato tecnico di un autore
  (es. «giustizia» per Incampo), spiega anche il significato generale e la differenza.
- Ogni collegamento si legge come una frase: «DA etichetta A» («Platone è il maestro di Aristotele»).
- I nuovi id possono essere citati dagli altri file `oltre-NN.json` della stessa materia, senza ridefinirli.
- Se una fonte verificata documenta un errore nella voce di base, `rettifica: { breve, definizione }` ne aggiorna la scheda e l'anteprima; spiega il motivo e cita la fonte nell'approfondimento. Non usarla per semplici ampliamenti o differenze di interpretazione.
- Per ogni coppia di concetti mantieni una formulazione condivisa: evita correzioni o rimozioni in conflitto tra file.
- Si controlla con `node studio/scripts/validate-content.mjs ".../oltre-01.json"`.
