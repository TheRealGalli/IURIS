# Martines · blocco C (pp. 145–190) — resoconto finale

## Fatto

| File | Contenuto | Stato |
|---|---|---|
| `u16.json` (pp. 145–158) | Potere giudiziario: giurisdizioni, CSM, processo e pena | 0 errori, 0 avvisi |
| `u17.json` (pp. 158–167) | Presidente della Repubblica | 0 errori, 0 avvisi |
| `u18.json` (pp. 168–174) | Corte costituzionale: composizione, vizi, atti sindacabili | 0 errori, 0 avvisi |
| `u19.json` (pp. 174–184) | Giudizi di legittimità e sentenze | 0 errori, 0 avvisi |
| `u20.json` (pp. 184–190) | Conflitti, giudizio d'accusa, ruolo della Corte, Alta Corte siciliana | 0 errori, 0 avvisi |
| `oltre-30.json`, `oltre-31.json` | 81 approfondimenti (31 + 50) | 0 errori (oltre-30: 5 avvisi «collegamento non riguarda questa voce», innocui) |
| `quadro.json` | 4 schemi per **tutta** la materia: organi costituzionali (rete), sistema delle fonti (piramide), giurisdizioni (rete), Corte costituzionale: competenze e vie d'accesso (rete) | JSON valido (il validatore delle unità non si applica al quadro) |
| `piani/fase-finale/martines-c-glossario.json` | 6 voci con `premessa` e `domanda`: Segni, Mortati, Esposito, Ruini, Calamandrei, Branca | 0 errori con `validateGlossario` |
| `piani/fase-finale/martines-c-schede-inverse.json` | 36 schede inverse (38% delle 94 voci del blocco) | 0 errori con `validateSchedeInverse` |
| `piani/fase-finale/martines-c-collegamenti-sospesi.json` | 18 collegamenti tolti dagli «oltre» perché puntano a id non ancora definiti | da rimettere (vedi sotto) |

## Misure del blocco

- Voci: 94; tutte con domande e citate in una lezione (100%).
- Approfondimenti: 81/94 voci (86%).
- Definizioni: mediana 74–79,5 parole per unità, minimo 69.
- Domande per lezione: da 14 a 20 (16 lezioni, tutte ≥ 14). Domande totali 268.
- Collegamenti nelle sintesi: da 2,37 a 3,63 ogni 100 parole (tutte le lezioni ≥ 2).
- Relazioni nelle unità: 168 (1,8 per voce) più i collegamenti degli «oltre».
- Nessuna correzione necessaria su u16–u20 in questa ripresa.

## Id attesi da altri blocchi

Collegamenti tolti da `oltre-30/31` (testo completo in `martines-c-collegamenti-sospesi.json`, stesso formato
degli `oltre`, con il campo `file` e `voce` dove rimetterli) perché gli id non esistono ancora nelle unità Martines:

- `regioni`, `legge-regionale`, `leale-collaborazione` → probabilmente u26–u28 (blocco D);
- `referendum-abrogativo`, `ammissibilita-referendum` → u13 (blocco B);
- `ministri`, `presidente-del-consiglio` → u14 (blocco B);
- `riserva-di-legge` → u15 (blocco B) o u02–u04;
- `annullamento`, `tutela-giurisdizionale`, `obbligatorieta-azione-penale` → **forse nessuno li definisce**: sono già
  citati con `[[…]]` anche in altre unità (tutela-giurisdizionale in u16), quindi conviene che qualcuno li definisca
  o che i collegamenti restino fuori.

Nel `quadro.json` uso id canonici (gli stessi della materia A-L) che le unità in scrittura dovrebbero definire; se
mancano il sync toglie solo il link della casella con un avviso: `governo`, `regioni`, `statuto-speciale`,
`decreto-legge`, `decreto-legislativo`, `referendum-abrogativo`, `legge-regionale`, `statuto-regionale`,
`regolamento-regionale`, `regolamento-ente-locale`, `ammissibilita-referendum`.
Rispetto al quadro A-L: `corpo elettorale` resta su `sovranita-popolare`; forma repubblicana su
`limiti-alla-revisione-costituzionale`; i contrasti su `criterio-gerarchico` (non c'è `antinomia`); i trattati su
`norma-interposta`; aggiunte le norme internazionali generalmente riconosciute (`diritto-internazionale-generale`).

## Dubbi

- Premesse del glossario scritte da conoscenze generali (date di nascita e morte, cariche), non dagli appunti:
  Branca (1907–1987, giudice e Presidente della Corte costituzionale) da ricontrollare se si vuole il massimo
  scrupolo.
- L'alias `ragionevolezza` di `eccesso-di-potere-legislativo` (u18) coincide con l'id `ragionevolezza` di u21: il sync
  potrebbe collegare il termine alla voce sbagliata nel testo; valutare se togliere l'alias.
