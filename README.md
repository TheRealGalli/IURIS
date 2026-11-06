# IURIS · Studio

[Apri IURIS online](https://formaiuris.it/)

Lezioni, glossario, mappe, cronologia ed esercizi con ripasso spaziato per lo studio del diritto.
Il sito funziona nel browser, senza account, server applicativo o sincronizzazione dei progressi.

## Progressi personali

I progressi sono salvati nel browser e rimangono dopo la chiusura della pagina e gli aggiornamenti del sito.
Ogni browser e dispositivo ha un archivio distinto; chi usa lo stesso profilo del browser condivide l'archivio.
Da **Progressi → Scarica backup** puoi conservare una copia e trasferirla con **Carica backup**.
Per passare dalla versione locale al sito online, scarica il backup dalla prima e importalo nel secondo.
Lo stesso trasferimento serve passando dal vecchio indirizzo `github.io` a `formaiuris.it`, perché ogni origine ha il proprio archivio.
Cancellando i dati del sito si eliminano anche i progressi locali.

## Sviluppo locale

Serve Node.js 24 per lo stesso ambiente usato nella pubblicazione automatica.

```sh
cd studio
npm ci
npm run studio
```

La versione per studiare è su `http://localhost:7100`; `npm run dev` avvia lo sviluppo sulla porta 7101.

## Pubblicazione su GitHub Pages

Il dominio principale è **formaiuris.it**, collegato a GitHub Pages tramite i DNS gestiti su IONOS.
Anche `www.formaiuris.it` punta a GitHub; il certificato HTTPS viene gestito da GitHub Pages.

In **Settings → Pages → Build and deployment → Source**, seleziona **GitHub Actions**.
Ogni push su `main` genera i contenuti delle materie, costruisce l'app, verifica i file e pubblica `studio/dist`.
Il workflow può anche essere avviato manualmente dalla scheda **Actions**.
I percorsi dell'app sono relativi e le pagine usano l'hash: il sito funziona anche nel percorso di un repository.

Prima di pubblicare puoi eseguire:

```sh
cd studio
npm run build
npm run check:build
```

Il repository include l'app e le cartelle `05 - Contenuti`, necessarie per generare i corsi.
PDF originali, vecchi elaborati, cartelle degli assistenti, backup dei progressi e file temporanei sono esclusi.
Il formato dei contenuti è descritto in [studio/CONTENUTI.md](studio/CONTENUTI.md).

