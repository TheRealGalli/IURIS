# Testo IURIS delle filosofie — istruzioni per i gruppi

Progetto IURIS (/Users/carlogalli/Desktop/IURIS). Scrivi in italiano. Leggi prima `piani/costituzionale-unica.md`
(metodo) e AGENTS.md «Qualità dei contenuti». Lavoro di circa 45–70 minuti. Altri subagenti scrivono altre pagine:
tocca SOLO il tuo file e il tuo resoconto. Non lanciare sync, build, check:build; non modificare `05 - Contenuti/`.

**Obiettivo.** Ogni materia ha UN SOLO testo, il «testo IURIS», scritto da noi. Le fonti attuali (riassunti di
manuali, dispense, sbobinature di lezioni) sono numerate di seguito in un unico file per pagina; noi riscriviamo ogni
pagina con parole nostre, **stessa numerazione** (lezioni, domande e sezioni restano valide), **stesso contenuto e
stessa divisione**. Non è un riassunto. Le espressioni caratteristiche del docente o del manuale (formule, esempi
celebri, definizioni che si ripetono all'esame) si conservano; i passi d'autore si citano tra «…».

**Prodotto.** `<cartella testo-iuris>/<gruppo>.txt` con TUTTE le tue pagine, ciascuna introdotta da `=== pagina N ===`.
- Lunghezza tipica 0,9–1,3 volte la pagina di partenza. Per le **sbobinature** (lezioni trascritte): togli ripetizioni,
  intercalari e divagazioni di aula, ma conserva ogni concetto, esempio e riferimento; il risultato può scendere a 0,7.
- Impaginazione: un titolo `### …` (riga a sé) per ogni tema; capoversi brevi (40–120 parole) separati da UNA riga
  vuota; elenchi con «• » (MAI «- »), una voce per riga; grassetto solo sui termini chiave; nessun link `[[…]]`. Se la
  pagina comincia a metà discorso, continua senza titolo nuovo. Pagina di copertina o di inizio di una nuova fonte:
  scrivi solo il titolo della parte (es. `## Parte seconda · Il ragionamento giuridico (F. Schauer)`).
- Citazioni letterali solo tra «…»; fuori dalle «» nessuna sequenza di 8 parole uguale alla fonte.
- Niente diario di lezione («il professore dice», «oggi vediamo», «a lezione»), niente nomi di chi ha scritto
  riassunti/dispense o di chi ha scaricato i file: testo da manuale. Il nome del docente del corso si può citare solo
  se serve («nel corso di Siniscalchi»), di norma no.
- Correggi gli errori evidenti già annotati nei `noteRedazione` delle unità (legature, nomi, date). Secoli con l'era.
- Dopo ogni 3–5 pagine lancia:
  `python3 piani/strumenti/controlla-iuris.py "<tuo file>" --fonte="<file fonte>" --extra="<file fonte>"`
  e correggi fino a 0 sequenze copiate e 0 riferimenti mancanti (salvo refusi della fonte, da spiegare nel resoconto).

**Resoconto** `piani/fase-filosofie/<gruppo>.md`: pagine, parole, esito del controllo, dubbi. Risposta finale ≤ 60 parole.
