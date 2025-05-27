import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            outDir: '.vite/build',
            rollupOptions: {
              external: ['sqlite3'],
            },
          },
        },
      },
      {
        entry: 'src/preload/preload.ts',
        vite: {
          build: {
            outDir: '.vite/build',
            rollupOptions: {
              external: ['sqlite3'],
            },
          },
        },
      },
    ]),
    renderer(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    rollupOptions: {
      external: ['sqlite3'],
    },
  },
  optimizeDeps: {
    exclude: ['sqlite3'],
  },
}); 