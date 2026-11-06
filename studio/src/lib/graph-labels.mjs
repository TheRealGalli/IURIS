import { graphLabelLines, graphTextWidth } from './graph-geometry.mjs';

// Un indice a celle evita di confrontare ogni frase con tutti i concetti della mappa.
class OccupiedSpace {
  cells = new Map();
  keys(box) {
    const keys = [];
    for (let x = Math.floor(box.x / 160); x <= Math.floor((box.x + box.width) / 160); x++) {
      for (let y = Math.floor(box.y / 160); y <= Math.floor((box.y + box.height) / 160); y++) keys.push(`${x},${y}`);
    }
    return keys;
  }
  add(box) {
    for (const key of this.keys(box)) {
      const cell = this.cells.get(key) ?? [];
      cell.push(box); this.cells.set(key, cell);
    }
  }
  free(box) {
    return this.keys(box).every((key) => !(this.cells.get(key) ?? []).some((b) =>
      box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y));
  }
}

/** Frasi complete, su più righe, vicino al collegamento e fuori da punti, nomi e altre frasi.
 * Calcolato solo al cambio del concetto attivo: lo zoom continua a muovere il solo gruppo SVG. */
export function placeGraphLabels(labels, obstacles) {
  const occupied = new OccupiedSpace();
  for (const box of obstacles) occupied.add(box);
  const prepared = labels.map((label) => {
    const lines = graphLabelLines(label.text, 180, 10.5);
    return { ...label, lines, width: Math.max(...lines.map((line) => graphTextWidth(line, 10.5))) + 16, height: lines.length * 14 + 12 };
  });
  const placed = new Map();
  // Le frasi più ingombranti hanno la prima scelta; l'ordine finale resta quello dei collegamenti.
  for (const label of [...prepared].sort((a, b) => b.width * b.height - a.width * a.height || a.id - b.id)) {
    const dx = label.target.x - label.source.x, dy = label.target.y - label.source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nx = -dy / distance, ny = dx / distance;
    const boxAt = (x, y) => ({ x: x - label.width / 2 - 5, y: y - label.height / 2 - 5, width: label.width + 10, height: label.height + 10 });
    let position;
    for (const offset of [0, 24, -24, 48, -48, 80, -80, 120, -120, 180, -180, 260, -260, 360, -360]) {
      for (const t of [.5, .38, .62, .26, .74]) {
        const anchor = { x: label.source.x + dx * t, y: label.source.y + dy * t };
        const x = anchor.x + nx * offset, y = anchor.y + ny * offset;
        if (occupied.free(boxAt(x, y))) { position = { x, y, anchor }; break; }
      }
      if (position) break;
    }
    // Un ventaglio molto denso può richiedere più spazio del tratto stesso.
    // La ricerca continua all'esterno: nessuna frase viene tagliata o sovrapposta per farla entrare.
    const middle = { x: (label.source.x + label.target.x) / 2, y: (label.source.y + label.target.y) / 2 };
    for (let radius = 420; !position; radius += 80) {
      for (let i = 0; i < 24; i++) {
        const angle = i * Math.PI / 12;
        const x = middle.x + Math.cos(angle) * radius, y = middle.y + Math.sin(angle) * radius;
        if (occupied.free(boxAt(x, y))) { position = { x, y, anchor: middle }; break; }
      }
    }
    occupied.add(boxAt(position.x, position.y));
    placed.set(label.id, { ...label, ...position });
  }
  return labels.map((label) => placed.get(label.id));
}
