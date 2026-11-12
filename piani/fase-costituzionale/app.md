# Costituzionale unica: app (corsi e migrazione dei progressi)

## Fatto

- **Corsi** (`studio/src/data/corsi.ts`): A-L, M-Z e SSG usano `diritto-costituzionale`; docenti A. Torre, R.G. Rodio,
  Andrea Bonomi. `src/lib/materie-corso.ts`: la Costituzione sta sempre in `diritto-costituzionale` (niente più scelta
  per classe). `scripts/check-corsi.mjs`: attese aggiornate (materie, docenti, nessun corso con lo slug Martines,
  `attiDelCorso` → `diritto-costituzionale` per ogni corso).
- **Formato** `Diritto Costituzionale/05 - Contenuti/migrazione.json` (come da richiesta: `versione`, `da` con
  `materia`, `finoAVersione`, `lezioni`/`domande` = tabella `{vecchio: nuovo | null}` oppure `"uguali"`). Documentato in
  `studio/CONTENUTI.md` («Migrazione dei progressi»).
- **Sync** (`scripts/sync-content.mjs`): pubblica la migrazione **dentro `corso.json`** (campo `migrazione`, con le
  tabelle) e nel **manifest** solo la descrizione (tabelle sostituite da `"tabella"`). Scelta: la tabella arriva con
  `corso.json`, quindi è sempre presente prima che l'app possa scrivere un id nuovo; nessun file in più da scaricare.
  File malformato = errore della materia (resta l'ultimo sync riuscito); id di destinazione `uNN-…` inesistenti = avviso.
- **App**: `src/lib/migrazione.ts` (funzioni pure: `rinomina`, `fondi`, `migraProgressi`, `descrizioneMigrazione`,
  `migrazioneValida`); `src/lib/store.ts`: `registraMigrazione`, `eseguiMigrazioni`, campo `versioneContenuto` nei
  progressi (assente = 1), progressi nuovi nati già sulla versione corrente, `azzera` la conserva; migrazione rieseguita
  dopo `importaTutto`/`importa` e a fine demo (mai dentro la demo). `src/lib/data.ts`: `fetchManifest` registra le
  descrizioni (preferenza `materia` Martines → `diritto-costituzionale`; fusione Martines subito se non serve la
  tabella A-L), `caricaCorso` registra le tabelle prima di indicizzare. `src/lib/backup-dati.ts`: accetta
  `versioneContenuto`. `src/lib/types.ts`: tipi `Migrazione`, campo `migrazione` in `Corso` e `MateriaInfo`.
- Regole: id `uNN-…` assenti dalla tabella si scartano (fuori dal ripasso); schede glossario/cronologia restano.
  Conflitti: carta ripassata più di recente, esito con più risposte, lezione studiata/letta più di recente, giorni al
  massimo per campo (niente somme → rifondere è innocuo); data d'esame e ultima lezione della materia di arrivo;
  limite nuove personalizzato. Segni degli Originali conservati per documento (`costituzionale-bin-pitruzzella-v1`,
  `costituzionale-martines-v1` restano nei dati). Sessione d'allenamento: scartata se A-L rinominata, spostata se Martines.
  Se serve la tabella e non c'è ancora: nulla cambia (`rimandata`), si riprova con `corso.json`.
- **Prova**: `scripts/check-migrazione.mjs` (8 controlli, aggiunto a `check:backup`): verde. `npx tsc --noEmit -p .` verde.
  `check-backup.mjs` verde (sulla dist vecchia).

## Per il coordinatore

- `check-corsi` oggi fallisce solo perché il manifest pubblicato contiene ancora `diritto-costituzionale-martines`
  («materia senza corso»; anche le fonti d'esame Martines citano M-Z/SSG): passa dopo il sync della materia unica.
- Riferimenti allo slug Martines da sistemare con gli Originali: `src/lib/originali-catalogo.json` (riga ~89),
  `src/lib/letture-catalogo.json` (documento `costituzionale-martines-v1`, generato), `scripts/check-originali.mjs:54`,
  `scripts/check-estrazione-letture.mjs:77,137` (Martines e elenco materie), `scripts/check-review-plan.mjs:521`.
  Attenzione: `aggiornaOriginale` in store rifiuta un documento con `materia` diversa dalla materia aperta, quindi i
  documenti nuovi devono avere `materia: "diritto-costituzionale"`.
- Dopo il sync: controllare nel manifest `migrazione` con `"tabella"` per la materia, e provare a mano su 7101 con un
  progresso A-L finto in localStorage (chiave `iuris:v1:prog:diritto-costituzionale` senza `versioneContenuto`).
