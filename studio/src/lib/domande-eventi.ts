import type { Corso, Domanda, Evento } from './types';

/** Una carta per ogni data/periodo del corso, senza combinazioni casuali con ID effimeri. */
export function creaDomandeCronologia(corso: Corso): Domanda[] {
  const date: Domanda[] = corso.eventi.map((e) => ({
    id: `cronologia-data-${e.id}`, tipo: 'flashcard', cronologia: e.id,
    lezione: '', unita: e.unita, livello: 'base', concetti: e.concetti,
    pagine: e.pagine, fonteNome: e.fonteNome,
    domanda: `Quando si colloca ${e.titolo}?`,
    risposta: `**${e.data}**${e.approssimato ? '\n\nDatazione approssimativa.' : ''}\n\n${e.descrizione}`,
  }));
  const ordini: Domanda[] = [];
  for (const unita of corso.unita) {
    const anni = new Set<number>(), titoli = new Set<string>();
    const eventi = corso.eventi.filter((e) => e.unita === unita.id && e.tipo !== 'periodo' && !e.approssimato && e.annoFine == null && Number.isFinite(e.anno))
      .sort((a, b) => a.anno - b.anno || a.id.localeCompare(b.id)).filter((e) => {
        const titolo = e.titolo.trim().toLocaleLowerCase('it');
        if (anni.has(e.anno) || titoli.has(titolo)) return false;
        anni.add(e.anno); titoli.add(titolo); return true;
      });
    for (let i = 0; i < eventi.length; i += 5) {
      const gruppo: Evento[] = eventi.slice(i, i + 5);
      if (gruppo.length < 3) continue;
      const ids = gruppo.map((e) => e.id);
      const id = `cronologia-ordine-${unita.id}-${ids.join('--')}`;
      ordini.push({ id, cronologia: id, eventiCronologia: ids, tipo: 'ordina', livello: 'medio',
        lezione: '', unita: unita.id, concetti: [...new Set(gruppo.flatMap((e) => e.concetti ?? []))],
        consegna: 'Metti gli eventi in ordine cronologico, dal più antico al più recente.',
        elementi: gruppo.map((e) => e.titolo),
        spiegazione: gruppo.map((e) => `**${e.data}** — ${e.titolo}`).join('  \n'),
      });
    }
  }
  return [...date, ...ordini];
}
