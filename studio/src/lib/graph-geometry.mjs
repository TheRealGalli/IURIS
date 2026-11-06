// Geometria condivisa tra il precalcolo della mappa e le etichette SVG.
export const GRAPH_LABEL_WIDTH = 180;
export const GRAPH_LABEL_FONT = 11;
export const GRAPH_LABEL_LINE = 14;

export const graphNodeRadius = (degree) => 5 + Math.sqrt(degree) * 2.4;

// Stima prudente per il font sans: non serve misurare centinaia di testi nel DOM.
export function graphTextWidth(text, fontSize = GRAPH_LABEL_FONT) {
  let units = 0;
  for (const ch of text) {
    units += /[ilIjtfr.,:;'!|\s]/u.test(ch) ? 0.34
      : /[MWmw@%]/u.test(ch) ? 0.92
      : /[A-ZÀ-Þ]/u.test(ch) ? 0.73 : 0.62;
  }
  return units * fontSize;
}

export function graphLabelLines(text, maxWidth = GRAPH_LABEL_WIDTH, fontSize = GRAPH_LABEL_FONT) {
  const lines = [];
  let line = '';
  for (const word of text.trim().split(/\s+/u)) {
    const next = line ? `${line} ${word}` : word;
    if (graphTextWidth(next, fontSize) <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = '';
    // Anche un termine senza spazi deve entrare nella larghezza disponibile.
    for (const ch of word) {
      if (line && graphTextWidth(line + ch, fontSize) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function graphNodeBounds(node, padding = 12) {
  const radius = graphNodeRadius(node.grado);
  const lines = graphLabelLines(node.nome);
  const halfWidth = Math.max(radius, ...lines.map((line) => graphTextWidth(line) / 2));
  return {
    x0: node.x - halfWidth - padding,
    y0: node.y - radius - padding,
    x1: node.x + halfWidth + padding,
    y1: node.y + radius + 12 + (lines.length - 1) * GRAPH_LABEL_LINE + 4 + padding,
  };
}
