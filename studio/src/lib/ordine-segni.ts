import type { SegnoOriginale } from './originali';

/**
 * Ordine di lettura dei segni: pagina, blocco, posizione nel blocco; per i segni
 * dal PDF, posizione verticale e poi orizzontale. Mai l'ordine in cui sono stati fatti.
 */
export type PosizioneTesto = readonly number[];

export function confrontaPosizioni(a: PosizioneTesto = [], b: PosizioneTesto = []): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -1, y = b[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

const paginaDaBlocco = (id: string) => { const m = /(?:^|-)p(\d+)-/.exec(id); return m ? Number(m[1]) : null; };
const numeroBlocco = (id: string) => { const m = /-b(\d+)$/.exec(id); return m ? Number(m[1]) : 0; };

/** `indiceBlocco` restituisce l'ordine del blocco nel testo caricato, se disponibile. */
export function posizioneSegno(segno: SegnoOriginale, indiceBlocco?: (id: string) => number | undefined): number[] {
  const ancore = segno.ancoreTesto ?? [];
  if (ancore.length) {
    const chiavi = ancore.map((a) => [paginaDaBlocco(a.blocco) ?? segno.pagina, indiceBlocco?.(a.blocco) ?? numeroBlocco(a.blocco), a.inizio, 0, 0]);
    return chiavi.reduce((min, k) => confrontaPosizioni(k, min) < 0 ? k : min);
  }
  const rett = segno.rettangoli.filter((r) => Number.isFinite(r.y) && Number.isFinite(r.x));
  const primo = rett.reduce<typeof rett[number] | null>((min, r) => !min || r.y < min.y - 0.002 || (Math.abs(r.y - min.y) <= 0.002 && r.x < min.x) ? r : min, null);
  return [segno.pagina, -1, -1, primo?.y ?? 0, primo?.x ?? 0];
}

/** Ordina una copia dei segni nell'ordine del testo; a parità, il più vecchio prima. */
export function ordinaSegniNelTesto(segni: readonly SegnoOriginale[], indiceBlocco?: (id: string) => number | undefined): SegnoOriginale[] {
  const pos = new Map(segni.map((s) => [s, posizioneSegno(s, indiceBlocco)]));
  return [...segni].sort((a, b) => confrontaPosizioni(pos.get(a), pos.get(b)) || a.creata.localeCompare(b.creata));
}
