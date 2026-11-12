# Testo IURIS di Diritto privato — istruzioni per i gruppi

Progetto IURIS (/Users/carlogalli/Desktop/IURIS). Scrivi in italiano. Leggi prima `piani/costituzionale-unica.md`
(metodo) e AGENTS.md «Qualità dei contenuti». Lavoro di circa 60–80 minuti. Altri 10 subagenti scrivono altre pagine:
tocca SOLO il tuo file e il tuo resoconto. Non lanciare sync, build, check:build; non modificare `05 - Contenuti/`.

**Obiettivo.** L'Originale di privato oggi è una dispensa del 2012 sul manuale Torrente–Schlesinger. Lo sostituiamo con
un testo scritto da noi, **stessa numerazione di pagina** (lezioni, domande e sezioni restano valide), **stesso
contenuto e stessa struttura**, parole nostre e **diritto vigente oggi (novembre 2026)**. Il testo nuovo deve rendere
inutili gli avvisi «Aggiornato: …» del Percorso: ciò che è cambiato si scrive com'è oggi, nel punto giusto.

**Fonti (solo lettura).**
- Dispensa revisionata, per pagina: `Diritto Privato/00 - Appunti e fonti/testo/dispensa.txt` (`=== pagina N ===`).
  Comprende i riquadri «Approfondimento/Esempio» già decifrati.
- Aggiornamenti già fatti nel Percorso: `Diritto Privato/05 - Contenuti/uNN.json` (campi `note`, `noteRedazione`,
  sintesi delle lezioni con le loro `pagine`), `norme-aggiornamenti.json`; il Codice civile vigente (allineato a
  Normattiva) in `Diritto Privato/05 - Contenuti/norme/` e `norme.json`. Le pagine 86–95 della dispensa sono schemi in
  immagine senza testo: per quelle scrivi il contenuto dalle sintesi del Percorso della lezione che le copre.

**Prodotto.** `Diritto Privato/00 - Appunti e fonti/testo-iuris/<gruppo>.txt` con TUTTE le tue pagine, ciascuna
introdotta da `=== pagina N ===`. Regole:
- Ogni pagina riscrive con parole nostre la pagina N senza perdere nulla (istituti, distinzioni, eccezioni, articoli,
  esempi, contenuto dei riquadri). Lunghezza tipica 0,9–1,3 volte la pagina di partenza.
- **Aggiornamento**: dove la disciplina è cambiata (filiazione e responsabilità genitoriale 2012–2013, unioni civili e
  convivenze 2016, divorzio breve 2015, Codice del consumo, Terzo settore 2017, liquidazione giudiziale e Codice della
  crisi, condominio 2012, Cartabia 2022, cognome dei figli, prescrizioni assicurative, transazioni commerciali, usura,
  pegno non possessorio, ecc.), scrivi la regola **vigente** con i suoi riferimenti; la vecchia regola solo se serve a
  capire, in una frase («Fino al 2013…»). Verifica gli articoli sul Codice civile in `norme/`. Mai inventare: se non sei
  certo di un dato aggiornato, scrivi il principio senza cifre e segnalalo nel resoconto.
- Impaginazione: un titolo `### …` (riga a sé) per ogni paragrafo/tema (i titoli di capitolo `### Capitolo N · Titolo`);
  capoversi brevi (40–120 parole) separati da UNA riga vuota; elenchi con «• » (MAI «- »), una voce per riga; esempi e
  approfondimenti come capoversi che iniziano con «**Esempio.**» / «**Approfondimento.**»; grassetto solo sui termini
  chiave; nessun link `[[…]]`. Se la pagina comincia a metà discorso, continua senza titolo nuovo.
- Citazioni letterali solo tra «…» (testo di articoli); fuori dalle «» nessuna sequenza di 8 parole uguale alla fonte.
- Niente riferimenti alla dispensa, ai suoi autori, al «manuale» o a chi studia: testo da manuale.
- Dopo ogni 3–5 pagine lancia:
  `python3 piani/strumenti/controlla-iuris.py "<tuo file>" --fonte="Diritto Privato/00 - Appunti e fonti/testo/dispensa.txt" --extra="Diritto Privato/00 - Appunti e fonti/testo/dispensa.txt"`
  Correggi fino a 0 sequenze copiate. «Riferimenti assenti» è ammesso SOLO quando il riferimento della dispensa è
  superato (articolo abrogato o numerato diversamente, cifra cambiata): elencali nel resoconto con il motivo.

**Resoconto** `piani/fase-privato/<gruppo>.md`: pagine, parole, esito del controllo, aggiornamenti fatti (con la fonte
normativa), riferimenti superati, dubbi. Risposta finale ≤ 80 parole.
