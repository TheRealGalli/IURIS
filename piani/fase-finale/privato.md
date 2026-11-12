# Fase 2 — Diritto privato (resoconto, aggiornato man mano)

Subagente «Diritto privato». File toccati: solo `Diritto Privato/` e questi due resoconti.
Strumenti di lavoro (fuori da git): testo della seconda dispensa senza intestazioni in
`00 - Appunti e fonti/confronto/testo/seconda-dispensa.txt`; riquadri della dispensa decifrati in
`00 - Appunti e fonti/testo/riquadri-decifrati.txt`.

## Stato di partenza (11 novembre 2026, misurato sui file `uNN.json`)

| Misura | Prima |
|---|---|
| Voci | 503 |
| Definizioni: mediana (parole) | 25 nei file delle unità (36 nel corso generato) |
| Definizioni sotto 40 parole | 99% nei file (70% nel corso generato) |
| Archi tra voci (unità + «oltre») | 802 = 1,59 per voce |
| Collegamenti nelle sintesi | 916 su 44.201 parole = 2,07 ogni 100 parole |
| Approfondimenti «oltre» | 250 su 503 voci (49,7%) |
| Domande | 1.426, almeno 14 per lezione (98 lezioni) |
| Voci con domande e citate in una lezione | 100% |
| Lezioni sotto 150 parole di sintesi per pagina | 24 su 98 |
| Tracce d'esame collegate | 0 |

## (c) Domande d'esame

`05 - Contenuti/esame.json` scritto: 61 tracce (39 Lobuono, 22 Pennasilico), ciascuna con lezioni e voci.

- **Lobuono**: PDF di 2 pagine con testo estraibile, 39 tracce, testo come nel PDF.
- **Pennasilico**: PDF di **una sola pagina** (immagine con testo; riletto anche con l'OCR di `piani/strumenti/ocr.m`).
  Contiene i blocchi «Situazioni giuridiche soggettive», «Il soggetto del rapporto giuridico», «L'influenza del tempo»,
  «Diritti reali» e si ferma al titolo «I DIRITTI DI CREDITO», **senza tracce sotto**: il file è tagliato, mancano i
  blocchi su obbligazioni, contratto, famiglia, successioni. Ne risultano 22 tracce. Alcune righe del PDF uniscono
  due argomenti senza pallino («Capacità giuridica e d'agire della persona fisica / Interdizione legale e
  giudiziale», «Minore età / Amministrazione di sostegno», «Il possesso e la detenzione / Acquisto e perdita del
  possesso / Azioni possessorie…»): sono state separate dove nel PDF c'è l'a capo.
- **Tracce ambigue** (interpretazione da confermare):
  - Lobuono 31 «Concorso del creditore»: può essere il concorso del fatto colposo del creditore (art. 1227 c.c.,
    dispensa p. 114) o il concorso dei creditori (art. 2741 c.c., p. 116). Coperte entrambe le letture
    (voce nuova `concorso-di-colpa-del-creditore` in u14-l1 e domanda sul concorso dei creditori in u14-l2).
  - Lobuono 35 «Decadenza del termine»: intesa come decadenza dal beneficio del termine (art. 1186 c.c.), perché
    segue «Termine a favore del debitore»; voce nuova `termine-di-adempimento` in u13-l3.
  - Lobuono 39 «Affidamento dei figli»: inteso come affidamento nella crisi della coppia (artt. 337-bis ss. c.c.),
    voce nuova `affidamento-dei-figli` in u25; l'affidamento familiare della l. 184/1983 resta in u25-l5.

## Avanzamento per unità

(tabella aggiornata a ogni unità completata: vedi in fondo)

Metodo (ripresa del 12 novembre): per ogni unità si rileggono le pagine della dispensa (testo in
`00 - Appunti e fonti/testo/torrente-dispense.txt`, riquadri in `riquadri-decifrati.txt`) e si riscrivono le
definizioni di tutte le voci che l'unità definisce per prima (60–90 parole, autosufficienti: che cos'è, disciplina,
articoli, distinzioni), si integrano i riquadri mancanti, si arricchiscono le lezioni sotto 150 parole per pagina e si
aggiungono collegamenti tra voci non ovvi. Ogni unità è validata subito; `noteRedazione` registra l'intervento.

| Unità | Definizioni riscritte | Riquadri integrati | Lezioni arricchite | Collegamenti + | Eventi + |
|---|---|---|---|---|---|
| u01 | 23/23 | pp. 2, 6 | u01-l3 (fonti UE, fonti secondarie) | 0 (già presenti) | Amsterdam 1997, Lisbona 2007 |
| u02 | 20/20 | pp. 9, 12 | u02-l2 (argomenti logici, esempio analogia) | 2 | Roma II 2007 |
| u03 | 19/19 | pp. 17, 18 (già in lezione; esempio nel glossario) | — | 2 | — |
| u04–u06, u10, u12, u15 | già fatte nella sessione precedente (vedi `noteRedazione` delle unità) | | | | |
| u07 | 21/21 | p. 43 (già ricostruito; nota imprecisa su locazione/affitto non ripresa) | u07-l1, u07-l2 | 5 | — |
| u08 | già riscritte | pp. 52, 59, 63 | tutte e quattro (da 72–114 a 168–207 parole/pagina) | 1 | — |
| u09 | 14/14 | nessun riquadro | u09-l1, u09-l2 (da 112–123 a 223–248) | 4 | — |
| u10 | già fatte | — | già sopra soglia | — | — |
| u11 | già fatte | p. 78 già integrato | u11-l2 (231/p); u11-l3 887 parole: pp. 86–95 sono schemi in immagine senza testo | 3 | — |
| u13 | 18/18 | p. 109 (solo rinvio) | u13-l1, u13-l2 | 5 | — |
| u14 | 9/9 | p. 113 (testo art. 1218) | u14-l1 (esempi) | 3 | — |
| u16 | 12/12 | pp. 129, 131 | u16-l1 | 3 | — |

Correzione trasversale: tolti 9 collegamenti automatici errati (Fase 0) che legavano «ordine pubblico» alla voce di
diritto internazionale privato, «indennizzo» all'espropriazione e «reciprocità» alla condizione di reciprocità dello
straniero (u04, u07, u08, u14, u16, u18, u22, u23, u24); resta quello corretto di u25 (delibazione).
| u17 | 17/17 (forma-ad-substantiam è di u06) | p. 136 (art. 2043) | u17-l4 | 5 | — |
| u18 | 17/17 | pp. 144, 147, 148, 149 (testi di articoli) | u18-l3 | 5 | — |
| u19 | 17/17 | — | u19-l3, u19-l4 | 1 | — |
| u20 | 20/20 | — | u20-l1, u20-l4, u20-l5 | 4 | — |

Altri collegamenti automatici errati corretti: «interpretazione» del contratto legata alla voce sull'interpretazione
della legge (u16, u19, u20).
| u21 | 20/20 | — | u21-l1, u21-l2, u21-l4 | 5 | d.lgs. 146/2007 (2 agosto 2007), l. 244/2007 (24 dicembre 2007) |

Stato al termine di u21 (12 novembre): mediana 97 parole, 23,7% sotto 40 (restano u22–u27), archi 989 (1,97 per voce).
| u22 | 24/24 (transazione è di u02) | — | u22-l2, u22-l3, u22-l5 | 2 | — |
| u23 | 16/16 | — | u23-l1 | 4 | — |
| u24 | 12/12 | — | u24-l3 (prescrizione e reato) | 5 | — |
| u25 | 26/26 (parentela e responsabilità genitoriale sono di u04), aggiornate alle riforme 2012–2022 | — | u25-l1 | 2 | — |
| u26 | 28/28 | — | già sopra soglia | 6 | — |
| u27 | 12/12 | — | già sopra soglia | — | — |

## Tracce d'esame (richiesta del coordinatore, 12 novembre)

- Definite nelle unità, con flashcard, le tre voci che `esame.json` citava ma mancavano: `concorso-di-colpa-del-creditore`
  (u14-l1, art. 1227 c.c.), `termine-di-adempimento` (u13-l3, artt. 1183–1186 c.c.), `affidamento-dei-figli` (u25-l2,
  artt. 337-bis ss. c.c., l. 54/2006).
- Le 33 tracce senza domanda aperta d'esame ora ne hanno una nella lezione collegata: 26 coperte marcando con
  `"esame"` l'aperta già esistente sullo stesso argomento (u07-q010 anche per Pennasilico 12); 6 domande aperte nuove
  (u14-q032 concorso del creditore, u13-q060 termine e decadenza dal termine, u25-q102 affidamento dei figli,
  u16-q045 elementi essenziali, u03-q031 situazioni soggettive, u09-q031 diritti reali di godimento).
  Verifica: 0 tracce scoperte, 0 voci mancanti; tutti i file validati senza errori.

## Stato finale (12 novembre 2026)

| Misura | Prima | Dopo |
|---|---|---|
| Voci | 503 | 506 |
| Definizioni: mediana (parole, prima definizione di ogni voce) | 27 | 106 |
| Definizioni sotto 40 parole | 68% | 0% |
| Archi tra voci (unità + «oltre», coppie distinte) | 941 = 1,87 per voce | 1.017 = 2,01 per voce |
| Parole di sintesi per pagina di appunti | 186 | 249 |
| Lezioni sotto 150 parole per pagina | 30 | 1 (u11-l3: pp. 86–95 sono schemi in immagine senza testo) |
| Eventi per le date 1997 e 2007 | — | Trattato di Amsterdam (1997), Trattato di Lisbona, Roma II, d.lgs. 146/2007, l. 244/2007 |
| Tracce d'esame con domanda aperta | 28/61 | 61/61 |

Dubbi e note:
- Le definizioni sono scritte dalla dispensa; dove la dispensa è superata (famiglia e filiazione, assegni, recesso del
  consumatore, azione di classe, donazioni e riduzione dopo la l. 182/2025) la voce dice il diritto vigente e
  `noteRedazione` dell'unità registra la differenza.
- Corretti 12 collegamenti automatici errati della Fase 0 («ordine pubblico» → diritto internazionale privato,
  «indennizzo» → espropriazione, «reciprocità» → condizione dello straniero, «interpretazione» del contratto → della
  legge). Altri collegamenti automatici impropri potrebbero esserci: conviene un controllo a campione in Fase 5.
- Interpretazioni delle tracce Lobuono 31, 35, 39 come già descritto sopra (da confermare con il docente).
- Non ho lanciato sync, build né check:build.

## Rifinitura (12 novembre 2026)

**Collegamenti nelle sintesi.** Per ogni lezione ho cercato la prima menzione non collegata di voci già definite nelle
unità di privato (nome e alias), poi ho scartato a mano i falsi positivi su 890 candidati: «c.c.» → Codice civile,
«Stato» → status, «impresa» → azienda, «tutela» nel senso di protezione, «ordine pubblico», «indennizzo», «assenza»,
«devoluzione», «interessi» nel senso di interessi generali, «buona fede» oggettiva o del terzo acquirente (la voce è la
buona fede possessoria), «obbligo»/«facoltà» generici, «che cosa», «minore»/«affini» aggettivi, «mutuo consenso»,
«onere» modale, «quota» ereditaria o associativa, ecc. Ne sono rimasti 570, più 13 aggiunti a mano nelle tre lezioni
rimaste sotto soglia (u08-l2, u22-l2, u18-l4).
Corretti anche 8 collegamenti sbagliati già presenti: `[[enfiteusi|devoluzione]]` (3 volte in u26: tolto),
«sottoscrizione del verbale» → scrittura privata (u25), «divisione aritmetica dei tempi» → divisione della comunione
(u25), divisione del fondo dell'associazione (u05), «remissione» → `remissione-del-debito` invece di `rinunzia`
(u13, u22); «comunione forzosa del muro» ora porta a `comunione-forzosa`.

**Approfondimenti.** Nuovo `oltre-61.json` con 18 voci importanti che non avevano «oltre»: inadempimento, famiglia,
divorzio, titolo di credito, cambiale, assegno bancario, assicurazione, leasing finanziario, successione mortis causa,
testamento pubblico, adozione del minore, diritto alla riservatezza, negozio giuridico, patto commissorio, privilegio,
vendita di cosa altrui, pignoramento, trasporto (159–190 parole ciascuna, diritto vigente, fonti normative, 25
collegamenti tra voci esistenti).

| Misura | Prima | Dopo |
|---|---|---|
| Collegamenti nelle sintesi ogni 100 parole (parole senza la parte id) | 1,77 (1.079) | 2,72 (1.659) |
| Lezione più bassa | 0,47 (u08-l2) | 1,50 (u08-l2); tutte ≥ 1,50 |
| Voci con «oltre» | 250/506 = 49,4% | 268/506 = 53,0% |

Validazione: u01–u27 e oltre-61 senza errori (restano i 2 avvisi già noti di u11-l3). Non ho lanciato sync né build.
Dubbi: alcuni collegamenti a voci molto generali (`contratto`, `bene`, `prestazione`, `proprieta`) compaiono alla prima
menzione in quasi ogni lezione; sono corretti ma, se l'effetto in pagina risultasse troppo fitto, si possono diradare
tenendo comunque la media sopra 2,1.
