import type { MateriaInfo } from '../lib/types';
import { CORSI, corsoDi, corsoDisponibile, descriviCorso, linkMateriale, type CorsoDiStudio } from '../data/corsi';
import { leggiPref, scriviPref } from '../lib/store';
import { href, vai } from '../lib/router';
import { Icon } from './ui';
import IurisMascot from './IurisMascot';
import MobileSheet from './MobileSheet';

type Item = { to: string; key: string; label: string; icon: string };
export function MobileHeader({ onSearch }: { onSearch: () => void }) {
  return <header className="mobile-header"><button className="mobile-icon" onClick={onSearch} aria-label="Cerca"><Icon n="cerca" size={21} /></button></header>;
}

export function MobileTabs({ items, section, path, onMenu }: { items: Item[]; section: string; path: string; onMenu: () => void }) {
  const current = items.find((n) => n.key === section) ?? (section === 'backup'
    ? { key: 'backup', label: 'Backup', icon: 'backup' }
    : { key: 'altro', label: 'Altro', icon: 'altro' });
  return <nav className="mobile-tabs" aria-label="Sezioni">
    <a href={path || href('/')} aria-current="page" className="on"><Icon n={current.icon} size={21} /><span>{current.key === 'allena' ? 'Allena' : current.label}</span></a>
    <button onClick={onMenu} aria-label="Apri menu"><Icon n="menu" size={21} /><span>Menu</span></button>
  </nav>;
}

export function MobileMenu({ panel, onClose, onStudy, corso, materie, materia, items, section, onMateria }: {
  panel: 'menu' | 'study' | null; onClose: () => void; onStudy: () => void; corso: CorsoDiStudio; materie: MateriaInfo[]; materia: MateriaInfo; items: Item[]; section: string; onMateria: (slug: string) => void;
}) {
  const navigate = (to: string) => { onClose(); vai(to); };
  const scegliCorso = (id: string) => {
    const nuovo = corsoDi(id);
    scriviPref({ corso: nuovo.id, ...(nuovo.materie.includes(leggiPref().materia ?? '') ? {} : { materia: nuovo.materie[0] }) });
    vai('/');
  };
  return <MobileSheet open={!!panel} onClose={onClose} title={panel === 'study' ? 'Corso e materie' : 'Il tuo studio'} className="mobile-navigation-sheet">
    {panel === 'study' ? <>
      <label className="mobile-field">Il tuo corso<select className="select" aria-label="Corso di studio" value={corso.id} onChange={(e) => scegliCorso(e.target.value)}>{CORSI.map((c) => <option key={c.id} value={c.id} disabled={!corsoDisponibile(c)}>{c.breve}{!corsoDisponibile(c) ? ' · in arrivo' : ''}</option>)}</select></label>
      <p className="mobile-course-description">{descriviCorso(corso)}</p>
      <h3 className="mobile-section-label">Scegli la materia</h3>
      <div className="mobile-subjects">{materie.map((m) => <button key={m.slug} aria-pressed={m.slug === materia.slug} onClick={() => { onMateria(m.slug); onClose(); }}><span className="materia-dot" style={{ background: m.colore ?? undefined }} /><span>{m.nome}</span>{m.slug === materia.slug && <Icon n="check" size={19} />}</button>)}
        {(corso.inArrivo ?? []).map((m) => <button key={m.nome} disabled><span className="materia-dot" style={{ background: m.colore ?? undefined }} /><span>{m.nome}</span><small>In arrivo</small></button>)}
      </div>
    </> : <>
      <button className="mobile-course-card" onClick={onStudy}><span><small>{corso.breve}</small><strong>{materia.breve ?? materia.nome}</strong></span><span className="mobile-change">Cambia<Icon n="giu" size={13} /></span></button>
      <nav className="mobile-menu-grid" aria-label="Tutte le sezioni">{items.map((n) => <a key={n.key} href={href(n.to)} aria-current={section === n.key ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(n.to); }}><Icon n={n.icon} size={21} /><span>{n.label}</span>{section === n.key && <span className="mobile-current" />}</a>)}</nav>
      <div className="mobile-menu-utilities">
        <a href={href('/backup')} onClick={(e) => { e.preventDefault(); navigate('/backup'); }}><Icon n="backup" size={21} /><span>Backup completo<small>Tutte le materie</small></span><Icon n="freccia" size={16} /></a>
        <a href={href('/demo')} onClick={(e) => { e.preventDefault(); navigate('/demo'); }}><IurisMascot /><span>Demo interattiva</span><Icon n="freccia" size={16} /></a>
        <a href={linkMateriale(corso)} target="_blank" rel="noopener noreferrer"><Icon n="whatsapp" size={21} /><span>Condividi materiale<small>Invia le tue sbobine su WhatsApp</small></span><Icon n="freccia" size={16} /></a>
      </div>
    </>}
  </MobileSheet>;
}
