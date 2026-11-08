import { useState, type ReactNode } from 'react';
import MobileSheet, { useCompact } from './MobileSheet';
import { inDemo } from '../lib/archivio';
import { Icon } from './ui';

/** Sul desktop i comandi mantengono il loro markup; su touch liberano tutta la mappa. */
export default function MapTools({ children, legend }: {
  children: ReactNode; legend: ReactNode;
}) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  if (!compact) return <div className="map-tools">{children}</div>;
  return <>
    <button className="mobile-map-filters mobile-icon" onClick={() => setOpen(true)} aria-label="Cerca e filtra la mappa" title="Strumenti mappa"><Icon n="filtri" size={20} /></button>
    <MobileSheet open={open} onClose={() => setOpen(false)} title="Strumenti mappa" className="mobile-map-sheet" modal={!inDemo()}>
      <div className="map-tools" onClick={(e) => { if ((e.target as Element).closest(".palette-item")) setOpen(false); }}>{children}</div>
      <details className="mobile-map-legend"><summary><Icon n="info" size={18} />Guida ai colori</summary><div className="map-legend">{legend}</div></details>
      <button className="btn btn-primary mobile-map-done" onClick={() => setOpen(false)}>Torna alla mappa<Icon n="freccia" size={17} /></button>
    </MobileSheet>
  </>;
}
