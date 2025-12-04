import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite config for Lenza ERP
// Updated: 2025-12-04 - Added environment variable definitions and security headers
export default defineConfig({
  base: '/',
  plugins: [react()],
  
  // Define environment variables with fallbacks
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://erp.lenza.uz' : 'http://localhost:8000')
    ),
    'import.meta.env.VITE_WS_URL': JSON.stringify(
      process.env.VITE_WS_URL || 
      (process.env.NODE_ENV === 'production' ? 'wss://erp.lenza.uz/ws/' : 'ws://localhost:8000/ws/')
    ),
  },
  
  server: {
    port: 5173,
    host: '0.0.0.0',
    // Proxy API requests in development to avoid CORS
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
