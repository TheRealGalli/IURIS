# Martines · blocco b (pp. 65–145) — resoconto

Stato: **completato** (12 novembre 2026). Tutte le unità validate con 0 errori e 0 avvisi.

| Unità | Pagine | Contenuto | Lezioni | Voci | Domande | Eventi |
|---|---|---|---|---|---|---|
| u08 | 65–74 | Parlamento, bicameralismo, formazione delle Camere | 4 | 23 | 64 | 14 |
| u09 | 75–78 | Status di parlamentare | 2 | 10 | 31 | 8 |
| u10 | 79–88 | Organizzazione e funzionamento delle Camere | 4 | 19 | 65 | 10 |
| u11 | 88–102 | Funzione legislativa e revisione costituzionale | 5 | 20 | 79 | 14 |
| u12 | 102–114 | Indirizzo politico delle Camere; funzioni elettorali | 5 | 22 | 77 | 6 |
| u13 | 114–118 | Potere legislativo del popolo (referendum) | 2 | 6 | 37 | 5 |
| u14 | 119–128 | Governo: struttura, PA, formazione, direzione politica | 4 | 19 | 70 | 6 |
| u15 | 128–145 | Atti normativi del Governo, riserva di legge, crisi, responsabilità, organi ausiliari | 7 | 30 | 130 | 11 |

Altri file:

| File | Contenuto |
|---|---|
| `Diritto Costituzionale Martines/05 - Contenuti/oltre-20.json` | 47 approfondimenti adattati da `Diritto Costituzionale/05 - Contenuti/oltre-*.json` (stessi id); collegamenti filtrati agli id definiti in Martines e alla voce; link a voci assenti resi testo; `sistema-elettorale` riscritto per la legge 180/2026 (l'A-L diceva «Rosatellum oggi in vigore») |
| `Diritto Costituzionale Martines/05 - Contenuti/oltre-21.json` | 35 approfondimenti nuovi (voci senza «oltre» in A-L: mozione di fiducia, ostruzionismo, stato di guerra, amnistia e indulto, ratifica, UPB, spoil system, riserve assoluta/relativa/costituzionale, rimpasto, Governo dimissionario, Avvocatura…) |
| `piani/fase-finale/martines-b-glossario.json` | 92 voci con `premessa` (= il `breve` della voce) per le definizioni che non dicono subito che cosa è la voce; nessuna persona nel blocco |
| `piani/fase-finale/martines-b-schede-inverse.json` | 55 schede inverse (37% delle 149 voci); 0 errori con `validateSchedeInverse` |
| `piani/fase-finale/strumenti-martines-b/` | sorgenti: `b.py` + `uNN.py` (unità), `oltre-adatta.py` e `oltre-nuovi.py` (oltre; leggono una bozza nello scratchpad), `glossario-schede.py` |

## Misure del blocco (u08–u15)

| Misura | Obiettivo | Valore |
|---|---|---|
| Definizioni, mediana parole | ≥ 60 | 81 (nessuna sotto 40) |
| Collegamenti per voce (coppie distinte, unità + oltre) | ≥ 2,0 | 2,24 (nessuna voce con meno di 2 archi) |
| Link ogni 100 parole di sintesi | ≥ 2 | 2,56 (ogni lezione ≥ 2,0) |
| Approfondimenti «oltre» | ≥ 50% | 57% (85 voci su 149, comprese 2 di `oltre-30`) |
| Domande per lezione | ≥ 14 | minimo 14 (553 domande, 33 lezioni) |
| Voci con domande / citate in lezione | ≥ 95% | 100% / 100% |
| Schede inverse | ≈ 35% | 37% |
| Anni citati ≥ 2 volte in pp. 102–145 con evento | tutti | tutti |

Sintesi: 20.041 parole; alcune lezioni sono tra 170 e 199 parole per pagina (le pagine di confine sono contate in due lezioni).

## Modifiche a unità già fatte (u08–u12)

- `b.py`: tolto il collegamento automatico «maggioranza» → `principio-di-maggioranza`, che puntava a un id non definito
  in Martines e legava anche «maggioranza assoluta» al principio. Rigenerate u08–u15 (le sorgenti coincidevano con i
  JSON prima della modifica, controllato).
- u10: definite `principio-di-maggioranza` e `tutela-delle-minoranze` (citate da relazioni e sintesi di u08, u10, u11
  ma non definite da nessuna unità Martines), con domande e relazioni. Le usano anche u06 e u25 di altri blocchi.
- u11: tolto il collegamento automatico a `potere-costituente` (non definito in Martines); aggiunti collegamenti a voci
  esistenti per tenere ≥ 2 link ogni 100 parole.
- u12: aggiunta una relazione per `esercizio-provvisorio` e due link nella lezione 2.
- u14: definite anche `presidenza-del-consiglio` e `consiglio-supremo-di-difesa` (prima solo citate).

## Correzioni e aggiornamenti (dettagli in `noteRedazione`)

- u13: sentenza sui limiti impliciti è la 16/1978 (il riassunto: «6 del 1978»); l. cost. 11 marzo 1953 n. 1 (non
  «22 marzo»); art. 39 l. 352/1970 corretto dalla sent. 68/1978; firme online dal 2021.
- u14: ministeri oggi 15 (non i 13 del 1999); CIPE → CIPESS dal 2021; art. 113 (non 111) sulla tutela contro la PA;
  nuova numerazione dei commi dell'art. 97 dopo il 2012; l. 270/2005 (non «207») e legge elettorale vigente 180/2026;
  premierato non approvato.
- u15: aggiunte sent. 22/2012 e 32/2014 (omogeneità della conversione); omesso il numero «307/1983» non verificato;
  «legge di stabilità» → legge di bilancio unica; l. 11/2005 → l. 234/2012; «Fanfani nel '58» → Fanfani I (1954);
  aggiunte le crisi parlamentari Prodi I (1998) e Prodi II (2008); CNEL non soppresso (referendum 2016).

## Dubbi

- Numeri di sentenze sulla delega legislativa (8/1977, 292/2000, 111/1972, 91/1974) presi dal riassunto e non
  verificati: nella sintesi restano solo 3/1957 e 224/1990.
- Negli «oltre» nuovi alcuni fatti vengono da conoscenze generali, non dagli appunti (da ricontrollare se serve il
  massimo scrupolo): composizione dell'UPB (tre membri, sei anni), primo uso della «ghigliottina» (gennaio 2014),
  mandati esplorativi dell'aprile 2018, preincarico a Bersani (2013), rifiuto di un ministro nel maggio 2018,
  sent. 233/2006 sullo spoil system, sent. 118/2015 sul referendum veneto, ultime amnistia (1990) e indulto (2006).
- Ministeri «oggi 15»: dato riferito al Governo in carica nel 2026 (riordini del 2020–2022); se cambia la compagine,
  va aggiornato in u14 (sintesi, domanda e `noteRedazione`).
- Il glossario parziale dà la `premessa` a 92 voci (è il `breve`): utile perché molte definizioni partono dal
  contesto («Per l'art. 64…»); il coordinatore può ridurle se le preferisce più rare.
