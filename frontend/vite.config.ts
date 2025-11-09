import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config: ensure base '/', UTF-8 charset handled by index.html meta tag.
// Removed custom server headers (not needed and can interfere with proper content-type negotiation).
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
