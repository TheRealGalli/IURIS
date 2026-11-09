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

## Fasi

1. **Costituzionale al livello di Romano**
   - definizioni ampliate, `glossario.json` (premesse), `schede-inverse.json`, `oltre-NN.json`;
   - collegamenti con un verbo vero al posto di «collegato» (nomina, controlla, scioglie, converte…);
   - eventi con date certe: Statuto albertino, 1946–48, leggi di revisione, sentenze storiche della Corte;
   - domande da circa 11 a circa 15 per lezione; le nuove sono casi pratici, confronti, «trova l'errore» e
     domande trasversali, scritte con i tipi già esistenti (`multipla`, `verofalso`, `aperta`).
2. **Sezione Norme**: la Costituzione articolo per articolo nel testo vigente (comprese le leggi costituzionali
   1/2020, 1/2021, 1/2022, 2/2022, 1/2023), collegata a lezioni, voci e domande; ricerca per numero di articolo.
   Per Privato, quando ci sarà: gli articoli chiave del Codice civile.
3. **Vista Quadro dentro Mappa**: il programma a colpo d'occhio. Costituzionale: organi e loro rapporti, piramide
   delle fonti. Romano: fasce temporali con periodi, fonti, magistrature e giuristi. Privato: albero degli istituti
   sui libri del Codice.
4. **Sezione Procedimenti**: schemi a passi (iter legislativo, formazione del Governo, revisione costituzionale,
   giudizi davanti alla Corte; per Romano i processi). Le tabelle di confronto stanno nelle lezioni e qui.
5. **Corsi**: docenti e materie del primo anno 2026/27 per le tre classi (fatto il 9 novembre 2026 in
   `studio/src/data/corsi.ts`, dal dossier di Carlo sul catalogo UniBa consultato l'8 novembre 2026).

## Dopo, quando arrivano le fonti

- **Diritto privato** (A-L e SSG, Lobuono: Gabrielli + codice; M-Z, Pennasilico: Perlingieri oppure Gabrielli).
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
