# Demo interattiva (visita guidata): resoconto

Data: 12 novembre 2026. File toccati: `studio/src/components/Tour.tsx`, `Tour.css`, `studio/src/lib/tour-passi.ts`,
`studio/src/lib/tour-avvio.ts` (nuovo), `studio/src/views/Oggi.tsx` (una riga: avvio alla prima visita),
`studio/src/components/MobileSheet.tsx` (`useTelefono`), `studio/src/views/LettoreTesto.tsx` e `studio/src/mobile.css`
(Mappa tolta dal lettore sul telefono), controlli `scripts/check-tour.mjs`, `scripts/check-responsive.mjs`,
`scripts/check-mappa-personale.mjs`, `scripts/visita-guidata-browser.mjs` (nuovo, usato da check-responsive),
`scripts/giro-tour.mjs` (nuovo, salva le schermate di ogni tappa). Non toccati: `App.tsx`, `MobileChrome.tsx`,
`Percorso.tsx`, contenuti.

## 1. Dall'inizio alla fine

- Tolto il `<select>` delle sezioni, che stava **in mezzo** ai comandi (era «la cosa in mezzo»): ora ci sono solo
  indietro, avanti/«Il mio backup» ed esci. Tolto dal testo del primo passo «oppure scegli una sezione dal menu in basso».
- La numerazione «N di M» conta solo le tappe vere (le tappe ponte del touch dicono «Verso …»).
- «Pronto» ora vale per una sola tappa: prima, subito dopo «Avanti», il riquadro restava attivo per un attimo con il
  testo nuovo (un doppio tocco poteva saltare una tappa).
- **Parte da sola solo alla prima visita**: `tour-avvio.ts` (chiave `iuris:v1:tour-visto`, nessuna materia studiata,
  mai in un browser automatizzato con `navigator.webdriver`), chiamato da `Oggi.tsx`. Si rifà tutta da «Demo
  interattiva» e riparte dalla prima tappa.

## 2. Calibrata sul telefono (e iPad)

- **Tappe ponte**: sul touch, prima di ogni cambio di sezione che passa dal Menu, una tappa breve illumina il pulsante
  Menu in basso a destra (bordo che pulsa) e dice dove si va e come («Il Percorso si apre dal Menu…», «Sul telefono la
  Mappa personale si apre solo da qui: Menu, poi Mappa e Personale»). Avanti: la freccetta preme Menu e si cambia pagina.
  Nessun ponte quando si arriva da un comando della pagina (lezione → Originali, citazione → articolo).
- **Riquadro che non copre**: sul telefono il riquadro va in basso o in alto, dove copre meno l'elemento spiegato
  (così il Menu in basso resta visibile); su iPad, se non c'è un lato libero, idem. Lo scorrimento avviene solo se
  l'elemento non è già in vista e lo porta sopra il riquadro. Bersagli più piccoli sul touch (`targetTouch`: titolo
  della lezione, scelta dell'allenamento, testata dell'articolo, titolo della voce).
- Testi touch riscritti, tutti ≤ 170 caratteri e titoli ≤ 60 (controllato in `check-tour`).
- Provato davvero (Playwright): iPhone SE e iPhone 15 Pro (WebKit), Pixel 7 (Chromium), iPad Pro 11 (WebKit), PC
  1366×860 (Chromium). Schermate di ogni tappa: `iphone-se/`, `iphone-15-pro/`, `pixel-7/`, `ipad/` (JPEG ridotti).
  Rigenerarle: `node scripts/giro-tour.mjs http://localhost:7102/ ../piani/fase-demo/<cartella> '<dispositivo>' <motore>`.

## 3. Bug della sottolineatura

Causa: la tappa «Prima scegli il passaggio» illuminava **tutto il paragrafo** e la selezione compariva già colorata
(l'anteprima dello strumento attivo, giallo), mentre la tappa successiva, in un colpo solo, sceglieva strumento e colore,
riselezionava e salvava: si vedeva il testo «segnato da solo» senza i passaggi intermedi. Ora sono tre tappe:
1. **selezione** che cresce a scatti come un trascinamento, riquadro sulla sola selezione (selettore speciale `::selection`),
   nessun segno salvato; il testo dice che il colore è solo un'anteprima;
2. **strumento e colore** (Evidenzia, Giallo) con la selezione ancora aperta, nessun segno;
3. **salvataggio** (Salva segno) → compare il segno.
La sottolineatura rosa ripete i tre gesti con pause visibili. Tornando indietro le azioni non si ripetono (`targetDopo`).
Verificato su PC e telefono (check: segni = 0 alla selezione e allo strumento, > 0 solo al salvataggio).

## 4. Nuove tappe

- **Chiesta all'esame** (Percorso): badge/riquadro su una lezione con tracce (quella della visita, se ne ha).
- **Domande d'esame** (Allenamento, `/allena?modo=docenti`).
- **Schede inverse** (`/allena?modo=inverse&c=…`): «di che concetto si tratta?».
- **Testo IURIS** negli Originali: un solo testo per materia (tappa «Un solo testo IURIS per materia»).
- **Mappa personale nuova**: schede in riga per sezione, collegamenti al passaggio (testo aggiornato).
- **Articoli** (sezione «Articoli»): una lezione con una citazione «art. N»; su PC la freccetta passa sopra e compare la
  scheda dell'articolo (illuminata insieme al collegamento), sul touch si spiega il tocco; poi si apre l'articolo
  (`/norme/N`) nella materia che ospita l'atto. Se la materia attiva non cita articoli e non ha l'atto, la visita passa
  per un momento nella materia della Costituzione (o del Codice civile) del corso e poi torna in quella di partenza:
  la visita sopravvive al ricaricamento del corso (stato del giro conservato nel modulo). Se l'articolo è di una materia
  fuori dal corso, o la funzione non c'è (niente tracce, niente schede inverse), la tappa si salta.
  Provato con Filosofia A-L (articolo del Codice civile in Diritto privato e ritorno), Diritto romano, Diritto
  costituzionale (iPhone), Diritto privato M-Z e SSG (dove le tappe d'esame si saltano: non ci sono tracce).

## 5. Mappa sul telefono

Sul telefono (`TELEFONO_QUERY`: larghezza ≤ 700 px, o telefono in orizzontale) il lettore non offre più il pulsante Mappa
nel foglio Testo e non apre il pannello; su iPad e PC resta. La tappa «I tuoi segni diventano una mappa» c'è solo su
PC e iPad; sul telefono la tappa ponte verso Mappe spiega che la Mappa personale si apre solo da lì.
`check-mappa-personale` sul telefono ora verifica che comando e pannello non ci siano (su PC e iPad il controllo del
pannello è invariato).

## Controlli

- `npx tsc --noEmit -p .`, `npx vite build`: verdi.
- `node scripts/check-tour.mjs`: verde (isolamento invariato + tappe: niente `<select>`, ponti prima di ogni cambio di
  sezione sul touch, niente mappa nel lettore sul telefono, testi brevi, tappe saltate se la funzione manca, cambio di
  materia per gli articoli).
- `node scripts/check-responsive.mjs`: aggiunto il giro completo della visita (PC, iPhone SE, iPhone 15 Pro, Pixel 7,
  iPad Pro 11 in parallelo, movimento ridotto): sequenza 1…N, due soli comandi, riquadro dentro lo schermo e che non copre
  l'elemento, ponti che illuminano il Menu, selezione → strumento → segno, articolo aperto, preferenze uguali a prima
  della visita, visita rifatta dalla prima tappa, avvio automatico solo alla prima visita. Tutto verde.
  **Unico rosso, non della demo**: «in Altro mancano il corso o l'invito WhatsApp» su tutti i dispositivi, perché la
  modifica locale di `App.tsx`/`MobileChrome.tsx` (coordinatore) toglie `InviaMateriale`: va aggiornata l'attesa in
  `check-responsive.mjs` (riga «Altro: corso e invito WhatsApp…»), non l'ho toccata.
- `node scripts/check-mappa-personale.mjs`: vedi sopra.

## Dubbi

- L'avvio alla prima visita sta in `Oggi.tsx` perché `App.tsx` era escluso: se il coordinatore preferisce, la stessa
  chiamata (`primaVisita()` → `segnaVisitaProposta(); vai('/demo')`) può spostarsi in `App.tsx`.
- Il cambio temporaneo di materia smonta e rimonta il tour (l'app ricarica il corso): per un attimo si vede
  «Caricamento del corso…» senza il riquadro.
