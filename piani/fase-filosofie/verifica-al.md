# Verifica del testo IURIS di Filosofia del diritto LMG A-L

File: `studio/letture-src/testi/filosofia-al-iuris.txt` (161 pagine) e
`Filosofia del Diritto/00 - Appunti e fonti/testo-iuris/f01–f07.txt`. Ogni correzione è fatta nel testo unico e nel
gruppo; alla fine le pp. 2–161 del testo unico e dei sette gruppi coincidono (confronto automatico per pagina). La p. 1
esiste solo nel testo unico.

`controlla-iuris.py … --fonte=al-fonte.txt --extra=al-fonte.txt`: **0 pagine con errori** (73.337 parole).

## 1. Fedeltà a campione (fonte e testo IURIS confrontati per intero)

Pagine: 1, 3, 7, 13, 18 (f01); 25, 30, 35, 40 (f02); 44, 49, 54, 58 (f03); 64, 70, 75, 80 (f04); 84, 89, 95, 99 (f05);
104, 110, 116, 122, 127 (f06); 136, 141, 146, 151, 158 (f07). In totale 31 pagine.

Nelle pagine campione non manca né è alterato alcun autore, opera, distinzione, formula o esempio (Hart, Kelsen, Fuller,
Saint-Exupéry, Lessio, Wittgenstein § 201, Kalinowski, von Wright, Reinach, Bobbio 1977, can. 1752, von Balthasar,
Searle X/Y/C, Lautsi 2009/2011, mesofatti, Moro sulla società, autorità e libertà e rivoluzione, Cotta sul volontarismo,
le forme coesistenziali, la legge di Hume). Le correzioni dei gruppi sono coerenti con i `noteRedazione` di u01–u14.

Correzioni:
- **p. 1**: mancava del tutto il contenuto della p. 1 della fonte (filosofia come scienza del tutto, *Metafisica* IV
  sull'essere in quanto essere, il dovere giuridico come oggetto della filosofia del diritto e le cinque porzioni con cui
  non si identifica). Riscritto dopo la presentazione, sotto il nuovo titolo `## Parte prima · Filosofia e diritto
  (A. Incampo)`; la p. 2 ora prosegue senza salto.
- p. 35: l'elenco a due livelli («effetto doppio») era diventato piatto e ambiguo: riunito in un punto solo.
- p. 44, p. 49, p. 80: tolte tre frasi di commento aggiunte senza riscontro nella fonte (chi comanda incontra
  condizioni…; chi impara dagli esempi…; la funzione essenziale «senza la quale non si avrebbe un ordinamento»).
- p. 157: riga spezzata a metà frase («perché quando / si parla…») ricomposta.

Dubbi dei gruppi: confermate le scelte di f01 (*simpliciter* «doveri e basta»), f02 (esempio «lezioni noiosissime»,
Conte 1977), f03 (passi oscuri lasciati com'erano), f04 (Grundnorm «alternativa» solo annunciata, principio
dell'incondizionato senza autore), f05 (Deleuze, UNHCR, Schönberg 1923), f06, f07 (Israele come esempio della fonte in
forma neutra; *ius* da *iungere* con «si fa risalire»).

## 2. Note redazionali visibili

Tolte dal testo, restano solo nei `noteRedazione`:
- p. 109: «Il passo, incompleto nella fonte, evoca…» → «Ne nasce l'immagine di una sorta di "chiesa"…».
- p. 113: «(il testo comincia però dallo Stato assoluto…)» → «il punto di partenza, però, è lo Stato assoluto».
- p. 114: «(formula quasi circolare, riportata così)» tolto.
- p. 129: «(l'espressione è ambigua nella fonte)» tolto.
- p. 143: «tesi che il testo collega a Marx e a Rousseau» → «con un richiamo a Marx e a Rousseau».
- p. 155: «(il senso di questo carattere resta poco chiaro)» tolto.
- p. 157: «(quest'ultimo, però, non viene poi esaminato)» → «Qui si esaminano i primi due».

Nessun diario di lezione, nessun nome di chi ha curato le dispense, nessuna email. Le «Nota.» di pp. 42, 43, 75, 78
sono note d'autore integrate nel testo e restano.

## 3. Uniformità

- Parti: `## Parte prima · Filosofia e diritto (A. Incampo)` (nuova, p. 1), `## Parte seconda · Il diritto e lo Stato
  (A. Moro)`, `## Parte terza · Il diritto nell'esistenza (S. Cotta)`.
- Incampo: i grandi temi sono ora tutti `##` (Diritto e parola, Diritto e logica, Doveri pragmatici, Doveri sintattici,
  *Ius publicum*, *Explicit*); prima solo i primi due lo erano.
- Cotta: `## Capitolo I–XIII · «Titolo»` e `## Parte II–IV · «Titolo»` tutti con i titoli d'autore tra «…»
  (prima mancavano ai capp. I e IV e alla Parte II). Togliere le virgolette fa scattare il controllo delle sequenze
  copiate, perché i titoli sono quelli del libro.
- Paragrafi `###`, elenchi «• », nessun «- », nessun `[[…]]`. Restano 4 voci di secondo livello rientrate («  • »,
  p. 80: Hart/Kelsen ed equifunzionalità), dove la gerarchia serve.
