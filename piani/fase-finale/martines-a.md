# Martines · blocco A (pp. 2–64) — resoconto finale

Stato al 12 novembre 2026: **blocco completato**. Tutti i file validati con `validate-content.mjs` (0 errori, 0 avvisi).

## Che cosa è stato fatto

| File | Contenuto | Numeri |
|---|---|---|
| `u01.json` | Parte I, Cap. I «Comunità e diritto» (pp. 2–8): gruppi e interessi, principio ordinatore, Romano/Kelsen/Mortati, costituzione formale e materiale, costituzione come processo, diritto naturale, pluralismo, pubblico/privato | 4 lezioni, 2.960 parole, 34 voci, 60 relazioni, 3 eventi, 67 domande |
| `u02.json`, `u03.json` | Cap. II, fonti del diritto (pp. 9–32) | già fatti nelle sessioni precedenti |
| `u04.json` | Cap. III «Il soggetto di diritto e le situazioni giuridiche soggettive» (pp. 33–36) | 3 lezioni, 1.549 parole, 17 voci, 40 relazioni, 2 eventi, 49 domande |
| `u05`–`u07` | Stato, organi e atti, Costituzione (pp. 37–64) | già fatti |
| `oltre-10.json` | approfondimenti di u01 e u04 | 35 voci |
| `oltre-11.json` | approfondimenti di u02 e u03 | 33 voci |
| `oltre-12.json` | approfondimenti di u05 | 22 voci |
| `oltre-13.json` | 34 voci riprese da `Diritto Costituzionale/05 - Contenuti/oltre-*.json` (stessi id), con i link e i collegamenti verso voci che in Martines non esistono trasformati in testo o tolti | 31 voci |
| `oltre-14.json` | approfondimenti di u06 e u07 | 26 voci |
| `piani/fase-finale/martines-a-glossario.json` | premesse per persone (Santi Romano, Gierke, Kelsen, Ulpiano, De Nicola) e per voci con definizione troppo legata al testo (legittimazione, autonomia, diritto costituzionale), domanda per «diritto» | 9 voci (PARZIALE, da unire) |
| `piani/fase-finale/martines-a-schede-inverse.json` | schede inverse del blocco, controllate con `validateSchedeInverse` contro le voci di tutte le unità Martines (nomi e alias uniti) | 92 schede (PARZIALE, da unire) |

## Misure del blocco (u01–u07, 236 voci)

| Misura | Obiettivo | Blocco A |
|---|---|---|
| Definizioni, mediana | ≥ 60 parole | 83 parole (0% sotto 40) |
| Collegamenti per voce (relazioni delle unità + collegamenti degli oltre) | ≥ 2,0 | 4,8 |
| Link ogni 100 parole di sintesi | ≥ 2 | 2,76 |
| Approfondimenti | ≥ 50% delle voci | 154/236 = 65% (147 nei miei oltre-10…14, le altre negli oltre degli altri blocchi) |
| Domande per lezione | ≥ 14 | minimo 15 (30 lezioni) |
| Voci con domande / citate in una lezione | ≥ 95% | 100% / 100% |
| Schede inverse | ≈ 35% | 92/236 = 39% |

## Note per il coordinatore

- **Voci definite qui per la prima volta in questa materia** (prima erano citate da altre unità senza definizione): `ordinamento-giuridico` (citata da u02, u03, u05, u07, u16, u21, u25), `pluralismo` (u22–u25), `diritto-soggettivo` (u16), `persona-giuridica` (u05, u06, u22, u25), `ente-pubblico` (u06, u24), `stato-liberale` (u05, u06, u07, u21, u25), `sanzione` (u16). Restano citate senza definizione in tutta la materia, ma fuori dalle mie pagine: `principio-di-legalita`, `regioni`, `governo`, `decreto-legge`, `annullamento` e altre (le elenca il sync).
- **Voci ridefinite** con il contenuto di queste pagine (il sync fonde): `interessi-diffusi` (u16), `costantino-mortati` (u17), `interesse-legittimo` (u16). Il glossario del blocco C ha già una premessa per Mortati e il blocco B per `buon-andamento-e-imparzialita`: non le ho duplicate.
- **Eventi ripetuti con lo stesso id** (il sync tiene il primo, cioè quello di u01/u04): `ev-approvazione-costituzione` (anche in u07), `ev-titolo-v-2001` (anche in u03; esiste anche `ev-riforma-titolo-v` in u19, stesso fatto con id diverso: da unificare), `ev-entrata-in-vigore-del-codice-civile` (anche in u03 e u25).
- `costituzione-scritta` (u07) ha già gli alias «costituzione formale»: in u01 la costituzione formale di Mortati è collegata a quella voce invece di crearne una nuova.
- Doppioni tolti: `regolamenti-parlamentari`, `revisione-costituzionale`, `rapporto-di-fiducia` (già in `oltre-20`, stesso testo di A-L), `buon-andamento-e-imparzialita` (in `oltre-21`) e `minoranze-linguistiche` (in `oltre-41`) non sono nei miei file: nessun id compare in due `oltre` della materia.
- Gli `oltre` di `oltre-13` riprendono quelli di A-L: il testo di `forma-di-governo` dice che al 11 novembre 2026 il premierato (A.C. 1921) è ancora in esame; `cittadinanza` cita le modifiche del 2025 e il referendum senza quorum del giugno 2025.

## Correzioni e dubbi (dettagli nei `noteRedazione`)

- p. 7: la «Dichiarazione di Filadelfia del 1787» è la Costituzione degli Stati Uniti (firmata il 17 settembre 1787): corretto.
- p. 34: «potestà dei genitori» → responsabilità genitoriale (d.lgs. 154/2013); «fallimento» → liquidazione giudiziale (d.lgs. 14/2019, in vigore dal 15 luglio 2022); «famiglia legittima» reso con famiglia fondata sul matrimonio. Segnalato in `note` di u04.
- Numeri di articolo aggiunti dove il riassunto parafrasa la Costituzione senza citarli (art. 8, 24, 30, 51, 52, 53).
- Negli approfondimenti ho usato solo fatti da manuale; fonti linkate: Costituzione (Quirinale), schede delle sentenze della Corte costituzionale, EUR-Lex, Normattiva (legge 241/1990), preleggi in Gazzetta Ufficiale. Le persone (Romano, Gierke, Kelsen, Ulpiano, De Nicola) non hanno link esterni.
