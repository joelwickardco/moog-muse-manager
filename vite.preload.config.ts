import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    rollupOptions: {
      external: ['sqlite3'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}); 