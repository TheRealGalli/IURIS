import { Icon } from '../components/ui';
import { useCorso } from '../lib/data';

export default function Originali() {
  const idx = useCorso();

  return (
    <div className="page fade-in">
      <div className="eyebrow">{idx.corso.materia.nome}</div>
      <h1 className="title-xl" style={{ margin: '6px 0 18px' }}>Originali</h1>

      <div className="card stack" style={{ gap: 10 }}>
        <Icon n="libro" size={26} />
        <h2 className="title-m">In preparazione</h2>
        <p className="muted" style={{ margin: 0 }}>Qui troverai gli appunti e le fonti originali di questa materia.</p>
      </div>
    </div>
  );
}
