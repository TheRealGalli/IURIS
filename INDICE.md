# IURIS — Percorso di laurea

Questa cartella raccoglie tutto il percorso di studi. Ogni materia ha la sua cartella con la stessa organizzazione, e l'app `studio/` la trasforma in un ambiente di studio completo (lezioni, mappe, cronologia, glossario, quiz con ripasso spaziato, tracciamento delle pagine studiate).

## Struttura di ogni materia

```
<Nome materia>/
├── 00 - Appunti e fonti/     ← sbobinature, PDF, dispense (materiale originale)
├── 05 - Contenuti/           ← i contenuti di studio che usa l'app
│   ├── materia.json          ← nome, docente, manuale, fonte, pagine
│   ├── u01.json … uNN.json   ← un'unità per capitolo: lezioni, concetti, relazioni, eventi, mappa, domande
│   ├── alias.json            ← (facoltativo) id doppi da unire: { "doppione": "id-giusto" }
│   ├── concetti-extra.json   ← (facoltativo) voci di glossario citate ma non definite da nessuna unità
│   └── oltre-NN.json         ← conoscenze di base oltre gli appunti, fonti e collegamenti rivisti
└── 01–04 …                   ← vecchio formato (analisi/mappe/glossario/quiz in Markdown), non più letto dall'app
```

Il formato delle unità è descritto in [`studio/CONTENUTI.md`](studio/CONTENUTI.md). Ogni unità si controlla con:

```bash
node studio/scripts/validate-content.mjs "Diritto Romano /05 - Contenuti/u03.json"
```

## Materie

| Materia | Stato | Contenuti |
|---|---|---|
| Storia del diritto romano (Mario Bretone, *Storia del diritto romano*) | Completa | 15 unità; Originale «testo IURIS» unico di 235 pagine: appunti delle lezioni pp. 1–223 e capitoli XI–XII alle pp. 224–235 (`studio/letture-src/testi/romano-iuris.txt`) |
| Filosofia del diritto A-L (Incampo; Moro, *Il diritto e lo Stato*; Cotta, *Il diritto nell'esistenza*) | Completa | 14 unità con numerazione unica: Incampo pp. 1–100 (`u01`–`u08`), Moro pp. 101–131 (`u09`–`u11`), Cotta pp. 132–161 (`u12`–`u14`); Originale «testo IURIS» `filosofia-al-iuris.txt` |
| Filosofia del diritto SSG (lezioni del corso 2024–25; Incampo, *Sul dovere giuridico*) | Completa | 20 unità con numerazione unica: lezioni pp. 1–192 (`u01`–`u17`, la `u17` fuori esame), Incampo pp. 193–221 (`u18`–`u20`); Originale «testo IURIS» `filosofia-ssg-iuris.txt` |
| Diritto costituzionale (unico per LMG A-L, M-Z e SSG) | Completa | 28 unità (ordine del Martines) con i temi del percorso A-L (Bin-Pitruzzella): 116 lezioni, 2.517 domande; Originale «testo IURIS» (267 pagine scritte da noi, `studio/letture-src/testi/costituzionale-iuris.txt`); migrazione dei progressi in `migrazione.json`; piano in [`piani/costituzionale-unica.md`](piani/costituzionale-unica.md) |
| Istituzioni di diritto privato (dispensa Petrullo–Mainieri sul Torrente–Schlesinger, 2012) | Completa | 27 unità, 98 lezioni e 1.426 domande, almeno 14 per lezione, più 333 schede inverse (pp. 1–238); Codice civile completo in `norme/`; piano in [`piani/diritto-privato.md`](piani/diritto-privato.md); precisione e stile delle unità 12–27 rivisti; Quadro con 8 schemi; 250 approfondimenti «oltre gli appunti» |
| Filosofia del diritto M-Z (Barberis, *Giuristi e filosofi*; Schauer, *Il ragionamento giuridico*) | Completa | 16 unità con numerazione unica: Barberis pp. 1–56 (`u01`–`u06`), Schauer pp. 57–132 (`u10`–`u19`); Originale «testo IURIS» `filosofia-mz-iuris.txt` |

## L'app di studio

Originali di Diritto privato: glossario curato con 361 voci e 476 etichette, collegate nei singoli capoversi.

```bash
cd studio && npm install && npm run studio
```

`npm run studio` costruisce l'app e la serve su **http://localhost:7100**: è la versione stabile per studiare, che cambia solo quando si rifà la build (i progressi restano, perché l'indirizzo è sempre lo stesso). Per lavorare sul codice c'è `npm run dev` su http://localhost:7101, che si ricarica a ogni modifica.

A ogni avvio `scripts/sync-content.mjs` legge le cartelle `05 - Contenuti` e costruisce `public/content/<materia>/corso.json`. Tutto gira nel browser, senza AI e senza server: i progressi (lezioni studiate, risposte, ripasso FSRS, giorni di studio) restano nel browser e si possono esportare dalla pagina Progressi.

- **Oggi**: pagine studiate, padronanza, conto alla rovescia per l'esame, ripasso del giorno, lezioni consigliate.
- **Percorso**: unità e lezioni con lo stato di ciascuna (da studiare → studiata → in ripasso → padroneggiata).
- **Lezione**: sintesi completa con i termini cliccabili, i punti da dire all'esame, le cose da sapere a memoria.
- **Allenamento**: ripasso spaziato, quiz libero, punti deboli, simulazione d'orale a voce, sfida cronologica.
- **Mappa**: mappa mentale per unità e costellazione di tutti i concetti, colorate in base a quanto li sai.
- **Cronologia** e **Glossario** ricercabili; ricerca globale con ⌘K.

## Prossimo passo: il professore AI

I contenuti strutturati (concetti con pagine, relazioni, domande con punti chiave) sono già la base per un modello che interroga: conosce cosa hai studiato e dove sbagli, e può farti domande a voce e correggere le risposte aperte.
