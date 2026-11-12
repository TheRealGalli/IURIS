# Fase 1 — app (resoconto del subagente)

Stato: **in corso** (aggiornato man mano; vedi in fondo «Da fare / non provato»).

## 1. Domande d'esame dei docenti (`esame.json` + campo `esame`)

Schema **invariato** rispetto ad `AGENTS.md`. Documentato in `studio/CONTENUTI.md` («Domande d'esame dei docenti»).

- `scripts/validate-content.mjs`: accetta `"esame": ["fonte"]` sulle domande (errore se non è un elenco di id);
  `node studio/scripts/validate-content.mjs ".../05 - Contenuti/esame.json"` controlla fonti, corsi (id letti da
  `src/data/corsi.ts`), lezioni e voci esistenti e, come **errore**, le tracce senza domanda `aperta` della stessa fonte
  nelle loro lezioni (o almeno nella stessa unità). Nuove funzioni esportate: `validateEsame`, `contestoEsame`,
  `domandeDellaTraccia`, `idCorsi`.
- `scripts/sync-content.mjs`: pubblica in `corso.json` `esame: { fonti: [{id, docente, corsi}], tracce: [{id, fonte,
  testo, lezioni, concetti, domande}] }` (il nome del PDF non viene pubblicato). Se `esame.json` manca o ha errori non
  si ferma: avvisa, toglie i riferimenti inesistenti, elenca le tracce senza domanda. `stats.tracceEsame` nel manifest.
  Quando più domande d'esame stanno nella stessa lezione, a ogni traccia va quella con più parole e voci in comune.
- **Sync più robusto** (non richiesto, ma necessario con più persone che scrivono insieme): prima svuotava
  `public/content` all'inizio e, se una materia lanciava un errore (es. `schede-inverse.json` che cita una voce di
  un'unità momentaneamente non valida), lasciava l'app senza contenuti. Ora ogni materia è costruita a sé: quella che
  fallisce resta alla versione dell'ultimo sync riuscito, le altre si aggiornano, e lo script esce comunque con
  codice 1 (la build continua a fermarsi).
- Tipi e indice: `src/lib/types.ts` (`FonteEsame`, `TracciaEsame`, `Domanda.esame`, `Corso.esame`), `src/lib/data.ts`
  (`fontiEsame`, `traccePerLezione`, `traccePerConcetto`, `traccePerUnita`), `src/lib/esame.ts` (ordine «prima il
  docente del corso scelto», «prof. Cognome», classi).
- UI (`src/components/Esame.tsx`, stili in `styles.css`):
  - badge «Chiesta all'esame (prof. X)» sulla lezione (riga dei chip), sulla voce del glossario e accanto alla lezione
    nel Percorso; tenue e con «altra classe» se il docente non è quello del corso scelto;
  - riquadro «Chiesta all'esame» nella colonna laterale di lezione e voce, con il testo della traccia e «Rispondi»;
  - Percorso: in ogni unità aperta, «Tracce d'esame collegate · N» (si apre con un clic);
  - Allenamento: modalità **Domande d'esame** (`?modo=docenti`), prima le domande del docente del corso scelto e poi
    quelle «di un'altra classe»; `?traccia=<id>` apre le domande di una traccia; nella scheda della domanda compaiono
    il badge e «Traccia del docente: «…»».
- `scripts/check-domande.mjs`: ogni traccia pubblicata ha fonte, lezioni, voci e almeno una domanda aperta della stessa
  fonte (errore altrimenti); le domande citano solo fonti esistenti; prove di `prof()` e dell'ordine.
- `scripts/check-corsi.mjs`: le fonti citano corsi veri che hanno quella materia e per ognuno esiste almeno una domanda.

## 2. Citazioni di articoli tra materie

- `src/lib/materie-corso.ts`: `attiDelCorso()` sceglie la materia che ospita la Costituzione e quella del Codice civile
  **per il corso scelto** (`diritto-costituzionale*` e `diritto-privato*` tra le materie del corso: A-L →
  `diritto-costituzionale`; M-Z e SSG → `diritto-costituzionale-martines` appena la Fase 4 la mette nel corso). Se il
  corso non ha ancora una costituzionale, ripiego su quella del manifest (di preferenza Martines) in sola lettura.
- `src/lib/letture-client.ts`: `collegaArticoli` ora funziona in tutte le materie (anche senza atto proprio: romano,
  filosofia), collega «art. N Cost.» e «art. N c.c.» alla materia giusta e segna i link (`data-art`, `data-materia`,
  `data-fuori`). Nuova `collegaArticoliHtml` per le sintesi.
- Lezione e voce del glossario: le citazioni nelle sintesi e nelle definizioni sono collegamenti; `ConceptPop.tsx`
  mostra al passaggio del mouse la scheda dell'articolo (atto, numero, titoletto, testo breve; `src/lib/articoli.ts`
  scarica il testo dall'altra materia o dal libro del Codice) e il clic apre `/norme/N` della materia giusta. Atto di
  una materia fuori dal corso: il clic apre la scheda con il testo intero, senza cambiare materia.
- «Indietro» del browser: `src/lib/ritorno.ts` + `App.tsx`. Ogni voce della cronologia ricorda la materia
  (`history.state`) e il punto della pagina da cui si è partiti: tornando indietro si ritrovano materia, pagina e
  scorrimento (provato: lezione di Filosofia → art. 111 Cost. → indietro: stessa lezione, stesso punto; avanti torna
  all'articolo).

## 3. Calendario (data dell'esame)

- `SceltaData` in `src/components/ui.tsx`: un solo selettore per PC, iPad e telefono, usato in `Oggi.tsx` e
  `Progressi.tsx` (niente più `<input type="date">`). Salva **solo** alla scelta del giorno (clic, tocco, Invio,
  Spazio) o con «Rimuovi data»; girare i mesi, le frecce, Esc e «Annulla» non salvano. Tastiera: frecce, Pag↑/Pag↓,
  Home/Fine, Esc. Sul telefono è un foglio in basso con giorni da 44 px.
- `scripts/check-responsive.mjs`: la prova della data d'esame è riscritta per il nuovo selettore (11 dispositivi).

## 4. Collaudo backup tra dispositivi (fatto)

- `scripts/backup-dispositivi.mjs` (nuovo, chiamato da `check-backup.mjs` dopo i controlli dell'archivio): giro nel
  browser PC (Chromium) → backup → telefono (WebKit, iPhone) → studio → backup → PC, più un backup di una sola
  materia su un terzo browser. `SOLO_ARCHIVIO=1` salta il giro; `IURIS_BASE=http://localhost:7101/` lo fa sul server
  di sviluppo invece che su `dist/`.
- Difetto trovato e corretto: in Allenamento, aprendo di seguito due sessioni con lo stesso titolo e lo stesso numero
  di domande (es. due «Ricorda il termine») restava a schermo l'esito della prima (`Runner` con la stessa `key`).
- Secondo difetto, dell'app (trovato dal giro sul telefono): dopo «Ripristina questo backup» cambiano preferenze e
  materia, `Guscio` azzerava `idx` e il `CorsoContext.Provider` in `App.tsx` compariva/spariva (`idx ? <Provider> : body`),
  quindi tutta la pagina veniva smontata e il messaggio «Backup ripristinato» non si vedeva mai (anche per l'utente).
  Ora il Provider c'è sempre (valore nullo ammesso). Il test non è stato indebolito.
- `node scripts/check-backup.mjs` passa per intero (16 scenari d'archivio + 8 passi del giro; corso SSG, 4 materie).

## File toccati

`studio/CONTENUTI.md`; `studio/scripts/`: `validate-content.mjs`, `sync-content.mjs`, `check-domande.mjs`,
`check-corsi.mjs`, `check-responsive.mjs`, `check-backup.mjs`; `studio/src/`: `App.tsx`, `styles.css`,
`components/{ConceptPop,Esame,ui}.tsx`, `lib/{articoli,data,esame,letture-client,materie-corso,ritorno,types}.ts`,
`views/{Allena,Concetto,Domande,Lezione,Oggi,Progressi,Percorso}.tsx`.

**`Percorso.tsx`**: la riga di Carlo (`{rifPagine(u)} · {minuti} min`, senza `u.capitolo`) è rimasta com'è. Le righe
mie sono tre aggiunte: l'import `BadgeEsame, TracceEsame`, il badge sotto la riga «pp. · min · domande» di ogni
lezione, e il blocco `<details className="unit-esame">` prima dei pulsanti «Mappa dell'unità / Quiz sull'unità».

## Da fare / non provato

- Giro backup provato su `dist/` (Chromium + WebKit iPhone), non a mano su dispositivi reali né su 7101; i corsi
  LMG non sono nel giro (sceglie un solo corso diverso dal predefinito).
