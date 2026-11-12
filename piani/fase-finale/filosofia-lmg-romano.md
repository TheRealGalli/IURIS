# Fase 2 — Filosofia del diritto LMG e Storia del diritto romano

Resoconto del subagente (11–12 novembre 2026). Cartelle toccate: `Filosofia del Diritto/05 - Contenuti/`,
`Diritto Romano /05 - Contenuti/` e questo file. Nessun commit, sync, build o server.
**Stato: completato.** Tutte le unità, gli `oltre` e i due `esame.json` passano `validate-content.mjs` con 0 errori.

## Numeri prima e dopo

Calcolati sui file sorgente con lo script delle misure del coordinatore (definizione = la più lunga tra le unità,
parole contate con `\w+`; collegamenti = coppie orientate di unità e `oltre`).

| Misura | Filosofia LMG prima | dopo | Romano prima | dopo | Obiettivo |
|---|---|---|---|---|---|
| Domande | 974 | 1.030 | 1.478 | 1.560 | — |
| Domande minime per lezione | 12 | 14 | 10 | 14 | ≥ 14 |
| Lezioni sotto 14 domande | 7 | 0 | 21 | 0 | 0 |
| Voci con almeno una domanda | 90% | 99% | 94% | 99% | ≥ 95% |
| Voci citate in una lezione | 98% | 99% | 100% | 100% | ≥ 95% |
| Definizione mediana (parole) | 55 | 60 | 56 | 60 | ≥ 60 |
| Collegamenti per voce | 1,88 | 2,06 | 2,57 | 2,57 | ≥ 2,0 |
| Collegamenti ogni 100 parole di sintesi | 1,94 | 2,01 | 2,4 | 2,4 | ≥ 2 |
| Voci con approfondimento | 49% | 50% (243 su 486) | 57% | 57% | ≥ 50% |
| Eventi | 45 | 47 | 202 | 202 | anni 1964 e 2006 |
| Domande senza `pagine` | 0 | 0 | 126 | 84 (tutte in u15, con `manuale`) | vedi sotto |
| Tracce d'esame collegate | — | 21 su 21 | — | 39 su 39 | tutte |

Con la misura di `stato-qualita.md` (definizione + `breve`) le mediane erano già 68 e 65.

## Filosofia del diritto LMG

- **`esame.json`**: fonti `incampo` (19 tracce) e `cotta` (2), docente «Antonio Incampo», corso `uniba-lmg-1-al`.
  Tredici aperte esistenti segnate con `esame`; otto aperte nuove:
  doveri sintattici e pragmatici (u06-q094), validità sintattica (u06-q095), validità secondo Kelsen (u06-q096),
  norme di revisione (u06-q097), norma giuridica per Kelsen (u03-q077), Grundwert e Grundnorm (u07-q089),
  condizioni di struttura e di funzione (u05-q088), obbligatorietà della regola in Cotta (u14-q087).
- **56 domande nuove**: 43 per le voci senza domande, 5 per portare a 14 le lezioni che ne avevano 12–13, 8 aperte.
- **Voci**: `tractatus-logico-philosophicus`, `summa-theologiae`, `zoon-politikon` erano voci «nuove» degli `oltre`,
  ma gli appunti le citano (Incampo pp. 4, 9, 55; Cotta p. 11). Ora sono definite in u01 e u13 con le pagine, e il
  vecchio testo generale è diventato il loro approfondimento in `oltre-00.json` e `oltre-01.json`.
- **Eventi**: 1964 (Fuller, *The Morality of Law*, p. 13) e 2006 (Corte internazionale di giustizia, divieto di
  genocidio come diritto cogente, p. 6). Il «1964» di p. 93 per la seconda edizione della *Reine Rechtslehre* è un
  errore degli appunti per 1960 (evento già presente): annotato in `noteRedazione` di u08.
- **Definizioni**: 54 definizioni tra 51 e 59 parole completate con una frase ricavata dalla stessa lezione.
- **Collegamenti tra voci**: 91 archi nuovi nelle unità, scelti tra le coppie che una definizione già collegava nel
  testo, ciascuno con tipo ed etichetta.
- **Collegamenti nelle sintesi**: 47, da una lista controllata di termini. Le voci con un senso proprio di un autore
  sono collegate solo nel suo testo (`comando`, `simpatia`, `alterita` in Cotta; `eticita`, `sovranita`,
  `solidarieta-sociale` in Moro).

## Diritto romano

- **`esame.json`**: fonte `starace`, docente «Pia Starace», corsi `uniba-lmg-1-mz` e `uniba-ssg-1`, 39 tracce.
  38 aperte esistenti segnate; quattro aperte nuove: assemblee (u02-q119), formalismo nelle tre forme (u03-q162),
  pretore peregrino (u05-q188), tappe della compilazione (u12-q087).
- **Elenco A ed elenco B**: A ha 39 voci, B 34. B non ha «Polibio e la costituzione mista», «Assemblee (comizi)»,
  «Pretore peregrino», «Actio in facto», e unisce «Giureconsulto laico» e «Professione aristocratica» in una voce
  sola; in B mancano le precisazioni «(e ius civile)», «(Schulz, Weber, Machiavelli)», «(Ulpiano)» e «(constitutio Deo
  auctore)». Ho tenuto l'elenco A, che contiene tutto B.
- **82 domande nuove**: 27 per le voci senza domande, 9 per le lezioni sotto soglia delle unità normali, 42 per le
  dodici lezioni di u14 e u15, 4 aperte.
- **Domande senza `pagine`**: erano 126, tutte in u14 e u15 (unità ricostruite dal manuale). In u14 hanno ora
  `pagine` (la pagina degli appunti con il solo titolo del paragrafo, come la lezione) e `manuale`. In u15 hanno solo
  `manuale` (Bretone, ed. 1992), perché gli appunti non hanno pagine per il capitolo dodicesimo: mettere una pagina
  sarebbe stato inventarla. Restano quindi 84 domande senza `pagine` (63 vecchie e 21 nuove di u15).
- **Definizioni**: 25 definizioni tra 56 e 59 parole completate con una frase dagli appunti.

## Dubbi e punti da decidere

1. **«Verità ontica e verità sintattica»** (Incampo, traccia 15): negli appunti la coppia è verità *semantica* e
   verità ontica (pp. 36–38); «verità sintattica» non compare. Ho lasciato il testo del PDF e collegato la traccia a
   u04-l2 e all'aperta sulle due verità. Se si preferisce correggere il testo in «semantica», è una riga di `esame.json`.
2. **Testi delle tracce**: i PDF sono in maiuscolo, li ho riportati in minuscolo. Refusi corretti: «preserittive» →
   prescrittive, «e?ettività» e «Di?erenza» (legature perse), «LEGISACTIONES», «RES MANCIPIS» → res mancipi,
   «ACTIO IN FACTO» → actio in factum, «NOV A NEGOTIA». **«emptio credito» → «emptio venditio»**: è più di un refuso,
   ma «emptio credito» non esiste e l'elenco è quello dei quattro contratti consensuali.
3. **Tracce che condividono un'aperta** (Starace): 2 e 3 erano entrambe su u02-q048, ora la 3 ha la sua; restano
   24 e 25 (tradizione civilistica e Quinto Mucio, u06-q101) e 34 e 36 (movimento codificatorio e i tre codici,
   u11-q111). Le domande coprono davvero entrambi i temi; un'aperta dedicata per ciascuna sarebbe un miglioramento.
4. **«Giuristi severiani»** (traccia 33): gli appunti non hanno un paragrafo con questo titolo; il tema è nella
   lezione sulla giurisprudenza tardo-classica (u10-l3), a cui ho legato la traccia. Nessuna traccia è rimasta
   senza appunti.
5. **Aperte con `esame` non agganciate a una traccia**: u03-q072 (Filosofia) e u02-q094, u03-q078, u05-q103,
   u11-q125, u12-q032 (Romano). Rispondono alla traccia, ma il validatore aggancia a ogni traccia solo la domanda
   più vicina nella stessa lezione. Si possono lasciare (compaiono tra le domande d'esame) o togliere il campo.
6. **Collegamenti per voce in Filosofia**: 2,06 contando le coppie orientate come lo script; dopo il sync, che unisce
   gli archi tra le stesse due voci, il valore potrebbe scendere poco sotto 2,0. Da ricontrollare su `corso.json`.
7. **Approfondimenti di Filosofia**: 243 su 486, cioè il 50% esatto, senza margine.
8. **Voci senza domande rimaste**: in Filosofia `heidegger`, `imperativo-ipotetico`, `logica-deontica`,
   `regola-di-riconoscimento`, `semantica`; in Romano `epistulae-dei-giuristi`, `giovanni-ex-questore`. Esistono solo
   negli `oltre` e gli appunti non le trattano: una domanda non avrebbe pagine a cui legarsi.
9. **A SSG Starace non chiede i capp. I e XII**: nessuna traccia cade su u01 o u15, quindi `esame.json` non cambia;
   l'eventuale esclusione di quelle unità dal percorso SSG è una scelta dell'app.
10. **Non provato**: non ho lanciato sync, build, `check-domande` né `check-corsi` (regola della fase). Le domande
    nuove di u14 e u15 vengono dalle sintesi ricostruite, non dagli appunti, come il resto di quelle unità.

## Definizioni (Diritto romano, ripresa del 12 novembre 2026)

**Stato: completato.** Misura sul corso generato e ricalcolata sui file con la stessa regola del sync (vale la
definizione della prima unità in ordine di file; poi `rettifica` degli `oltre`, che qui non tocca nessuna voce
corta; poi `premessa` del glossario anteposta; parole contate con `\w+` di JavaScript, quindi le lettere accentate
spezzano la parola come nello script del coordinatore).

| Misura | prima | dopo | obiettivo |
|---|---|---|---|
| Voci | 553 | 553 | — |
| Definizione mediana (parole) | 53–54 | 63 | ≥ 60 |
| Definizioni sotto 40 parole | 124 (22,4%) | 13 (2,4%) | < 15% |

- **112 definizioni riscritte** (tutte quelle sotto 40 parole di u01–u07 e u12–u13, quasi tutte di u10–u11 e
  due di u14), rileggendo gli appunti di Pennacchio (pp. 2–223, testo estratto con pypdf): istituti, magistrature,
  assemblee, leggi, fonti, generi letterari, giuristi e imperatori. Sono state allungate le definizioni della
  prima unità che definisce la voce (quella che il sync tiene); le altre restano approfondimenti. Nessun testo
  degli «oltre» copiato. Ogni nuovo `[[collegamento]]` punta a una voce esistente.
- **Persone**: la definizione dice chi era e perché conta negli appunti (Quinto Mucio e la diairesis, Servio e il
  responso argomentato, Sesto Elio e i Tripertita, Sabino e Cassio e la scuola, gli allievi di Servio, Valentiniano
  III e la Legge delle citazioni, Caracalla e Papiniano, Accursio e la Magna Glossa, Bluhme e le masse…). Per le
  voci con `premessa` nel glossario la frase iniziale non è stata ripetuta.
- **Restano sotto 40 (13)**: voci già precise e di contorno (`subscriptiones`, `adnotatio`, `sirmondiana`,
  `subtilitas`, `pragmatici-greci`, `legibus-solutus`, `trattato-civilistico`, `ius-singulare`, `usufructus`,
  `diritto-soggettivo`) e tre voci di u15, unità ricostruita dal manuale senza pagine di appunti
  (`florentino`, `iuris-praecepta`, `arricchimento-senza-causa`): allungarle avrebbe voluto dire aggiungere
  notizie che gli appunti non danno.
- **Validazione**: u01–u15 con 0 errori (u09, non toccata, ha 1 avviso preesistente). Sync e build non lanciati.
- **Dubbi**: (1) la Lex Hortensia è datata 286 a p. 15 e 287 a p. 138: nelle definizioni ho scritto 287 a.C.
  (data corrente); (2) la Lex Valeria de provocatione è datata 509 a.C. a p. 48 e «320 a.C.» a p. 58 (refuso);
  nelle definizioni resta 509 a.C., come nelle voci esistenti; (3) la voce `lex-de-imperio` è usata sia per l'investitura repubblicana nei comizi curiati (u02) sia per la Lex
  de imperio Vespasiani (u08): la definizione che prevale (u02) ora dice entrambe le cose, e `lex-curiata-de-imperio`
  rimanda a essa per il principato.
