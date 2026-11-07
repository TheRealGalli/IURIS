import { useEffect, useRef, type RefObject } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition';

export interface OpzioniZoom {
  /** Ruota del mouse: se false, zooma solo con pizzico o Ctrl/⌘ (la pagina continua a scorrere). */
  rotella?: boolean;
  /** I gesti che partono da qui dentro (pulsanti dello zoom, menu) non spostano la mappa. */
  ignora?: string;
}

/**
 * Zoom e trascinamento con d3-zoom, condivisi dalle mappe (SVG) e dalla mappa del testo (HTML).
 * `applica` riceve la trasformazione: chi la usa decide se scriverla su un <g> o su un CSS transform.
 */
export function useZoom<E extends Element>(surfaceRef: RefObject<E | null>, applica: (t: ZoomTransform) => void, minZoom = 0.15, opzioni: OpzioniZoom = {}) {
  const zRef = useRef<ZoomBehavior<E, unknown>>();
  useEffect(() => {
    if (!surfaceRef.current) return;
    const surface = select(surfaceRef.current);
    let inMovimento = false;
    const z = zoom<E, unknown>().scaleExtent([minZoom, 4]).clickDistance(4)
      .on('end.layers', () => { inMovimento = false; surface.attr('data-moving', null); })
      .on('zoom', (e) => {
        if (!inMovimento) { inMovimento = true; surface.attr('data-moving', 'true'); }
        applica(e.transform);
      });
    if (opzioni.rotella === false || opzioni.ignora) z.filter((e: any) => {
      if (opzioni.ignora && (e.target as Element | null)?.closest?.(opzioni.ignora)) return false;
      if (e.type === 'wheel') return opzioni.rotella === false ? e.ctrlKey || e.metaKey : true;
      return !e.ctrlKey && !e.button;
    });
    surface.call(z).on('dblclick.zoom', null);
    zRef.current = z;
    return () => {
      // Anche cambiando pagina durante un'animazione, non restano timer o gesti sul vecchio elemento.
      surface.interrupt().on('.zoom', null);
      z.on('zoom', null).on('end.layers', null);
      surface.attr('data-moving', null);
      zRef.current = undefined;
    };
  }, []);
  const misura = () => surfaceRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 };
  const vai = (t: ZoomTransform, durata: number) => {
    const el = surfaceRef.current; if (!el || !zRef.current) return;
    if (durata) select(el).transition().duration(durata).call(zRef.current.transform as any, t);
    else select(el).call(zRef.current.transform as any, t);
  };
  const fit = (bbox: { x: number; y: number; w: number; h: number }, pad = 40, maxK = 1.2, minK = minZoom, durata = 450) => {
    const { width, height } = misura();
    if (!zRef.current || !width) return;
    const k = Math.max(minK, Math.min(maxK, (width - pad * 2) / Math.max(1, bbox.w), (height - pad * 2) / Math.max(1, bbox.h)));
    // se non entra tutto, si parte dall'inizio (sinistra) invece che dal centro
    const tx = bbox.w * k > width - pad * 2 ? pad - bbox.x * k : width / 2 - (bbox.x + bbox.w / 2) * k;
    vai(zoomIdentity.translate(tx, height / 2 - (bbox.y + bbox.h / 2) * k).scale(k), durata);
  };
  const imposta = (x: number, y: number, k: number, durata = 0) => vai(zoomIdentity.translate(x, y).scale(k), durata);
  const centra = (x: number, y: number, k = 1.4) => {
    const { width, height } = misura();
    vai(zoomIdentity.translate(width / 2 - x * k, height / 2 - y * k).scale(k), 500);
  };
  const zoomBy = (factor: number) => {
    if (surfaceRef.current && zRef.current) select(surfaceRef.current).transition().duration(180).call(zRef.current.scaleBy as any, factor);
  };
  const sposta = (dx: number, dy: number) => { if (surfaceRef.current && zRef.current) select(surfaceRef.current).call(zRef.current.translateBy as any, dx, dy); };
  const limitaInsieme = (bbox: { w: number; h: number }) => {
    const { width, height } = misura();
    if (!zRef.current) return;
    const minimo = Math.min(1, (width - 80) / Math.max(1, bbox.w), (height - 80) / Math.max(1, bbox.h));
    zRef.current.scaleExtent([Math.max(.005, minimo * .9), 4]);
  };
  const limiti = (min: number, max: number) => zRef.current?.scaleExtent([min, max]);
  return { fit, centra, zoomBy, limitaInsieme, imposta, sposta, limiti };
}
