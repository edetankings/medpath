import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { frontendBoundary } from './scripts/frontend-boundary.mjs';

export default defineConfig({
  plugins: [frontendBoundary(), react()],
  // Never copy an unreviewed public directory into the deployment bundle.
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    open: false,
    cors: false,
    fs: {
      strict: true,
      allow: ['src', 'css', 'assets', 'node_modules', 'index.html', 'manifest.json']
        .map(p => path.resolve(__dirname, p)),
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    cors: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
