import { useEffect, useRef, useState } from 'react';
import type { MateriaInfo } from '../lib/types';
import { docenteDi, type CorsoDiStudio } from '../data/corsi';
import { Icon } from './ui';

function iconaMateria(nome: string) {
  const n = nome.toLocaleLowerCase('it');
  if (n.includes('filosofia')) return 'materia-filosofia';
  if (n.includes('romano')) return 'materia-romano';
  if (n.includes('costituzionale')) return 'materia-costituzionale';
  if (n.includes('privato')) return 'materia-privato';
  return 'libro';
}

/** Ricordo, fuori dall'archivio di studio e dai backup, che l'accenno di scorrimento è già stato mostrato. */
const ACCENNO = 'iuris-ui:griglia-materie-accenno';

/** Griglia delle materie: se ne vedono quattro, le altre si scorrono. Il nome di quella sotto il puntatore
 *  (o a fuoco, o scelta) sta nella riga sotto la griglia, dove lo scorrimento non lo taglia. */
export default function GrigliaMaterie({ corso, materie, selezionata, onSelect, className = '' }: {
  corso: CorsoDiStudio; materie: MateriaInfo[]; selezionata: string; onSelect: (slug: string) => void; className?: string;
}) {
  const voci = [
    ...materie.map((m) => ({ id: m.slug, nome: m.nome, colore: m.colore, pronta: m.disponibile, dettagli: docenteDi(corso, m.slug) })),
    ...(corso.inArrivo ?? []).map((m) => ({ id: m.nome, nome: m.nome, colore: m.colore, pronta: false,
      dettagli: [m.docente, m.cfu && `${m.cfu} CFU`, m.semestre && (m.semestre === 'Annuale' ? 'annuale' : `${m.semestre} semestre`), 'in arrivo'].filter(Boolean).join(' · ') })),
  ];
  const lista = useRef<HTMLDivElement>(null);
  const [indicata, setIndicata] = useState<string | null>(null);
  const [altreSotto, setAltreSotto] = useState(false);
  const mostrata = voci.find((v) => v.id === indicata) ?? voci.find((v) => v.id === selezionata);

  const aggiorna = () => {
    const el = lista.current;
    if (el) setAltreSotto(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  };
  useEffect(aggiorna, [voci.length]);

  // La prima volta la griglia sale un poco e torna giù (animazione CSS): fa capire che sotto ci sono altre materie.
  const [accenno, setAccenno] = useState(false);
  useEffect(() => {
    const el = lista.current;
    if (!el || el.scrollHeight - el.clientHeight < 8) return;
    let visto = false;
    try { visto = localStorage.getItem(ACCENNO) === '1'; } catch { /* archivio non disponibile */ }
    if (visto) return;
    setAccenno(true);
    const fine = setTimeout(() => {
      setAccenno(false);
      try { localStorage.setItem(ACCENNO, '1'); } catch { /* archivio non disponibile */ }
    }, 2600);
    return () => clearTimeout(fine);
  }, [voci.length]);

  return <div className={`materia-griglia${altreSotto ? ' altre-sotto' : ''}`}>
    <div ref={lista} className={`materia-lista ${className}${accenno ? ' accenno' : ''}`} role="group" aria-label="Materie" onScroll={aggiorna}>
      {voci.map((m) => <span key={m.id} className="materia-casella"
        onPointerEnter={() => setIndicata(m.id)} onPointerLeave={() => setIndicata(null)}
        onFocus={() => setIndicata(m.id)} onBlur={() => setIndicata(null)}>
        <button className={`materia-btn${m.id === selezionata ? ' on' : ''}`} disabled={!m.pronta}
          aria-label={m.nome} title={m.nome} aria-pressed={m.pronta ? m.id === selezionata : undefined}
          onClick={() => onSelect(m.id)}>
          <span className="materia-dot" style={{ background: m.pronta ? m.colore ?? undefined : undefined }} />
          <Icon n={iconaMateria(m.nome)} size={32} stroke={1.45} />
        </button>
      </span>)}
    </div>
    <div className="materia-didascalia" aria-hidden="true">
      <b>{mostrata?.nome ?? ' '}</b>
      <span>{mostrata?.dettagli || ' '}</span>
    </div>
  </div>;
}
