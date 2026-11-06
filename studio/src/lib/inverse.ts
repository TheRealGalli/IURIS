import type { Corso, Domanda } from './types';

/** Solo definizioni curate, non l'inversione automatica di testi che svelano il termine. */
export function creaSchedeInverse(corso: Corso): Domanda[] {
  return corso.concetti.filter((c) => c.schedaInversa).map((c) => {
    const altriNomi = [...new Set([c.latino, ...c.alias].filter((n): n is string => !!n && n !== c.nome))];
    return {
      id: `glossario-inversa-${c.id}`,
      tipo: 'flashcard', inversa: c.id, livello: 'base',
      // Il titolo della lezione potrebbe suggerire la risposta: si mostra solo la definizione.
      lezione: '', unita: c.unita[0] ?? '', concetti: [c.id],
      domanda: c.schedaInversa!,
      risposta: `**${c.nome}**${altriNomi.length ? `\n\nAnche: ${altriNomi.join('; ')}.` : ''}`,
    };
  });
}
