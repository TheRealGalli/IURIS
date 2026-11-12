# Ottimizzazione degli Originali (12 novembre 2026)

Problema: nel lettore degli Originali il cambio di sezione era diventato lento, soprattutto con molti segni.

## Misure

Strumenti di misura: Playwright su `dist/` servito in locale, senza service worker. Configurazioni: Chromium e WebKit, PC (1440×900) e iPad Pro 11.
Testi: `romano-iuris-v1` e `costituzionale-iuris-v1`, senza segni e con 263/289 segni finti. I segni sono 200 sparsi su tutto il testo e 100 nelle prime quattro sezioni, evidenziati e sottolineati in sei colori.
Ogni cambio di sezione si misura dal cambio dell'indirizzo al primo disegno della sezione nuova. Il «blocco» è il task lungo più lungo (solo in Chromium) oppure il salto più lungo fra due fotogrammi nei 1,5 s successivi.

| Caso (con ~300 segni) | Prima: cambio sezione | Prima: blocco | Dopo: cambio sezione | Dopo: blocco |
|---|---|---|---|---|
| Romano, PC Chromium | 1.575 ms | 1.587 ms | 30 ms | 28 ms |
| Costituzionale, PC Chromium | 3.398 ms | 3.445 ms | 44 ms | 32 ms |
| Romano, PC WebKit | 1.840 ms | 1.941 ms | 49 ms | 48 ms |
| Costituzionale, PC WebKit | 3.293 ms | 3.372 ms | 55 ms | 40 ms |
| Romano, iPad Chromium | 2.744 ms | 3.708 ms | 30 ms | 24 ms |
| Costituzionale, iPad Chromium | 4.151 ms | 5.476 ms | 29 ms | 34 ms |
| Romano, iPad WebKit | 2.198 ms | 3.121 ms | 35 ms | 39 ms |
| Costituzionale, iPad WebKit | 3.465 ms | 6.393 ms | 45 ms | 42 ms |

- **Senza segni** il cambio di sezione restava sui 30–60 ms, prima e dopo.
- **Apertura dell'Originale con segni**: prima 2,7–8,6 s, con 106–133 richieste di rete. Dopo 0,25–0,45 s, con 21 richieste.
- **Mappa personale** (prima apertura, con tutte le sezioni annotate): dopo la prima correzione il blocco era di 550–750 ms. Ora la mappa compare in 0,5–0,9 s senza blocchi oltre gli 85 ms. Le aperture successive richiedono 25–85 ms.

## Dove andava il tempo (profilo CPU)

1. **La mappa personale veniva calcolata dentro il lettore a ogni cambio di sezione, anche a pannello chiuso.** La causa principale era `useMappaGeometrica()` in `SezioneTesto`, che a ogni sezione:
   - scaricava tutte le sezioni annotate;
   - preparava il loro Markdown;
   - proiettava tutti i segni;
   - eseguiva `ritrovaNellaSezione` e la semantica del glossario.

   Il calcolo si ripeteva anche a ogni salvataggio della posizione di lettura, perché cambiava `p.originali`. Nel profilo pesava il 95% del tempo, quasi tutto in `indicizzaTesto`.
2. **`ritrovaNellaSezione` indicizzava di nuovo ogni blocco per ogni tratto cercato**: la cache vale solo per testi di almeno 256 caratteri e i capoversi IURIS sono corti.
3. **Falsi «da verificare» sulle pagine divise fra due sezioni.** Un segno della sezione A, guardato dalla sezione B che condivide la pagina, risultava «da verificare». Su 289 segni di costituzionale i casi erano 86, e su Romano 39 su 263. Questo produceva avvisi sbagliati nel lettore, segni doppi «da ricollocare» nella mappa e ricerche costose.
4. Nella semantica della mappa: le regex delle etichette venivano ricompilate in ogni sezione, `parentela` cercava in modo lineare, e ogni sezione percorreva tutte le relazioni del corso.

**Migrazione dei segni**: verificata nel browser. Con 40 segni sul documento vecchio, la tabella si scarica una volta sola e tutti i segni risultano trattati. Nessuna nuova richiesta dopo 6 cambi di sezione né dopo una ricarica. Non andava corretta.

## Correzioni

- `LettoreTesto.tsx`: la mappa vive nel componente `PannelloMappa` e si calcola solo a pannello aperto.
- `letture.ts`:
  - proiezione con un contesto calcolato una volta per sezione (indice dei blocchi, intervallo di pagine);
  - `ritrovaNellaSezione` indicizza ogni blocco una volta sola e normalizza ogni tratto una volta sola;
  - nuovo parametro `altrove`: un blocco che appartiene a un'altra sezione della stessa pagina (secondo `primo`) dà «fuori sezione».
- `letture-client.ts`:
  - `preparaBlocchi` è in cache per sezione: il Markdown, la pulizia e i collegamenti si rifanno solo se cambiano glossario, atto della materia o atti del corso;
  - nuova funzione `bloccoInAltraSezione`, applicata solo agli id `pNNN-bNNN`. I segni «da ricollocare» della migrazione non cambiano.
- `letture-hooks.ts`:
  - albero della mappa in cache per sezione, ricalcolato solo se cambiano i segni di quella sezione;
  - preparazione dei blocchi e primo calcolo dell'albero a lotti di 30 ms;
  - fino a 3 sezioni cambiate (un segno aggiunto o tolto) si ricalcolano subito, così niente sparisce dalla mappa;
  - relazioni filtrate ai concetti della sezione.
- `mappa-geometrica.ts`:
  - regex delle etichette compilate una volta sola;
  - mappa degli antenati;
  - nodi per concetto memorizzati;
  - un filtro rapido per sottostringa in minuscolo prima della regex lenta. Il filtro si disattiva sui pochi caratteri che le minuscole non piegano come la regex.
- Dati salvati e segni invariati. Nuovo scenario in `check-letture.mjs` per la pagina divisa fra due sezioni.

## Verifiche

Tutte superate:
- `npx tsc --noEmit -p .`
- `npx vite build`
- `npm run check:letture` (21 scenari, mappa sul corpus con ogni segno al suo posto)
- `check-originali`
- `check-segni-migrati`
- `SOLO_LETTORE=1 check-responsive` (215 controlli su 11 dispositivi)

Gli script di misura sono nel blocco di appunti della sessione e non fanno parte del progetto.
