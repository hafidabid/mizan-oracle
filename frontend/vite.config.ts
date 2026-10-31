import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// three.js is large, so it gets its own chunk and the app code stays small.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
