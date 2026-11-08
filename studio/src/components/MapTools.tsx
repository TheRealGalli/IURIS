import { useState, type ReactNode } from 'react';
import MobileSheet, { useCompact } from './MobileSheet';
import { inDemo } from '../lib/archivio';
import { Icon } from './ui';

/** Sul desktop i comandi mantengono il loro markup; su touch liberano tutta la mappa. */
export default function MapTools({ children, legend, onFit, onZoom }: {
  children: ReactNode; legend: ReactNode; onFit: () => void; onZoom: (factor: number) => void;
}) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  if (!compact) return <div className="map-tools">{children}</div>;
  return <>
    <div className="mobile-map-dock">
      <button className="mobile-map-filters" onClick={() => setOpen(true)} aria-label="Cerca e filtra la mappa"><Icon n="filtri" size={19} /><span>Cerca e filtra</span></button>
      <button onClick={onFit} aria-label="Adatta la mappa"><Icon n="espandi" size={19} /></button>
      <button onClick={() => onZoom(1 / 1.35)} aria-label="Riduci zoom">−</button>
      <button onClick={() => onZoom(1.35)} aria-label="Aumenta zoom">+</button>
    </div>
    <MobileSheet open={open} onClose={() => setOpen(false)} title="Strumenti mappa" className="mobile-map-sheet" modal={!inDemo()}>
      <div className="map-tools" onClick={(e) => { if ((e.target as Element).closest(".palette-item")) setOpen(false); }}>{children}</div>
      <details className="mobile-map-legend"><summary><Icon n="info" size={18} />Guida ai colori</summary><div className="map-legend">{legend}</div></details>
      <button className="btn btn-primary mobile-map-done" onClick={() => setOpen(false)}>Torna alla mappa<Icon n="freccia" size={17} /></button>
    </MobileSheet>
  </>;
}
