# Piano: Diritto privato (LMG · I anno · A-L)

Potenziamento delle domande (passo 2): **1.426 domande**, almeno 14 in ciascuna delle 98 lezioni.
Le 392 aggiunte comprendono 196 casi e confronti a scelta multipla, 98 vero/falso e 98 completamenti.
Le domande precedenti conservano integralmente identificativi e contenuti. I conteggi dei giri sotto sono storici.

Stato: **completato**. Fonte arrivata il 10 novembre 2026: dispensa di Nick Petrullo e Ludovico Mainieri sul manuale
Torrente–Schlesinger (2012), 238 pagine fitte, 72 capitoli. Testo per pagina in
`Diritto Privato/00 - Appunti e fonti/testo/torrente-dispense.txt`. Completate le 27 unità (pp. 1–238); la materia è attiva nei tre corsi.

**Per riprendere il lavoro: [`consegne-diritto-privato.md`](consegne-diritto-privato.md)** (giri, ciclo, standard, punti da aggiornare).

Attenzione: la dispensa è del **2012**. Vanno aggiornati almeno: filiazione (l. 219/2012 e d.lgs. 154/2013: stato
unico di figlio, responsabilità genitoriale), unioni civili e convivenze (l. 76/2016), divorzio breve (l. 55/2015),
Codice del consumo, riforma Cartabia (d.lgs. 149/2022), condominio (l. 220/2012), mediazione e negoziazione assistita.
Alcuni riquadri di approfondimento sono illeggibili nel PDF (caratteri codificati): vanno ricostruiti con nozioni
pacifiche e segnalati in `noteRedazione`. Il programma ufficiale indica altri manuali (Gabrielli; Perlingieri per M-Z):
Carlo ha scelto queste dispense per tutte e tre le classi.

## Come si scrive un'unità

Si scrive il sorgente compatto `05 - Contenuti/sorgenti/uNN.txt` (formato spiegato in testa a
[`strumenti/unita.py`](strumenti/unita.py); esempio completo: `sorgenti/u01.txt`), poi:

```bash
python3 piani/strumenti/unita.py "Diritto Privato/05 - Contenuti/sorgenti/uNN.txt"
node studio/scripts/validate-content.mjs "Diritto Privato/05 - Contenuti/uNN.json"
```

Gli articoli del Codice vanno citati sempre con la sigla, «art. 1321 c.c.» o «artt. 1325 e 1418 c.c.»: solo così
la sezione Codice civile li collega alla lezione e alle domande. Nelle risposte da completare evitare le parole che
sono anche numeri («sei»): `check-domande` le rifiuta. La definizione estesa di ogni voce diventa la risposta della carta di
glossario: deve dire da sola che cos'è la voce (almeno 40 caratteri, non cominciare con «Esempi…» o «Vi si…»).

## Unità previste

| Unità | Capitoli | Pagine | Stato |
|---|---|---|---|
| u01 Ordinamento, norma e fonti | 1–2 | 1–8 | fatta |
| u02 Legge nel tempo, interpretazione, conflitti di leggi | 3–5 | 9–15 | fatta |
| u03 Situazioni giuridiche soggettive | 6 | 16–18 | fatta |
| u04 La persona fisica | 7 A–B | 19–27 | fatta |
| u05 Gli enti | 7 C | 28–32 | fatta |
| u06 Beni; fatto, atto e negozio giuridico | 8–9 | 33–41 | fatta |
| u07 Prescrizione e decadenza, tutela giurisdizionale, prove | 10–12 | 42–50 | fatta |
| u08 Diritti reali e proprietà | 13 | 51–66 | fatta |
| u09 Diritti reali di godimento | 14 | 67–73 | fatta |
| u10 Comunione, condominio, multiproprietà | 15 | 74–77 | fatta |
| u11 Possesso e usucapione | 16 | 78–95 | fatta |
| u12 Il rapporto obbligatorio e i suoi elementi | 17–18 | 96–101 | fatta |
| u13 Modificazioni soggettive ed estinzione dell'obbligazione | 19–20 | 102–112 | fatta |
| u14 Inadempimento, mora, responsabilità patrimoniale | 21 | 113–116 | fatta |
| u15 Pegno, ipoteca e conservazione della garanzia | 22–23 | 117–126 | fatta |
| u16 Il contratto: nozione, trattative, conclusione | 25–26 | 127–133 | fatta |
| u17 Vizi della volontà, forma, rappresentanza | 27–29 | 134–141 | fatta |
| u18 Preliminare, oggetto, causa, interpretazione | 30–33 | 142–149 | fatta |
| u19 Effetti, elementi accidentali, simulazione | 34–36 | 150–159 | fatta |
| u20 Invalidità, rescissione, risoluzione | 37–38 | 160–171 | fatta |
| u21 Consumatore, contratti tipici e atipici, compravendita | 39–41 | 172–182 | fatta |
| u22 Gli altri contratti | 42–50 | 183–199 | fatta |
| u23 Promesse unilaterali, titoli di credito, obbligazioni dalla legge | 51–54 | 200–207 | fatta |
| u24 La responsabilità per fatto illecito | 55 | 208–210 | fatta |
| u25 La famiglia | 56–63 | 211–222 | fatta |
| u26 Le successioni | 64–70 | 223–234 | fatta |
| u27 Donazione e trascrizione | 71–72 | 235–238 | fatta |

## Decisioni prese con Carlo (10 novembre 2026)

- **Una sola materia per le tre classi**: le sbobine valgono per LMG A-L, LMG M-Z e SSG. Slug `diritto-privato`, da
  aggiungere alle `materie` di tutti e tre i corsi in `studio/src/data/corsi.ts` (togliendola dagli `inArrivo`).
- **Sezione «Codice civile»** (stesso meccanismo della sezione Costituzione, `norme.json` con `"nome": "Codice civile"`).

### Come trattare il Codice civile

Il Codice ha 2969 articoli più i bis/ter: circa 1,5 MB di testo. Non può stare dentro `corso.json` come la
Costituzione (65 KB), altrimenti ogni apertura della materia lo scarica tutto.

1. **Fonte**. Normattiva è la fonte ufficiale, ma l'esportazione che Carlo ha provato si ferma a circa 1100 articoli.
   Wikisource ha il testo completo diviso per libro e titolo (61 pagine, 2986 articoli con le rubriche ufficiali,
   scaricate e contate il 10 novembre 2026), ma dichiara l'ultimo aggiornamento al 6 luglio 2022 e una qualità bassa.
   Strada scelta: Wikisource come base completa; il file di Normattiva, dove c'è, prevale e serve da controllo;
   gli articoli toccati dalle riforme dopo luglio 2022 (riforma Cartabia della famiglia e dei minori, d.lgs. 149/2022,
   e successive) si verificano uno per uno su Normattiva. Ogni articolo porta la data dell'ultima verifica; quelli
   non verificati lo dicono.
2. **Formato** (fatto). `python3 studio/scripts/codice-civile.py` genera `norme.json` e un file per libro in
   `05 - Contenuti/norme/` (preleggi e libri I–VI: 3042 articoli). Il sync mette in `corso.json` l'indice (numero,
   rubrica, libro, titolo) e il testo dei soli articoli citati nelle lezioni; i libri si scaricano quando si aprono.
   Le correzioni a mano stanno in `05 - Contenuti/norme-aggiornamenti.json` (`{"1519-bis": {"abrogato": true,
   "nota": "…", "verificato": "2026-11-10"}}`) e prevalgono sul testo scaricato. Da fare: verificare gli articoli
   modificati dopo luglio 2022 e i 71 numeri che Wikisource non riporta (quasi tutti abrogati); il Titolo IX del
   Libro I porta ancora la vecchia intestazione «potestà dei genitori».
   **Allineamento a Normattiva (fatto il 10 novembre 2026).** `python3 studio/scripts/codice-normattiva.py --scarica`
   scarica dal sito ufficiale il testo vigente dei 3211 articoli (le pagine restano in
   `00 - Appunti e fonti/codice-civile-normattiva/`, fuori da git); `--scrivi` lo confronta con la base e registra le
   differenze in `norme-aggiornamenti.json` (campo `fonte: "normattiva"`); poi `codice-civile.py` rigenera i libri.
   Primo giro: 1202 articoli con testo o rubrica diversi (molti refusi della base, ma anche filiazione, condominio,
   società, riforma del 2025 su assenza, morte presunta e donazioni), 145 articoli che mancavano, 56 abrogati.
   Per gli abrogati di cui la base aveva il testo, questo resta in `precedente` e l'app lo mostra a richiesta.
   Da rifare ogni tanto: basta cancellare la cartella delle pagine e rilanciare i tre comandi. Dopo ogni giro,
   controllare le lezioni che citano articoli cambiati di recente (campo `vigenteDal`).
3. **Uso nello studio**. Vista predefinita: solo gli articoli citati nelle lezioni (il programma d'esame è una parte
   del Codice), con il resto a portata di ricerca. Il collegamento articolo–lezione–domande è già automatico
   («art. 1321 c.c.», «artt. 1325 e 1418»): nelle lezioni gli articoli vanno scritti così.
4. **Restano fuori**, per ora: leggi collegate (codice del consumo, legge sul divorzio, unioni civili). Si
   aggiungeranno solo se le sbobine le trattano a fondo.

## Primi passi quando arrivano le fonti

1. **Riconosci il materiale**: che cos'è (sbobinature, riassunto di un manuale, dispense del docente), di quale
   manuale (es. Torrente–Schlesinger, Trimarchi, Gazzoni, Bianca…), quale edizione o anno, quante pagine.
   Se ci sono più testi, la materia ha più `fonti` (vedi «Materie con più testi» in `studio/CONTENUTI.md`).
2. **Estrai il testo per pagina** in `00 - Appunti e fonti/testo/` (righe `=== pagina N ===`), con pypdf.
   Se il testo esce illeggibile (simboli a caso: succede con i PDF StuDocu), usa l'OCR di
   [`strumenti/ocr.m`](strumenti/ocr.m): circa 7 secondi a pagina, conviene lanciarlo in background.
3. **Controlla i dati personali**: filigrane con nome o email di chi ha scaricato il file non vanno pubblicate
   (niente PDF di quel tipo negli Originali).
4. **Mappa i capitoli**: dall'indice del PDF, se c'è, o dai titoli in maiuscolo. Una unità per capitolo
   (o per blocco di 6–15 pagine se i capitoli sono molto lunghi), 3–5 lezioni per unità. Scrivi la tabella delle
   unità in questo file, nella sezione sotto.
5. **Verifica l'aggiornamento**: il diritto privato cambia spesso (filiazione, famiglia, successioni, contratti
   dei consumatori, riforma Cartabia per il processo). Se il materiale è vecchio, la sintesi descrive la disciplina
   vigente e il campo `note` spiega che cosa è cambiato (con la fonte normativa).

## Struttura tipica del corso (solo orientamento)

Un corso di Istituzioni di diritto privato del primo anno di solito copre: fonti e interpretazione; situazioni
giuridiche soggettive; persone fisiche e giuridiche; beni, proprietà e diritti reali; possesso; obbligazioni;
contratto in generale (requisiti, effetti, invalidità, risoluzione); singoli contratti; fatti illeciti e
responsabilità civile; famiglia; successioni; tutela dei diritti (trascrizione, prescrizione, prove).
L'ordine e i confini veri vengono dal materiale di Carlo, non da questo elenco.

## Come scrivere le lezioni di questa materia

- È una materia di **istituti e articoli del Codice civile**: per ogni istituto la sintesi dice che cos'è,
  dove sta (articolo c.c., citato esatto), quali sono i requisiti o gli elementi, gli effetti, le eccezioni,
  e un esempio pratico.
- Tabelle per le distinzioni (nullità/annullabilità, diritti reali/di credito, possesso/detenzione,
  responsabilità contrattuale/extracontrattuale, tipi di prescrizione e decadenza).
- Domande: definizioni, requisiti da elencare, casi pratici brevi («Tizio vende a Caio…: il contratto è valido?»),
  articoli da abbinare agli istituti, termini e numeri (`completa`), procedimenti da mettere in ordine.
- Eventi in cronologia: solo poche date certe (Codice civile 1942, Costituzione 1948, riforma del diritto di
  famiglia 1975, riforma della filiazione 2012–2013, unioni civili 2016…). Con poche date l'unità può averne 0.
- Id canonici: scegli id brevi e stabili (`contratto`, `obbligazione`, `proprieta`, `possesso`, `nullita`,
  `annullabilita`, `responsabilita-civile`, `capacita-giuridica`, `capacita-di-agire`, …) e scrivili in
  `studio/CONTENUTI.md` in una sezione «ID CANONICI (diritto privato)» prima di cominciare.

## Materia e attivazione

- `Diritto Privato/05 - Contenuti/materia.json`: nome «Diritto privato», `breve` «Privato», manuale e fonte
  secondo il materiale, colore `#b07a1e` (quello già usato per la materia «in arrivo»).
- `.gitignore`: `!/Diritto Privato/`, `/Diritto Privato/*`, `!/Diritto Privato/05 - Contenuti/`.
- `studio/src/data/corsi.ts`: `'diritto-privato'` nelle `materie` di A-L (e M-Z segnaposto), via da `inArrivo` in
  tutti i corsi; attese in `studio/scripts/check-corsi.mjs`; riga in `README.md`; build e controlli.

### Verifiche emerse nel giro u12–u15 (10 novembre 2026)

Il testo locale dell’art. 1284 in `norme/libro-iv.json` è storico (10%) e incompleto: vanno verificati anche gli aggiornamenti anteriori al 2022. Nella lezione u12-l3 sono usati il tasso 2026 e il testo vigente verificato sul portale ufficiale MEF, compresi i commi 4–5 introdotti nel 2014. La sezione Codice è stata lasciata invariata secondo le consegne. L’art. 2929-bis non è presente nella base locale e viene trattato in u15 con verifica esterna.

Controlli del giro u12–u15: validazione di tutte le nuove unità senza errori (avvisi di lunghezza accettati dalle consegne); sync e check-domande riusciti; build e check:build riusciti, inclusi 1.348 controlli responsive su 11 dispositivi. Dopo la precisazione finale sull’art. 1284 ripetuti con successo build, check-build e check:review. Nessun commit o push. Il giro successivo u16–u20 è documentato qui sotto.

### Giro u16–u20 (10 novembre 2026)

Scritte le cinque unità sul contratto in generale: 20 lezioni da 383–470 parole, 84 definizioni (83 voci nuove e una ripresa), 210 domande, 42 relazioni e mappe per ogni unità. Le domande aperte includono tracce ideali complete; corretti i rinvii di caparra penitenziale, contratto a favore di terzo, prova testimoniale e termini della trascrizione del preliminare. Aggiornata la tutela degli immobili da costruire al regime del 2019, con fonti nelle note redazionali. In u20 sono state usate cinque lezioni per separare i rimedi senza comprimerli.

Totale al termine del giro: **20 unità, 64 lezioni, 364 voci, 680 domande; pp. 1–171**. Il giro u21–u24 è documentato sotto. La sezione Codice e la modifica preesistente di Percorso non sono state toccate. Nessun commit o push.

Controlli del giro u16–u20: tutte le unità validate senza errori; avvisi di densità accettati dalle consegne. Sync, check-domande, build e check:build completati con successo; 1.348 controlli responsive su 11 dispositivi. Verificata anche l’apertura delle nuove u16–u20 a 393 px, con tabelle renderizzate e senza sbordi, e controllata visivamente la lezione u20-l1. Build allineata ai conteggi e alle definizioni finali.

### Giro u21–u24 (10 novembre 2026)

Completate quattro unità su consumatore e vendita, altri contratti, promesse e titoli di credito, obbligazioni dalla legge e fatto illecito: **17 lezioni, 74 definizioni (73 voci nuove, transazione ripresa da u02), 178 domande e 40 relazioni**. Ogni unità ha mappa, ordina e abbina; le 17 domande aperte includono risposte modello complete. Cinque lezioni in u21 e u22 per distinguere i molti istituti della dispensa.

Aggiornamenti verificati e fonti nelle note redazionali: recesso consumeristico e azioni collettive; conformità e riparazione (d.lgs. 176/2026, applicazione ai contratti dal 31 luglio 2026); leasing finanziario, mediazione, libretti al portatore e canoni agrari; non trasferibilità e sanzioni amministrative degli assegni; limiti dell’arricchimento; legittima difesa e danno non patrimoniale. Distinte le riforme non ancora applicabili, in particolare il regime UE dei prodotti dopo il 9 dicembre 2026. Il nuovo art. 133 mantiene il termine ordinario dell’azione a 26 mesi e introduce separatamente l’estensione della responsabilità per riparazione: non inventata una prescrizione automatica di 38 mesi.

Completamento locale: **27 unità, 98 lezioni, 503 voci, 1.034 domande; pp. 1–238**. Le unità finali aggiornano famiglia e filiazione, successioni e circolazione dei beni donati, donazione e trascrizione; il Codice resta invariato. Gli **Originali** includono la dispensa completa, estratta in 98 sezioni e collegata a tutte le lezioni. La modifica preesistente di Percorso resta fuori da questa consegna.

Controlli del giro u21–u24: validazione senza errori (sette avvisi di densità accettati dalle consegne), sync e controllo domande riusciti; build finale e check:build completati con successo, inclusi 1.348 controlli responsive su 11 dispositivi. Provate tutte le 17 lezioni a 393 e 1280 px (34 aperture), con testo completo, tabelle renderizzate, nessuno sbordo e nessun errore del browser; ispezionata visivamente u24-l3 su telefono. Verificato l’allineamento delle 178 domande finali nella versione compilata. La porta 7100 non è stata riavviata né ricaricata.
