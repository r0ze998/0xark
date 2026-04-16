import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Build as a library so it can be injected into the game page
    lib: {
      entry: 'src/main.tsx',
      name: 'OxarkUI',
      fileName: 'oxark-ui',
      formats: ['iife'],
    },
    outDir: '../react-dist',
    emptyOutDir: true,
    rollupOptions: {
      // React and ReactDOM are loaded via CDN in the game page to keep bundle small
      external: [],
    },
  },
  define: {
    // Required for @solana/web3.js in browser
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Node polyfills for Solana web3.js
      buffer: 'buffer',
    },
  },
});
