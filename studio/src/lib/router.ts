// Router minimo basato sull'hash: #/lezione/u01-l2?x=1
import { useSyncExternalStore } from 'react';

export interface Rotta { parti: string[]; query: URLSearchParams; hash: string }

function parse(hash: string): Rotta {
  const raw = hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { parti: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q), hash };
}

let corrente = parse(location.hash);
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  corrente = parse(location.hash);
  subs.forEach((s) => s());
});

export function useRotta(): Rotta {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => corrente);
}

export function vai(to: string) {
  const h = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`;
  if (location.hash === h) return;
  location.hash = h;
  window.scrollTo({ top: 0 });
}

export const href = (to: string) => `#${to.startsWith('/') ? to : `/${to}`}`;
