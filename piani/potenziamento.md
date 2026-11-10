# Piano di potenziamento di IURIS

Scritto il 9 novembre 2026 dopo l'analisi del progetto. Le regole generali restano in [`../AGENTS.md`](../AGENTS.md).
Ogni fase si chiude con `npm run build && npm run check:build`; le prove si fanno sulla porta 7101.

## Punto di partenza (misurato sui file `05 - Contenuti`)

| Materia | Unità / lezioni | Domande (per lezione) | Voci | Collegamenti | Eventi | Extra |
|---|---|---|---|---|---|---|
| Diritto romano (LMG A-L + SSG) | 15 / 98 | 1478 (15) | 769 | 893 | 202 | glossario, schede inverse, «oltre», Originali |
| Filosofia A-L | 14 / 63 | 974 (15) | 535 | 578 | 45 | glossario, schede inverse, «oltre», Originali |
| Filosofia SSG | 20 / 77 | 681 (9) | 251 | 316 | 47 | solo glossario |
| Costituzionale A-L | 18 / 50 | 536 (11) | 293 | 163 | 15 | nessuno |

Costituzionale è scritto alle soglie minime del validatore: definizioni di 31 parole in media (50 in Romano),
112 collegamenti su 163 di tipo generico «collegato», 9% di domande avanzate (15–17% altrove), nessun
`glossario.json`, `schede-inverse.json` o `oltre-NN.json`.

## Fatto il 9–10 novembre 2026

1. **Costituzionale arricchito**: da 536 a 760 domande (casi pratici, «trova l'errore», confronti, 28 domande d'esame
   in più), 82 schede inverse, 16 approfondimenti «oltre gli appunti» con circa 90 collegamenti riscritti con un verbo
   vero, 34 date in più in cronologia.
2. **Sezione Costituzione** (`norme.json`): testo vigente, 139 articoli e XVIII disposizioni, collegati a lezioni e
   domande. Testo da Wikisource, controllato sugli articoli modificati (9, 27, 33, 41, 56–59, 81, 119).
3. **Mappa → Quadro**: Programma automatico per tutte le materie; organi costituzionali e piramide delle fonti per
   Costituzionale; linea del tempo a corsie per Romano.
4. **Esercizi dedicati in Allenamento** al posto della sezione Procedimenti (tolta su indicazione di Carlo: come
   pagina a sé era poco utile): 10 procedimenti e 8 confronti sono diventati 47 esercizi della serie `procedimenti`;
   10 commenti ai Principi fondamentali (artt. 1–11) formano la serie `principi` e la prova «Tre quesiti».
5. **Corsi**: docenti e materie del primo anno 2026/27 per le tre classi in `studio/src/data/corsi.ts`.

## Che cosa sappiamo dell'esame di costituzionale (da verificare ogni anno)

- La scheda 2020/21 del corso di Torre (A-L) dice che l'esame parte da **tre quesiti**, di cui almeno uno è il
  **commento personale a un principio costituzionale fondamentale**, e raccomanda la lettura diretta della
  Costituzione e della giurisprudenza costituzionale. Da qui le modalità «Commento ai principi» e «Tre quesiti».
  Va controllato sulla scheda 2026/27.
- La scheda 2021/22 indicava un manuale a scelta, tra cui Caretti–De Siervo: i contenuti attuali seguono invece un
  riassunto del Bin–Pitruzzella. Serve l'elenco dei tre manuali di quest'anno.
- A SSG il docente (Bonomi, manuale Martines) insegna anche Diritto regionale: è plausibile che insista su Regioni
  ed enti locali. Oggi in A-L le Regioni occupano le unità 10 e 15 (5 lezioni su 50): per SSG andranno ampliate.

## Da fare

- **Diritto privato** (completato il 10 novembre 2026): 27 unità, 98 lezioni, 503 voci e 1.034 domande sulle pp. 1–238,
  con Codice civile consultabile e Originali completi. Restano facoltativi schede inverse, Quadro ed esercizi dedicati, e la verifica
  puntuale degli articoli del Codice modificati dopo luglio 2022.
- **Costituzionale**: definizioni brevi del glossario ancora da ampliare (media 31 parole); sentenze storiche della
  Corte come voci di glossario; domande reali degli appelli, se la classe le raccoglie.
- **Filosofia SSG** (controllo e completamento del 10 novembre 2026): nessun errore di formato. Aggiunte le 31
  domande d'esame (`aperta`) che mancavano e le 81 domande che portano ogni lezione in programma alle soglie minime
  (flashcard, risposta multipla, vero/falso, completa, un `ordina` per unità): 793 domande in tutto. La u17 è fuori
  programma e resta com'è. Le domande nuove seguono le sintesi delle lezioni, non le sbobinature. Aggiunte anche 168 schede inverse
  (dalla definizione breve delle voci, riscritta dove non bastava a riconoscerle). Restano: gli approfondimenti
  «oltre gli appunti», che mancano; sintesi di circa 540 parole per lezione contro le 940 di Filosofia A-L
  (il validatore ne segnala 16 come corte); un `abbina` per la u16.
- **Procedimenti di Romano** (i tre processi) come esercizi della serie `procedimenti`.

## Dopo, quando arrivano le fonti

- **LMG M-Z**: Filosofia (Mangini), Romano (Starace), Costituzionale (Rodio, Martines ed. 2025).
- **Costituzionale SSG** (Bonomi, Martines): stesso manuale di M-Z, da controllare l'edizione.
- **Secondo semestre**: Istituzioni di diritto romano (solo LMG), Storia del diritto italiano (Mastroberti, canale
  unico; SSG ha un programma ridotto), Lingua inglese e Abilità informatiche (solo SSG).
- **Domande del docente**: quelle chieste agli appelli, raccolte dalla classe per professore.

## Nucleo comune tra classi (da progettare prima del secondo percorso di una disciplina)

Oggi ogni materia è un blocco a sé e Filosofia SSG ridefinisce voci che Filosofia A-L ha già. Con M-Z e
Costituzionale SSG si raddoppierebbero glossario, norme e cronologia. Proposta: separare un nucleo per disciplina
(voci, articoli, date) dal percorso del docente (unità, lezioni, domande sul suo manuale).

## Punti da verificare con Carlo

- **Costituzionale A-L**: il dossier dice che con Torre si sceglie tra tre manuali; i contenuti attuali vengono da
  un riassunto del Bin–Pitruzzella. Serve sapere quali sono i tre.
- **Romano SSG**: Starace usa Bretone ed. 2024 senza i capp. I e XII, A-L (Alessandrì) l'ed. 2016 intera. Oggi SSG
  condivide la materia di A-L: va segnalato agli studenti SSG che cosa è fuori programma.
- **Filosofia A-L**: il catalogo non indica i testi; i contenuti seguono Incampo, Moro e Cotta.
- **Discordanze del catalogo**: Istituzioni di diritto romano M-Z (Piacente nel catalogo, Gonzalez Roldan
  nell'elenco docenti); Abilità informatiche SSG (Lopez nel catalogo, Buonamassa nell'elenco docenti).
