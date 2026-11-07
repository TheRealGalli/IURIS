import type { Corso, Domanda } from './types';

/** Solo definizioni curate, non l'inversione automatica di testi che svelano il termine. */
export function creaSchedeInverse(corso: Corso): Domanda[] {
  return corso.concetti.filter((c) => c.schedaInversa).map((c) => {
    const altriNomi = [...new Set([c.latino, ...c.alias].filter((n): n is string => !!n && n !== c.nome))];
    return {
      id: `glossario-inversa-${c.id}`,
      tipo: 'flashcard', inversa: c.id, glossario: c.id, livello: 'base',
      // Il titolo della lezione potrebbe suggerire la risposta: si mostra solo la definizione.
      lezione: '', unita: c.unita[0] ?? '', concetti: [c.id],
      domanda: c.schedaInversa!,
      risposta: `**${c.nome}**${altriNomi.length ? `\n\nAnche: ${altriNomi.join('; ')}.` : ''}`,
    };
  });
}

/** Le altre voci si ripassano dal termine alla definizione, senza inventare inverse. */
export function creaDomandeGlossario(corso: Corso, inverse = creaSchedeInverse(corso)): Domanda[] {
  const curate = new Map(inverse.map((q) => [q.inversa!, q]));
  return corso.concetti.map((c): Domanda => curate.get(c.id) ?? {
    id: `glossario-diretta-${c.id}`, tipo: 'flashcard', glossario: c.id, livello: 'base',
    lezione: '', unita: c.unita[0] ?? '', concetti: [c.id],
    domanda: `Che cosa significa «${c.nome}»?`,
    risposta: c.definizione || c.breve || c.nome,
  });
}
