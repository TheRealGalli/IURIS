# Filosofia del diritto M-Z — Barberis, *Giuristi e filosofi* (resoconto in corso)

Stato: **completato** (12 novembre 2026). Tutti i file validano senza errori.

## Testo pulito
- `Filosofia del Diritto MZ/00 - Appunti e fonti/testo/barberis.txt` (56 pagine, righe `=== pagina N ===`), ricavato da `barberis-grezzo.txt`.
- Metodo: mappa di sostituzione delle legature per simbolo e posizione (`?`, `+`, `8`, `\` = «tt»; `A`, `2`, `R`, `.` fra due minuscole = «ti»; `K`, `V`, `X` = «tti»; ﬁ/ﬀ/ﬂ/ﬃ sciolte), con controllo su un dizionario ricavato da tutti i contenuti italiani già presenti nel repository; i casi ambigui (A = «tti» in «oggettivi», «accettino», «scetticismo», «direttive», «prescrittività»; A iniziale = «ti» in «tipo», «titolo», «tirano», «timore»; «.» finale = «ti» in «rapporti», «Stati», «limiti», «fonti»…) sono stati risolti parola per parola.
- Verifica: nessun token residuo con simboli, cifre o maiuscole interne; elenco delle parole fuori dizionario letto per intero; lettura integrale del testo pulito. Corretti anche parole attaccate («giuridicodovrebbe»), «(16181648)» → 1618-1648, «mogico» → magico, «Ludwing», «Roosvelt», «Aushwitz», «Hagerstrom» → Hägerström.
- Nessun dato personale né segnaposto. La p. 1 è la copertina.

## Unità scritte (tutte validate: 0 errori)
| Unità | Pagine | Lezioni | Voci | Domande |
|---|---|---|---|---|
| u01 Prefazione e cap. 1, diritto naturale | 2–12 | 6 | 47 | 102 |
| u02 Cap. 2, filosofia del diritto in senso stretto | 12–19 | 4 | 31 | 69 |
| u03 Cap. 3, jurisprudence | 19–28 | 5 | 26 | 88 |

| u04 Cap. 4, teoria generale del diritto | 28–37 | 5 | 29 | 86 |
| u05 Cap. 5, sociologia del diritto | 37–48 | 5 | 42 | 87 |
| u06 Cap. 6, filosofia del diritto in senso ampio | 48–56 | 6 | 41 | 101 |

## Approfondimenti «oltre» (`oltre-10` … `oltre-14`)
- `oltre-10`: 61 voci riprese da Filosofia LMG, Filosofia SSG, Costituzionale e Romano (stessi id). Adattate: tolte le frasi su Incampo, Moro, Cotta, «il corso», «gli appunti»; scollegati i `[[link]]` a id che in M-Z non esistono; tenuti solo i collegamenti fra voci M-Z; riscritte stato-etico, pluralismo-giuridico, robert-alexy (1945–2026, come da necrologio di Kiel già citato in LMG); integrate con il punto di vista di Barberis eteronomia, vigenza (Ferrajoli), geiger, jhering, husserl, rousseau, cicerone, gény, tarello.
- `oltre-11` (15: Grozio, Pufendorf, Beccaria, Finnis, Rawls, Gentile, Frege, Gadamer, John Austin, Hohfeld, Pound, Kantorowicz, Hägerström, Olivecrona, Hauriou), `oltre-12` (17: Montesquieu, Spirito delle leggi, Tocqueville, Comte, Durkheim, Parsons, Luhmann, Spencer, sociologia del diritto, razionalizzazione, potere legittimo, avalutatività, Circolo di Vienna, Scuola di Francoforte, razionalità comunicativa, democrazia deliberativa, Fatti e norme), `oltre-13` (30: Dworkin, Raz, Ferrajoli, Scarpelli, Nino, Carrió, Waldron, Ehrlich e 22 concetti), `oltre-14` (7 voci in comune con Schauer lasciate a me: holmes, llewellyn, frank, lon-fuller, common-law, formalismo-giuridico, realismo-giuridico-americano; hart, bentham, aristotele, socrate, critical-legal-studies sono in `oltre-10`).
- Copertura: **130 voci Barberis su 213 (61%)**.

## Glossario e schede inverse (file parziali da unire)
- `piani/fase-finale/mz-barberis-glossario.json`: 88 premesse, una per ogni persona e opera di u01–u06 (comprese le persone in comune con Schauer: hart, bentham, holmes, llewellyn, frank, fuller, aristotele, socrate). Validato con `validateGlossario`.
- `piani/fase-finale/mz-barberis-schede-inverse.json`: 89 schede (42% delle voci Barberis), solo concetti. Validate con `validateSchedeInverse` (nessuna contiene il nome o un alias).

## Collegamenti nelle sintesi
Aggiunto il collegamento alla prima occorrenza di ogni voce (nomi e alias, esclusa una lista di parole comuni e alcuni id fuorvianti: `parlamento`/«legislatore», «precedenti» aggettivo, `il-concetto-di-diritto` e `il-ragionamento-giuridico` come titoli, «caso per caso», «certezza», «competenza»), più alcuni a mano. Controllati uno per uno gli archi aggiunti.

## Misure finali (u01–u06)
| Misura | Prima (u01–u04) | Dopo (u01–u06) |
|---|---|---|
| Voci | 132 | 213 |
| Definizione mediana | 72 parole | 78 parole (nessuna sotto 40) |
| Collegamenti per voce (relazioni) | 3,4 | 3,3 |
| Collegamenti nelle sintesi ogni 100 parole | ≈1,8 | **2,57** (3 lezioni fra 1,8 e 2,0: u01-l6, u05-l2, u05-l5) |
| Domande per lezione | 16–20 | 16–20 (minimo 16) |
| Voci con domande | 100% | 100% |
| Approfondimenti | 0 | 61% |
| Schede inverse | 0 | 42% |

## Dubbi e note per il coordinatore
- Ferrajoli, *Principia iuris*: il riassunto lo data 2009; l'edizione Laterza risulta del 2007. In u06 la sintesi conserva 2009 (come nel riassunto), ma ho tolto l’evento e la domanda con la data; nell’«oltre» di Ferrajoli è scritto 2007. Da verificare.
- Alexy, *Teoria dei diritti fondamentali*: il riassunto dice 1986 (edizione tascabile Suhrkamp; la prima è del 1985). Lasciato 1986.
- Id doppi nella materia: `norma-di-riconoscimento` (Barberis u03) e `regola-di-riconoscimento` (Schauer u12) sono lo stesso concetto di Hart: conviene unirli con un alias. Anche `riggs-v-palmer` è definito da Schauer; u06 lo cita soltanto e aggiunge l'evento `ev-riggs-v-palmer` (1889).
- `u04`: corrette le pagine di `rudolf-von-jhering` (27–30 → 28–30) per togliere l'unico avviso.
- Nessun sync/build lanciato. Gli script di lavoro sono nello scratchpad della sessione (`barb/`).
