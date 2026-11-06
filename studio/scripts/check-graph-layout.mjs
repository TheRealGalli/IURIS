import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphLabelLines, graphNodeBounds, graphNodeRadius, graphTextWidth, GRAPH_LABEL_LINE } from '../src/lib/graph-geometry.mjs';
import { placeGraphLabels } from '../src/lib/graph-labels.mjs';
import { spaceGraphNodes } from './graph-layout.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const checkBoxes = (nodes, positions) => {
  const boxes = nodes.map((node) => {
    const position = positions[node.id];
    assert(position?.every(Number.isFinite), `Coordinate mancanti/non finite: ${node.id}`);
    return graphNodeBounds({ ...node, x: position[0], y: position[1] });
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert(!overlap(boxes[i], boxes[j]), `Nomi o nodi sovrapposti: ${nodes[i].id}, ${nodes[j].id}`);
  }
};

const rectBounds = (box) => ({ x0: box.x, y0: box.y, x1: box.x + box.width, y1: box.y + box.height });
const checkRelationLabels = (labels, obstacles, context) => {
  const start = performance.now();
  const placed = placeGraphLabels(labels, obstacles);
  const elapsed = performance.now() - start;
  assert.equal(placed.length, labels.length, `Collegamenti persi: ${context}`);
  const boxes = placed.map((label, i) => {
    const input = labels[i];
    assert.equal(label.id, input.id, `Ordine dei collegamenti cambiato: ${context}`);
    assert.equal(label.text, input.text, `Frase cambiata: ${context}`);
    assert.deepEqual(label.source, input.source, `Origine del collegamento cambiata: ${context}`);
    assert.deepEqual(label.target, input.target, `Destinazione del collegamento cambiata: ${context}`);
    assert.equal(label.lines.join('').replace(/\s/gu, ''), input.text.replace(/\s/gu, ''), `Frase tagliata: ${context}`);
    assert(label.lines.every((line) => graphTextWidth(line, 10.5) <= 180), `Frase troppo larga: ${context}`);
    assert([label.x, label.y, label.width, label.height, label.anchor.x, label.anchor.y].every(Number.isFinite), `Posizione non finita: ${context}`);
    // Anche il margine di sicurezza da 5 unità deve restare libero.
    return { x0: label.x - label.width / 2 - 5, y0: label.y - label.height / 2 - 5,
      x1: label.x + label.width / 2 + 5, y1: label.y + label.height / 2 + 5 };
  });
  const obstacleBoxes = obstacles.map(rectBounds);
  for (let i = 0; i < boxes.length; i++) {
    assert(!obstacleBoxes.some((obstacle) => overlap(boxes[i], obstacle)), `Frase su punto o nome: ${context}, ${i}`);
    for (let j = i + 1; j < boxes.length; j++) assert(!overlap(boxes[i], boxes[j]), `Frasi sovrapposte: ${context}, ${i}/${j}`);
  }
  return elapsed;
};

// Stessi ingombri dell'overlay di Mappa.tsx: ogni cerchio, più i nomi dei vicini.
const overlayObstacles = (nodes, neighbors) => [
  ...nodes.map((node) => {
    const radius = graphNodeRadius(node.grado) + 6;
    return { x: node.x - radius, y: node.y - radius, width: radius * 2, height: radius * 2 };
  }),
  ...nodes.filter((node) => neighbors.has(node.id)).map((node) => {
    const lines = graphLabelLines(node.nome);
    const width = Math.max(...lines.map((line) => graphTextWidth(line)));
    return { x: node.x - width / 2 - 8, y: node.y + graphNodeRadius(node.grado), width: width + 16,
      height: 16 + lines.length * GRAPH_LABEL_LINE };
  }),
];

// Nodi coincidenti e termini lunghi: nessuna parola persa, né collisioni residue.
const fixture = Array.from({ length: 50 }, (_, i) => ({
  id: `n${i}`, nome: i % 2 ? 'Ius (publice) respondendi ex auctoritate principis' : 'W'.repeat(60),
  grado: i, x: i % 3, y: i % 4,
}));
const layout = spaceGraphNodes(fixture);
assert.deepEqual(layout, spaceGraphNodes([...fixture].reverse()), 'Il layout dipende dall’ordine dei dati');
checkBoxes(fixture, layout);
for (const node of fixture) {
  const lines = graphLabelLines(node.nome);
  assert.equal(lines.join('').replace(/\s/gu, ''), node.nome.replace(/\s/gu, ''), 'Testo perso nel ritorno a capo');
  assert(lines.every((line) => graphTextWidth(line) <= 180), 'Etichetta oltre la larghezza prevista');
}

// Molte frasi sullo stesso segmento, direzioni opposte, archi convergenti e un cappio.
const relationNodes = [
  { id: 'hub', nome: 'Costitutiones principum', grado: 40, x: 0, y: 0 },
  ...Array.from({ length: 6 }, (_, i) => ({ id: `v${i}`, nome: `Fonte primaria ${i}`, grado: 4,
    x: Math.cos(i * Math.PI / 3) * 180, y: Math.sin(i * Math.PI / 3) * 180 })),
];
const relationFixture = Array.from({ length: 28 }, (_, i) => ({
  id: i, text: i % 2 ? 'contribuisce, salvo alcune eccezioni, al superamento delle forme precedenti e alla stabilizzazione dei rapporti'
    : 'disciplina le relazioni fra i soggetti secondo il diritto vigente',
  source: i < 12 || i === 27 ? relationNodes[0] : relationNodes[1 + i % 6],
  target: i === 27 ? relationNodes[0] : i < 12 ? relationNodes[1] : relationNodes[0],
}));
const relationFixtureObstacles = overlayObstacles(relationNodes, new Set(relationNodes.map((node) => node.id)));
checkRelationLabels(relationFixture, relationFixtureObstacles, 'ventaglio convergente e archi multipli');
assert.deepEqual(placeGraphLabels(relationFixture, relationFixtureObstacles), placeGraphLabels(relationFixture, relationFixtureObstacles),
  'Il posizionamento delle frasi non è deterministico');
checkRelationLabels([], relationFixtureObstacles, 'nessuna relazione');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/content/manifest.json'), 'utf8'));
for (const entry of manifest.materie.filter((entry) => entry.disponibile)) {
  const course = JSON.parse(fs.readFileSync(path.join(root, 'public', entry.file), 'utf8'));
  const degree = new Map();
  for (const edge of course.relazioni) {
    degree.set(edge.da, (degree.get(edge.da) ?? 0) + 1);
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
  }
  const nodes = course.concetti.map((node) => ({ ...node, grado: degree.get(node.id) ?? 0,
    x: course.grafo[node.id][0], y: course.grafo[node.id][1] }));
  checkBoxes(nodes, course.grafo);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let maxTime = 0, maxLabels = 0;
  const hubs = [...nodes].sort((a, b) => b.grado - a.grado).slice(0, 8);
  for (const hub of hubs) {
    const edges = course.relazioni.filter((edge) => edge.da === hub.id || edge.a === hub.id);
    const neighbors = new Set([hub.id, ...edges.flatMap((edge) => [edge.da, edge.a])]);
    const labels = edges.flatMap((edge, i) => edge.etichetta ? [{ id: i, text: edge.etichetta,
      source: byId.get(edge.da), target: byId.get(edge.a) }] : []);
    const elapsed = checkRelationLabels(labels, overlayObstacles(nodes, neighbors), `${entry.slug}/${hub.id}`);
    maxTime = Math.max(maxTime, elapsed); maxLabels = Math.max(maxLabels, labels.length);
  }
  console.log(`[graph] ${entry.slug}: ${course.concetti.length} nodi e nomi senza collisioni; ${hubs.length} hub, fino a ${maxLabels} frasi, placement massimo ${maxTime.toFixed(1)} ms`);
}
