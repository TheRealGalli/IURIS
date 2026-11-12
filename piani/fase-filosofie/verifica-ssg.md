# Verifica del testo IURIS di Filosofia del diritto SSG

File: `studio/letture-src/testi/filosofia-ssg-iuris.txt` (221 pagine) e
`Filosofia del Diritto SSG/00 - Appunti e fonti/testo-iuris/s01–s10.txt`. Ogni correzione è stata fatta nei gruppi
e riportata nel testo unico; alla fine le pp. 2–221 del testo unico e dei dieci gruppi coincidono (confronto
automatico per pagina). La p. 1 esiste solo nel testo unico.

## 1. Note redazionali visibili

- s02: tolte le sette note «la fonte scrive / dice per svista…» (pp. 31, 34, 36, 38, 40, 42, 43): restano solo la forma
  corretta (prescrittive sanzionatorie, irretroattività, nazista, Tribunale per l'ex Jugoslavia, *Fondazione* 1785,
  pubblicità delle massime). Freud–Kelsen: «dialogo avviato già nei primi anni Venti», senza rinvio alla fonte.
- s08: tolti «gli appunti la collegano / negli appunti / gli appunti lo dicono» (Schmitt e il nazismo, abderitismo,
  Rancière, Carnelutti «maestro soprattutto del diritto processuale civile»).
- s05 p. 91: la frase «il riferimento giusto è… *Totem e tabù* è di altro tema» riscritta come dato (*Totem e tabù*
  1913, *Psicologia delle masse e analisi dell'Io* 1921), coerente con il noteRedazione.
- s10 p. 196: tolto «che il testo chiama "fondamentale"» (resta: interpretazione teleologica).
- s09, passi oscuri: **non reintegrati**. «visual legal commence / visual commons» (p. 190), «attraverso il primo
  "Bones"» (p. 186), «ci sono imprese o muri» (p. 180), il corso di dottorato «Ludovico Einaudi» e il «contagio»
  (p. 190) non si ricostruiscono con certezza; il contenuto di quei passi è già reso nella sostanza.

## 2. Fedeltà a campione (fonte e testo IURIS confrontati per intero)

Pagine: 1, 7, 14, 20 (s01); 27, 35, 41 (s02); 44–45, 47, 55, 65 (s03); 70, 80, 86, 88 (s04); 91, 99, 104, 105 (s05);
116, 124, 130 (s06); 137, 145, 152 (s07); 160, 168, 174–176 (s08); 177, 178, 180, 184, 186, 188, 190 (s09);
196, 207, 215 (s10). Più i raccordi di fine pagina 44/45, 66/67, 88/89, 110/111, 132/133, 154/155, 176/177, 192/193.

Nessun autore, opera, esempio o distinzione perso nelle pagine campione; le condensazioni tolgono domande d'aula e
ripetizioni. Correzioni:
- **p. 1**: mancava del tutto il contenuto della p. 1 della fonte (apertura della lezione 1: la domanda metafisica
  sull'esistenza del diritto, il velo d'ignoranza, i bisogni diventati diritti, i filosofi del linguaggio e l'uomo
  comune, *layman* per «playman»). Riscritto dopo la presentazione.
- p. 20: «non condannare chi viene ucciso» → «non condannare chi uccide» (come la fonte).
- p. 55: aggiunto il titolo del libro di Austin, che la frase dava per noto.
- p. 65: «prescrittivo-sanzionatoria» → «prescrittivo-sanzionatorio».
- p. 67 (s04): formula di Carcaterra uniformata a «determinazione **D**» (era «B», come un refuso della fonte p. 70;
  u06 e p. 65 usano D).
- p. 88: il teorema di incompletezza di Gödel non dice che serve «un fondamento esterno»; reso in modo corretto
  (un sistema abbastanza ricco non dimostra da sé tutte le sue verità né la propria coerenza) e collegato alla
  norma fondamentale; la «dimostrazione dell'esistenza di Dio» è detta prova ontologica.
- p. 172: tolto il paragrafo sul ricevimento del docente (orari dell'anno 2024/25); restano prenotazione, struttura
  dell'esame ed esempi di domande.

Dubbi dei gruppi: confermate le scelte di s01 (stoici, *appeal to Heaven*, barbiere), s03 (antropologi ungheresi,
Carcaterra «anni Settanta»), s05 (*Il quinto potere* resta senza anno, come nella fonte), s06, s07 (p. 154 non
ripete la coda di p. 132; Chester Barnard e la Bell come nel noteRedazione u15), s08 (regista della Nouvelle Vague e
secondo teorico anglo-americano senza nome), s09 (Friedman, Genette, Sherwin, *Oz*, LeRoy; Rebecca Schaeffer per
«(nomi attori)» è un fatto certo e resta), s10 (p. 211 e citazione senza autore a p. 215 lasciate come nella fonte).

## 3. Uniformità

- **Lezioni**: ogni lezione comincia con `## Lezione N · Tema` (1–30, senza date): prima ce l'avevano solo le
  lezioni 7–9 e 19–30, con le date. Numerazione ricostruita (la fonte ha una lezione senza numero il 28/10 e due
  «lezione 13»). Lezione 1 a p. 1, le altre in cima alla pagina dove comincia la lezione nella fonte.
- Tolti i `##` tematici di s05 (p. 93 diventa `### I custodi dell'osservanza: arbitro e VAR`; pp. 97 e 107 sono ora
  titoli di lezione), i titoli doppi (p. 174; p. 178 «Il cerchio magico e chi ne resta fuori», che ripeteva quello di
  p. 176).
- Parte seconda (Incampo): capitoli `## Capitolo N · Titolo` (1–10, erano `### N.`); i tre `####` di p. 217 sono `###`.
- Elenchi solo «• »; nessun «- », nessun `[[…]]`, nessun nome di chi ha sbobinato o riassunto.

## Controllo finale

`controlla-iuris.py … --fonte=ssg-fonte.txt --extra=ssg-fonte.txt`: **0 sequenze copiate**, nessun avviso di diario
o di trattini; le 30 pagine «con errori» hanno come unico riferimento assente la data della lezione (pp. 1, 6, 8,
12, 19, 22, 33, 38, 44, 49, 63, 71, 73, 78, 81, 84, 97, 107, 114, 118, 122, 127, 134, 144, 151, 155, 165, 169, 172, 174).
Restano avvisi di lunghezza (0,5–0,8) attesi per le sbobinature.
