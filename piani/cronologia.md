# Cronologia: raggruppamento nella striscia e doppioni di eventi (12 novembre 2026)

## 1. Raggruppamento nella linea del tempo

Prima: tutti gli eventi dello stesso anno condividevano un pallino e un'etichetta («2007 · 8 eventi»).
Ora si uniscono solo gli eventi **correlati**; quelli indipendenti hanno ciascuno pallino ed etichetta.

- Logica in `studio/src/lib/cronologia-striscia.mjs` (modulo puro con `.d.mts`, usato da `Cronologia.tsx` e dal controllo).
- Due eventi dello stesso anno sono correlati se:
  - hanno **una voce specifica in comune** (che compare in al massimo 4 eventi della materia; «Unione europea»,
    «Corte costituzionale», «statuto speciale» sono troppo generiche e non bastano) **oppure due voci in comune**;
  - citano **lo stesso atto** «n/anno» nel titolo o nella descrizione (es. 348/2007, «legge 85/2006»);
  - uno **richiama il titolo dell'altro**: almeno il 75% delle parole significative del titolo (minimo tre) ricorre nel
    testo dell'altro (es. «Primo voto delle donne» cita il referendum istituzionale e l'elezione della Costituente).
  - Gruppi = componenti connesse (se A~B e B~C stanno insieme). Lo stesso giorno da solo **non** basta:
    il 23 luglio 2002 la fine della CECA e il messaggio di Ciampi sul pluralismo sono fatti diversi.
- Disposizione: il primo gruppo di un anno sta sull'anno; gli altri gruppi dello stesso anno si mettono a destra, a
  14 px l'uno dall'altro (nessun pallino sopra un altro, anche fra anni attaccati). Le etichette restano su al massimo
  6 righe (3 su touch): quando mancano righe, la striscia si allarga da quel punto (come prima). La larghezza della tela
  tiene conto dell'ultimo gruppo spostato. Tempo: circa 7 ms per costituzionale (245 eventi).
- Risultato: costituzionale 2007 ha 7 etichette separate; 109 anni (tutte le materie) hanno ora fatti separati.
  Uniti, per esempio: 1946 referendum istituzionale + prima riunione della Costituente + primo voto delle donne;
  2001 legge cost. 3/2001 + referendum costituzionale; 2003 legge 131 + sentenza 274; 2006 legge 85 + abrogazione
  dell'art. 279 c.p.; Romano −44 le tre opere di Cicerone, −27 Principato/ius respondendi, 528 Haec quae necessario +
  compilazione giustinianea.
- Controllo nuovo `studio/scripts/check-cronologia.mjs` (aggiunto a `check:build` dopo `check-graph-layout`): caso
  costruito «stesso anno, eventi indipendenti → etichette separate; correlati (stesso atto, voce specifica) → uniti»,
  stesso giorno ma fatti diversi → separati, anno affollato con 15 fatti su 3 righe, e tutte le materie generate su PC e
  touch (nessuna etichetta sovrapposta nella stessa riga, pallini distanti almeno 14 px, ogni evento una sola volta, gruppi
  coerenti con `correlati`, nessun titolo doppio nello stesso anno). Prova nel browser (7101): costituzionale, 240
  etichette, nessuna sovrapposizione.

## 2. Doppioni di eventi uniti

Trovati con uno script (stesso anno o ±1, titoli simili, stesso atto «n/anno» nel titolo, voci in comune) e
controllati a mano. Per ciascuno: un solo id, descrizione più completa (fusa), voci unite; le `pagine` restano quelle di
ogni unità. Nessun altro file citava gli id tolti.

| Materia | Id tenuto | Id tolto | Unità |
|---|---|---|---|
| Costituzionale | `ev-granital` (Sentenza n. 170/1984) | `ev-sentenza-granital` | u03, u18 |
| Costituzionale | `ev-sentenze-gemelle-2007` (Sentenze n. 348 e 349/2007 sulla CEDU) | `ev-sentenze-n-348-e-349-2007` | u19, u24 |
| Costituzionale | `ev-rinvio-legge-gasparri` | `ev-rinvio-della-legge-gasparri` | u11, u23 |
| Costituzionale | `ev-sentenza-183-1973` | `ev-sentenza-n-183-1973` | u18, u24 |
| Costituzionale | `ev-referendum-giustizia-2026` (22–23 marzo 2026) | `ev-referendum-costituzionale-2026` | u11, u16 |
| Costituzionale | `ev-legge-costituzionale-n-2-1963` (durata delle Camere) | `ev-legge-costituzionale-2-1963` | u08, u17 |
| Romano | `ev-codici-gregoriano-ermogeniano` (291; 293–294 d.C.) | `ev-codex-gregorianus` | u01, u11, u13 |
| Romano | `ev-topica` (44 a.C., con il primo catalogo normativo) | `ev-catalogo-di-cicerone` | u07, u14 |

Le unità sono state riscritte con il loro rientro originale (1 o 2 spazi), cambiano solo gli eventi; validazione senza
errori né avvisi. Costituzionale passa da 251 a 245 eventi, Romano da 158 a 156 (in striscia).

Simili ma **non** doppioni (lasciati): legge cost. 1/1971 e testo unico 1972 dello statuto del Trentino-Alto Adige;
leggi cost. 1/2000 e 1/2001 sulla circoscrizione Estero; statuti del Friuli-Venezia Giulia e del Trentino del 2026;
firma (2007) ed entrata in vigore (2009) del Trattato di Lisbona; istituzione (1971) e avvio (1974) dei TAR;
`ev-principato-augusteo` (27 a.C.) e `ev-eta-augustea` (27 a.C.–14 d.C.); Polibio e la seconda guerra punica.

Da notare (non toccato): in Romano `ev-principato-augusteo` in u05 ha un titolo diverso («Augusto si appropria dello
ius edicendi») dalle altre unità; il sync mostra quello di u01. Costituzionale ha due voci quasi uguali,
`norma-interposta` e `parametro-interposto`, entrambe nell'evento delle sentenze del 2007.

## 3. Filosofia SSG: eventi e testo IURIS

47 eventi. L'anno compare nelle sintesi del Percorso solo per 7, ma nel testo IURIS
(`studio/letture-src/testi/filosofia-ssg-iuris.txt`) per 38; i 9 restanti (Guerra dei Trent'anni, Rivoluzione
francese, Panopticon, Codice di Napoleone, carcere moderno, Weimar, Io sono un evaso, Norimberga, «È vietato vietare»)
ci sono come fatti, senza l'anno. Tutti e 47 hanno riscontro negli appunti di Siniscalchi/Incampo e sono pertinenti
(esempi del corso, anche quelli di law and film). Il problema è delle sintesi, che citano poco gli anni, non degli
eventi.

Da rivedere (non tolto): `ev-crisi-stato-nazione`, con anno 1975 «anni Settanta–Ottanta» approssimato. È una tendenza
e non un fatto datato, quindi va contro la regola «eventi solo con date certe». Si può togliere o legare a un fatto
preciso (es. Thatcher-Reagan 1979, che c'è già).
