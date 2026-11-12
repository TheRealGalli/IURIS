# Testo IURIS di Storia del diritto romano — istruzioni per i gruppi

Progetto IURIS (/Users/carlogalli/Desktop/IURIS). Scrivi in italiano. Leggi prima `piani/costituzionale-unica.md`
(stesso metodo, già usato per costituzionale) e AGENTS.md «Qualità dei contenuti». Lavoro di circa 45–75 minuti.
Altri 9 subagenti scrivono altre pagine in parallelo: tocca SOLO il tuo file. Non lanciare sync, build, check:build e
non modificare nulla in `05 - Contenuti/` (il Percorso di Romano è già ottimo e resta com'è).

**Obiettivo.** L'Originale di Romano oggi è il PDF degli appunti di una studentessa (lezioni della prof. Starace,
manuale di M. Bretone). Lo sostituiamo con un testo scritto da noi, **stessa numerazione di pagina** (così lezioni,
domande e sezioni restano valide), **stesso contenuto e stessa divisione**, parole nostre. Non è un riassunto e non va
«migliorato» cambiando i contenuti: è lo stesso lavoro, riscritto e impaginato bene.

**Fonte (solo lettura).** `Diritto Romano /00 - Appunti e fonti/testo/pennacchio.txt` (attenzione allo spazio nel nome
della cartella), righe `=== pagina N ===`: è il testo già revisionato degli Originali. Per capire a quale lezione
appartiene una pagina e quali correzioni sono state fatte: `studio/public/content/diritto-romano/corso.json` (lezioni
con `pagine`, sintesi; `noteRedazione` nelle unità `Diritto Romano /05 - Contenuti/uNN.json`).

**Prodotto.** `Diritto Romano /00 - Appunti e fonti/testo-iuris/<gruppo>.txt` con TUTTE le tue pagine, ciascuna
introdotta da `=== pagina N ===`. Ogni pagina riscrive con parole nostre la pagina N, senza perdere nulla: istituti,
distinzioni, giuristi, opere, leggi, date (a.C./d.C.), passi delle fonti, esempi. Regole:
- Lunghezza tipica 0,9–1,3 volte la pagina di partenza.
- Impaginazione per lo studio e per i segni: un titolo `### …` (riga a sé) per ogni tema; capoversi brevi (40–120
  parole) separati da UNA riga vuota; elenchi con righe che iniziano con «• » (MAI «- »), una voce per riga; grassetto
  solo sui termini chiave; nessun link `[[…]]` (i collegamenti al glossario li mette l'app). Se la pagina comincia a metà
  di un discorso, continua senza titolo nuovo.
- Citazioni letterali SOLO tra «…» (passi latini, frammenti di Gaio o del Digesto, testi di legge); fuori dalle «»
  nessuna sequenza di 8 parole uguale alla fonte.
- Niente diario di lezione o riferimenti alle persone («la prof dice», «a lezione», «oggi», «come abbiamo visto»,
  nomi di chi ha scritto gli appunti): testo da manuale. La pagina 1 (frontespizio) la scrive il coordinatore: saltala.
- Termini latini sempre in corsivo `*…*` la prima volta in una pagina, con la traduzione se la fonte la dà.
- Correggi solo gli errori evidenti già annotati nei `noteRedazione` (date, nomi): non introdurre fatti nuovi.
- Scrivi a gruppi di 3–5 pagine e dopo ogni gruppo lancia:
  `python3 piani/strumenti/controlla-iuris.py "<tuo file>" --fonte="Diritto Romano /00 - Appunti e fonti/testo/pennacchio.txt" --extra="Diritto Romano /00 - Appunti e fonti/testo/pennacchio.txt"`
  e correggi finché le tue pagine hanno 0 errori (sequenze copiate, riferimenti mancanti).

**Resoconto** `piani/fase-romano/<gruppo>.md` (pagine, parole, esito del controllo, dubbi). Risposta finale ≤ 80 parole.
