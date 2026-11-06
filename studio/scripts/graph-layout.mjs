import { graphNodeBounds } from '../src/lib/graph-geometry.mjs';

/** Libera lo spazio occupato da ciascun punto e dal suo nome, senza ingrandire i nodi.
 *  La scala opzionale serve solo ai precalcoli; nel browser non si esegue il layout. */
export function spaceGraphNodes(nodes, { scaleX = 1, scaleY = 1 } = {}) {
  const cellSize = 128;
  const cells = new Map();
  const positions = new Map();
  let rightmost = -Infinity;
  const cellKeys = (box) => {
    const keys = [];
    for (let x = Math.floor(box.x0 / cellSize); x <= Math.floor(box.x1 / cellSize); x++) {
      for (let y = Math.floor(box.y0 / cellSize); y <= Math.floor(box.y1 / cellSize); y++) keys.push(`${x},${y}`);
    }
    return keys;
  };
  const free = (box) => {
    const checked = new Set();
    for (const key of cellKeys(box)) for (const other of cells.get(key) ?? []) {
      if (checked.has(other)) continue;
      checked.add(other);
      if (box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0) return false;
    }
    return true;
  };
  // Prima i nodi più connessi: il loro contesto conserva il centro del gruppo.
  const ordered = [...nodes].sort((a, b) => b.grado - a.grado || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const node of ordered) {
    const origin = { ...node, x: Math.round(node.x * scaleX), y: Math.round(node.y * scaleY) };
    let placed = origin;
    const originBox = graphNodeBounds(origin);
    let box = originBox;
    if (!free(box)) {
      let found = false;
      // Si cerca il posto libero più vicino, anziché far ripartire una simulazione.
      for (let ring = 1; ring <= 128 && !found; ring++) {
        const radius = ring * 24;
        const steps = Math.max(12, Math.ceil(Math.PI * 2 * radius / 24));
        for (let step = 0; step < steps; step++) {
          const angle = step / steps * Math.PI * 2;
          const candidate = { ...origin, x: Math.round(origin.x + Math.cos(angle) * radius), y: Math.round(origin.y + Math.sin(angle) * radius) };
          const dx = candidate.x - origin.x, dy = candidate.y - origin.y;
          const candidateBox = { x0: originBox.x0 + dx, y0: originBox.y0 + dy, x1: originBox.x1 + dx, y1: originBox.y1 + dy };
          if (!free(candidateBox)) continue;
          placed = candidate; box = candidateBox; found = true; break;
        }
      }
      if (!found) {
        // Dati futuri eccezionalmente densi: una posizione libera è comunque garantita.
        placed = { ...origin, x: Math.ceil(origin.x + rightmost - originBox.x0 + 24) };
        box = graphNodeBounds(placed);
      }
    }
    positions.set(node.id, [placed.x, placed.y]);
    rightmost = Math.max(rightmost, box.x1);
    for (const key of cellKeys(box)) {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(box);
    }
  }
  return Object.fromEntries(nodes.map((node) => [node.id, positions.get(node.id)]));
}
