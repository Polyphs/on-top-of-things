import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ─── CRITICAL: keeps all asset URLs relative to /ot2/ ───
  base: '/ot2/',

  // Include .htm files as assets
  assetsInclude: ['**/*.htm'],

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        manualChunks: undefined,
      },
    },
    copyPublicDir: true,
  },
});
