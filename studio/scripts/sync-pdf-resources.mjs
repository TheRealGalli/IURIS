// Risorse PDF.js locali: il lettore non dipende da servizi esterni o CDN.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve('pdfjs-dist/package.json'));
const target = fileURLToPath(new URL('../public/pdfjs/', import.meta.url));
fs.mkdirSync(target, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) {
  fs.rmSync(path.join(target, dir), { recursive: true, force: true });
  fs.cpSync(path.join(source, dir), path.join(target, dir), { recursive: true });
}
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(target, 'LICENSE'));
console.log('Risorse del lettore PDF preparate.');
