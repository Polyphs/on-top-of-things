import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ─── CRITICAL: keeps all asset URLs relative to /ot2/ ───
  base: '/ot2/',

  build: {
    outDir: 'dist',
    // Single chunk for simplicity — fine for an investor demo
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
