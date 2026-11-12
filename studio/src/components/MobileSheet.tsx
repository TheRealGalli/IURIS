import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './ui';

export const COMPACT_QUERY = '(max-width: 860px), (max-width: 1280px) and (pointer: coarse)';
const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(COMPACT_QUERY) : null;
const subscribe = (cb: () => void) => { query?.addEventListener('change', cb); return () => query?.removeEventListener('change', cb); };
export const useCompact = () => useSyncExternalStore(subscribe, () => query?.matches ?? false, () => false);
/** Telefono: larghezza da telefono, o telefono in orizzontale (poco alto e touch). L'iPad resta fuori. */
export const TELEFONO_QUERY = '(max-width: 700px), (max-height: 500px) and (pointer: coarse)';
const queryTelefono = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(TELEFONO_QUERY) : null;
const subscribeTelefono = (cb: () => void) => { queryTelefono?.addEventListener('change', cb); return () => queryTelefono?.removeEventListener('change', cb); };
export const useTelefono = () => useSyncExternalStore(subscribeTelefono, () => queryTelefono?.matches ?? false, () => false);
export const MobileNavigation = createContext({ openMenu: () => {} });
export const useMobileNavigation = () => useContext(MobileNavigation);

export default function MobileSheet({ open, onClose, title, children, className = '', modal = true }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; modal?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    if (modal) { el.showModal(); document.body.style.overflow = 'hidden'; } else el.show();
    const cancel = (e: Event) => { e.preventDefault(); close.current(); };
    el.addEventListener('cancel', cancel);
    return () => {
      el.removeEventListener('cancel', cancel); el.close();
      if (modal) document.body.style.overflow = overflow;
      if (previous?.isConnected && previous.getBoundingClientRect().width) previous.focus({ preventScroll: true });
    };
  }, [open, modal]);
  if (!open) return null;
  return createPortal(<dialog ref={ref} className={`mobile-sheet ${className}`} aria-labelledby={id} aria-modal={modal}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mobile-sheet-grip" aria-hidden="true" />
    <header className="mobile-sheet-header"><h2 id={id}>{title}</h2><button className="mobile-icon" onClick={onClose} aria-label={`Chiudi ${title.toLowerCase()}`}><Icon n="x" size={20} /></button></header>
    <div className="mobile-sheet-content">{children}</div>
  </dialog>, document.body);
}
