# Diritto costituzionale unico per A-L, M-Z e SSG (12 novembre 2026)

Il programma è lo stesso nelle tre classi (syllabus: Rodio M-Z e Bonomi SSG identici, testo Martines; Torre A-L
stessi argomenti, manuale a scelta tra Bin-Pitruzzella, Caretti-De Siervo, Zagrebelsky). Le due materie
(`diritto-costituzionale`, A-L, 18 unità sul riassunto Bin-Pitruzzella; `diritto-costituzionale-martines`, M-Z e SSG,
28 unità) diventano **una sola**, slug `diritto-costituzionale`, cartella `Diritto Costituzionale/`.

## Scelte

- **Ossatura = Martines**: unità u01–u28, id di lezioni e domande di Martines invariati (chi studia M-Z/SSG non perde
  nulla). I contenuti del percorso A-L entrano nelle unità giuste: sintesi arricchite, voci, eventi, relazioni,
  domande aggiunte con id nuovi `uNN-q5NN`. Tabella di migrazione per i progressi A-L.
- **Originale IURIS**: testo scritto da noi, diviso `=== pagina N ===` con la **stessa numerazione del riassunto
  Martines** (così `pagine` di lezioni e domande restano valide). Ogni pagina riscrive con parole nostre la pagina
  Martines e vi integra i temi A-L. Nessun PDF o riassunto di terzi pubblicato: le fonti restano in `00 - Appunti e
  fonti/` per la verifica.
- **Controllo automatico**: `python3 piani/strumenti/controlla-iuris.py <file>`: nessuna sequenza di 8 parole uguale
  alle fonti (fuori dalle citazioni «…»), tutti gli articoli/anni/numeri della pagina Martines presenti, lunghezza,
  niente diario di lezione.

## Gruppi (un subagente ciascuno)

Unità Martines e pagine **possedute** (le pagine di confine appartengono al gruppo indicato); lezioni A-L da integrare
(file vecchi in `Diritto Costituzionale/00 - Appunti e fonti/al-precedente/`).

| Gruppo | Unità Martines | Pagine IURIS | Lezioni A-L da integrare |
|---|---|---|---|
| g01 | u01, u04, u05, u06 | 2–8, 33–57 | u01 (tutta), u02 (tutta), u05 (tutta), u03-l2 |
| g02 | u02, u03 | 9–32 | u12 (tutta), u16 (tutta), u03-l3 |
| g03 | u07, u21 | 58–64, 191–198 | u04 (tutta), u18-l1 |
| g04 | u08, u09, u10 | 65–88 | u06 (tutta), u08-l1, u08-l2, u03-l1 |
| g05 | u11, u12, u13 | 89–118 | u13-l1, u13-l2, u14-l2, u08-l3 |
| g06 | u14, u15 | 119–145 | u07 (tutta), u13-l3, u14-l1, u14-l3 |
| g07 | u16, u17 | 146–167 | u09 (tutta), u11 (tutta) |
| g08 | u18, u19, u20 | 168–190 | u17 (tutta) |
| g09 | u22, u23 | 199–217 | u18-l2, u18-l3 |
| g10 | u24, u25 | 218–239 | u18-l4, u18-l5 |
| g11 | u26, u27, u28 | 240–267 | u10 (tutta), u15 (tutta) |

## Che cosa produce ogni gruppo

1. `Diritto Costituzionale/00 - Appunti e fonti/testo-iuris/gNN.txt`: le sue pagine IURIS, ognuna presente.
2. Le sue unità in `Diritto Costituzionale/05 - Contenuti/uNN.json` (copie di Martines già al loro posto), arricchite.
3. `piani/fase-costituzionale/mappa-gNN.json`: `{"lezioni": {"<lezione A-L>": "<lezione nuova>"}, "domande":
   {"<domanda A-L>": "<domanda nuova>"}}` per **ogni** lezione e domanda A-L del gruppo (domanda doppione = id della
   domanda già esistente che la sostituisce).
4. `piani/fase-costituzionale/gNN.md`: resoconto breve (fatto, numeri, dubbi).

Dopo: unione di `oltre`, glossario, schede inverse, quadro, esame (Torre con lezioni rimappate), migrazione dei
progressi nell'app, Originali, corsi, controlli.
