# Verifica del testo IURIS di Filosofia del diritto M-Z

File: `studio/letture-src/testi/filosofia-mz-iuris.txt` (132 pagine) e `Filosofia del Diritto MZ/00 - Appunti e fonti/testo-iuris/m01–m06.txt`.
Ogni correzione è stata fatta in entrambi; alla fine le pagine 2–132 del testo unico e dei sei gruppi coincidono
carattere per carattere (confronto automatico per pagina).

## 1. Aggiunte di m04 tolte

- I tre esempi didattici assenti nella fonte: il colore dell'auto di MacPherson (p. 71), l'ombrello per le ragioni
  sostanziali (p. 76), mela e automobile (p. 85).
- Tolte anche 26 frasi di raccordo senza contenuto della fonte, aggiunte da m04 solo per allungare le pagine
  (pp. 68, 70, 71, 73–76, 82, 84, 85, 87–89; per esempio «Il dibattito resta aperto», «Il precedente si impone,
  l'analogia si sceglie», «La questione, in ultima analisi, è empirica»). Rimesse due parafrasi fedeli (p. 70
  sugli scopi della classificazione giuridica, p. 76 «Conta chi parla…») per tenere le pp. 70 e 76 sopra 0,8 di
  lunghezza. La definizione di distinguishing (p. 74) e la frase sui diritti che cedono a diritti più forti (p. 80)
  restano, perché spiegano la fonte e non aggiungono fatti.
- p. 88: «Il diritto è in continua evoluzione» resta (lettura di «sottratto all'evoluzione permanente», noteRedazione u14).

## 2. Fedeltà a campione (fonte e testo IURIS confrontati)

Pagine lette per intero: 3, 6, 10, 20 (m01); 26, 30, 36, 42 (m02); 52, 54, 61, 62, 65 (m03); 68, 70, 73, 74, 75,
76, 80, 82, 84, 85, 87, 88, 89 (m04); 92, 98, 104, 109 (m05); 114, 120, 125, 131 (m06). Più i passi dubbi delle
pp. 14, 16, 23, 24, 46, 95. In più, controllo automatico di tutte le pagine per frasi con poche parole della fonte.

Nessun autore, opera, tesi o distinzione perso o attribuito male; date coerenti con i `noteRedazione` (Principia
iuris 2007, Poscritto, Holmes Jr., Underhill Moore, Llewellyn, Blackstone). Fuori da m04 le aggiunte sono glosse
già nei `noteRedazione` (Law and the Modern Mind, works itself pure, open texture, teoria digestiva).
Correzioni: p. 125 «distinto» → «distinta».

## Dubbi dei gruppi: decisioni

- **Gentile (p. 16)**: resta «a lungo legato a Croce da amicizia e collaborazione»: storicamente non fu allievo di Croce.
  Da allineare: u02 dice «allievo e amico di Croce» (sintesi e definizione); nessuna domanda chiede «allievo».
- **Hegel, «Stato minimo» (p. 14)**: resta «società civile, una sorta di "Stato minimo"»: corretto rispetto a Hegel e
  riconoscibile per le domande di u02, che seguono il riassunto.
- **Università di Londra (pp. 23–24)**: p. 24 portata a «Università di Londra», come p. 23 e come il noteRedazione u03
  (le domande di u03 dicono ancora «Università popolare»).
- **Citazione senza autore (p. 95)**: resta senza autore, come nella fonte e in u14. Nel testo introduce l'idea
  aristotelica di equità e non è attribuita a nessuno.
- p. 46 (critici dell'evoluzionismo), p. 52 (Carlos Nino), p. 86 (alcolici e armerie): scelte dei gruppi confermate.

## 3. Uniformità

- Capitoli tutti `## Capitolo N · …` (Barberis 1–6, Schauer I–XII): erano `### 6.`, `### I.`, `## IV ·`.
- Paragrafi `### N.N Titolo` senza punto finale né «·»; i tre titoli `### 1) 2) 3)` di Habermas sono diventati
  «Habermas: …».
- Elenchi solo con «• » o con 1) 2) numerati; nessun «- ». Nessun diario di lezione, data di lezione, nome di
  chi ha scritto o scaricato i riassunti.

## Controllo finale

`controlla-iuris.py --fonte=mz-fonte.txt --extra=mz-fonte.txt`: 0 sequenze copiate, nessun avviso di lunghezza;
restano solo i due riferimenti assenti voluti (p. 54 «2009», p. 58 «2018»).
