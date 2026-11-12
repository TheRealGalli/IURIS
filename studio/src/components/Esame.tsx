// Tracce d'esame dei docenti: badge «Chiesta all'esame (prof. X)» ed elenco delle tracce collegate.
import { corsoDi } from '../data/corsi';
import { useCorso } from '../lib/data';
import { classiDi, delCorso, fontiOrdinate, prof, tracceOrdinate } from '../lib/esame';
import { href } from '../lib/router';
import { usePref } from '../lib/store';
import type { FonteEsame, TracciaEsame } from '../lib/types';
import { Icon } from './ui';

/** Id del corso (classe) scelto: decide quali tracce sono «del tuo docente». */
export function useCorsoScelto(): string {
  return corsoDi(usePref().corso).id;
}

const titoloFonte = (f: FonteEsame, mia: boolean) => (mia
  ? `Traccia d'esame di ${f.docente}, docente del tuo corso`
  : `Traccia d'esame di ${f.docente}, docente di un'altra classe${classiDi(f) ? ` (${classiDi(f)})` : ''}`);

/** Un chip per docente: pieno per il docente del corso scelto, tenue per le altre classi. */
export function BadgeEsame({ fonti, breve = false }: { fonti: Iterable<string>; breve?: boolean }) {
  const idx = useCorso();
  const corso = useCorsoScelto();
  // due fonti dello stesso docente (per esempio le tracce su due libri) danno un solo chip
  const elenco = fontiOrdinate(idx, fonti, corso).filter((f, i, tutti) => tutti.findIndex((x) => x.docente === f.docente) === i);
  if (!elenco.length) return null;
  return <>{elenco.map((f) => {
    const mia = delCorso(f, corso);
    return (
      <span key={f.id} className={`chip chip-esame${mia ? '' : ' chip-esame-altra'}`} title={titoloFonte(f, mia)} data-esame={f.id}>
        <Icon n="esame" size={13} />
        {breve ? prof(f.docente) : `Chiesta all'esame (${prof(f.docente)})`}
        {!mia && <span className="chip-esame-nota">altra classe</span>}
      </span>
    );
  })}</>;
}

/** Elenco di tracce d'esame: testo del docente, dove se ne parla e il collegamento per allenarsi. */
export function TracceEsame({ tracce, lezioni = true, compatto = false }: { tracce: TracciaEsame[]; lezioni?: boolean; compatto?: boolean }) {
  const idx = useCorso();
  const corso = useCorsoScelto();
  if (!tracce.length) return null;
  return (
    <ul className={`tracce-esame${compatto ? ' tracce-esame-compatte' : ''}`}>
      {tracceOrdinate(idx, tracce, corso).map((t) => {
        const f = idx.fontiEsame.get(t.fonte)!;
        const mia = delCorso(f, corso);
        const dove = lezioni ? t.lezioni.map((l) => idx.lezioneById.get(l)).filter(Boolean) : [];
        return (
          <li key={t.id} className={mia ? '' : 'traccia-altra'} data-traccia={t.id}>
            <div className="traccia-testo">«{t.testo}»</div>
            <div className="traccia-meta">
              <span title={titoloFonte(f, mia)}>{prof(f.docente)}{!mia && <> · <i>di un'altra classe{classiDi(f) ? ` (${classiDi(f)})` : ''}</i></>}</span>
              {dove.map((l) => <a key={l!.id} href={href(`/lezione/${l!.id}`)} onClick={(e) => e.stopPropagation()}>{l!.titolo}</a>)}
              {t.domande.length > 0 && <a className="traccia-allena" href={href(`/allena?traccia=${t.id}`)} onClick={(e) => e.stopPropagation()}><Icon n="allena" size={13} /> Rispondi</a>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Riquadro «Chiesta all'esame» per la lezione e per la voce. */
export function RiquadroEsame({ tracce, lezioni = false }: { tracce: TracciaEsame[]; lezioni?: boolean }) {
  if (!tracce.length) return null;
  return (
    <div className="card riquadro-esame">
      <div className="eyebrow row" style={{ gap: 6, marginBottom: 2 }}><Icon n="esame" size={14} /> Chiesta all'esame</div>
      <TracceEsame tracce={tracce} lezioni={lezioni} compatto />
    </div>
  );
}
