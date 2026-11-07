import { createHash } from 'node:crypto';

/** Identità del materiale riusato; non è l'impronta di un PDF del manuale. */
export const improntaMaterialePercorso = (unita) => createHash('sha256').update(JSON.stringify(unita)).digest('hex');

/** Nessuna riscrittura: gli stessi testi della lezione, dei punti chiave e della memoria. */
export function blocchiDaPercorso(lezione, unita, pagina) {
  const prefisso = `manuale-${unita.id}-p${String(pagina).padStart(3, '0')}`;
  const blocco = (id, markdown) => ({ id: `${prefisso}-${id}`, pagina, markdown,
    concetti: [...new Set([...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => m[1]))] });
  return [
    ...(unita.note ? [blocco('nota-fonte', unita.note)] : []),
    blocco('sintesi', lezione.sintesi),
    ...(lezione.puntiChiave.length ? [blocco('punti-chiave', `### Da dire all'esame\n\n${lezione.puntiChiave.map((p, i) => `${i + 1}. ${p}`).join('\n')}`)] : []),
    ...(lezione.memoria.length ? [blocco('memoria-titolo', '### Da sapere a memoria'),
      ...lezione.memoria.map((m, i) => blocco(`memoria-${String(i + 1).padStart(3, '0')}`, `**${m.voce}**\n\n${m.dettaglio}`))] : []),
  ];
}

export function sezioneDaPercorso(doc, sec, lezione, unita) {
  if (!lezione || !unita?.ricostruita || !lezione.manuale) throw new Error(`Materiale del Percorso non ricostruito dal manuale: ${sec.id}`);
  if (JSON.stringify(sec.manuale) !== JSON.stringify(lezione.manuale)) throw new Error(`Pagine del manuale non aggiornate: ${sec.id}`);
  return { documento: doc.id, edizione: doc.edizione, id: sec.id, titolo: lezione.titolo,
    da: sec.da, a: sec.a, lezione: lezione.id, tipoFonte: 'manuale-ricostruito', manuale: lezione.manuale,
    blocchi: blocchiDaPercorso(lezione, unita, sec.da) };
}
