# Diritto costituzionale: titoli, semestri e glossario mancante (12 novembre 2026)

Lavoro solo su `Diritto Costituzionale/05 - Contenuti/` (u01–u28, `glossario.json`, `esame.json`). File modificati
conservando esattamente il formato (rientro 1 o 2 spazi come prima, stessa chiusura di riga). Tutte le 28 unità e
`esame.json`: `validate-content` 0 errori, 0 avvisi. Sync e build non lanciati.

## 1. Titoli

Su indicazione di Carlo i titoli conservano le espressioni del manuale (Martines) e dei docenti: niente titoli generici,
ritocchi solo dove c'erano «§§», riferimenti interni («percorso A-L») o lunghezze eccessive. I titoli delle unità
restano quelli di prima (già nostri e senza «§»).

| Lezione | Prima | Ora |
|---|---|---|
| u02-l5 | I regolamenti, i regolamenti degli organi costituzionali e la consuetudine | I regolamenti, quelli degli organi costituzionali e la consuetudine |
| u02-l6 | Opinio iuris, consuetudine costituzionale, convenzioni, correttezza, prassi e precedente | Consuetudine costituzionale, convenzioni, correttezza, prassi e precedente |
| u03-l2 | Le fonti di ordinamenti esterni: diritto internazionale, rinvio e trattati europei | Fonti di ordinamenti esterni: diritto internazionale, rinvio e trattati UE |
| u03-l3 | Regolamenti e direttive europee, primato; fonti atipiche e leggi rinforzate | Regolamenti e direttive europee, primato, fonti atipiche e leggi rinforzate |
| u07-l4 | Stato parlamentare, decentrato, laico, internazionalista; la Costituzione vigente | Stato parlamentare, decentrato, laico, internazionalista; il testo vigente |
| u07-l5 | I principi fondamentali (artt. 1–12): la lettura del percorso A-L | I principi fondamentali (artt. 1–12) letti articolo per articolo |
| u08-l3 | Il procedimento elettorale, le leggi elettorali e le differenze tra le Camere | Procedimento elettorale, leggi elettorali e differenze tra le Camere |
| u16-l3 | Il riparto fra giudici, i ricorsi amministrativi e le giurisdizioni non statali | Riparto fra giudici, ricorsi amministrativi e giurisdizioni non statali |

Campo `capitolo`: tolti i «§§» (u02/u03 → «Parte I · Capitolo II, prima/seconda parte»; u14/u15 → «Parte II · Capitolo
III, prima/seconda parte»; u18 «Parte II · Capitolo VI»; u19 «… · Sezione I»; u22/u23 «Parte III · Capitolo I · Sezione
III, prima/seconda parte») e aggiunto il semestre in testa.

Restano alcuni titoli di 71–74 caratteri (u01-l4, u05-l2, u05-l5, u08-l4, u12-l4, u24) lasciati così per non perdere
espressioni del manuale.

## 2. Semestri (programma di Torre)

| Semestre | Unità |
|---|---|
| I semestre | u01, u02, u03, u04, u05, u07, u13, u15, u21, u22, u23, u24, u25 |
| II semestre | u06, u08, u09, u10, u11, u12, u14, u16, u17, u18, u19, u20, u26, u27, u28 |

Scelte e casi misti, da segnalare (le unità **non** sono state riordinate):

- **L'ordine Martines mescola i semestri**: dopo le fonti e lo Stato (I) viene u06 (II); dopo il Parlamento (II) vengono
  u13 e u15 (I); i **diritti e le libertà u21–u25 (I semestre) vengono dopo la Corte costituzionale (u18–u20, II)**; poi
  Regioni u26–u28 (II).
- u06 (separazione dei poteri, organi, atti dei pubblici poteri) → II, come «organizzazione dello Stato»; si potrebbe
  anche leggere come teoria generale (I).
- u13 (referendum abrogativo) → I: nel percorso A-L è una fonte del diritto; nel Martines sta nella parte sugli organi.
- u15 → I: l1–l5 sono fonti (decreto-legge, decreto legislativo, regolamenti, riserva di legge); ma l6–l7 (crisi di
  Governo, responsabilità dei ministri, organi ausiliari) sono materia del II semestre.
- u11 (procedimento legislativo, leggi costituzionali e revisione) → II (Parlamento), ma legge e revisione servono
  anche per le fonti del I semestre.
- u03 → I (fonti), ma u03-l2, l3, l6 e l7 trattano l'Unione europea, che Torre mette nel II semestre; lo stesso vale
  in parte per u05-l2.

## 3. Glossario: 53 voci nuove

Ricerca sistematica: grassetti del testo IURIS confrontati con nomi e alias delle 653 voci esistenti, coppie e serie
incomplete, termini delle tracce di Torre. Ogni voce ha definizione ≥ 60 parole (testo IURIS/sintesi), `pagine`, citazione
nei `concetti` della lezione, una flashcard (`uNN-q7NN`) e il collegamento `[[id|…]]` alla prima menzione nella sintesi.
Molte assenze apparenti erano già alias di voci esistenti (costituzione breve/bilancio, funzione legislativa e
amministrativa, rilevanza della questione, gerarchia delle fonti, presa di Roma, sfiducia individuale, tribunale dei
ministri, Conferenza Stato-Regioni, potestà primaria…) e non sono state duplicate.

Id ripresi da altre materie quando il concetto coincide: `certezza-del-diritto`, `fonti-primarie`, `fonti-secondarie`
(Romano), `montesquieu` (Filosofia M-Z), `pena-di-morte` (Filosofia), `cosa-giudicata` (Privato). Il giuramento qui è
`giuramento-cariche-pubbliche`, per non confonderlo con il giuramento decisorio di Privato. `montesquieu` ha la
`premessa` in `glossario.json`.

In `esame.json` aggiunte voci alle tracce di Torre: n. 25 (Sentenza Mancuso) → `sentenza-mancuso`; n. 17 (Stato-Chiesa,
presa di Roma) → `legge-delle-guarentigie`; n. 29 (gerarchia delle fonti) → `fonti-primarie`.

| Id | Voce | Lezione | Pagine |
|---|---|---|---|
| `interesse-individuale` | Interesse individuale | u01-l1 | 2–2 |
| `certezza-del-diritto` | Certezza del diritto | u02-l1 | 10–10 |
| `legge-speciale` | Legge speciale | u02-l1 | 10–10 |
| `legge-eccezionale` | Legge eccezionale | u02-l1 | 10–10 |
| `ignoranza-della-legge` | Ignoranza della legge | u02-l2 | 12–12 |
| `decreto-del-presidente-della-repubblica` | Decreto del Presidente della Repubblica (d.P.R.) | u02-l3 | 14–14 |
| `fonti-primarie` | Fonti primarie | u15-l4 | 136–136 |
| `fonti-secondarie` | Fonti secondarie | u15-l4 | 136–137 |
| `principi-generali-dell-ordinamento` | Principi generali dell'ordinamento | u03-l4 | 29–29 |
| `cosa-giudicata` | Giudicato | u03-l5 | 29–31 |
| `trattati-ue` | Trattati dell'Unione europea (TUE e TFUE) | u03-l7 | 25–25 |
| `banca-centrale-europea` | Banca centrale europea (BCE) | u03-l7 | 25–25 |
| `persona-fisica` | Persona fisica | u04-l1 | 33–34 |
| `originarieta` | Originarietà dell'ordinamento statale | u05-l1 | 37–37 |
| `stati-esigui` | Stati esigui | u05-l1 | 37–37 |
| `suffragio-universale` | Suffragio universale | u05-l1 | 40–40 |
| `montesquieu` | Montesquieu | u05-l1 | 39–39 |
| `atto-amministrativo` | Atto amministrativo | u05-l4 | 49–49 |
| `parere` | Parere | u06-l2 | 54–55 |
| `controllo-di-legittimita` | Controllo di legittimità | u06-l2 | 55–55 |
| `controllo-di-merito` | Controllo di merito | u06-l2 | 55–55 |
| `principi-fondamentali` | Principi fondamentali della Costituzione | u07-l5 | 61–64 |
| `disposizioni-transitorie-e-finali` | Disposizioni transitorie e finali | u03-l5 | 32–32 |
| `bipartitismo` | Bipartitismo e bipolarismo | u08-l2 | 68–68 |
| `mattarellum` | Mattarellum (leggi elettorali del 1993) | u08-l3 | 69–69 |
| `collegio-uninominale` | Collegio uninominale | u08-l3 | 69–69 |
| `voto-di-preferenza` | Voto di preferenza e liste bloccate | u08-l3 | 69–69 |
| `comitato-per-la-legislazione` | Comitato per la legislazione | u10-l2 | 83–83 |
| `emendamento` | Emendamento | u11-l2 | 91–91 |
| `vicepresidente-del-consiglio` | Vicepresidente del Consiglio | u14-l1 | 119–119 |
| `concorso-pubblico` | Concorso pubblico | u14-l2 | 122–122 |
| `consultazioni` | Consultazioni del Presidente della Repubblica | u14-l3 | 124–124 |
| `giuramento-cariche-pubbliche` | Giuramento | u14-l3 | 125–126 |
| `segreto-di-stato` | Segreto di Stato | u14-l4 | 127–127 |
| `sentenza-mancuso` | Caso Mancuso (sentenza n. 7/1996) | u15-l7 | 143–143 |
| `giudice-di-pace` | Giudice di pace | u16-l1 | 146–146 |
| `misure-di-sicurezza` | Misure di sicurezza | u16-l1 | 147–147 |
| `giurisdizione-ordinaria` | Giurisdizione ordinaria | u16-l3 | 146–151 |
| `giurisdizione-amministrativa` | Giurisdizione amministrativa | u16-l3 | 146–152 |
| `ricorso-in-cassazione` | Ricorso in Cassazione per violazione di legge | u16-l5 | 157–157 |
| `patrocinio-dei-non-abbienti` | Patrocinio dei non abbienti | u16-l5 | 157–157 |
| `pena-di-morte` | Divieto della pena di morte | u16-l5 | 149–157 |
| `efficacia-erga-omnes` | Efficacia erga omnes | u19-l3 | 180–180 |
| `ordine-pubblico` | Ordine pubblico | u22-l3 | 199–205 |
| `associazioni-paramilitari` | Associazioni di carattere militare | u22-l4 | 206–206 |
| `legge-delle-guarentigie` | Legge delle Guarentigie (1871) | u23-l1 | 208–208 |
| `legge-mammi` | Legge Mammì (l. 223/1990) | u23-l3 | 214–214 |
| `servizi-pubblici-essenziali` | Servizi pubblici essenziali | u24-l2 | 220–220 |
| `esame-di-stato` | Esame di Stato | u25-l2 | 230–230 |
| `province-autonome` | Province autonome di Trento e di Bolzano | u26-l3 | 244–244 |
| `camera-delle-regioni` | Camera delle Regioni | u27-l3 | 252–252 |
| `potesta-legislativa-esclusiva-statale` | Potestà legislativa esclusiva dello Stato | u28-l3 | 260–260 |
| `tributi-propri` | Tributi ed entrate propri | u28-l4 | 264–264 |

## Dubbi

- Nessuna voce nuova ha `oltre` né scheda inversa: da valutare nella fase degli approfondimenti.
- `trattati-ue` è collegata alla parola «Trattati» in u03-l7: se si preferisce, nel testo IURIS c'è la forma estesa
  (TUE e TFUE) a p. 25.
- `voto-di-preferenza` riunisce preferenze e liste bloccate in una sola voce. La sentenza 1/2014 sulle liste bloccate
  è citata in base a pp. 67–69 del testo IURIS.
