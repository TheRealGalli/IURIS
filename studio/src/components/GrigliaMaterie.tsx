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

export default function GrigliaMaterie({ corso, materie, selezionata, onSelect, className = '' }: {
  corso: CorsoDiStudio; materie: MateriaInfo[]; selezionata: string; onSelect: (slug: string) => void; className?: string;
}) {
  const voci = [
    ...materie.map((m) => ({ id: m.slug, nome: m.nome, colore: m.colore, pronta: m.disponibile, dettagli: docenteDi(corso, m.slug) })),
    ...(corso.inArrivo ?? []).map((m) => ({ id: m.nome, nome: m.nome, colore: m.colore, pronta: false,
      dettagli: [m.docente, m.cfu && `${m.cfu} CFU`, m.semestre && (m.semestre === 'Annuale' ? 'annuale' : `${m.semestre} semestre`)].filter(Boolean).join(' · ') })),
  ];
  return <div className={`materia-lista ${className}`} role="group" aria-label="Materie">
    {voci.map((m) => <span key={m.id} className="materia-casella">
      <button className={`materia-btn${m.id === selezionata ? ' on' : ''}`} disabled={!m.pronta}
        aria-label={m.nome} title={m.nome} aria-pressed={m.pronta ? m.id === selezionata : undefined}
        onClick={() => onSelect(m.id)}>
        <span className="materia-dot" style={{ background: m.pronta ? m.colore ?? undefined : undefined }} />
        <Icon n={iconaMateria(m.nome)} size={32} stroke={1.45} />
      </button>
      <span className="materia-nome" aria-hidden="true">{m.nome}{m.dettagli && <span className="materia-dettagli">{m.dettagli}</span>}</span>
    </span>)}
  </div>;
}
