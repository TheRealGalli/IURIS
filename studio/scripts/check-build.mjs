// Verifica l'artefatto statico prima di pubblicarlo: risorse locali, corsi e assenza di file estranei.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const file = (relative) => {
  const absolute = path.resolve(root, relative);
  assert(absolute.startsWith(root), `Percorso fuori dal sito: ${relative}`);
  assert(fs.statSync(absolute).isFile(), `File mancante: ${relative}`);
  return absolute;
};
const json = (relative) => JSON.parse(fs.readFileSync(file(relative), 'utf8'));

const html = fs.readFileSync(file('index.html'), 'utf8');
for (const [, resource] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^https?:\/\//.test(resource)) continue;
  assert(!resource.startsWith('/'), `Risorsa non relativa: ${resource}`);
  file(resource);
}
const manifest = json('content/manifest.json');
const originali = JSON.parse(fs.readFileSync(new URL('../src/lib/originali-catalogo.json', import.meta.url), 'utf8'));
const pdfConsentiti = new Set(originali.filter((d) => d.file).map((d) => d.file));
for (const d of originali) {
  if (d.tipoFonte === 'manuale-ricostruito') {
    assert(!d.file && !d.sha256, 'Le ricostruzioni non devono dichiarare un PDF originale');
    continue;
  }
  assert(d.file.startsWith('originali/') && d.file.endsWith('.pdf'), `Percorso originale non valido: ${d.id}`);
  const bytes = fs.readFileSync(file(d.file));
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', `PDF non valido: ${d.id}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), d.sha256, `Il file originale è cambiato senza aggiornare la versione: ${d.id}`);
}
const materie = manifest.materie.filter((m) => m.disponibile);
assert(materie.length > 0, 'Nessuna materia generata: controllare le cartelle 05 - Contenuti');
for (const m of materie) {
  assert(typeof m.file === 'string' && !m.file.startsWith('/'), `Percorso del corso non valido: ${m.slug}`);
  const c = json(m.file);
  assert.equal(c.materia.slug, m.slug);
  assert(c.unita.length > 0 && c.concetti.length > 0 && c.domande.length > 0, `Corso incompleto: ${m.slug}`);
  assert.equal(c.unita.length, m.stats.unita);
  assert.equal(c.domande.length, m.stats.domande);
}
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  assert(!entry.isSymbolicLink(), `Link simbolico nel sito: ${entry.name}`);
  assert(!entry.name.startsWith('.'), `File nascosto nel sito: ${entry.name}`);
  const relativo = path.relative(root, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join('/');
  assert(!/\.(docx|pptx|log)$/i.test(entry.name), `File estraneo nel sito: ${entry.name}`);
  if (/\.pdf$/i.test(entry.name)) assert(pdfConsentiti.has(relativo), `PDF non previsto nel sito: ${relativo}`);
  assert(!/^(iuris-progressi-|recupero-claude)/i.test(entry.name), `File personale nel sito: ${entry.name}`);
}
const pwa = json('manifest.webmanifest');
assert.equal(pwa.start_url, './');
assert.equal(pwa.scope, './');
for (const icon of pwa.icons) file(icon.src);
file('sw.js');
console.log(`Sito verificato: ${materie.length} materie, ${pdfConsentiti.size} PDF originali verificati e risorse locali.`);

