# Fase 2 — Diritto costituzionale A-L (resoconto del subagente)

Stato: **completato** il 12 novembre 2026 (tutte le unità validate: 0 errori, 0 avvisi; `esame.json` 0 errori).

## Avanzamento

- [x] (c) `esame.json`: 30 tracce di Torre, ognuna con lezioni, voci e una domanda `aperta` con `"esame": ["torre"]` (25 nuove, 5 esistenti marcate). Validato: 0 errori.
- [x] (b) 19 anni senza evento: tutti coperti (33 eventi nuovi, vedi sotto).
- [x] Voci nuove: `messaggio-presidenziale` (u09), `questione-romana` (u18); approfondimenti in `oltre-61.json`.
- [x] (a) Definizioni: riscritte u01–u18 (alla ripresa del 12 novembre u09–u18 risultavano già riscritte: mediana materia 110 parole, 0% sotto 40).
- [x] (d) Sintesi corte e collegamenti nelle sintesi. 12/11: +227 collegamenti alla prima menzione (Costituzione, Governo, Parlamento/Camere, Stato, Regioni, plurali e sinonimi certi: «capo dello Stato», «Consulta», «decreti-legge»…), da 1,44 a 2,04 ogni 100 parole; esclusi i contesti stranieri di u05 (Senato USA, Stati Uniti). Formato JSON riportato a 2 spazi come in HEAD.
- [x] (d) Sintesi corte arricchite dagli appunti: u09-l2 (pp. 82–87: consultazioni e incarico con riserva, giuramento e fiducia entro dieci giorni, esternazioni atipiche, formula di promulgazione, atti in forma di d.P.R., altri poteri dell'art. 87 e art. 126, composizione del Consiglio supremo di difesa, prassi sul CSM), da 146 a 213 parole per pagina; u15-l2 (pp. 132–135: perché la legge regionale è fonte primaria, leggi provinciali, maggioranze, sent. 282/2002, limiti impliciti, limiti delle potestà degli statuti speciali, norme di attuazione), da 148 a 210; u15-l3 (pp. 134–137: parallelismo Giunta-Governo, gerarchia regionale, sent. 376/2002, art. 3 e art. 7 TUEL), da 147 a 188. Ora nessuna lezione sotto 164 parole per pagina (media 210).
- [x] Collegamenti a mano nelle lezioni più povere (u01-l2, u01-l3, u06-l2, u11-l2, u18-l2, u18-l4): +28 legami a voci esistenti (riserva di legge e di giurisdizione, costituzione rigida, sistema maggioritario/proporzionale, soglia, verifica dei poteri…).
- [x] Domande: +10 (una per ciascuna delle 10 lezioni ferme a 13: u01-l3, u01-l4, u02-l1, u07-l3, u08-l3, u12-l3, u16-l3, u17-l1, u18-l4, u18-l5), tutte ricavate dalle sintesi/appunti e senza doppioni con quelle esistenti. Ora ogni lezione ha ≥ 14 domande.
- [x] Relazioni: +2 (cittadinanza europea → elettorato attivo; premio di maggioranza → soglia di sbarramento); le altre 12 candidate esistevano già.

## Misure (script di lavoro, definizione principale = prima unità in ordine, come nel sync)

| Misura | Inizio Fase 2 (stato-qualita.md) | Alla ripresa (12/11) | Fine |
|---|---|---|---|
| Definizioni: mediana parole | 40 | 110 | **110** |
| Definizioni sotto 40 parole | 45% | 0% | **0%** |
| Collegamenti tra voci (archi distinti / voce) | 2,0 | 2,02 | **2,03** (569 archi, 280 voci, nessuna isolata) |
| Collegamenti nelle sintesi ogni 100 parole | 1,5 | 1,44 | **2,11** |
| Parole di sintesi per pagina (min lezione) | 216 medio | 146 min | **210 medio, 164 min** |
| Domande per lezione (min) | — | 13 (10 lezioni) | **14** (795 domande in 50 lezioni) |
| Voci con domande / citate in una lezione | 100% / 100% | 100% / 100% | **100% / 100%** |
| Voci con approfondimento «oltre» | 50% | 94% | **94%** |
| Anni degli appunti senza evento | 19 | 0 | **0** |
| Tracce d'esame Torre collegate | 0 | 30/30 | **30/30** |

## Dubbi e note per il coordinatore

- Collegamenti automatici: si collega la prima menzione per lezione di Costituzione, Governo, Parlamento/«Camere», Stato, Regioni, Senato e di plurali/sinonimi sicuri. Esclusi a mano i contesti stranieri di u05 (Senato e Presidente USA, «Stati Uniti», Parlamento/Governo generici) e i «con deroghe» generici di u06/u08. Il «Ministro» di u11-l2 non è collegato (è il ministro della giustizia, già collegato prima).
- Restano 14 definizioni **secondarie** sotto 40 parole (voci già definite meglio in un'unità precedente: la loro definizione compare solo come approfondimento «nell'unità X»): norma-giuridica (u12), forma-di-governo (u05), principio-di-legalita (u12), diritti-sociali (u18), principio-di-uguaglianza (u04, u18), sussidiarieta (u10), indirizzo-politico (u07), quorum-strutturale (u08), rapporto-di-fiducia (u07), regolamenti-parlamentari (u14), autodichia (u14), capacita-contributiva (u18), progressivita-tributaria (u18). Non incidono sulle misure; si possono allungare in Fase 5.
- u09-l2: gli appunti (p. 86) attraggono la grazia nella sfera governativa; la sintesi mantiene la correzione già presente (Corte cost. 200/2006). Il Consiglio supremo di difesa è descritto con la composizione degli appunti, aggiornando i nomi dei ministeri in forma generica; la legge istitutiva del 1950 è oggi nel d.lgs. 66/2010 (già in sintesi).
- u15-l3: gli appunti dicono che in Valle d'Aosta e Sardegna il potere regolamentare è concentrato nel Consiglio; non l'ho riportato perché non verificato sugli statuti vigenti.
- File JSON delle unità riportati a 2 spazi di rientro, come in HEAD (la sessione precedente li aveva salvati a 1 spazio: il diff ora mostra solo i cambiamenti veri).

Strumenti di lavoro della ripresa: `scratchpad/costal/` (`misure.py`, `linker.py`, `manlink.py`), non accessibili dopo la sessione. Strumenti precedenti: cartella `scratchpad/costal-x7/` della sessione (`lib.py`, `applydef.py`, `misure.py`, `d1.py`… con le definizioni).
