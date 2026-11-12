# Fase 2 — Filosofia del diritto SSG (resoconto)

Subagente «Filosofia del diritto SSG», 11–12 novembre 2026. Toccati solo `Filosofia del Diritto SSG/05 - Contenuti/`
(unità `u01`–`u20`, `glossario.json`, `oltre-11/40/41/42.json`), il testo degli appunti in
`00 - Appunti e fonti/testo/` (non in git) e questo file. Nessun commit, sync o build.

## Che cosa è stato fatto

1. **Voci del «passo 5»**. Le voci senza lezione o senza domande erano 145 (134 mai citate in una lezione, più 11 già
   in una lezione ma senza domande), non 87. Per ognuna: lezione scelta cercando la voce nel testo degli appunti,
   voce aggiunta ai `concetti` della lezione, collegamento `[[id|testo]]` alla prima occorrenza nella sintesi quando
   il termine vi compare (111 collegamenti nuovi), e **una domanda** con `lezione`, `pagine` e `concetti`
   (145 domande: 92 flashcard, 22 vero/falso, 21 multiple, 9 completa, 1 abbina), scritta sul passo degli appunti.
2. **Spostamento delle voci dai `nuovi` alle unità**. Le 134 voci stavano nei `nuovi` di `oltre-11/40/41/42`. Il
   validatore non accetta in un'unità un id definito solo lì (le unità sarebbero state saltate dal sync) e la scheda
   mostrava «voce aggiunta: negli appunti non c'è» per voci che negli appunti ci sono (Creonte, Weimar, Sherwin…).
   Ora sono nei `concetti` dell'unità in cui se ne parla, con le `pagine`. I quattro file `oltre` svuotati sono
   stati riusati per gli approfondimenti nuovi.
3. **Approfondimenti `oltre`**: 60 nuovi (12 adattati da Filosofia LMG dove l'id coincide, 48 scritti ex novo:
   27 persone, 18 teorie e concetti, 3 opere), tutti con `daSapere` e collegamenti. Solo fatti da manuale, senza `fonti`.
4. **Definizioni**: 191 ampliate con una o due frasi tratte dagli appunti (136 tra 45 e 59 parole, 55 sotto 40).
5. **Premesse**: aggiunte in `glossario.json` per le 33 persone che non l'avevano (ora 81 su 81).
6. **Unità 17** (lezione fuori programma): 23 domande in più, così ogni lezione raggiunge il minimo del validatore
   (4 flashcard, 2 multiple, 2 vero/falso, 1 completa, 1 aperta) e l'unità ha un `abbina`; 11 voci aggiunte ai
   `concetti` delle sue lezioni con 8 collegamenti nelle sintesi.

## Misure prima e dopo

Calcolate sui file sorgente con lo script del subagente. Per le definizioni sono riportati due conteggi: parole
separate da spazi e parole `\w+` (la metrica dello script del coordinatore, che conta anche gli id dei collegamenti).

| Misura | Prima | Dopo | Obiettivo |
|---|---|---|---|
| Voci | 379 | 379 | — |
| Voci citate in una lezione | 245 (65%) | 379 (100%) | ≥ 95% |
| Voci con almeno una domanda | 234 (62%) | 379 (100%) | ≥ 95% |
| Voci con approfondimento `oltre` | 150 (40%) | 210 (55%) | ≥ 50% |
| Definizione mediana, parole `\w+` | 50 | 63 | ≥ 60 |
| Definizione mediana, parole separate da spazi | 45 | 57 | — |
| Definizioni sotto 40 parole (`\w+`) | 101 (27%) | 48 (13%) | — |
| Collegamenti tra voci (coppie) per voce | 1,92 | 2,03 | ≥ 2,0 |
| Collegamenti ogni 100 parole di sintesi | 2,19 | 2,46 | ≥ 2 |
| Domande | 1.036 | 1.204 | — |
| Domande per lezione d'esame (minimo) | 14 | 14 | ≥ 14 |
| Domande per lezione di u17 (fuori esame) | 3–4 | 10–11 | — |
| Schede inverse | 168 (44%) | 168 (44%) | ≈ 35% |
| Persone con `premessa` | 48 su 81 | 81 su 81 | tutte |

Validazione: `validate-content.mjs` su tutte le unità e su tutti gli `oltre`: 0 errori. Restano avvisi già presenti
(sintesi corte, pagine di alcune voci fuori dall'unità) e uno nuovo dello stesso tipo non bloccante.

## Dubbi e punti da controllare

- **Mediana delle definizioni**: l'obiettivo è raggiunto con la metrica `\w+` (63); contando le parole separate da
  spazi la mediana è 57. Restano 48 definizioni sotto le 40 parole, quasi tutte voci di unità molto brevi.
- **Definizioni delle voci spostate**: erano state scritte come voci «oltre gli appunti» e alcune contengono notizie
  di contesto che negli appunti non ci sono (per esempio *Orizzonti di gloria* per Kubrick, *Film Art* per Bordwell,
  le date della legge Reale e del decreto Cossiga). Ora compaiono come definizioni normali: da rileggere in Fase 5.
- **Voci non nominate alla lettera negli appunti**: `parrhesia` (gli appunti dicono «il discorso di dire la verità
  sul potere», p. 111), `effetto-csi` (descritto alle pp. 132 e 190 senza il nome), `convenzionalismo-giuridico`
  (metro campione, pp. 120–121), `pastorato` (immagine del pastore, p. 152). Le domande usano il passo degli appunti.
- **Trascrizioni errate degli appunti** corrette nelle domande: «Richard Shelby» = Richard Sherwin (p. 132),
  «James Boyd Weifel» = James Boyd White (p. 162), «L'Etna sugli spettacoli» = *Lettera sugli spettacoli* (p. 160),
  «Jean Rancière» = Jacques Rancière (p. 162), «Kaufman» = Felix Kaufmann (Incampo p. 23). Non le ho riportate nei
  `noteRedazione` delle unità.
- **Affermazioni degli appunti non riprese**: Honneth «allievo di Foucault» (p. 145: è allievo di Habermas), Lenoble
  «francese» (nella premessa: «di lingua francese»), il metro campione «al Louvre» (p. 120), Debord «di ascendenze
  naziste» (p. 164, quasi certamente un errore di trascrizione).
- **Spettacolare concentrato e diffuso**: a p. 161 la sbobinatura attribuisce al «diffuso» l'immedesimazione nel
  leader; ho lasciato la definizione esistente (concentrato = leader, diffuso = merci), che è quella di Debord.
- **Approfondimenti nuovi**: scritti a memoria da conoscenze di manuale, senza fonti consultate in rete. Date e
  titoli andrebbero verificati a campione in Fase 5, in particolare per Friedman, Carnelutti, Ascarelli e Radbruch.
- **Unità 17**: il docente la dichiara fuori programma; ho portato le domande al minimo del validatore, non a 14.
- `schede-inverse.json`, `quadro.json`, eventi e mappe non sono stati toccati. Non esiste `esame.json` (nessuna
  traccia per Siniscalchi).
- `check-domande` non è stato eseguito (lavora sul contenuto sincronizzato): va lanciato dal coordinatore dopo il sync.
