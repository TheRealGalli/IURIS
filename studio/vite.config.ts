import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // percorsi relativi: la build funziona su qualunque hosting statico
  // 7101: server di sviluppo (si ricarica a ogni modifica del codice)
  server: {
    port: 7101,
    strictPort: false,
    host: true,
  },
  // 7100: la versione stabile per studiare (npm run studio), che cambia solo quando si rifà la build
  preview: {
    port: 7100,
    strictPort: true,
    host: true,
  },
});
